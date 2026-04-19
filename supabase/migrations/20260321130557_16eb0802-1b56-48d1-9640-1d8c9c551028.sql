
-- Add community chat mode preference per store (anonymous or named)
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS community_chat_mode text NOT NULL DEFAULT 'anonymous';

-- Add QR order service control columns
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS qr_service_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS qr_service_expires_at timestamptz DEFAULT NULL;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS qr_service_plan_months integer DEFAULT NULL;
