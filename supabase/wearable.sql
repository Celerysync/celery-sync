-- Priority #7: Wearable integration
-- Run this in the Supabase SQL Editor

-- Add vitals columns to existing daily_checkins table
ALTER TABLE daily_checkins
  ADD COLUMN IF NOT EXISTS sleep_hours numeric(4,1),
  ADD COLUMN IF NOT EXISTS sleep_quality integer,   -- 1-5
  ADD COLUMN IF NOT EXISTS hrv integer,             -- milliseconds
  ADD COLUMN IF NOT EXISTS resting_hr integer,      -- bpm
  ADD COLUMN IF NOT EXISTS sleep_score integer,     -- 0-100 (from wearable)
  ADD COLUMN IF NOT EXISTS wearable_source text;    -- 'oura' | 'manual'

-- Oura / wearable token storage
CREATE TABLE IF NOT EXISTS wearable_tokens (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source      text NOT NULL,     -- 'oura'
  token       text NOT NULL,
  last_sync   timestamptz,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, source)
);

ALTER TABLE wearable_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own wearable tokens"
  ON wearable_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
