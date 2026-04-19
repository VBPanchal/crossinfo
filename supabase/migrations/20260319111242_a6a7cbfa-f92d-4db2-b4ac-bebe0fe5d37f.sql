
-- Fix 1: Set search_path on generate_store_id and update_updated_at_column
CREATE OR REPLACE FUNCTION public.generate_store_id()
RETURNS TEXT
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 'STORE-' || LPAD(nextval('public.store_id_seq')::TEXT, 4, '0')
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public;

-- Fix 2: Remove overly permissive feedback insert policy and make it more restrictive
DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback;
CREATE POLICY "Anyone can submit feedback" ON public.feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(name) > 0 AND length(name) < 200
    AND length(email) > 0 AND length(email) < 300
    AND length(message) > 0 AND length(message) < 2000
  );
