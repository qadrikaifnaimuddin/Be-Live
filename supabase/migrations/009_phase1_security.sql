-- ════════════════════════════════════════════════════════════
-- Migration 009: Phase 1 Security & Data Exposure Remediations
-- ════════════════════════════════════════════════════════════

-- 1. Batch 2: Fix handle_new_user() trigger (generate non-null username)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id, 
    NEW.email, 
    'user_' || substr(md5(NEW.id::text || random()::text), 1, 8)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Batch 3: Add profiles DELETE policy for account deletion
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- 3. Batch 4: Secure Notification INSERT Policy
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = actor_id);

-- 4. Batch 5: Add chat_rooms DELETE Policy
DROP POLICY IF EXISTS "Allow delete for room creator" ON public.chat_rooms;
CREATE POLICY "Allow delete for room creator"
  ON public.chat_rooms FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

-- 5. Batch 6: Restrict Room Messages SELECT Policy to Room Members
DROP POLICY IF EXISTS "messages_select_bidirectional" ON public.messages;
CREATE POLICY "messages_select_bidirectional"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    auth.uid() = sender_id
    OR auth.uid() = receiver_id
    OR (room_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chat_rooms r
      WHERE r.id = room_id AND auth.uid() = ANY(r.members)
    ))
  );

-- 6. Batch 7: Add database constraint / trigger on relationships to reject direct follow to private accounts
CREATE OR REPLACE FUNCTION public.check_target_privacy()
RETURNS TRIGGER AS $$
DECLARE
  target_private BOOLEAN;
BEGIN
  -- Select is_private from cached profiles table
  SELECT is_private INTO target_private FROM public.profiles WHERE id = NEW.target_id;
  IF target_private = TRUE THEN
    RAISE EXCEPTION 'Cannot follow private account directly. Please send a follow request instead.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_target_privacy ON public.relationships;
CREATE TRIGGER trg_check_target_privacy
  BEFORE INSERT ON public.relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.check_target_privacy();
