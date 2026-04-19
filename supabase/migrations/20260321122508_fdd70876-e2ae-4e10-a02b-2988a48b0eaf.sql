
-- 1. Allow anon users to read store name/status for public QR order page
CREATE POLICY "Anon can read store basics"
ON public.stores FOR SELECT
TO anon
USING (status = 'active');

-- 2. Add day_type column to store_time_slots for day-wise scheduling
ALTER TABLE public.store_time_slots ADD COLUMN day_type text NOT NULL DEFAULT 'all';
