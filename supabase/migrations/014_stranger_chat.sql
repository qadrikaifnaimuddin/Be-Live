-- 014_stranger_chat.sql
-- Matchmaking queue and active session schemas for Stranger Chat (Omegle Clone)

-- 1. Create stranger_queue Table
CREATE TABLE IF NOT EXISTS public.stranger_queue (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    chat_mode TEXT NOT NULL CHECK (chat_mode IN ('text', 'video')),
    interests JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.stranger_queue ENABLE ROW LEVEL SECURITY;

-- Policies for stranger_queue
DROP POLICY IF EXISTS "Allow select stranger_queue" ON public.stranger_queue;
CREATE POLICY "Allow select stranger_queue"
    ON public.stranger_queue FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow insert stranger_queue for self" ON public.stranger_queue;
CREATE POLICY "Allow insert stranger_queue for self"
    ON public.stranger_queue FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow update stranger_queue for self" ON public.stranger_queue;
CREATE POLICY "Allow update stranger_queue for self"
    ON public.stranger_queue FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow delete stranger_queue for self" ON public.stranger_queue;
CREATE POLICY "Allow delete stranger_queue for self"
    ON public.stranger_queue FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);


-- 2. Create stranger_sessions Table
CREATE TABLE IF NOT EXISTS public.stranger_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    chat_mode TEXT NOT NULL CHECK (chat_mode IN ('text', 'video')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT stranger_sessions_users_unique UNIQUE (user_1_id, user_2_id)
);

-- Enable RLS
ALTER TABLE public.stranger_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for stranger_sessions
DROP POLICY IF EXISTS "Allow select stranger_sessions for participants" ON public.stranger_sessions;
CREATE POLICY "Allow select stranger_sessions for participants"
    ON public.stranger_sessions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_1_id OR auth.uid() = user_2_id);

DROP POLICY IF EXISTS "Allow insert stranger_sessions" ON public.stranger_sessions;
CREATE POLICY "Allow insert stranger_sessions"
    ON public.stranger_sessions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_1_id OR auth.uid() = user_2_id);

DROP POLICY IF EXISTS "Allow delete stranger_sessions for participants" ON public.stranger_sessions;
CREATE POLICY "Allow delete stranger_sessions for participants"
    ON public.stranger_sessions FOR DELETE
    TO authenticated
    USING (auth.uid() = user_1_id OR auth.uid() = user_2_id);


-- 3. Atomic Matchmaking Postgres Function
CREATE OR REPLACE FUNCTION public.join_stranger_chat(
    p_user_id UUID,
    p_chat_mode TEXT,
    p_interests JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_opponent_id UUID;
    v_opponent_interests JSONB;
    v_session_id UUID;
    v_shared_interests JSONB;
BEGIN
    -- Remove stale queues for self to avoid duplicates
    DELETE FROM public.stranger_queue WHERE user_id = p_user_id;

    -- Remove any queue records older than 1 minute to keep the queue clean
    DELETE FROM public.stranger_queue WHERE created_at < NOW() - INTERVAL '1 minute';

    -- Try to match with an active user in the queue
    SELECT q.user_id, q.interests INTO v_opponent_id, v_opponent_interests
    FROM public.stranger_queue q
    WHERE q.chat_mode = p_chat_mode AND q.user_id != p_user_id
    ORDER BY q.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_opponent_id IS NOT NULL THEN
        -- Intersect interests before deleting the opponent
        SELECT jsonb_agg(tag) INTO v_shared_interests
        FROM (
            SELECT jsonb_array_elements_text(p_interests) AS tag
            INTERSECT
            SELECT jsonb_array_elements_text(v_opponent_interests) AS tag
        ) t;

        IF v_shared_interests IS NULL THEN
            v_shared_interests := '[]'::jsonb;
        END IF;

        -- Delete opponent from queue
        DELETE FROM public.stranger_queue WHERE user_id = v_opponent_id;

        -- Create session
        INSERT INTO public.stranger_sessions (user_1_id, user_2_id, chat_mode)
        VALUES (v_opponent_id, p_user_id, p_chat_mode)
        ON CONFLICT (user_1_id, user_2_id) DO UPDATE SET chat_mode = EXCLUDED.chat_mode
        RETURNING id INTO v_session_id;

        RETURN jsonb_build_object(
            'session_id', v_session_id,
            'opponent_id', v_opponent_id,
            'shared_interests', v_shared_interests,
            'initiator', true
        );
    ELSE
        -- No opponent found, insert self into queue to wait
        INSERT INTO public.stranger_queue (user_id, chat_mode, interests)
        VALUES (p_user_id, p_chat_mode, p_interests);

        RETURN NULL;
    END IF;
END;
$$;

-- Enable Realtime replication for stranger_sessions and stranger_queue if they are not already members
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
          AND c.relname = 'stranger_sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.stranger_sessions;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_rel pr
        JOIN pg_publication p ON p.oid = pr.prpubid
        JOIN pg_class c ON c.oid = pr.prrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE p.pubname = 'supabase_realtime' 
          AND n.nspname = 'public' 
          AND c.relname = 'stranger_queue'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.stranger_queue;
    END IF;
END $$;
