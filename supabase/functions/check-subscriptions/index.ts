import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const now = new Date().toISOString();
    const GRACE_PERIOD_DAYS = 7;
    const RETRY_INTERVALS = [1, 3, 7]; // days after first failure
    let downgraded = 0;
    let retried = 0;

    // ─── 1. Handle expired active subscriptions → move to grace period ───
    const { data: expired, error: fetchErr } = await adminClient
      .from('store_subscriptions')
      .select('id, store_id, plan_type, payment_mode, billing_cycle, paypal_subscription_id, amount')
      .eq('status', 'active')
      .lt('expires_at', now);

    if (fetchErr) throw fetchErr;

    for (const sub of expired || []) {
      if (sub.payment_mode === 'recurring' && sub.paypal_subscription_id) {
        // For recurring: move to grace period, attempt retry
        const gracePeriodEnd = new Date(Date.now() + GRACE_PERIOD_DAYS * 86400000);
        await adminClient.from('store_subscriptions').update({
          status: 'grace_period',
          grace_period_ends_at: gracePeriodEnd.toISOString(),
          retry_count: 0,
        }).eq('id', sub.id);

        await logWebhookEvent(adminClient, 'subscription_grace_period', sub.store_id, sub.id, { reason: 'expired' });

        // Notify store
        await notifyStore(adminClient, sub.store_id, 'Payment Required', 
          `Your subscription has expired. We'll retry payment over the next ${GRACE_PERIOD_DAYS} days. Please ensure your payment method is up to date.`, 'billing');
      } else {
        // For manual: directly downgrade
        await downgradeStore(adminClient, sub);
        downgraded++;
      }
    }

    // ─── 2. Handle grace period retries (1d, 3d, 7d) ───
    const { data: graceSubscriptions } = await adminClient
      .from('store_subscriptions')
      .select('id, store_id, plan_type, payment_mode, billing_cycle, paypal_subscription_id, amount, retry_count, last_retry_at, grace_period_ends_at')
      .eq('status', 'grace_period');

    for (const sub of graceSubscriptions || []) {
      // Check if grace period has ended
      if (sub.grace_period_ends_at && new Date(sub.grace_period_ends_at) < new Date()) {
        // Grace period over → downgrade
        await adminClient.from('store_subscriptions').update({ status: 'expired' }).eq('id', sub.id);
        await downgradeStore(adminClient, sub);
        await logWebhookEvent(adminClient, 'subscription_expired_after_grace', sub.store_id, sub.id, { retries: sub.retry_count });
        downgraded++;
        continue;
      }

      // Check if it's time for retry
      const retryIndex = sub.retry_count || 0;
      if (retryIndex >= RETRY_INTERVALS.length) continue;

      const daysSinceGrace = sub.last_retry_at
        ? (Date.now() - new Date(sub.last_retry_at).getTime()) / 86400000
        : (Date.now() - new Date(sub.grace_period_ends_at!).getTime() + GRACE_PERIOD_DAYS * 86400000) / 86400000;

      const nextRetryAfterDays = RETRY_INTERVALS[retryIndex];
      if (daysSinceGrace >= nextRetryAfterDays) {
        // Attempt retry - for PayPal recurring, we just check subscription status
        if (sub.paypal_subscription_id) {
          try {
            const paypalStatus = await checkPayPalSubscriptionStatus(sub.paypal_subscription_id);
            if (paypalStatus === 'ACTIVE') {
              // Payment recovered!
              const months = sub.billing_cycle === '6months' ? 6 : sub.billing_cycle === 'yearly' ? 12 : 1;
              const newExpiry = new Date();
              newExpiry.setMonth(newExpiry.getMonth() + months);
              
              await adminClient.from('store_subscriptions').update({
                status: 'active',
                expires_at: newExpiry.toISOString(),
                grace_period_ends_at: null,
                retry_count: 0,
                last_retry_at: null,
              }).eq('id', sub.id);

              await logWebhookEvent(adminClient, 'payment_recovered', sub.store_id, sub.id, { attempt: retryIndex + 1 });
              await notifyStore(adminClient, sub.store_id, 'Payment Recovered ✅', 
                'Your recurring payment has been processed successfully. Your subscription is now active again.', 'billing');
              
              retried++;
              continue;
            }
          } catch (e) {
            console.error(`PayPal check failed for ${sub.paypal_subscription_id}:`, e);
          }
        }

        // Payment still failed
        await adminClient.from('store_subscriptions').update({
          retry_count: retryIndex + 1,
          last_retry_at: now,
        }).eq('id', sub.id);

        await logWebhookEvent(adminClient, 'payment_retry_failed', sub.store_id, sub.id, { attempt: retryIndex + 1 });
        
        const remainingRetries = RETRY_INTERVALS.length - retryIndex - 1;
        await notifyStore(adminClient, sub.store_id, 'Payment Failed',
          `Payment retry #${retryIndex + 1} failed. ${remainingRetries > 0 ? `We'll try ${remainingRetries} more time(s).` : 'This was the final attempt. Your account will be downgraded soon.'} Please update your payment method in Settings → Plan & Billing.`, 'billing');

        // Send email notification
        const { data: storeData } = await adminClient.from('stores').select('name, email').eq('id', sub.store_id).maybeSingle();
        if (storeData?.email) {
          await adminClient.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'payment-failed',
              recipientEmail: storeData.email,
              idempotencyKey: `payment-failed-${sub.id}-retry-${retryIndex + 1}`,
              templateData: {
                storeName: storeData.name,
                attemptNumber: retryIndex + 1,
                remainingRetries,
                planName: sub.plan_type.charAt(0).toUpperCase() + sub.plan_type.slice(1),
              },
            },
          });
        }
      }
    }

    // ─── 3. Handle paused subscriptions — do not expire them ───
    // Paused subs don't count down; skip them entirely

    // ─── 4. Trial expiry handling ───
    const { data: trialExpired } = await adminClient
      .from('stores')
      .select('id, plan_type, name, email')
      .neq('plan_type', 'starter')
      .lt('trial_ends_at', now)
      .not('trial_ends_at', 'is', null);

    // Send trial expiry REMINDERS (3 days before)
    const threeDaysFromNow = new Date(Date.now() + 3 * 86400000).toISOString();
    const { data: trialExpiringSoon } = await adminClient
      .from('stores')
      .select('id, plan_type, name, email, trial_ends_at')
      .neq('plan_type', 'starter')
      .gt('trial_ends_at', now)
      .lte('trial_ends_at', threeDaysFromNow)
      .not('trial_ends_at', 'is', null);

    for (const store of trialExpiringSoon || []) {
      const daysLeft = Math.max(1, Math.ceil((new Date(store.trial_ends_at).getTime() - Date.now()) / 86400000));

      await adminClient.from('store_notifications').insert({
        store_id: store.id,
        title: 'Trial Ending Soon',
        message: `Your free trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Upgrade now to keep your premium features.`,
        type: 'billing',
      });

      if (store.email) {
        await adminClient.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'trial-expiry-reminder',
            recipientEmail: store.email,
            idempotencyKey: `trial-reminder-${store.id}-${daysLeft}`,
            templateData: { storeName: store.name, planName: store.plan_type.charAt(0).toUpperCase() + store.plan_type.slice(1), daysLeft },
          },
        });
      }
    }

    // For stores with expired trials
    for (const store of trialExpired || []) {
      const { data: activeSub } = await adminClient
        .from('store_subscriptions')
        .select('id')
        .eq('store_id', store.id)
        .in('status', ['active', 'grace_period', 'paused'])
        .limit(1);

      if (!activeSub || activeSub.length === 0) {
        const { data: storeData } = await adminClient.from('stores').select('name, email').eq('id', store.id).maybeSingle();

        await adminClient.from('stores').update({ plan_type: 'starter' }).eq('id', store.id);
        await notifyStore(adminClient, store.id, 'Trial Expired',
          `Your free trial has ended. You've been moved to the Starter plan. Please subscribe to continue using premium features.`, 'billing');

        if (storeData?.email) {
          await adminClient.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'plan-downgrade',
              recipientEmail: storeData.email,
              idempotencyKey: `trial-downgrade-${store.id}-${Date.now()}`,
              templateData: { storeName: storeData.name, previousPlan: store.plan_type.charAt(0).toUpperCase() + store.plan_type.slice(1), reason: 'free trial ended' },
            },
          });
        }
        downgraded++;
      }
    }

    // ─── 5. Upcoming renewal reminders (2 days before expiry for active subs) ───
    const twoDaysFromNow = new Date(Date.now() + 2 * 86400000).toISOString();
    const { data: renewingSoon } = await adminClient
      .from('store_subscriptions')
      .select('id, store_id, plan_type, billing_cycle, amount, expires_at, payment_mode')
      .eq('status', 'active')
      .gt('expires_at', now)
      .lte('expires_at', twoDaysFromNow);

    for (const sub of renewingSoon || []) {
      const { data: storeData } = await adminClient.from('stores').select('name, email').eq('id', sub.store_id).maybeSingle();
      const daysLeft = Math.max(1, Math.ceil((new Date(sub.expires_at!).getTime() - Date.now()) / 86400000));
      
      await notifyStore(adminClient, sub.store_id, 'Renewal Coming Up',
        `Your ${sub.plan_type} plan ${sub.payment_mode === 'recurring' ? 'auto-renews' : 'expires'} in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. ${sub.payment_mode === 'manual' ? 'Please renew from Settings → Plan & Billing.' : ''}`, 'billing');

      if (storeData?.email) {
        await adminClient.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'upcoming-renewal',
            recipientEmail: storeData.email,
            idempotencyKey: `renewal-reminder-${sub.id}-${daysLeft}`,
            templateData: {
              storeName: storeData.name,
              planName: sub.plan_type.charAt(0).toUpperCase() + sub.plan_type.slice(1),
              daysLeft,
              amount: `$${Number(sub.amount).toFixed(2)}`,
              paymentMode: sub.payment_mode === 'recurring' ? 'Auto-Recurring' : 'Manual',
            },
          },
        });
      }
    }

    console.log(`Subscription check: ${expired?.length || 0} expired, ${downgraded} downgraded, ${retried} recovered`);

    return new Response(JSON.stringify({ expired: expired?.length || 0, downgraded, retried }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Subscription check error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// ─── Helper functions ───

async function downgradeStore(adminClient: any, sub: any) {
  const { data: storeData } = await adminClient.from('stores').select('name, email, plan_type').eq('id', sub.store_id).maybeSingle();
  const previousPlan = storeData?.plan_type || sub.plan_type;

  await adminClient.from('stores').update({ plan_type: 'starter' }).eq('id', sub.store_id);
  await adminClient.from('store_subscriptions').update({ status: 'expired' }).eq('id', sub.id);

  await notifyStore(adminClient, sub.store_id, 'Plan Expired',
    `Your ${previousPlan} plan has expired. You've been downgraded to the Starter plan. Please subscribe to continue using premium features.`, 'billing');

  if (storeData?.email) {
    await adminClient.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'plan-downgrade',
        recipientEmail: storeData.email,
        idempotencyKey: `plan-downgrade-${sub.id}`,
        templateData: { storeName: storeData.name, previousPlan: previousPlan.charAt(0).toUpperCase() + previousPlan.slice(1), reason: 'subscription expired' },
      },
    });
  }

  await logWebhookEvent(adminClient, 'subscription_downgraded', sub.store_id, sub.id, { from: previousPlan, to: 'starter' });
}

async function notifyStore(adminClient: any, storeId: string, title: string, message: string, type: string) {
  await adminClient.from('store_notifications').insert({ store_id: storeId, title, message, type });
}

async function logWebhookEvent(adminClient: any, eventType: string, storeId: string | null, subscriptionId: string | null, payload: Record<string, any>) {
  await adminClient.from('webhook_logs').insert({
    event_type: eventType,
    store_id: storeId,
    subscription_id: subscriptionId,
    payload,
    status: 'processed',
  });
}

async function checkPayPalSubscriptionStatus(subscriptionId: string): Promise<string> {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('PayPal not configured');

  const PAYPAL_API = Deno.env.get('PAYPAL_MODE') === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';

  const tokenResp = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const tokenData = await tokenResp.json();
  if (!tokenResp.ok) throw new Error('PayPal auth failed');

  const subResp = await fetch(`${PAYPAL_API}/v1/billing/subscriptions/${subscriptionId}`, {
    headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
  });
  const subData = await subResp.json();
  return subData.status || 'UNKNOWN';
}
