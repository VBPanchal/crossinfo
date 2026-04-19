
-- Fix remaining overly permissive INSERT policies

-- customer_orders: restrict anon insert to require valid store_id and customer_id
DROP POLICY IF EXISTS "Anyone can create orders" ON public.customer_orders;
CREATE POLICY "Anyone can create orders"
ON public.customer_orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  store_id IN (SELECT id FROM stores WHERE status = 'active')
);

-- store_customers: restrict anon insert to require valid active store
DROP POLICY IF EXISTS "Anyone can create customers" ON public.store_customers;
CREATE POLICY "Anyone can create customers"
ON public.store_customers
FOR INSERT
TO anon, authenticated
WITH CHECK (
  store_id IN (SELECT id FROM stores WHERE status = 'active')
);
