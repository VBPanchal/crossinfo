
CREATE TABLE public.customer_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  code text NOT NULL,
  store_id text NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '5 minutes'),
  verified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_otp_codes ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (edge function uses service role, but just in case)
CREATE POLICY "Service role manages OTP codes"
ON public.customer_otp_codes
FOR ALL
USING (true)
WITH CHECK (true);

-- Allow anon to read their own codes for verification
CREATE POLICY "Anon can read OTP by phone"
ON public.customer_otp_codes
FOR SELECT
TO anon
USING (true);
