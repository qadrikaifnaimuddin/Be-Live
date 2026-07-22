-- =========================================================
-- 015_live_streaming.sql
-- Live Streaming System Table, Security Policies & Realtime
-- =========================================================

-- 1. Create live_streams Table
CREATE TABLE IF NOT EXISTS public.live_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'My Live Stream 🌟',
    stream_type TEXT NOT NULL DEFAULT 'video' CHECK (stream_type IN ('video', 'audio')),
    status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'ended')),
    viewer_count INT NOT NULL DEFAULT 0,
    peak_viewers INT NOT NULL DEFAULT 0,
    total_hearts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- Indexing for fast active stream queries
CREATE INDEX IF NOT EXISTS idx_live_streams_status ON public.live_streams(status);
CREATE INDEX IF NOT EXISTS idx_live_streams_host_id ON public.live_streams(host_id);

-- Enable Row Level Security
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow read access to live_streams" ON public.live_streams;
CREATE POLICY "Allow read access to live_streams"
    ON public.live_streams FOR SELECT
    TO authenticated, anon
    USING (true);

DROP POLICY IF EXISTS "Allow host to create live_stream" ON public.live_streams;
CREATE POLICY "Allow host to create live_stream"
    ON public.live_streams FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Allow host or viewers to update live_stream" ON public.live_streams;
CREATE POLICY "Allow host or viewers to update live_stream"
    ON public.live_streams FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow host to delete live_stream" ON public.live_streams;
CREATE POLICY "Allow host to delete live_stream"
    ON public.live_streams FOR DELETE
    TO authenticated
    USING (auth.uid() = host_id);

-- Enable Realtime Replication safely via PL/pgSQL block
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_rel pr
        JOIN pg_publication p ON p.oid = pr.prpubid
        JOIN pg_class c ON c.oid = pr.prrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE p.pubname = 'supabase_realtime' 
          AND n.nspname = 'public' 
          AND c.relname = 'live_streams'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;
    END IF;
END $$;
