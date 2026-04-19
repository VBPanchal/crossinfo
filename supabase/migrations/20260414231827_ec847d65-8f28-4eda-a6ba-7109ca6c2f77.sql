
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS qr_order_input_mode text NOT NULL DEFAULT 'both';

DROP FUNCTION IF EXISTS public.get_public_store_by_slug(text);

CREATE FUNCTION public.get_public_store_by_slug(_slug text)
 RETURNS TABLE(id text, name text, status text, show_store_name boolean, qr_service_enabled boolean, qr_service_expires_at timestamp with time zone, delivery_mode text, qr_order_input_mode text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id, name, status, show_store_name, qr_service_enabled, qr_service_expires_at, delivery_mode, qr_order_input_mode
  FROM public.stores
  WHERE qr_slug = _slug AND status = 'active'
  LIMIT 1;
$function$;
