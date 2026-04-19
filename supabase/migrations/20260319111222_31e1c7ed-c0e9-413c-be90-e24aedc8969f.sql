
-- ================================================================
-- CossInfo Database Schema — Full Migration
-- ================================================================

-- 1. Admin role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'store_owner');

-- 2. User roles table (for admin access)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. Stores table
CREATE TABLE public.stores (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  owner_name TEXT NOT NULL DEFAULT '',
  contact_no TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  street_address TEXT DEFAULT '',
  suburb TEXT DEFAULT '',
  city TEXT DEFAULT '',
  pin_code TEXT DEFAULT '',
  address TEXT DEFAULT '',
  ref_code_discount TEXT DEFAULT '',
  webhook_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Store counter for auto-generated IDs
CREATE SEQUENCE public.store_id_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_store_id()
RETURNS TEXT
LANGUAGE sql
AS $$
  SELECT 'STORE-' || LPAD(nextval('public.store_id_seq')::TEXT, 4, '0')
$$;

-- 4. Global Products table
CREATE TABLE public.global_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carton_barcode TEXT DEFAULT '',
  packet_barcode TEXT DEFAULT '',
  brand_name TEXT NOT NULL,
  manufacturer_name TEXT DEFAULT '',
  packets_per_carton INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.global_products ENABLE ROW LEVEL SECURITY;

-- 5. Store Products (per-store product config)
CREATE TABLE public.store_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  barcode TEXT DEFAULT '',
  carton_barcode TEXT DEFAULT '',
  packet_barcode TEXT DEFAULT '',
  brand_name TEXT NOT NULL,
  avg_sales_last_three_weeks NUMERIC NOT NULL DEFAULT 0,
  quantity_of_order NUMERIC NOT NULL DEFAULT 0,
  unit_type TEXT NOT NULL DEFAULT 'carton' CHECK (unit_type IN ('carton', 'packet')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

-- 6. Stock Entries
CREATE TABLE public.stock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.store_products(id) ON DELETE SET NULL,
  barcode TEXT DEFAULT '',
  brand_name TEXT NOT NULL,
  avg_sales_last_three_weeks NUMERIC NOT NULL DEFAULT 0,
  quantity_of_order NUMERIC NOT NULL DEFAULT 0,
  front_stock NUMERIC NOT NULL DEFAULT 0,
  back_stock NUMERIC NOT NULL DEFAULT 0,
  next_week_need NUMERIC NOT NULL DEFAULT 0,
  week_date TEXT NOT NULL,
  employee_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_entries ENABLE ROW LEVEL SECURITY;

-- 7. Orders (confirmed weekly reports)
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  week_date TEXT NOT NULL,
  products JSONB NOT NULL DEFAULT '[]',
  total_items INT NOT NULL DEFAULT 0,
  confirmed_by TEXT DEFAULT '',
  pdf_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 8. Store Portfolios (assigned global products per store)
CREATE TABLE public.store_portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  global_product_id UUID NOT NULL REFERENCES public.global_products(id) ON DELETE CASCADE,
  UNIQUE (store_id, global_product_id)
);
ALTER TABLE public.store_portfolios ENABLE ROW LEVEL SECURITY;

-- 9. Feedback
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- RLS POLICIES
-- ================================================================

-- User Roles: admins can see all, users can see own
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can see own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Stores: owners see own, admins see all
CREATE POLICY "Store owners can view own store" ON public.stores
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Store owners can update own store" ON public.stores
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create stores" ON public.stores
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can delete stores" ON public.stores
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Global Products: all authenticated can read, admins can write
CREATE POLICY "Anyone can read global products" ON public.global_products
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage global products" ON public.global_products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Store Products: store owners see own, admins see all
CREATE POLICY "Store owners can manage own products" ON public.store_products
  FOR ALL TO authenticated
  USING (
    store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Store owners can insert own products" ON public.store_products
  FOR INSERT TO authenticated
  WITH CHECK (
    store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Stock Entries: store owners see own, admins see all
CREATE POLICY "Store owners can manage own stock" ON public.stock_entries
  FOR ALL TO authenticated
  USING (
    store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Store owners can insert own stock" ON public.stock_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Orders: store owners see own, admins see all
CREATE POLICY "Store owners can manage own orders" ON public.orders
  FOR ALL TO authenticated
  USING (
    store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Store owners can insert own orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Store Portfolios: admins manage, store owners read own
CREATE POLICY "Admins can manage portfolios" ON public.store_portfolios
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Store owners can read own portfolio" ON public.store_portfolios
  FOR SELECT TO authenticated
  USING (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()));

-- Feedback: anyone can insert, admins can read/delete
CREATE POLICY "Anyone can submit feedback" ON public.feedback
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage feedback" ON public.feedback
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ================================================================
-- TRIGGERS
-- ================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_global_products_updated_at BEFORE UPDATE ON public.global_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_store_products_updated_at BEFORE UPDATE ON public.store_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
