
-- Create store_qr_products table
CREATE TABLE public.store_qr_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id text NOT NULL,
  store_product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (store_id, store_product_id)
);

-- Enable RLS
ALTER TABLE public.store_qr_products ENABLE ROW LEVEL SECURITY;

-- Store owners can manage their own QR products
CREATE POLICY "Store owners can manage own qr products"
ON public.store_qr_products
FOR ALL
USING (
  (store_id IN (SELECT stores.id FROM stores WHERE stores.user_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (store_id IN (SELECT stores.id FROM stores WHERE stores.user_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Anon cannot read directly
CREATE POLICY "Anon cannot read qr products directly"
ON public.store_qr_products
FOR SELECT
TO anon
USING (false);

-- Security-definer function for public QR page
CREATE OR REPLACE FUNCTION public.get_qr_products_for_store(_store_id text)
RETURNS TABLE(id uuid, display_name text, display_order integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sqp.id, sqp.display_name, sqp.display_order
  FROM public.store_qr_products sqp
  WHERE sqp.store_id = _store_id AND sqp.is_active = true
  ORDER BY sqp.display_order ASC, sqp.created_at ASC;
$$;
