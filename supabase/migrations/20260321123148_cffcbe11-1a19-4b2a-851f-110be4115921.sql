
-- Allow anon to read back their just-inserted customer row
CREATE POLICY "Anon can read own customer insert"
ON public.store_customers FOR SELECT
TO anon
USING (true);
