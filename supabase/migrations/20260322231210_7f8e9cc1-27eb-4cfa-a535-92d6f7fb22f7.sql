CREATE POLICY "Anon can insert notifications for active stores"
ON public.store_notifications
FOR INSERT
TO anon
WITH CHECK (
  store_id IN (SELECT stores.id FROM stores WHERE stores.status = 'active'::text)
);