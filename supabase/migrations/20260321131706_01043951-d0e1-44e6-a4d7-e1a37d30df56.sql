
-- Add unique QR slug to stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS qr_slug text UNIQUE;

-- Generate slugs for existing stores using random hex
UPDATE public.stores SET qr_slug = encode(gen_random_bytes(8), 'hex') WHERE qr_slug IS NULL;

-- Make it NOT NULL after backfill
ALTER TABLE public.stores ALTER COLUMN qr_slug SET NOT NULL;
ALTER TABLE public.stores ALTER COLUMN qr_slug SET DEFAULT encode(gen_random_bytes(8), 'hex');

-- Allow anon to read stores by qr_slug (already covered by existing "Anon can read store basics" policy)
