import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PAYPAL_API = Deno.env.get('PAYPAL_MODE') === 'sandbox'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

const PRICES: Record<string, { monthly: number; name: string }> = {
  starter: { monthly: 29.99, name: 'CossInfo Starter Plan' },
  popular: { monthly: 49.99, name: 'CossInfo Popular Plan' },
  business: { monthly: 79.99, name: 'CossInfo Business Plan' },
  enterprise: { monthly: 100.00, name: 'CossInfo Enterprise Plan' },
};

function calcAmount(plan: string, billingCycle: string): { amount: number; description: string; months: number } {
  const info = PRICES[plan];
  if (!info) throw new Error('Invalid plan');
  if (billingCycle === '6months') {
    return { amount: +(info.monthly * 6 * 0.95).toFixed(2), description: `${info.name} - 6 Months (5% off)`, months: 6 };
  } else if (billingCycle === 'yearly') {
    return { amount: +(info.monthly * 12 * 0.90).toFixed(2), description: `${info.name} - Yearly (10% off)`, months: 12 };
  }
  return { amount: info.monthly, description: `${info.name} - Monthly`, months: 1 };
}

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('PayPal credentials not configured');

  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`PayPal auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

function getAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

async function logEvent(adminClient: any, eventType: string, storeId: string | null, subscriptionId: string | null, payload: any) {
  await adminClient.from('webhook_logs').insert({
    event_type: eventType,
    store_id: storeId,
    subscription_id: subscriptionId,
    payload: payload || {},
    status: 'processed',
  });
}

async function generateInvoice(adminClient: any, storeId: string, subscriptionId: string, amount: number, planType: string, billingCycle: string, paymentRef: string) {
  const { data: invoiceNum } = await adminClient.rpc('generate_invoice_number');
  const { data: invoice } = await adminClient.from('invoices').insert({
    invoice_number: invoiceNum,
    store_id: storeId,
    subscription_id: subscriptionId,
    amount,
    plan_type: planType,
    billing_cycle: billingCycle,
    payment_reference: paymentRef,
    status: 'paid',
  }).select('id, invoice_number').single();
  return invoice;
}

async function applyCoupon(adminClient: any, couponCode: string, storeId: string, amount: number, planType: string) {
  if (!couponCode) return { finalAmount: amount, discountApplied: 0, couponId: null };

  const { data: coupon } = await adminClient.from('coupons')
    .select('*')
    .eq('code', couponCode.toUpperCase().trim())
    .eq('is_active', true)
    .maybeSingle();

  if (!coupon) throw new Error('Invalid or expired coupon code');

  const now = new Date();
  if (coupon.valid_until && new Date(coupon.valid_until) < now) throw new Error('Coupon has expired');
  if (coupon.max_uses && coupon.used_count >= coupon.max_uses) throw new Error('Coupon usage limit reached');
  if (coupon.applicable_plans && coupon.applicable_plans.length > 0 && !coupon.applicable_plans.includes(planType)) {
    throw new Error(`Coupon not applicable for ${planType} plan`);
  }

  // Check if store already used this coupon
  const { data: existing } = await adminClient.from('coupon_redemptions')
    .select('id').eq('coupon_id', coupon.id).eq('store_id', storeId).maybeSingle();
  if (existing) throw new Error('You have already used this coupon');

  let discount = 0;
  if (coupon.discount_type === 'percentage') {
    discount = +(amount * coupon.discount_value / 100).toFixed(2);
  } else {
    discount = Math.min(coupon.discount_value, amount);
  }

  return { finalAmount: +(amount - discount).toFixed(2), discountApplied: discount, couponId: coupon.id };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, plan, orderId, billingCycle = 'monthly', paymentMode = 'manual', subscriptionId, couponCode } = body;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = user.id;

    const ok = (data: unknown) => new Response(JSON.stringify(data), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const err = (msg: string, status = 400) => new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // ─── Get Client ID ───
    if (action === 'get-client-id') {
      const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
      if (!clientId) throw new Error('PAYPAL_CLIENT_ID not configured');
      return ok({ clientId });
    }

    // ─── Validate Coupon ───
    if (action === 'validate-coupon') {
      const adminClient = getAdminClient();
      const { data: store } = await adminClient.from('stores').select('id').eq('user_id', userId).maybeSingle();
      if (!store) return err('Store not found');
      const { amount } = calcAmount(plan, billingCycle);
      try {
        const result = await applyCoupon(adminClient, couponCode, store.id, amount, plan);
        return ok({ valid: true, originalAmount: amount, finalAmount: result.finalAmount, discount: result.discountApplied });
      } catch (e: any) {
        return ok({ valid: false, error: e.message, originalAmount: amount, finalAmount: amount, discount: 0 });
      }
    }

    const accessToken = await getPayPalAccessToken();
    const adminClient = getAdminClient();

    const { data: store } = await adminClient.from('stores').select('id').eq('user_id', userId).maybeSingle();
    if (!store) return err('Store not found');

    // ─── ONE-TIME (Manual Renewal) ─── Create Order
    if (action === 'create' && paymentMode === 'manual') {
      let { amount, description } = calcAmount(plan, billingCycle);
      
      // Apply coupon if provided
      let couponId = null;
      let discountApplied = 0;
      if (couponCode) {
        try {
          const couponResult = await applyCoupon(adminClient, couponCode, store.id, amount, plan);
          amount = couponResult.finalAmount;
          discountApplied = couponResult.discountApplied;
          couponId = couponResult.couponId;
          description += ` (Coupon: -$${discountApplied.toFixed(2)})`;
        } catch (e: any) {
          return err(e.message);
        }
      }

      const response = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{ amount: { currency_code: 'AUD', value: amount.toFixed(2) }, description }],
        }),
      });
      const order = await response.json();
      if (!response.ok) throw new Error(`PayPal create order failed: ${JSON.stringify(order)}`);
      return ok({ id: order.id, couponId, discountApplied });
    }

    // ─── ONE-TIME (Manual Renewal) ─── Capture Order
    if (action === 'capture' && paymentMode === 'manual') {
      const response = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      });
      const captureData = await response.json();
      if (!response.ok) throw new Error(`PayPal capture failed: ${JSON.stringify(captureData)}`);

      if (captureData.status === 'COMPLETED') {
        const { amount, months } = calcAmount(plan, billingCycle);
        const capturedAmount = parseFloat(captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || amount.toString());
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + months);

        const { data: storeDetails } = await adminClient.from('stores').select('name, email').eq('id', store.id).maybeSingle();

        await adminClient.from('stores').update({ plan_type: plan }).eq('id', store.id);
        const { data: newSub } = await adminClient.from('store_subscriptions').insert({
          store_id: store.id,
          plan_type: plan,
          billing_cycle: billingCycle,
          payment_mode: 'manual',
          paypal_order_id: orderId,
          status: 'active',
          amount: capturedAmount,
          expires_at: expiresAt.toISOString(),
        }).select('id').single();

        // Generate invoice
        const invoice = await generateInvoice(adminClient, store.id, newSub?.id, capturedAmount, plan, billingCycle, orderId);

        // Record coupon redemption
        const couponId = body.couponId;
        const discountApplied = body.discountApplied || 0;
        if (couponId) {
          await adminClient.from('coupon_redemptions').insert({ coupon_id: couponId, store_id: store.id, subscription_id: newSub?.id, discount_applied: discountApplied });
          // Increment used_count
          const { data: couponData } = await adminClient.from('coupons').select('used_count').eq('id', couponId).maybeSingle();
          if (couponData) {
            await adminClient.from('coupons').update({ used_count: (couponData.used_count || 0) + 1 }).eq('id', couponId);
          }
        }

        await logEvent(adminClient, 'payment_success', store.id, newSub?.id, { orderId, amount: capturedAmount, plan, billingCycle });

        if (storeDetails?.email) {
          const cycleLabel = billingCycle === '6months' ? '6 Months' : billingCycle === 'yearly' ? 'Yearly' : 'Monthly';
          await adminClient.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'payment-success',
              recipientEmail: storeDetails.email,
              idempotencyKey: `payment-success-${orderId}`,
              templateData: {
                storeName: storeDetails.name,
                planName: plan.charAt(0).toUpperCase() + plan.slice(1),
                billingCycle: cycleLabel,
                amount: `$${capturedAmount.toFixed(2)}`,
                paymentMode: 'One-time (Manual)',
                invoiceNumber: invoice?.invoice_number,
              },
            },
          });
        }
      }
      return ok({ status: captureData.status });
    }

    // ─── RECURRING ─── Create Subscription Plan & Subscription
    if (action === 'create-subscription') {
      if (!PRICES[plan]) return err('Invalid plan');
      const { amount, description, months } = calcAmount(plan, billingCycle);

      const prodResp = await fetch(`${PAYPAL_API}/v1/catalogs/products`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': `prod-${store.id}-${plan}-${Date.now()}` },
        body: JSON.stringify({ name: description, type: 'SERVICE', category: 'SOFTWARE' }),
      });
      const product = await prodResp.json();
      if (!prodResp.ok) throw new Error(`Product creation failed: ${JSON.stringify(product)}`);

      let intervalUnit = 'MONTH';
      let intervalCount = 1;
      if (billingCycle === '6months') { intervalCount = 6; }
      else if (billingCycle === 'yearly') { intervalUnit = 'YEAR'; intervalCount = 1; }

      const planResp = await fetch(`${PAYPAL_API}/v1/billing/plans`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': `plan-${store.id}-${plan}-${billingCycle}-${Date.now()}` },
        body: JSON.stringify({
          product_id: product.id,
          name: description,
          billing_cycles: [{
            frequency: { interval_unit: intervalUnit, interval_count: intervalCount },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0,
            pricing_scheme: { fixed_price: { value: amount.toFixed(2), currency_code: 'AUD' } },
          }],
          payment_preferences: { auto_bill_outstanding: true, payment_failure_threshold: 3 },
        }),
      });
      const billingPlan = await planResp.json();
      if (!planResp.ok) throw new Error(`Plan creation failed: ${JSON.stringify(billingPlan)}`);

      const subResp = await fetch(`${PAYPAL_API}/v1/billing/subscriptions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': `sub-${store.id}-${plan}-${Date.now()}` },
        body: JSON.stringify({
          plan_id: billingPlan.id,
          application_context: {
            brand_name: 'CossInfo',
            user_action: 'SUBSCRIBE_NOW',
            return_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/paypal-checkout`,
            cancel_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/paypal-checkout`,
          },
        }),
      });
      const subscription = await subResp.json();
      if (!subResp.ok) throw new Error(`Subscription creation failed: ${JSON.stringify(subscription)}`);

      const approvalLink = subscription.links?.find((l: any) => l.rel === 'approve')?.href;
      return ok({ subscriptionId: subscription.id, approvalUrl: approvalLink, planId: billingPlan.id });
    }

    // ─── RECURRING ─── Activate subscription after user approval
    if (action === 'activate-subscription') {
      if (!subscriptionId) return err('subscriptionId required');

      const subResp = await fetch(`${PAYPAL_API}/v1/billing/subscriptions/${subscriptionId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const subData = await subResp.json();
      if (!subResp.ok) throw new Error(`Subscription fetch failed: ${JSON.stringify(subData)}`);

      if (subData.status === 'ACTIVE' || subData.status === 'APPROVED') {
        const { amount, months } = calcAmount(plan, billingCycle);
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + months);

        const { data: storeDetails } = await adminClient.from('stores').select('name, email').eq('id', store.id).maybeSingle();

        await adminClient.from('stores').update({ plan_type: plan }).eq('id', store.id);
        const { data: newSub } = await adminClient.from('store_subscriptions').insert({
          store_id: store.id,
          plan_type: plan,
          billing_cycle: billingCycle,
          payment_mode: 'recurring',
          paypal_subscription_id: subscriptionId,
          status: 'active',
          amount,
          expires_at: expiresAt.toISOString(),
        }).select('id').single();

        const invoice = await generateInvoice(adminClient, store.id, newSub?.id, amount, plan, billingCycle, subscriptionId);
        await logEvent(adminClient, 'payment_success', store.id, newSub?.id, { subscriptionId, amount, plan, billingCycle });

        if (storeDetails?.email) {
          const cycleLabel = billingCycle === '6months' ? '6 Months' : billingCycle === 'yearly' ? 'Yearly' : 'Monthly';
          await adminClient.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'payment-success',
              recipientEmail: storeDetails.email,
              idempotencyKey: `payment-success-sub-${subscriptionId}`,
              templateData: {
                storeName: storeDetails.name,
                planName: plan.charAt(0).toUpperCase() + plan.slice(1),
                billingCycle: cycleLabel,
                amount: `$${amount.toFixed(2)}`,
                paymentMode: 'Auto-Recurring',
                invoiceNumber: invoice?.invoice_number,
              },
            },
          });
        }

        return ok({ status: 'ACTIVE' });
      }
      return ok({ status: subData.status });
    }

    // ─── Cancel Subscription ───
    if (action === 'cancel-subscription') {
      if (!subscriptionId) return err('subscriptionId required');

      const cancelResp = await fetch(`${PAYPAL_API}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Customer requested cancellation' }),
      });

      if (!cancelResp.ok && cancelResp.status !== 204) {
        const cancelData = await cancelResp.json().catch(() => ({}));
        throw new Error(`Cancel failed: ${JSON.stringify(cancelData)}`);
      }

      await adminClient.from('store_subscriptions')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('paypal_subscription_id', subscriptionId)
        .eq('store_id', store.id);

      await logEvent(adminClient, 'subscription_cancelled', store.id, null, { subscriptionId });
      return ok({ status: 'CANCELLED' });
    }

    // ─── Pause Subscription ───
    if (action === 'pause-subscription') {
      const { data: activeSub } = await adminClient.from('store_subscriptions')
        .select('*')
        .eq('store_id', store.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1).maybeSingle();

      if (!activeSub) return err('No active subscription to pause');

      // Calculate remaining days
      const remaining = activeSub.expires_at
        ? Math.max(0, Math.ceil((new Date(activeSub.expires_at).getTime() - Date.now()) / 86400000))
        : 0;

      // If recurring, suspend on PayPal
      if (activeSub.paypal_subscription_id) {
        const suspendResp = await fetch(`${PAYPAL_API}/v1/billing/subscriptions/${activeSub.paypal_subscription_id}/suspend`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Customer requested pause' }),
        });
        if (!suspendResp.ok && suspendResp.status !== 204) {
          const data = await suspendResp.json().catch(() => ({}));
          throw new Error(`Pause failed: ${JSON.stringify(data)}`);
        }
      }

      await adminClient.from('store_subscriptions').update({
        status: 'paused',
        paused_at: new Date().toISOString(),
        pause_days_remaining: remaining,
      }).eq('id', activeSub.id);

      await logEvent(adminClient, 'subscription_paused', store.id, activeSub.id, { daysRemaining: remaining });
      return ok({ status: 'PAUSED', daysRemaining: remaining });
    }

    // ─── Resume Subscription ───
    if (action === 'resume-subscription') {
      const { data: pausedSub } = await adminClient.from('store_subscriptions')
        .select('*')
        .eq('store_id', store.id)
        .eq('status', 'paused')
        .order('created_at', { ascending: false })
        .limit(1).maybeSingle();

      if (!pausedSub) return err('No paused subscription to resume');

      // If recurring, reactivate on PayPal
      if (pausedSub.paypal_subscription_id) {
        const activateResp = await fetch(`${PAYPAL_API}/v1/billing/subscriptions/${pausedSub.paypal_subscription_id}/activate`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Customer resumed subscription' }),
        });
        if (!activateResp.ok && activateResp.status !== 204) {
          const data = await activateResp.json().catch(() => ({}));
          throw new Error(`Resume failed: ${JSON.stringify(data)}`);
        }
      }

      // Extend expiry by remaining days
      const daysRemaining = pausedSub.pause_days_remaining || 0;
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + daysRemaining);

      await adminClient.from('store_subscriptions').update({
        status: 'active',
        resumed_at: new Date().toISOString(),
        paused_at: null,
        pause_days_remaining: null,
        expires_at: newExpiry.toISOString(),
      }).eq('id', pausedSub.id);

      await logEvent(adminClient, 'subscription_resumed', store.id, pausedSub.id, { daysRemaining });
      return ok({ status: 'ACTIVE', expiresAt: newExpiry.toISOString() });
    }

    // ─── Get Subscription Status (includes paused + grace) ───
    if (action === 'get-subscription') {
      const { data: sub } = await adminClient.from('store_subscriptions')
        .select('*')
        .eq('store_id', store.id)
        .in('status', ['active', 'paused', 'grace_period'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Also get invoices
      const { data: invoices } = await adminClient.from('invoices')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })
        .limit(10);

      return ok({ subscription: sub, invoices: invoices || [] });
    }

    // ─── Get Invoices ───
    if (action === 'get-invoices') {
      const { data: invoices } = await adminClient.from('invoices')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });
      return ok({ invoices: invoices || [] });
    }

    return err('Invalid action');
  } catch (error: unknown) {
    console.error('PayPal error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
