
-- Fix 1: Remove the overly permissive anon SELECT policy on store_customers
DROP POLICY IF EXISTS "Anon can read own customer insert" ON public.store_customers;

-- Fix 2: Replace the overly permissive INSERT policy on store_notifications
DROP POLICY IF EXISTS "Anyone can create notifications" ON public.store_notifications;

CREATE POLICY "Store owners can insert own notifications"
ON public.store_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  store_id IN (SELECT id FROM stores WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);
