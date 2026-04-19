
-- 1. Add grace period and pause columns to store_subscriptions
ALTER TABLE public.store_subscriptions 
  ADD COLUMN IF NOT EXISTS grace_period_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS resumed_at timestamptz,
  ADD COLUMN IF NOT EXISTS pause_days_remaining integer;

-- 2. Webhook / payment event logs
CREATE TABLE public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  source text NOT NULL DEFAULT 'paypal',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  store_id text,
  subscription_id uuid REFERENCES public.store_subscriptions(id),
  status text NOT NULL DEFAULT 'received',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage webhook logs" ON public.webhook_logs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage webhook logs" ON public.webhook_logs
  FOR ALL TO public USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 3. Invoices table
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  store_id text NOT NULL,
  subscription_id uuid REFERENCES public.store_subscriptions(id),
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'AUD',
  plan_type text NOT NULL,
  billing_cycle text NOT NULL,
  payment_method text NOT NULL DEFAULT 'paypal',
  payment_reference text,
  status text NOT NULL DEFAULT 'paid',
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can view own invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (store_id IN (SELECT stores.id FROM stores WHERE stores.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage invoices" ON public.invoices
  FOR ALL TO public USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can manage invoices" ON public.invoices
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. Coupons table
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text DEFAULT '',
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 0,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  applicable_plans text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active coupons" ON public.coupons
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage coupons" ON public.coupons
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. Coupon redemptions tracking
CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid REFERENCES public.coupons(id) NOT NULL,
  store_id text NOT NULL,
  subscription_id uuid REFERENCES public.store_subscriptions(id),
  discount_applied numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(coupon_id, store_id)
);
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can view own redemptions" ON public.coupon_redemptions
  FOR SELECT TO authenticated
  USING (store_id IN (SELECT stores.id FROM stores WHERE stores.user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage redemptions" ON public.coupon_redemptions
  FOR ALL TO public USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can manage redemptions" ON public.coupon_redemptions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 6. Invoice number sequence
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START WITH 1001;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE sql
SET search_path TO 'public'
AS $$
  SELECT 'INV-' || LPAD(nextval('public.invoice_number_seq')::TEXT, 6, '0')
$$;
