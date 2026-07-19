-- ════════════════════════════════════════════════════════════
-- Migration 008: Add missing columns and fix constraints
-- ════════════════════════════════════════════════════════════

-- 1. Add deleted_by column to messages table if it does not exist
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_by UUID[] NOT NULL DEFAULT '{}';

-- 2. Add deleted_by column to chat_rooms table if it does not exist
ALTER TABLE public.chat_rooms ADD COLUMN IF NOT EXISTS deleted_by UUID[] NOT NULL DEFAULT '{}';

-- 3. Add is_delivered, delivered_at, read_at columns to messages (referenced by app code)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_delivered BOOLEAN DEFAULT FALSE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- 4. Drop the old media_type CHECK constraint and create an updated one including 'call'
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_media_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_media_type_check CHECK (media_type IN ('image', 'video', 'audio', 'snap', 'poll', 'location', 'call'));
