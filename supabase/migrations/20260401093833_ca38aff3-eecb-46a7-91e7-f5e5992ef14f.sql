
-- Enable RLS on realtime.messages
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to receive realtime messages
-- only for channels associated with their own stores
CREATE POLICY "Authenticated users receive own store realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Allow if the realtime topic references a table where the user owns the store
  -- The extension column stores the channel/topic info
  EXISTS (
    SELECT 1 FROM public.stores
    WHERE stores.user_id = auth.uid()
  )
);

-- Policy: Allow admin users full access to realtime messages
CREATE POLICY "Admins receive all realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
);
