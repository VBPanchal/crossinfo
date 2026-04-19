
-- Create a security definer function to check if a store is active
CREATE OR REPLACE FUNCTION public.is_active_store(_store_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stores WHERE id = _store_id AND status = 'active'
  )
$$;

-- Drop the old failing policy
DROP POLICY IF EXISTS "Validated anonymous order insert" ON public.customer_orders;

-- Recreate with security definer function instead of subquery
CREATE POLICY "Validated anonymous order insert"
ON public.customer_orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  public.is_active_store(store_id)
  AND length(order_details) > 0
  AND length(order_details) < 5000
  AND length(order_type) > 0
  AND customer_id IS NOT NULL
);

-- Also fix the same issue on store_customers insert policy
DROP POLICY IF EXISTS "Validated customer insert" ON public.store_customers;

CREATE POLICY "Validated customer insert"
ON public.store_customers
FOR INSERT
TO anon, authenticated
WITH CHECK (
  public.is_active_store(store_id)
  AND length(name) > 0
  AND length(name) < 200
  AND length(email) > 0
  AND length(email) < 300
  AND length(contact_no) > 0
  AND length(contact_no) < 30
);
