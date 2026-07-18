-- =============================================================================
-- Be-Live — Full Database Migration
-- Run this on a fresh Supabase project to reproduce the entire schema.
-- Execute in the Supabase SQL Editor in order.
-- =============================================================================

-- ─────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for fast username/name search

-- ─────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username       TEXT UNIQUE NOT NULL,
  email          TEXT,
  name           TEXT,
  bio            TEXT,
  avatar         TEXT,
  color          TEXT DEFAULT '#C4B99D',
  is_private     BOOLEAN DEFAULT FALSE,
  is_anonymous_mode BOOLEAN DEFAULT FALSE,
  avatar_config  JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast user search
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON public.profiles USING GIN (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_name_trgm ON public.profiles USING GIN (name gin_trgm_ops);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique ON public.profiles (lower(username));

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────
-- RELATIONSHIPS (follows)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.relationships (
  id          BIGSERIAL PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_relationships_target_id   ON public.relationships(target_id);
CREATE INDEX IF NOT EXISTS idx_relationships_follower_id ON public.relationships(follower_id);

ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read relationships"
  ON public.relationships FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to follow"
  ON public.relationships FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Allow users to unfollow"
  ON public.relationships FOR DELETE USING (auth.uid() = follower_id);

-- ─────────────────────────────────────────────
-- FOLLOW REQUESTS (private accounts)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.follow_requests (
  id           BIGSERIAL PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_follow_requests_target    ON public.follow_requests(target_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_follow_requests_requester ON public.follow_requests(requester_id);

ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own follow requests"
  ON public.follow_requests FOR SELECT
  USING (auth.uid() = target_id OR auth.uid() = requester_id);

CREATE POLICY "Users can send follow requests"
  ON public.follow_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Target can update request status"
  ON public.follow_requests FOR UPDATE
  USING (auth.uid() = target_id);

CREATE POLICY "Users can cancel their own requests"
  ON public.follow_requests FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = target_id);

-- ─────────────────────────────────────────────
-- PROFILE FOLLOW STATS VIEW
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW public.profile_follow_stats AS
SELECT
  p.id,
  p.username,
  COUNT(DISTINCT r_followers.follower_id)::INT AS followers_count,
  COUNT(DISTINCT r_following.target_id)::INT   AS following_count
FROM public.profiles p
LEFT JOIN public.relationships r_followers ON r_followers.target_id   = p.id
LEFT JOIN public.relationships r_following ON r_following.follower_id = p.id
GROUP BY p.id, p.username;

-- ─────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id           BIGSERIAL PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('follow','follow_request','follow_accept','like','comment','mention')),
  entity_id    TEXT,
  is_read      BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON public.notifications(recipient_id, is_read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can mark own notifications read"
  ON public.notifications FOR UPDATE USING (auth.uid() = recipient_id);

-- ─────────────────────────────────────────────
-- POSTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.posts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  caption         TEXT,
  media_url       TEXT,
  media_type      TEXT CHECK (media_type IN ('image','video','text','audio')),
  gradient        TEXT,
  is_private      BOOLEAN DEFAULT FALSE,
  is_archived     BOOLEAN DEFAULT FALSE,
  allowed_users   UUID[] DEFAULT '{}',
  likes           UUID[] DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id    ON public.posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC) WHERE is_archived = FALSE;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Posts: owners see all, others see non-private only
CREATE POLICY "Post owners see all their posts"
  ON public.posts FOR SELECT
  USING (
    auth.uid() = user_id
    OR is_private = FALSE
    OR auth.uid() = ANY(allowed_users)
  );

CREATE POLICY "Users can create their own posts"
  ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
  ON public.posts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
  ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- COMMENTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id    UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id  UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  likes      UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id, created_at);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are publicly viewable"
  ON public.comments FOR SELECT USING (true);

CREATE POLICY "Users can create comments"
  ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- CHAT ROOMS (groups & channels)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  description       TEXT,
  type              TEXT NOT NULL DEFAULT 'group' CHECK (type IN ('group','channel','direct')),
  avatar            TEXT,
  creator_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  members           UUID[] NOT NULL DEFAULT '{}',
  admin_ids         UUID[] NOT NULL DEFAULT '{}',
  allow_anonymous   BOOLEAN DEFAULT FALSE,
  last_message      TEXT,
  last_message_time TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_members ON public.chat_rooms USING GIN (members);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_msg ON public.chat_rooms(last_message_time DESC NULLS LAST);

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read their rooms"
  ON public.chat_rooms FOR SELECT
  USING (auth.uid() = ANY(members) OR auth.uid() = creator_id);

CREATE POLICY "Authenticated users can create rooms"
  ON public.chat_rooms FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Admins can update rooms"
  ON public.chat_rooms FOR UPDATE
  USING (auth.uid() = ANY(admin_ids) OR auth.uid() = creator_id);

-- ─────────────────────────────────────────────
-- MESSAGES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id           UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id               UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  text                  TEXT,
  media_url             TEXT,
  media_type            TEXT CHECK (media_type IN ('image','video','audio','snap','poll','location')),
  is_e2ee               BOOLEAN DEFAULT TRUE,
  snap_viewed           BOOLEAN DEFAULT FALSE,
  is_disappearing       BOOLEAN DEFAULT FALSE,
  disappear_duration    INT,
  disappeared           BOOLEAN DEFAULT FALSE,
  reply_to_id           UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  reply_to_text         TEXT,
  reply_to_sender_name  TEXT,
  reactions             JSONB DEFAULT '{}',
  is_pinned             BOOLEAN DEFAULT FALSE,
  is_forwarded          BOOLEAN DEFAULT FALSE,
  is_read               BOOLEAN DEFAULT FALSE,
  poll_question         TEXT,
  poll_options          TEXT[],
  poll_votes            JSONB DEFAULT '{}',
  is_sticker            BOOLEAN DEFAULT FALSE,
  is_doodle             BOOLEAN DEFAULT FALSE,
  doodle_bg             TEXT,
  live_location_duration INT,
  live_location_status  TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),

  -- At least one of receiver_id or room_id must be set
  CHECK (receiver_id IS NOT NULL OR room_id IS NOT NULL)
);

-- Composite index: DMs between two users
CREATE INDEX IF NOT EXISTS idx_messages_dm
  ON public.messages(sender_id, receiver_id, created_at DESC)
  WHERE receiver_id IS NOT NULL AND disappeared = FALSE;

-- Index for room messages
CREATE INDEX IF NOT EXISTS idx_messages_room
  ON public.messages(room_id, created_at DESC)
  WHERE room_id IS NOT NULL AND disappeared = FALSE;

-- Index for unread messages
CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON public.messages(receiver_id, is_read)
  WHERE is_read = FALSE AND disappeared = FALSE;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read messages they sent or received"
  ON public.messages FOR SELECT
  USING (
    auth.uid() = sender_id
    OR auth.uid() = receiver_id
    OR (room_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chat_rooms r
      WHERE r.id = room_id AND auth.uid() = ANY(r.members)
    ))
  );

CREATE POLICY "Authenticated users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Senders can delete their own messages"
  ON public.messages FOR DELETE USING (auth.uid() = sender_id);

CREATE POLICY "Recipients and senders can update messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- ─────────────────────────────────────────────
-- STREAKS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.streaks (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  count            INT NOT NULL DEFAULT 1,
  last_interaction TIMESTAMPTZ DEFAULT NOW(),
  active           BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, partner_id)
);

CREATE INDEX IF NOT EXISTS idx_streaks_user ON public.streaks(user_id, active);

ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own streaks"
  ON public.streaks FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own streaks"
  ON public.streaks FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- STORIES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_url  TEXT NOT NULL,
  media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image','video')),
  caption    TEXT,
  viewers    UUID[] DEFAULT '{}',
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stories_user_expires
  ON public.stories(user_id, expires_at DESC)
  WHERE expires_at > NOW();

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stories viewable by everyone"
  ON public.stories FOR SELECT USING (expires_at > NOW());

CREATE POLICY "Users can create their own stories"
  ON public.stories FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories"
  ON public.stories FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
  ON public.stories FOR DELETE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- STORAGE BUCKETS
-- ─────────────────────────────────────────────
-- Run after connecting to the storage schema:

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true, 5242880,
  ARRAY['image/jpeg','image/png','image/gif','image/webp']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'posts-media', 'posts-media', true, 52428800,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm']
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'messages-media', 'messages-media', true, 52428800,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','video/mp4','video/webm','audio/webm','audio/mp4','audio/ogg']
) ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────
-- REALTIME PUBLICATIONS
-- (enable in Supabase Dashboard > Database > Replication OR run below)
-- ─────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.follow_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.relationships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
