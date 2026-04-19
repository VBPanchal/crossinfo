
-- Fix: The previous migration already applied most fixes successfully.
-- Only the coupons policy failed. Recreate it properly.
-- Coupons need to be readable by authenticated users to validate codes during checkout.
-- Keep it simple: active coupons readable by all authenticated, admins see all.
DROP POLICY IF EXISTS "Authenticated can read active coupons for validation" ON public.coupons;
DROP POLICY IF EXISTS "Anyone can read active coupons" ON public.coupons;
CREATE POLICY "Authenticated can read active coupons"
ON public.coupons FOR SELECT TO authenticated
USING (is_active = true OR public.has_role(auth.uid(), 'admin'::public.app_role));
