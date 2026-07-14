-- ============================================================
-- Phase 1 — activity_events ledger (spec §2, CELERYSYNC_COMPANION_SPEC.md)
-- Run in Supabase SQL Editor BEFORE deploying the matching app code.
-- Safe to re-run (idempotent). Does NOT drop or modify rhythm_completions —
-- that table stays untouched as the rollback net.
--
-- Deviations from the spec's literal schema, both deliberate:
--  * No protocol_items table — the app's existing rhythm_items is richer
--    and live; the ledger references items by item_id instead.
--  * item_id is text, not a uuid FK: program items (3-6-9 cleanse days etc.)
--    are defined in app code, not rhythm_items rows, so a hard FK is
--    impossible. Name/category are denormalized, same as rhythm_completions.
-- ============================================================

-- 1. The ledger (append-only: completions, un-ticks, skips — one row each)
CREATE TABLE IF NOT EXISTS activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  item_name text,
  item_category text,
  event_type text NOT NULL CHECK (event_type IN ('completed', 'uncompleted', 'skipped')),
  source text NOT NULL DEFAULT 'tap' CHECK (source IN ('tap', 'voice', 'auto')),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  local_date date NOT NULL,            -- user's local calendar day, computed client-side (never UTC)
  program_id text,
  program_day int,
  session_id uuid,                     -- links to companion_sessions when source='voice'
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_profile_date
  ON activity_events(profile_id, local_date, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_events_user_date
  ON activity_events(user_id, local_date);

ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own activity events" ON activity_events;
CREATE POLICY "Users manage own activity events" ON activity_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Realtime: the Rhythm screen subscribes to INSERTs so a voice tick (or a
-- tick on another device) animates on screen live.
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE activity_events;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Current status = latest event per item per local day.
-- security_invoker so the querying user's RLS applies (Supabase views are
-- otherwise owner-privileged and would leak across users).
CREATE OR REPLACE VIEW v_daily_status
WITH (security_invoker = true) AS
SELECT DISTINCT ON (profile_id, item_id, local_date)
  profile_id,
  user_id,
  item_id,
  item_name,
  item_category,
  local_date,
  event_type AS status,
  source,
  occurred_at,
  program_id,
  program_day
FROM activity_events
ORDER BY profile_id, item_id, local_date, created_at DESC, id DESC;

-- 3. Backfill: every historical completion becomes a ledger row, so streaks
-- and reports have full history from day one. Idempotent via the marker check.
INSERT INTO activity_events
  (user_id, profile_id, item_id, item_name, item_category,
   event_type, source, occurred_at, local_date, program_id, program_day, created_at)
SELECT
  p.user_id, rc.profile_id, rc.item_id, rc.item_name, rc.item_category,
  'completed', 'tap', rc.completed_at, rc.date, rc.program_id, rc.program_day,
  rc.completed_at
FROM rhythm_completions rc
JOIN profiles p ON p.id = rc.profile_id
WHERE NOT EXISTS (
  SELECT 1 FROM activity_events ae
  WHERE ae.profile_id = rc.profile_id
    AND ae.item_id = rc.item_id
    AND ae.local_date = rc.date
);

-- 4. companion_sessions (spec §2.3) — one row per live voice session
CREATE TABLE IF NOT EXISTS companion_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  evi_chat_id text,
  duration_seconds int,
  transcript_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE companion_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own companion sessions" ON companion_sessions;
CREATE POLICY "Users manage own companion sessions" ON companion_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. voice_usage_meter (spec §2.4) — written by the server (service role,
-- bypasses RLS); clients may only read their own meter.
CREATE TABLE IF NOT EXISTS voice_usage_meter (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_month date NOT NULL,          -- first day of the billing month
  evi_seconds_used int NOT NULL DEFAULT 0,
  evi_seconds_included int NOT NULL DEFAULT 0,
  topup_seconds_remaining int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period_month)
);

ALTER TABLE voice_usage_meter ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own voice meter" ON voice_usage_meter;
CREATE POLICY "Users read own voice meter" ON voice_usage_meter
  FOR SELECT USING (auth.uid() = user_id);

-- 6. user_voice_prefs (spec §2.5)
CREATE TABLE IF NOT EXISTS user_voice_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  voice_id text,
  companion_name text,
  morning_nudge boolean NOT NULL DEFAULT true,
  evening_nudge boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_voice_prefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own voice prefs" ON user_voice_prefs;
CREATE POLICY "Users manage own voice prefs" ON user_voice_prefs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
