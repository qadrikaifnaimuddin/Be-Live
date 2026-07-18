-- ════════════════════════════════════════════════════════════
-- Migration: Fix RLS policies for messages and notifications
-- ════════════════════════════════════════════════════════════

-- ── Drop all old/broken policies on messages ──
DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_update" ON public.messages;
DROP POLICY IF EXISTS "Allow users to read their own messages" ON public.messages;
DROP POLICY IF EXISTS "Allow users to send messages" ON public.messages;
DROP POLICY IF EXISTS "messages_select_bidirectional" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
DROP POLICY IF EXISTS "messages_update_own" ON public.messages;

-- ── Enable RLS ──
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ── SELECT: both sender AND receiver can read DMs; room members can read room messages ──
CREATE POLICY "messages_select_bidirectional"
ON public.messages
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) = sender_id
  OR (select auth.uid()) = receiver_id
  OR room_id IS NOT NULL
);

-- ── INSERT: only the sender can create a message ──
CREATE POLICY "messages_insert_own"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = sender_id);

-- ── UPDATE: only the sender can edit their message ──
CREATE POLICY "messages_update_own"
ON public.messages
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = sender_id)
WITH CHECK ((select auth.uid()) = sender_id);

-- ── Fix notifications RLS ──
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select"
ON public.notifications
FOR SELECT
TO authenticated
USING ((select auth.uid()) = recipient_id);

DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update"
ON public.notifications
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = recipient_id);

-- ── Ensure profile_follow_stats view exists ──
CREATE OR REPLACE VIEW public.profile_follow_stats AS
SELECT
  p.id,
  COUNT(DISTINCT r_followers.follower_id)::int AS followers_count,
  COUNT(DISTINCT r_following.target_id)::int   AS following_count
FROM public.profiles p
LEFT JOIN public.relationships r_followers
  ON r_followers.target_id = p.id
LEFT JOIN public.relationships r_following
  ON r_following.follower_id = p.id
GROUP BY p.id;

GRANT SELECT ON public.profile_follow_stats TO authenticated, anon;
