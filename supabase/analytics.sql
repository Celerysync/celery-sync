-- Priority #8: Usage analytics
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS analytics_events (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type  text NOT NULL,
  properties  jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

-- Index for fast time-range queries
CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_type_idx ON analytics_events (event_type, created_at DESC);

-- RLS: users can insert their own events; only service role reads all
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can log own events"
  ON analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
