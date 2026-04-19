
DROP POLICY IF EXISTS "Validated login attempt insert" ON public.login_attempts;

CREATE POLICY "Service role can insert login attempts"
ON public.login_attempts FOR INSERT TO public
WITH CHECK (auth.role() = 'service_role');
