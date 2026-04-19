
-- Create a security-definer function so the registration form can check duplicates
CREATE OR REPLACE FUNCTION public.check_store_duplicate(_email text, _contact_no text)
RETURNS TABLE(email_taken boolean, contact_taken boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.stores WHERE LOWER(email) = LOWER(_email)) AS email_taken,
    EXISTS (SELECT 1 FROM public.stores WHERE TRIM(REPLACE(contact_no, ' ', '')) = TRIM(REPLACE(_contact_no, ' ', ''))) AS contact_taken;
$$;

-- Add unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS stores_email_unique ON public.stores (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS stores_contact_no_unique ON public.stores (TRIM(REPLACE(contact_no, ' ', '')));
