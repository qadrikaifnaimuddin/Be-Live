-- ════════════════════════════════════════════════════════════
-- Migration 011: Phase 3 Highlights Table & Policies
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.story_highlights (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  cover_url    TEXT DEFAULT '',
  story_ids    UUID[] NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_highlights_user_id ON public.story_highlights(user_id);

ALTER TABLE public.story_highlights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select highlights for everyone" ON public.story_highlights;
CREATE POLICY "Allow select highlights for everyone"
  ON public.story_highlights FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Allow insert/update/delete highlights for owner" ON public.story_highlights;
CREATE POLICY "Allow insert/update/delete highlights for owner"
  ON public.story_highlights FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
