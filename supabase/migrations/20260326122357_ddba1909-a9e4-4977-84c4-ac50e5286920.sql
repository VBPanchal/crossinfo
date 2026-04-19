
-- 1. Fix: stores anon sensitive data exposure
-- Create a security definer function that only returns public-safe columns
CREATE OR REPLACE FUNCTION public.get_public_store_by_slug(_slug text)
RETURNS TABLE(
  id text,
  name text,
  status text,
  show_store_name boolean,
  qr_service_enabled boolean,
  qr_service_expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, status, show_store_name, qr_service_enabled, qr_service_expires_at
  FROM public.stores
  WHERE qr_slug = _slug AND status = 'active'
  LIMIT 1;
$$;

-- Replace overly permissive anon SELECT with restricted one
DROP POLICY IF EXISTS "Anon can read store basics" ON public.stores;

CREATE POLICY "Anon can read store basics limited"
ON public.stores
FOR SELECT
TO anon
USING (false);

-- 2. Fix: store_notifications anon insert spam
-- Create triggers to auto-insert notifications on customer/order creation
CREATE OR REPLACE FUNCTION public.notify_store_new_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.store_notifications (store_id, title, message, type)
  VALUES (NEW.store_id, 'New Customer', NEW.name || ' signed up via QR code', 'customer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_customer
AFTER INSERT ON public.store_customers
FOR EACH ROW EXECUTE FUNCTION public.notify_store_new_customer();

CREATE OR REPLACE FUNCTION public.notify_store_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.store_notifications (store_id, title, message, type, related_order_id)
  VALUES (NEW.store_id, 'New Order', 'New ' || NEW.order_type || ' order received', 'order', NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_order
AFTER INSERT ON public.customer_orders
FOR EACH ROW EXECUTE FUNCTION public.notify_store_new_order();

-- Remove anon INSERT policy on store_notifications
DROP POLICY IF EXISTS "Validated anon notification insert" ON public.store_notifications;

-- 3. Fix: user_roles privilege escalation
-- Add explicit INSERT policy restricting to admins only
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
