-- Hume EVI voice overhaul: per-turn logging, app-wide (not just Companion tab)
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS voice_turns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  surface text NOT NULL,               -- 'companion' | 'home' | 'track' | 'supplements' | 'onboarding' | 'global' etc.
  user_transcript text,
  assistant_transcript text,
  latency_ms int,
  -- No emotion column by design (spec §3.5): Hume's prosody data may shape
  -- tone live, in-session, but is never accepted or stored.
  tool_calls jsonb,
  success boolean DEFAULT true,
  error_message text,
  hume_chat_id text,                   -- Hume's own chat/session id, for cross-referencing their dashboard
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_turns_profile_created ON voice_turns(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_turns_surface ON voice_turns(surface, created_at DESC);

ALTER TABLE voice_turns ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users own their voice turns"
    ON voice_turns FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
