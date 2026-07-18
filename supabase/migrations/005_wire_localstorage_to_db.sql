-- ═══════════════════════════════════════════════════════════════
-- Be-Live: Wire localStorage features to DB
-- Paste in Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════

-- 1. Username change lock — store timestamp in profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username_last_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS name_last_changed_at     TIMESTAMPTZ;

-- 2. Chat wallpaper preferences — store per-user as JSONB
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS chat_wallpaper_prefs JSONB DEFAULT '{}';

-- 3. Profile share messages — use the existing messages table.
--    Shares are inserted as normal DMs with a special type column.
--    Add a 'share_payload' JSONB column to messages for shared profile data.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS share_payload JSONB;

-- 4. Refresh materialized view so new profile columns are queryable
-- (profile_follow_stats only uses id/username/name/avatar/bio/is_private — no action needed)

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'profiles'
  AND column_name IN ('username_last_changed_at', 'name_last_changed_at', 'chat_wallpaper_prefs')
ORDER BY column_name;
