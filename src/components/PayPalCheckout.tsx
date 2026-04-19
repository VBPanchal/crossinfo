import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, CheckCircle, RefreshCw, CreditCard, Tag } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface PayPalCheckoutProps {
  plan: 'starter' | 'popular' | 'business' | 'enterprise';
  billingCycle?: 'monthly' | '6months' | 'yearly';
  onSuccess: () => void;
  onCancel?: () => void;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

// Track which SDK intent is currently loaded
let loadedSdkIntent: string | null = null;

export function PayPalCheckout({ plan, billingCycle = 'monthly', onSuccess, onCancel }: PayPalCheckoutProps) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'manual' | 'recurring'>('manual');
  const [couponCode, setCouponCode] = useState('');
  const [couponValidation, setCouponValidation] = useState<{ valid?: boolean; error?: string; discount?: number; finalAmount?: number; originalAmount?: number } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const paypalRef = useRef<HTMLDivElement>(null);
  const buttonsInstanceRef = useRef<any>(null);

  const planInfo = {
    starter: { label: 'Starter', price: '$29.99/mo' },
    popular: { label: 'Popular', price: '$49.99/mo' },
    business: { label: 'Business', price: '$79.99/mo' },
    enterprise: { label: 'Enterprise', price: '$100/mo' },
  };

  const getApiConfig = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not logged in');
    return {
      baseUrl: `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/paypal-checkout`,
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    };
  }, []);

  const loadSdk = useCallback(async (clientId: string, intent: string) => {
    // If the SDK is loaded with a different intent, remove the old script and reset
    if (window.paypal && loadedSdkIntent !== intent) {
      const oldScript = document.querySelector('script[src*="paypal.com/sdk/js"]');
      if (oldScript) oldScript.remove();
      delete window.paypal;
      loadedSdkIntent = null;
    }

    if (!window.paypal) {
      const sdkParams = intent === 'subscription'
        ? `client-id=${clientId}&currency=AUD&vault=true&intent=subscription`
        : `client-id=${clientId}&currency=AUD&intent=capture`;

      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?${sdkParams}`;
        script.onload = () => { loadedSdkIntent = intent; resolve(); };
        script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
        document.body.appendChild(script);
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setLoading(true);

      // Clean up previous buttons
      if (paypalRef.current) paypalRef.current.innerHTML = '';
      if (buttonsInstanceRef.current) {
        try { buttonsInstanceRef.current.close(); } catch {}
        buttonsInstanceRef.current = null;
      }

      try {
        const { baseUrl, headers } = await getApiConfig();
        if (cancelled) return;

        // Get PayPal Client ID
        const resp = await fetch(baseUrl, {
          method: 'POST', headers,
          body: JSON.stringify({ action: 'get-client-id' }),
        });
        if (!resp.ok) { toast.error('Could not load PayPal'); setLoading(false); return; }
        const { clientId } = await resp.json();
        if (cancelled) return;

        // Load SDK with correct intent
        const sdkIntent = paymentMode === 'recurring' ? 'subscription' : 'capture';
        await loadSdk(clientId, sdkIntent);
        if (cancelled || !paypalRef.current) return;

        setLoading(false);

        let buttonsConfig: any;

        if (paymentMode === 'recurring') {
          buttonsConfig = {
            style: { layout: 'vertical', color: 'blue', shape: 'rect', label: 'subscribe' },
            createSubscription: async () => {
              setProcessing(true);
              const r = await fetch(baseUrl, {
                method: 'POST', headers,
                body: JSON.stringify({ action: 'create-subscription', plan, billingCycle, paymentMode: 'recurring' }),
              });
              const data = await r.json();
              if (!r.ok) { setProcessing(false); throw new Error(data.error); }
              setProcessing(false);
              return data.subscriptionId;
            },
            onApprove: async (data: any) => {
              setProcessing(true);
              try {
                const r = await fetch(baseUrl, {
                  method: 'POST', headers,
                  body: JSON.stringify({ action: 'activate-subscription', subscriptionId: data.subscriptionID, plan, billingCycle }),
                });
                const result = await r.json();
                if (result.status === 'ACTIVE' || result.status === 'APPROVED') {
                  setCompleted(true);
                  toast.success(`${planInfo[plan].label} subscription activated!`);
                  onSuccess();
                } else {
                  toast.error('Subscription was not activated.');
                }
              } catch { toast.error('Failed to activate subscription.'); }
              setProcessing(false);
            },
            onCancel: () => { toast.info('Subscription cancelled'); onCancel?.(); },
            onError: (err: any) => { console.error('PayPal error:', err); toast.error('PayPal error. Please try again.'); setProcessing(false); },
          };
        } else {
          let lastCouponId: string | null = null;
          let lastDiscountApplied = 0;

          buttonsConfig = {
            style: { layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay' },
            createOrder: async () => {
              setProcessing(true);
              const r = await fetch(baseUrl, {
                method: 'POST', headers,
                body: JSON.stringify({ action: 'create', plan, billingCycle, paymentMode: 'manual', couponCode: couponCode.trim() || undefined }),
              });
              const data = await r.json();
              if (!r.ok) { setProcessing(false); throw new Error(data.error); }
              // Store coupon info for capture step
              lastCouponId = data.couponId || null;
              lastDiscountApplied = data.discountApplied || 0;
              setProcessing(false);
              return data.id;
            },
            onApprove: async (data: any) => {
              setProcessing(true);
              try {
                const r = await fetch(baseUrl, {
                  method: 'POST', headers,
                  body: JSON.stringify({ action: 'capture', orderId: data.orderID, plan, billingCycle, paymentMode: 'manual', couponId: lastCouponId, discountApplied: lastDiscountApplied }),
                });
                const result = await r.json();
                if (result.status === 'COMPLETED') {
                  setCompleted(true);
                  toast.success(`${planInfo[plan].label} plan activated!`);
                  onSuccess();
                } else {
                  toast.error('Payment was not completed.');
                }
              } catch { toast.error('Failed to process payment.'); }
              setProcessing(false);
            },
            onCancel: () => { toast.info('Payment cancelled'); onCancel?.(); },
            onError: (err: any) => { console.error('PayPal error:', err); toast.error('PayPal error. Please try again.'); setProcessing(false); },
          };
        }

        if (paypalRef.current) {
          const buttons = window.paypal.Buttons(buttonsConfig);
          buttonsInstanceRef.current = buttons;
          buttons.render(paypalRef.current);
        }
      } catch (err) {
        console.error('PayPal init error:', err);
        if (!cancelled) {
          toast.error('Failed to initialize PayPal');
          setLoading(false);
        }
      }
    };

    init();

    return () => { cancelled = true; };
  }, [paymentMode, plan, billingCycle]);

  if (completed) {
    return (
      <div className="text-center py-6 space-y-3">
        <CheckCircle className="h-12 w-12 mx-auto" style={{ color: '#22c55e' }} />
        <h3 className="text-lg font-bold text-foreground">Payment Successful!</h3>
        <p className="text-sm text-muted-foreground">Your {planInfo[plan].label} plan is now active.</p>
      </div>
    );
  }

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    try {
      const { baseUrl, headers } = await getApiConfig();
      const r = await fetch(baseUrl, {
        method: 'POST', headers,
        body: JSON.stringify({ action: 'validate-coupon', plan, billingCycle, couponCode: couponCode.trim() }),
      });
      const data = await r.json();
      setCouponValidation(data);
      if (data.valid) toast.success(`Coupon applied! You save $${data.discount.toFixed(2)}`);
      else toast.error(data.error || 'Invalid coupon');
    } catch { toast.error('Failed to validate coupon'); }
    setValidatingCoupon(false);
  };

  return (
    <div className="space-y-3">
      {/* Coupon Code (manual mode only) */}
      {paymentMode === 'manual' && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3" /> Coupon Code</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Enter coupon code"
              value={couponCode}
              onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponValidation(null); }}
              className="flex-1 text-xs"
            />
            <Button variant="outline" size="sm" onClick={validateCoupon} disabled={!couponCode.trim() || validatingCoupon} className="text-xs">
              {validatingCoupon ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Apply'}
            </Button>
          </div>
          {couponValidation?.valid && (
            <p className="text-xs text-green-600">✅ Coupon applied: -${couponValidation.discount?.toFixed(2)} → <strong>${couponValidation.finalAmount?.toFixed(2)} AUD</strong></p>
          )}
          {couponValidation && !couponValidation.valid && (
            <p className="text-xs text-destructive">❌ {couponValidation.error}</p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Payment Mode</Label>
        <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as 'manual' | 'recurring')}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">
              <div className="flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5" />
                <span>One-time Payment (Manual Renewal)</span>
              </div>
            </SelectItem>
            <SelectItem value="recurring">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Auto-Recurring Subscription</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          {paymentMode === 'manual'
            ? 'Pay once for the selected period. Renew manually when it expires.'
            : 'PayPal will auto-charge you each billing cycle. Cancel anytime.'}
        </p>
      </div>

      {(loading || processing) && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">
            {processing ? 'Processing...' : 'Loading PayPal...'}
          </span>
        </div>
      )}
      <div ref={paypalRef} className={loading ? 'hidden' : ''} />
      {onCancel && <Button variant="ghost" className="w-full" onClick={onCancel}>Cancel</Button>}
    </div>
  );
}
