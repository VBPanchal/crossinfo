
-- The INSERT policy and feedback fix already applied successfully.
-- Just need to add realtime for store_subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_subscriptions;
