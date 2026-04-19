ALTER TABLE public.global_products ADD COLUMN IF NOT EXISTS unit_name text NOT NULL DEFAULT 'unit';
ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS unit_name text NOT NULL DEFAULT 'unit';