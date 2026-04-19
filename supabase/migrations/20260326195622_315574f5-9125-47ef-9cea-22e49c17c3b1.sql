
DROP FUNCTION IF EXISTS public.get_public_store_by_slug(text);

CREATE FUNCTION public.get_public_store_by_slug(_slug text)
RETURNS TABLE(id text, name text, status text, show_store_name boolean, qr_service_enabled boolean, qr_service_expires_at timestamptz, delivery_mode text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, name, status, show_store_name, qr_service_enabled, qr_service_expires_at, delivery_mode
  FROM public.stores
  WHERE qr_slug = _slug AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.validate_store_customer(_store_id text, _name text, _contact_no text)
RETURNS TABLE(id uuid, name text, email text, contact_no text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, name, email, contact_no
  FROM public.store_customers
  WHERE store_id = _store_id
    AND LOWER(TRIM(name)) = LOWER(TRIM(_name))
    AND TRIM(replace(contact_no, ' ', '')) = TRIM(replace(_contact_no, ' ', ''))
  LIMIT 1;
$$;
