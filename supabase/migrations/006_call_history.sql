CREATE TABLE IF NOT EXISTS public.call_history (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caller_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  call_type    TEXT NOT NULL CHECK (call_type IN ('audio', 'video')),
  status       TEXT NOT NULL CHECK (status IN ('completed', 'missed', 'declined', 'failed')),
  duration     INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_history_caller_id   ON public.call_history(caller_id,   created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_history_receiver_id ON public.call_history(receiver_id, created_at DESC);

ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own call history"
  ON public.call_history FOR SELECT
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Callers can insert call records"
  ON public.call_history FOR INSERT
  WITH CHECK (auth.uid() = caller_id);

SELECT id, call_type, status, duration FROM public.call_history LIMIT 1;
