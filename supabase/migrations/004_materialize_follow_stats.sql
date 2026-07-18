-- ═══════════════════════════════════════════════════════════════
-- Be-Live: Materialize profile_follow_stats view
-- Paste this in Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════
-- A regular VIEW does a full COUNT(*) scan every time it's read.
-- A MATERIALIZED VIEW pre-computes and stores the result.
-- We refresh it automatically via a trigger on relationships.
-- ═══════════════════════════════════════════════════════════════

-- 1. Drop old regular view if it exists
DROP VIEW IF EXISTS public.profile_follow_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.profile_follow_stats CASCADE;

-- 2. Create the materialized view
-- NOTE: relationships table has no status column — every row IS an accepted follow
CREATE MATERIALIZED VIEW public.profile_follow_stats AS
SELECT
  p.id,
  p.username,
  p.name,
  p.avatar,
  p.bio,
  p.is_private,
  COUNT(DISTINCT r_followers.follower_id) AS followers_count,
  COUNT(DISTINCT r_following.target_id)   AS following_count
FROM public.profiles p
LEFT JOIN public.relationships r_followers
  ON r_followers.target_id   = p.id
LEFT JOIN public.relationships r_following
  ON r_following.follower_id = p.id
GROUP BY p.id, p.username, p.name, p.avatar, p.bio, p.is_private;

-- 3. Unique index on id so concurrent refresh works
CREATE UNIQUE INDEX idx_profile_follow_stats_id
  ON public.profile_follow_stats(id);

-- 4. Index on username for search lookups
CREATE INDEX idx_profile_follow_stats_username
  ON public.profile_follow_stats(username);

-- 5. Function to refresh the materialized view
CREATE OR REPLACE FUNCTION public.refresh_follow_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.profile_follow_stats;
  RETURN NULL;
END;
$$;

-- 6. Trigger: refresh after any change to relationships
DROP TRIGGER IF EXISTS trg_refresh_follow_stats ON public.relationships;
CREATE TRIGGER trg_refresh_follow_stats
  AFTER INSERT OR UPDATE OR DELETE
  ON public.relationships
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.refresh_follow_stats();

-- 7. Grant read access
GRANT SELECT ON public.profile_follow_stats TO authenticated;
GRANT SELECT ON public.profile_follow_stats TO anon;

-- 8. Do an initial refresh right now
REFRESH MATERIALIZED VIEW public.profile_follow_stats;

-- 9. Verify results
SELECT id, username, followers_count, following_count
FROM public.profile_follow_stats
LIMIT 10;
