
-- Create a security definer function for anonymous order status lookup by order ID
CREATE OR REPLACE FUNCTION public.get_order_status_by_id(
  _order_id uuid
)
RETURNS TABLE(status text, collection_number text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status, collection_number
  FROM public.customer_orders
  WHERE id = _order_id
  LIMIT 1;
$$;
