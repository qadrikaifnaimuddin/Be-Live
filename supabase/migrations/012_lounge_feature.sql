-- 012_lounge_feature.sql
-- Creates schema tables, triggers, and Row-Level Security (RLS) policies for Be-Live Lounge Room features

-- 1. Lounge Rooms Table
CREATE TABLE IF NOT EXISTS public.lounge_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    privacy TEXT NOT NULL CHECK (privacy IN ('public', 'private')) DEFAULT 'public',
    room_type TEXT NOT NULL CHECK (room_type IN ('audio', 'video', 'both')) DEFAULT 'both',
    location_name TEXT DEFAULT '',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    allow_anonymous BOOLEAN DEFAULT TRUE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on lounge_rooms
ALTER TABLE public.lounge_rooms ENABLE ROW LEVEL SECURITY;

-- Policies for lounge_rooms
DROP POLICY IF EXISTS "Allow select active lounge rooms" ON public.lounge_rooms;
CREATE POLICY "Allow select active lounge rooms"
    ON public.lounge_rooms FOR SELECT
    TO authenticated
    USING (active = true);

DROP POLICY IF EXISTS "Allow insert lounge rooms for self" ON public.lounge_rooms;
CREATE POLICY "Allow insert lounge rooms for self"
    ON public.lounge_rooms FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Allow update lounge rooms for host" ON public.lounge_rooms;
CREATE POLICY "Allow update lounge rooms for host"
    ON public.lounge_rooms FOR UPDATE
    TO authenticated
    USING (auth.uid() = host_id)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete lounge rooms for host" ON public.lounge_rooms;
CREATE POLICY "Allow delete lounge rooms for host"
    ON public.lounge_rooms FOR DELETE
    TO authenticated
    USING (auth.uid() = host_id);


-- 2. Lounge Participants Table
CREATE TABLE IF NOT EXISTS public.lounge_participants (
    room_id UUID NOT NULL REFERENCES public.lounge_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_mic_on BOOLEAN DEFAULT FALSE,
    is_camera_on BOOLEAN DEFAULT FALSE,
    is_muted_by_admin BOOLEAN DEFAULT FALSE,
    is_camera_disabled_by_admin BOOLEAN DEFAULT FALSE,
    is_anonymous BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);

-- Ensure new columns are added if tables already existed from an older version
ALTER TABLE public.lounge_participants ADD COLUMN IF NOT EXISTS is_camera_disabled_by_admin BOOLEAN DEFAULT FALSE;

-- Enable RLS on lounge_participants
ALTER TABLE public.lounge_participants ENABLE ROW LEVEL SECURITY;

-- Policies for lounge_participants
DROP POLICY IF EXISTS "Allow select participants" ON public.lounge_participants;
CREATE POLICY "Allow select participants"
    ON public.lounge_participants FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow insert participant self" ON public.lounge_participants;
CREATE POLICY "Allow insert participant self"
    ON public.lounge_participants FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow update participant self or host" ON public.lounge_participants;
CREATE POLICY "Allow update participant self or host"
    ON public.lounge_participants FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id 
        OR auth.uid() = (SELECT host_id FROM public.lounge_rooms WHERE id = room_id)
    )
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete participant self or host" ON public.lounge_participants;
CREATE POLICY "Allow delete participant self or host"
    ON public.lounge_participants FOR DELETE
    TO authenticated
    USING (
        auth.uid() = user_id 
        OR auth.uid() = (SELECT host_id FROM public.lounge_rooms WHERE id = room_id)
    );


-- 3. Lounge Messages Table
CREATE TABLE IF NOT EXISTS public.lounge_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.lounge_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_ephemeral BOOLEAN DEFAULT FALSE,
    burn_after_seconds INTEGER DEFAULT 0,
    custom_voice_profile TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on lounge_messages
ALTER TABLE public.lounge_messages ENABLE ROW LEVEL SECURITY;

-- Policies for lounge_messages
DROP POLICY IF EXISTS "Allow select room messages" ON public.lounge_messages;
CREATE POLICY "Allow select room messages"
    ON public.lounge_messages FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.lounge_participants 
        WHERE room_id = lounge_messages.room_id AND user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Allow insert room messages" ON public.lounge_messages;
CREATE POLICY "Allow insert room messages"
    ON public.lounge_messages FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = sender_id 
        AND EXISTS (
            SELECT 1 FROM public.lounge_participants 
            WHERE room_id = lounge_messages.room_id AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Allow delete room messages by sender or host" ON public.lounge_messages;
CREATE POLICY "Allow delete room messages by sender or host"
    ON public.lounge_messages FOR DELETE
    TO authenticated
    USING (
        auth.uid() = sender_id 
        OR auth.uid() = (SELECT host_id FROM public.lounge_rooms WHERE id = room_id)
    );


-- 4. Lounge Doodles Table (One canvas per active room)
CREATE TABLE IF NOT EXISTS public.lounge_doodles (
    room_id UUID PRIMARY KEY REFERENCES public.lounge_rooms(id) ON DELETE CASCADE,
    lines JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on lounge_doodles
ALTER TABLE public.lounge_doodles ENABLE ROW LEVEL SECURITY;

-- Policies for lounge_doodles
DROP POLICY IF EXISTS "Allow select room doodles" ON public.lounge_doodles;
CREATE POLICY "Allow select room doodles"
    ON public.lounge_doodles FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow insert/update/upsert room doodles" ON public.lounge_doodles;
CREATE POLICY "Allow insert/update/upsert room doodles"
    ON public.lounge_doodles FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);


-- 5. Lounge Sandbox Table (Draggable decorations/memes per room)
CREATE TABLE IF NOT EXISTS public.lounge_sandbox (
    room_id UUID PRIMARY KEY REFERENCES public.lounge_rooms(id) ON DELETE CASCADE,
    items JSONB DEFAULT '[]'::jsonb,
    theme TEXT DEFAULT 'gradient-sunset',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on lounge_sandbox
ALTER TABLE public.lounge_sandbox ENABLE ROW LEVEL SECURITY;

-- Policies for lounge_sandbox
DROP POLICY IF EXISTS "Allow select room sandbox" ON public.lounge_sandbox;
CREATE POLICY "Allow select room sandbox"
    ON public.lounge_sandbox FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow insert/update/upsert room sandbox" ON public.lounge_sandbox;
CREATE POLICY "Allow insert/update/upsert room sandbox"
    ON public.lounge_sandbox FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);


-- 6. Lounge Snaps Table (Photo Booth snaps)
CREATE TABLE IF NOT EXISTS public.lounge_snaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.lounge_rooms(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    bg_style TEXT DEFAULT 'gradient-sunset',
    caption TEXT DEFAULT '',
    duration INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on lounge_snaps
ALTER TABLE public.lounge_snaps ENABLE ROW LEVEL SECURITY;

-- Policies for lounge_snaps
DROP POLICY IF EXISTS "Allow select room snaps" ON public.lounge_snaps;
CREATE POLICY "Allow select room snaps"
    ON public.lounge_snaps FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.lounge_participants 
        WHERE room_id = lounge_snaps.room_id AND user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Allow insert room snaps" ON public.lounge_snaps;
CREATE POLICY "Allow insert room snaps"
    ON public.lounge_snaps FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Allow delete room snaps by creator or host" ON public.lounge_snaps;
CREATE POLICY "Allow delete room snaps by creator or host"
    ON public.lounge_snaps FOR DELETE
    TO authenticated
    USING (
        auth.uid() = creator_id 
        OR auth.uid() = (SELECT host_id FROM public.lounge_rooms WHERE id = room_id)
    );


-- 7. Lounge Polls Table (One active poll per room)
CREATE TABLE IF NOT EXISTS public.lounge_polls (
    room_id UUID PRIMARY KEY REFERENCES public.lounge_rooms(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    voted_users JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_quiz BOOLEAN DEFAULT FALSE,
    correct_index INTEGER,
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on lounge_polls
ALTER TABLE public.lounge_polls ENABLE ROW LEVEL SECURITY;

-- Policies for lounge_polls
DROP POLICY IF EXISTS "Allow select room polls" ON public.lounge_polls;
CREATE POLICY "Allow select room polls"
    ON public.lounge_polls FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Allow insert/update/upsert room polls" ON public.lounge_polls;
CREATE POLICY "Allow insert/update/upsert room polls"
    ON public.lounge_polls FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
