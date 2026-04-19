
-- 1. Fix customer_orders: Remove the overly permissive anon SELECT policy
DROP POLICY IF EXISTS "Customers can view own orders by id" ON public.customer_orders;

-- Anon users cannot do full table scans - use server-side function for order tracking
CREATE POLICY "Anon cannot read orders directly"
ON public.customer_orders
FOR SELECT
TO anon
USING (false);

-- Create a security definer function for anonymous order lookup by collection_number
CREATE OR REPLACE FUNCTION public.get_order_by_collection_number(
  _store_id text,
  _collection_number text
)
RETURNS SETOF public.customer_orders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.customer_orders
  WHERE store_id = _store_id
    AND collection_number = _collection_number
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- 2. Add validation to customer_orders anonymous INSERT policy
DROP POLICY IF EXISTS "Anyone can create orders" ON public.customer_orders;

CREATE POLICY "Validated anonymous order insert"
ON public.customer_orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  store_id IN (SELECT id FROM stores WHERE status = 'active')
  AND length(order_details) > 0
  AND length(order_details) < 5000
  AND length(order_type) > 0
  AND customer_id IS NOT NULL
);

-- 3. Strengthen store_customers anonymous INSERT validation
DROP POLICY IF EXISTS "Anyone can create customers" ON public.store_customers;

CREATE POLICY "Validated customer insert"
ON public.store_customers
FOR INSERT
TO anon, authenticated
WITH CHECK (
  store_id IN (SELECT id FROM stores WHERE status = 'active')
  AND length(name) > 0 AND length(name) < 200
  AND length(email) > 0 AND length(email) < 300
  AND length(contact_no) > 0 AND length(contact_no) < 30
);

-- 4. Add validation to store_notifications anonymous INSERT
DROP POLICY IF EXISTS "Anon can insert notifications for active stores" ON public.store_notifications;

CREATE POLICY "Validated anon notification insert"
ON public.store_notifications
FOR INSERT
TO anon
WITH CHECK (
  store_id IN (SELECT id FROM stores WHERE status = 'active')
  AND length(title) > 0 AND length(title) < 500
  AND length(message) > 0 AND length(message) < 2000
);
