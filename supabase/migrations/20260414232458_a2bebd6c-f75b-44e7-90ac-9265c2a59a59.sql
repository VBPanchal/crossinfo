ALTER TABLE public.stores ALTER COLUMN plan_type SET DEFAULT 'starter';

UPDATE public.stores SET plan_type = 'starter' WHERE plan_type = 'free';