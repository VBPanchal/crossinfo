
-- Community channels
CREATE TABLE public.community_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.community_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read channels" ON public.community_channels
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage channels" ON public.community_channels
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Seed default channels
INSERT INTO public.community_channels (name, description) VALUES
  ('General', 'General discussion for all stores'),
  ('Announcements', 'Important announcements and updates'),
  ('Help & Support', 'Ask questions and get help from other stores');

-- Community messages (anonymous - no store name exposed)
CREATE TABLE public.community_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.community_channels(id) ON DELETE CASCADE,
  store_id text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read messages" ON public.community_messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Store owners can insert messages" ON public.community_messages
  FOR INSERT TO authenticated
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));

CREATE POLICY "Store owners can delete own messages" ON public.community_messages
  FOR DELETE TO authenticated
  USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;

-- Store profile picture
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS profile_picture_url text DEFAULT '';

-- Storage bucket for store profile pictures
INSERT INTO storage.buckets (id, name, public) VALUES ('store-profiles', 'store-profiles', true);

-- Storage policies
CREATE POLICY "Anyone can view store profiles" ON storage.objects
  FOR SELECT USING (bucket_id = 'store-profiles');

CREATE POLICY "Store owners can upload own profile" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'store-profiles' AND (storage.foldername(name))[1] IN (SELECT id FROM stores WHERE user_id = auth.uid()));

CREATE POLICY "Store owners can update own profile" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'store-profiles' AND (storage.foldername(name))[1] IN (SELECT id FROM stores WHERE user_id = auth.uid()));

CREATE POLICY "Store owners can delete own profile" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'store-profiles' AND (storage.foldername(name))[1] IN (SELECT id FROM stores WHERE user_id = auth.uid()));
