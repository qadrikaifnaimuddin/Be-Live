-- ═══════════════════════════════════════════════════════════════
-- Be-Live Performance Indexes Migration
-- Supabase SQL Editor → paste this entire block → Run
-- ═══════════════════════════════════════════════════════════════

-- 1. Messages: fast lookups by sender, receiver, room, and time
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id  ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id    ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_room_id      ON public.messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at   ON public.messages(created_at DESC);

-- 2. Relationships: fast follow/following lookups
CREATE INDEX IF NOT EXISTS idx_relationships_target_id   ON public.relationships(target_id);
CREATE INDEX IF NOT EXISTS idx_relationships_follower_id ON public.relationships(follower_id);

-- 3. Notifications: fast unread lookups sorted by time
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id
  ON public.notifications(recipient_id, created_at DESC);

-- 4. Profiles: fast username search
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- ─── Verify all were created ─────────────────────────────────
SELECT indexname, tablename
FROM   pg_indexes
WHERE  schemaname = 'public'
  AND  indexname LIKE 'idx_%'
ORDER  BY tablename, indexname;
