-- ════════════════════════════════════════════════════════════
-- Migration 008: Add deleted_by and update media_type constraint on messages
-- ════════════════════════════════════════════════════════════

-- 1. Add deleted_by column to messages table if it does not exist
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_by UUID[] NOT NULL DEFAULT '{}';

-- 2. Drop the old media_type CHECK constraint and create an updated one including 'call'
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_media_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_media_type_check CHECK (media_type IN ('image', 'video', 'audio', 'snap', 'poll', 'location', 'call'));
