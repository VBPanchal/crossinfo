
-- Fix: store_time_slots public read - restrict anon access
-- Create security definer function for fetching time slots by store
CREATE OR REPLACE FUNCTION public.get_active_time_slots_for_store(_store_id text)
RETURNS TABLE(
  id uuid,
  slot_label text,
  slot_type text,
  day_type text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, slot_label, slot_type, day_type
  FROM public.store_time_slots
  WHERE store_id = _store_id AND is_active = true;
$$;

-- Replace overly broad anon SELECT with restricted one
DROP POLICY IF EXISTS "Anyone can read active time slots" ON public.store_time_slots;

CREATE POLICY "Anon cannot read time slots directly"
ON public.store_time_slots
FOR SELECT
TO anon
USING (false);

-- Keep authenticated access for store owners
CREATE POLICY "Authenticated can read active time slots"
ON public.store_time_slots
FOR SELECT
TO authenticated
USING (is_active = true);
