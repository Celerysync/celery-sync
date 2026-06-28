-- CelerySync: holistic data model migration
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Safe to run multiple times — all statements use IF NOT EXISTS / IF EXISTS guards

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Expand daily_checkins with richer daily picture
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE daily_checkins
  ADD COLUMN IF NOT EXISTS mental_clarity    int            CHECK (mental_clarity BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS emotional_state   text[]         DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS healing_reaction  boolean        DEFAULT false,
  ADD COLUMN IF NOT EXISTS healing_reaction_notes text,
  ADD COLUMN IF NOT EXISTS water_oz          int,
  ADD COLUMN IF NOT EXISTS bowel_movements   int,
  ADD COLUMN IF NOT EXISTS pain_level        int            CHECK (pain_level BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS win_today         text,
  ADD COLUMN IF NOT EXISTS rhythm_completed  int            DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rhythm_total      int            DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_protocol_id   uuid,
  ADD COLUMN IF NOT EXISTS active_protocol_day  int;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Expand weekly_summaries with richer weekly picture
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE weekly_summaries
  ADD COLUMN IF NOT EXISTS avg_mental_clarity          float,
  ADD COLUMN IF NOT EXISTS healing_reaction_days        int     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_water_oz                float,
  ADD COLUMN IF NOT EXISTS avg_pain_level              float,
  ADD COLUMN IF NOT EXISTS rhythm_completion_pct       float,
  ADD COLUMN IF NOT EXISTS active_protocol_name        text,
  ADD COLUMN IF NOT EXISTS active_protocol_days_completed int,
  ADD COLUMN IF NOT EXISTS wins                        text[]  DEFAULT '{}';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. New table: active_protocols
--    Tracks current and historical protocol programs per subscriber
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS active_protocols (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  program_id       text        NOT NULL,
  program_name     text        NOT NULL,
  start_date       date        NOT NULL,
  end_date         date,
  total_days       int         NOT NULL,
  completed        boolean     DEFAULT false,
  abandoned        boolean     DEFAULT false,
  notes            text,
  chained_from_id  uuid        REFERENCES active_protocols(id),
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_active_protocols_profile
  ON active_protocols(profile_id, completed, abandoned);

ALTER TABLE active_protocols ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own protocols" ON active_protocols;
CREATE POLICY "Users manage own protocols" ON active_protocols
  FOR ALL USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. New table: rhythm_completions
--    Every individual rhythm item tick — permanent record in Supabase
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rhythm_completions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date            date        NOT NULL,
  item_id         text        NOT NULL,
  item_name       text        NOT NULL,
  item_category   text,
  completed_at    timestamptz NOT NULL DEFAULT now(),
  program_id      text,
  program_day     int,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(profile_id, date, item_id)
);

CREATE INDEX IF NOT EXISTS idx_rhythm_completions_profile_date
  ON rhythm_completions(profile_id, date);

ALTER TABLE rhythm_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own rhythm completions" ON rhythm_completions;
CREATE POLICY "Users manage own rhythm completions" ON rhythm_completions
  FOR ALL USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. New table: supplement_logs
--    Daily supplement tracking — currently localStorage only
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplement_logs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date             date        NOT NULL,
  supplement_name  text        NOT NULL,
  timing           text,
  taken            boolean     DEFAULT false,
  taken_at         timestamptz,
  dose_note        text,
  created_at       timestamptz DEFAULT now(),
  UNIQUE(profile_id, date, supplement_name, timing)
);

CREATE INDEX IF NOT EXISTS idx_supplement_logs_profile_date
  ON supplement_logs(profile_id, date);

ALTER TABLE supplement_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own supplement logs" ON supplement_logs;
CREATE POLICY "Users manage own supplement logs" ON supplement_logs
  FOR ALL USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. New table: saved_rhythms
--    Subscriber-created custom rhythm templates
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_rhythms (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  emoji        text        DEFAULT '✨',
  description  text,
  items        jsonb       NOT NULL DEFAULT '[]',
  is_default   boolean     DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE saved_rhythms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own saved rhythms" ON saved_rhythms;
CREATE POLICY "Users manage own saved rhythms" ON saved_rhythms
  FOR ALL USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );
