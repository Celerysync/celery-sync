-- CelerySync Supabase Schema (v2 — multi-profile)
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query → Run
-- Safe to re-run — uses IF NOT EXISTS and IF EXISTS throughout

-- ─────────────────────────────────────────────────────────
-- subscriptions (may already exist)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  plan text DEFAULT 'healer', -- healer | practitioner
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- Add plan column if upgrading from v1 (safe no-op if column already exists)
DO $$ BEGIN
  ALTER TABLE subscriptions ADD COLUMN plan text DEFAULT 'healer';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can view own subscription"
    ON subscriptions FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────
-- profiles — one per family member (NEW)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT 'Me',
  avatar_emoji text DEFAULT '🌿',
  symptoms text[] DEFAULT '{}',
  goal text DEFAULT '',
  gender text,
  age_band text,
  cycle_tracking_enabled boolean NOT NULL DEFAULT false,
  rhythm_anchor_time text,
  onboarding_completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_user_id ON profiles(user_id);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users own their profiles"
    ON profiles FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS rhythm_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  emoji text DEFAULT '🌿',
  category text DEFAULT 'other',
  spacing_minutes int DEFAULT 0,
  fixed_time text,
  frequency text DEFAULT 'daily',
  duration_type text DEFAULT 'ongoing',
  duration_days int,
  start_date date,
  is_medicine boolean DEFAULT false,
  note text DEFAULT '',
  sort_order int DEFAULT 0,
  last_reminded_on date,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rhythm_items_profile ON rhythm_items(profile_id);
ALTER TABLE rhythm_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own rhythm items"
    ON rhythm_items FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS cycle_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, period_start_date)
);
CREATE INDEX IF NOT EXISTS idx_cycle_logs_profile ON cycle_logs(profile_id);
ALTER TABLE cycle_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own cycle logs"
    ON cycle_logs FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────
-- conversations — AI memory per profile
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add profile_id if upgrading from v1 (safe no-op if column already exists)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS conversations_profile_created
  ON conversations(profile_id, created_at DESC);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users own their conversations"
    ON conversations FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────
-- daily_checkins — journal tracker per profile
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_checkins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  check_date date NOT NULL,
  energy int CHECK (energy BETWEEN 1 AND 10),
  mood int CHECK (mood BETWEEN 1 AND 5),
  symptoms text[] DEFAULT '{}',
  celery_oz int DEFAULT 0,
  morning_protocol bool DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, check_date)
);

-- Add profile_id if upgrading from v1
ALTER TABLE daily_checkins ADD COLUMN IF NOT EXISTS
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

-- Drop old unique constraint and recreate per-profile
DO $$ BEGIN
  ALTER TABLE daily_checkins DROP CONSTRAINT IF EXISTS daily_checkins_user_id_check_date_key;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Per-profile uniqueness: one check-in per profile per day
DO $$ BEGIN
  ALTER TABLE daily_checkins ADD CONSTRAINT daily_checkins_profile_date_unique
    UNIQUE (profile_id, check_date);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS checkins_profile_date
  ON daily_checkins(profile_id, check_date DESC);

ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users own their checkins"
    ON daily_checkins FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────
-- healing_profiles — AI summary per profile
-- Drop and recreate with profile_id as PK (replaces user_id PK)
-- ─────────────────────────────────────────────────────────
DROP TABLE IF EXISTS healing_profiles CASCADE;

CREATE TABLE healing_profiles (
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  healing_summary text DEFAULT '',
  hard_times text,
  current_focus text,
  wins text,
  preferences jsonb DEFAULT '{"prefers":[],"avoids":[]}'::jsonb,
  memory_updated_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE healing_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their healing profiles"
  ON healing_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
