
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'free',
ADD COLUMN IF NOT EXISTS community_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS community_plan_months integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS community_expires_at timestamp with time zone DEFAULT NULL;
