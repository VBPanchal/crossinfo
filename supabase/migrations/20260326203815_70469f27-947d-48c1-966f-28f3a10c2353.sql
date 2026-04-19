
-- Fix 1: Remove dangerous anon SELECT on customer_otp_codes
DROP POLICY IF EXISTS "Anon can read OTP by phone" ON public.customer_otp_codes;

-- Fix 2: Create a secure RPC for OTP verification
CREATE OR REPLACE FUNCTION public.verify_customer_otp(_email text, _code text, _store_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _found boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.customer_otp_codes
    WHERE phone_number = _email
      AND code = _code
      AND store_id = _store_id
      AND verified = false
      AND expires_at > now()
  ) INTO _found;

  IF _found THEN
    UPDATE public.customer_otp_codes
    SET verified = true
    WHERE phone_number = _email
      AND code = _code
      AND store_id = _store_id
      AND verified = false
      AND expires_at > now();
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_customer_otp(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_customer_otp(text, text, text) TO authenticated;

-- Fix 3: Restrict time slots to store owners only
DROP POLICY IF EXISTS "Authenticated can read active time slots" ON public.store_time_slots;
CREATE POLICY "Store owners can read own time slots"
ON public.store_time_slots
FOR SELECT
TO authenticated
USING (
  (store_id IN (SELECT stores.id FROM stores WHERE stores.user_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix 4: Allow authenticated store owners to manage OTP codes
CREATE POLICY "Store owners can manage OTP codes"
ON public.customer_otp_codes
FOR ALL
TO authenticated
USING (
  (store_id IN (SELECT stores.id FROM stores WHERE stores.user_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (store_id IN (SELECT stores.id FROM stores WHERE stores.user_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);
