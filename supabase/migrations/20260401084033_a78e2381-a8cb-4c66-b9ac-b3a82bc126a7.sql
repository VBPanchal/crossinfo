
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 'INV-' || LPAD(nextval('public.invoice_number_seq')::TEXT, 6, '0')
$$;
