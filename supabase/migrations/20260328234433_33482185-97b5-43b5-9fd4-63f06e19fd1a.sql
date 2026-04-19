
-- Support tickets table
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL,
  store_name text NOT NULL DEFAULT '',
  store_email text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  subject text NOT NULL DEFAULT 'Support Request',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Support messages table
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type text NOT NULL DEFAULT 'customer',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- RLS for support_tickets
CREATE POLICY "Store owners can view own tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Store owners can create tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));

CREATE POLICY "Store owners and admins can update tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS for support_messages
CREATE POLICY "Users can view messages for their tickets"
  ON public.support_messages FOR SELECT TO authenticated
  USING (ticket_id IN (SELECT id FROM support_tickets WHERE store_id IN (SELECT id FROM stores WHERE user_id = auth.uid())) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Store owners can insert messages"
  ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (ticket_id IN (SELECT id FROM support_tickets WHERE store_id IN (SELECT id FROM stores WHERE user_id = auth.uid())) OR has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for support messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;

-- Trigger to update updated_at on tickets
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
