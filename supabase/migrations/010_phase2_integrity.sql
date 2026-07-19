-- ════════════════════════════════════════════════════════════
-- Migration 010: Phase 2 Data Integrity & Mismatch Remediations
-- ════════════════════════════════════════════════════════════

-- 1. Batch 1: Add last_seen column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

-- 2. Batch 3: Sync call_history.status Check Constraint
ALTER TABLE public.call_history DROP CONSTRAINT IF EXISTS call_history_status_check;
ALTER TABLE public.call_history ADD CONSTRAINT call_history_status_check 
  CHECK (status IN ('incoming', 'outgoing', 'completed', 'missed', 'declined', 'failed'));

-- 3. Batch 4: Trigger for profile_follow_stats Materialized View
CREATE OR REPLACE FUNCTION public.refresh_follow_stats_on_profile_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Materialized view concurrent refresh
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.profile_follow_stats;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_follow_stats_on_profile ON public.profiles;
CREATE TRIGGER trg_refresh_follow_stats_on_profile
  AFTER UPDATE OF username, name, avatar, bio, is_private
  ON public.profiles
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.refresh_follow_stats_on_profile_change();

-- 4. Batch 5: Unique Room Constraint on direct rooms (prevent duplicate direct chat rooms)
CREATE OR REPLACE FUNCTION public.check_duplicate_direct_room()
RETURNS TRIGGER AS $$
DECLARE
  existing_room_id UUID;
BEGIN
  IF NEW.type = 'direct' THEN
    -- Check if a room of type 'direct' already contains both members (subset equality check)
    SELECT id INTO existing_room_id
    FROM public.chat_rooms
    WHERE type = 'direct'
      AND members @> NEW.members
      AND NEW.members @> members
      AND id <> NEW.id -- ignore self if updating
    LIMIT 1;

    IF existing_room_id IS NOT NULL THEN
      RAISE EXCEPTION 'A direct chat room already exists between these users (Room ID: %).', existing_room_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_duplicate_direct_room ON public.chat_rooms;
CREATE TRIGGER trg_check_duplicate_direct_room
  BEFORE INSERT OR UPDATE OF members ON public.chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.check_duplicate_direct_room();

-- 5. Batch 6: Drop Obsolete Post and Comments Tables
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
