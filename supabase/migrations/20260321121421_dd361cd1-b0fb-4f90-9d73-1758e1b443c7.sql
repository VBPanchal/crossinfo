
-- Time slots per store
CREATE TABLE public.store_time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  slot_label text NOT NULL,
  slot_type text NOT NULL DEFAULT 'both',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_time_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active time slots" ON public.store_time_slots
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "Store owners can manage own time slots" ON public.store_time_slots
  FOR ALL TO authenticated
  USING (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Customers per store
CREATE TABLE public.store_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  contact_no text NOT NULL,
  address text DEFAULT '',
  referral_code text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create customers" ON public.store_customers
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Store owners can view own customers" ON public.store_customers
  FOR SELECT TO authenticated
  USING (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Store owners can manage own customers" ON public.store_customers
  FOR ALL TO authenticated
  USING (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Customer orders
CREATE TABLE public.customer_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.store_customers(id) ON DELETE CASCADE,
  order_type text NOT NULL DEFAULT 'pickup',
  time_slot_id uuid REFERENCES public.store_time_slots(id),
  preferred_time text NOT NULL DEFAULT '',
  order_details text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create orders" ON public.customer_orders
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Customers can view own orders by id" ON public.customer_orders
  FOR SELECT TO anon USING (true);

CREATE POLICY "Store owners can manage own orders" ON public.customer_orders
  FOR ALL TO authenticated
  USING (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Store notifications
CREATE TABLE public.store_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  related_order_id uuid REFERENCES public.customer_orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.store_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create notifications" ON public.store_notifications
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Store owners can manage own notifications" ON public.store_notifications
  FOR ALL TO authenticated
  USING (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Enable realtime for orders and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_notifications;
