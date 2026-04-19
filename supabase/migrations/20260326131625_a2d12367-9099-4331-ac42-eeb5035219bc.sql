
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role manages OTP codes" ON public.customer_otp_codes;

-- OTP codes are managed by edge functions using service_role key, no direct user access needed for INSERT/UPDATE/DELETE
-- Only allow authenticated store owners to view OTP codes for their store
CREATE POLICY "Store owners can view OTP codes"
ON public.customer_otp_codes
FOR SELECT
TO authenticated
USING (store_id IN (SELECT stores.id FROM stores WHERE stores.user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
