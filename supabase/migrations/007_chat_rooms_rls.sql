-- ════════════════════════════════════════════════════════════
-- Migration 007: Fix Chat Rooms RLS Policies
-- ════════════════════════════════════════════════════════════

-- Enable RLS on chat_rooms
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

-- Drop all old policies to prevent duplicates/conflicts
DROP POLICY IF EXISTS "Members can read their rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Admins can update rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Allow select for room members" ON public.chat_rooms;
DROP POLICY IF EXISTS "Allow insert for room creator" ON public.chat_rooms;
DROP POLICY IF EXISTS "Allow update for room members" ON public.chat_rooms;

-- 1. SELECT policy: allow users to see rooms they are members of, or rooms they created
CREATE POLICY "Allow select for room members"
  ON public.chat_rooms FOR SELECT
  TO authenticated
  USING (
    auth.uid() = creator_id 
    OR auth.uid() = ANY(members)
  );

-- 2. INSERT policy: allow authenticated users to create rooms, checking that they are the creator
CREATE POLICY "Allow insert for room creator"
  ON public.chat_rooms FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = creator_id
  );

-- 3. UPDATE policy: allow room creators and members (or admins) to update room metadata
CREATE POLICY "Allow update for room members"
  ON public.chat_rooms FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = creator_id
    OR auth.uid() = ANY(members)
  );
