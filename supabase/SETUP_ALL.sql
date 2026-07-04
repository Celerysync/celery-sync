-- ═══════════════════════════════════════════════════════════════════
-- CelerySync — Complete Supabase Setup
-- Paste this entire file into: Supabase Dashboard → SQL Editor → Run
-- Safe to re-run — uses IF NOT EXISTS and exception handlers throughout
-- ═══════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────
-- PART 1: Core Schema
-- ───────────────────────────────────────────────────────────────────

-- subscriptions
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
DO $$ BEGIN
  ALTER TABLE subscriptions ADD COLUMN plan text DEFAULT 'healer';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE subscriptions ADD COLUMN cancel_at_period_end boolean DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can view own subscription"
    ON subscriptions FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- profiles (one per family member)
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

-- conversations (AI memory per profile)
CREATE TABLE IF NOT EXISTS conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
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

-- daily_checkins (journal tracker per profile)
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
ALTER TABLE daily_checkins ADD COLUMN IF NOT EXISTS
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE;
DO $$ BEGIN
  ALTER TABLE daily_checkins DROP CONSTRAINT IF EXISTS daily_checkins_user_id_check_date_key;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE daily_checkins ADD CONSTRAINT daily_checkins_profile_date_unique
    UNIQUE (profile_id, check_date);
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN sqlstate '42P07' THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS checkins_profile_date
  ON daily_checkins(profile_id, check_date DESC);
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users own their checkins"
    ON daily_checkins FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- healing_profiles (AI summary per profile)
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
DO $$ BEGIN
  CREATE POLICY "Users own their healing profiles"
    ON healing_profiles FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ───────────────────────────────────────────────────────────────────
-- PART 2: Book Intelligence (PDF / YouTube / Notes)
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_books (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('pdf', 'youtube', 'note')),
  source_url text,
  page_count int DEFAULT 0,
  chunk_count int DEFAULT 0,
  status text DEFAULT 'ready',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_books_user_id ON user_books(user_id);
ALTER TABLE user_books ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users own their books"
    ON user_books FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS book_chunks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book_id uuid REFERENCES user_books(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  chunk_index int NOT NULL,
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS book_chunks_search ON book_chunks USING gin(search_vector);
CREATE INDEX IF NOT EXISTS book_chunks_user_id ON book_chunks(user_id);
CREATE INDEX IF NOT EXISTS book_chunks_book_id ON book_chunks(book_id);
ALTER TABLE book_chunks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users own their chunks"
    ON book_chunks FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ───────────────────────────────────────────────────────────────────
-- PART 3: TTS Audio Cache
-- ───────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tts-audio',
  'tts-audio',
  true,
  5242880,
  ARRAY['audio/mpeg', 'audio/mp3']
)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Public read tts audio"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'tts-audio');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role upload tts audio"
    ON storage.objects FOR INSERT
    TO service_role
    WITH CHECK (bucket_id = 'tts-audio');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role delete tts audio"
    ON storage.objects FOR DELETE
    TO service_role
    USING (bucket_id = 'tts-audio');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS tts_cache (
  hash       text PRIMARY KEY,
  audio_url  text NOT NULL,
  voice_id   text NOT NULL,
  char_count integer,
  hit_count  integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION increment_tts_hit(p_hash text)
RETURNS void LANGUAGE sql AS $$
  UPDATE tts_cache SET hit_count = hit_count + 1 WHERE hash = p_hash;
$$;


-- ───────────────────────────────────────────────────────────────────
-- PART 4: Push Notifications
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  keys jsonb NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  morning_start_hour integer NOT NULL DEFAULT 6,
  encouragement_prefs jsonb DEFAULT '{"afternoon":{"enabled":true,"hour":15},"evening":{"enabled":true,"hour":20}}'::jsonb,
  reminder_prefs jsonb DEFAULT '{"morningProtocol":true,"adrenalSnack":true}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);
-- Migration: add columns if upgrading from older schema
DO $$ BEGIN
  ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS morning_start_hour integer NOT NULL DEFAULT 6;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS encouragement_prefs jsonb DEFAULT '{"afternoon":{"enabled":true,"hour":15},"evening":{"enabled":true,"hour":20}}'::jsonb;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS reminder_prefs jsonb DEFAULT '{"morningProtocol":true,"adrenalSnack":true}'::jsonb;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own push subscriptions"
    ON push_subscriptions FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Service role reads all push subscriptions"
    ON push_subscriptions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS encouragement_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  time_window text NOT NULL CHECK (time_window IN ('afternoon','evening')),
  message text NOT NULL,
  sent boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, date, time_window)
);
CREATE INDEX IF NOT EXISTS idx_encouragement_messages_profile_date
  ON encouragement_messages(profile_id, date);
ALTER TABLE encouragement_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own encouragement messages"
    ON encouragement_messages FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS user_supplements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  dose_label text,
  timing text NOT NULL DEFAULT 'morning_food',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_supplements_profile ON user_supplements(profile_id);
ALTER TABLE user_supplements ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own supplements"
    ON user_supplements FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS supplement_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supplement_name text NOT NULL,
  units_on_hand numeric,
  units_per_dose numeric NOT NULL DEFAULT 1,
  restock_threshold_days int NOT NULL DEFAULT 7,
  low_stock_alerted_on date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, supplement_name)
);
CREATE INDEX IF NOT EXISTS idx_supplement_inventory_profile ON supplement_inventory(profile_id);
ALTER TABLE supplement_inventory ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own supplement inventory"
    ON supplement_inventory FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ───────────────────────────────────────────────────────────────────
-- PART 5: Wearable / Oura Integration
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE daily_checkins
  ADD COLUMN IF NOT EXISTS sleep_hours numeric(4,1),
  ADD COLUMN IF NOT EXISTS sleep_quality integer,
  ADD COLUMN IF NOT EXISTS hrv integer,
  ADD COLUMN IF NOT EXISTS resting_hr integer,
  ADD COLUMN IF NOT EXISTS sleep_score integer,
  ADD COLUMN IF NOT EXISTS wearable_source text,
  ADD COLUMN IF NOT EXISTS steps integer,
  ADD COLUMN IF NOT EXISTS readiness_score integer;

CREATE TABLE IF NOT EXISTS wearable_tokens (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source      text NOT NULL,
  token       text NOT NULL,
  last_sync   timestamptz,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, source)
);
ALTER TABLE wearable_tokens ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own wearable tokens"
    ON wearable_tokens FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ───────────────────────────────────────────────────────────────────
-- PART 6: Community Healing Circles
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS circles (
  id text PRIMARY KEY,
  name text NOT NULL,
  emoji text NOT NULL,
  description text NOT NULL,
  condition_tags text[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS circle_members (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  circle_id text REFERENCES circles(id) ON DELETE CASCADE NOT NULL,
  alias text NOT NULL DEFAULT 'Healer',
  avatar_emoji text NOT NULL DEFAULT '🌿',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, circle_id)
);

CREATE TABLE IF NOT EXISTS circle_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id text REFERENCES circles(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alias text NOT NULL,
  avatar_emoji text NOT NULL DEFAULT '🌿',
  post_type text NOT NULL DEFAULT 'update',
  content text NOT NULL,
  energy_today integer,
  likes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS circle_post_likes (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES circle_posts(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (user_id, post_id)
);

ALTER TABLE circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE circle_post_likes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "Anyone can read circles" ON circles FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Members manage own membership" ON circle_members FOR ALL USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Anyone can read memberships" ON circle_members FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Anyone can read posts" ON circle_posts FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users manage own posts" ON circle_posts FOR ALL USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users manage own likes" ON circle_post_likes FOR ALL USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Anyone can read likes" ON circle_post_likes FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Seed the 10 healing circles
INSERT INTO circles (id, name, emoji, description, condition_tags) VALUES
  ('thyroid',      'Thyroid Healing Circle',         '🦋', 'Supporting each other through Hashimoto''s, hypothyroidism, thyroid nodules and all things thyroid — per Anthony William''s Thyroid Healing.', ARRAY['Hashimoto''s','Hypothyroidism','Thyroid nodules','Hyperthyroidism']),
  ('liver',        'Liver Rescue Circle',            '🍊', 'Liver health, sluggish liver, high enzymes, psoriasis, eczema, mystery symptoms — everything the liver holds.', ARRAY['Liver','Eczema','Psoriasis','High cholesterol']),
  ('brain',        'Brain & Nervous System Circle',  '🧠', 'Brain fog, neuralgia, memory, focus, anxiety, depression — the neurological healing community.', ARRAY['Brain fog','Anxiety','Depression','Neuralgia','MS','Epilepsy']),
  ('fatigue',      'Chronic Fatigue Circle',         '⚡', 'ME/CFS, Epstein-Barr, adrenal fatigue, fibromyalgia — for those who know what it is to be truly exhausted.', ARRAY['Chronic Fatigue','Fibromyalgia','EBV','Adrenal fatigue','ME/CFS']),
  ('autoimmune',   'Autoimmune Healing Circle',      '🛡', 'Lupus, Hashimoto''s, rheumatoid arthritis, Lyme, and all conditions where the immune system needs retraining.', ARRAY['Lupus','Rheumatoid arthritis','Lyme disease','Autoimmune']),
  ('heavymetal',   'Heavy Metal Detox Circle',       '🫐', 'Following the Heavy Metal Detox protocol together — the Big 5, the HMDS, and the healing journey.', ARRAY['Heavy metals','Mercury toxicity','Autism','ADHD','Alzheimer''s']),
  ('mentalhealth', 'Mental Health & Anxiety Circle', '💜', 'Anxiety, depression, OCD, panic, low mood — exploring the viral and toxic roots Anthony William reveals.', ARRAY['Anxiety','Depression','OCD','Panic attacks','PTSD','Bipolar']),
  ('womens',       'Women''s Health Circle',         '🌸', 'PCOS, endometriosis, infertility, perimenopause, hormonal conditions — women healing together.', ARRAY['PCOS','Endometriosis','Infertility','Hormonal imbalance','Menopause']),
  ('digestive',    'Digestive Healing Circle',       '🌿', 'IBS, SIBO, bloating, reflux, Crohn''s, constipation — gut healing in the MM way.', ARRAY['IBS','SIBO','Crohn''s','Bloating','Reflux','Constipation']),
  ('general',      'General Healing Circle',         '🌱', 'For everyone on the Medical Medium path — share wins, questions, protocol tips, and encouragement.', ARRAY[]::text[])
ON CONFLICT (id) DO NOTHING;


-- ───────────────────────────────────────────────────────────────────
-- PART 7: Practitioner Portal
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS practitioner_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  age integer,
  conditions text[] NOT NULL DEFAULT '{}',
  goal text,
  notes text,
  avatar_emoji text NOT NULL DEFAULT '🌿',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE practitioner_clients ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Practitioners manage own clients"
    ON practitioner_clients FOR ALL USING (auth.uid() = practitioner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS practitioner_client_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES practitioner_clients(id) ON DELETE CASCADE NOT NULL,
  session_date date NOT NULL DEFAULT current_date,
  energy integer,
  mood integer,
  symptoms text[] DEFAULT '{}',
  celery_oz integer,
  morning_protocol boolean DEFAULT false,
  client_notes text,
  practitioner_notes text,
  protocol_changes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, session_date)
);
ALTER TABLE practitioner_client_sessions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Practitioners manage own sessions"
    ON practitioner_client_sessions FOR ALL USING (auth.uid() = practitioner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS practitioner_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES practitioner_clients(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);
ALTER TABLE practitioner_protocols ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Practitioners manage own protocols"
    ON practitioner_protocols FOR ALL USING (auth.uid() = practitioner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ───────────────────────────────────────────────────────────────────
-- PART 8: Analytics
-- ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics_events (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type  text NOT NULL,
  properties  jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx ON analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_type_idx ON analytics_events (event_type, created_at DESC);
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can log own events"
    ON analytics_events FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ───────────────────────────────────────────────────────────────────
-- PART 9: Community Replies + reply_count column
-- ───────────────────────────────────────────────────────────────────

-- Add reply_count to circle_posts
DO $$ BEGIN
  ALTER TABLE circle_posts ADD COLUMN reply_count integer DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Replies table
CREATE TABLE IF NOT EXISTS circle_post_replies (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     uuid REFERENCES circle_posts(id) ON DELETE CASCADE NOT NULL,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alias       text NOT NULL DEFAULT 'Healer',
  avatar_emoji text DEFAULT '🌿',
  content     text NOT NULL,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS circle_post_replies_post_idx ON circle_post_replies (post_id, created_at ASC);
ALTER TABLE circle_post_replies ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Members can read replies"
    ON circle_post_replies FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can post replies"
    ON circle_post_replies FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users delete own replies"
    ON circle_post_replies FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════
-- PART 10 — Healing Memory & Weekly Summaries
-- ═══════════════════════════════════════════════════════════════════

-- healing_milestones: individual insights extracted from conversations
-- These NEVER get overwritten — they accumulate forever, building a
-- complete picture of the subscriber's healing journey over years.
CREATE TABLE IF NOT EXISTS healing_milestones (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users NOT NULL,
  profile_id   uuid NOT NULL,
  insight      text NOT NULL,
  category     text DEFAULT 'general', -- supplement | symptom | pattern | emotion | milestone | protocol
  session_date date DEFAULT CURRENT_DATE,
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS healing_milestones_profile_idx
  ON healing_milestones(profile_id, created_at DESC);
ALTER TABLE healing_milestones ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users own their milestones"
    ON healing_milestones FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- weekly_summaries: generated every Sunday for every active subscriber
-- Persisted permanently — forms the long-term healing record.
CREATE TABLE IF NOT EXISTS weekly_summaries (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid REFERENCES auth.users NOT NULL,
  profile_id           uuid NOT NULL,
  week_start           date NOT NULL,
  week_end             date NOT NULL,
  celery_days          integer DEFAULT 0,
  protocol_days        integer DEFAULT 0,
  avg_energy           numeric(3,1),
  avg_mood             numeric(3,1),
  journal_entries      integer DEFAULT 0,
  ai_observations      text,
  milestones_this_week jsonb DEFAULT '[]',
  email_sent           boolean DEFAULT false,
  created_at           timestamptz DEFAULT now(),
  UNIQUE(profile_id, week_start)
);
ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users own their weekly summaries"
    ON weekly_summaries FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- healing_letters: annual letters generated on each subscriber's anniversary
CREATE TABLE IF NOT EXISTS healing_letters (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users NOT NULL,
  profile_id  uuid NOT NULL,
  year_number integer NOT NULL,
  letter_text text NOT NULL,
  email_sent  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(profile_id, year_number)
);
ALTER TABLE healing_letters ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users own their healing letters"
    ON healing_letters FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════
-- profile_carers: carer invite system
-- A subscriber can invite a friend/carer to see their healing progress.
-- The carer gets a read-only view — energy, check-ins, milestones.
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS profile_carers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  owner_id     uuid REFERENCES auth.users NOT NULL,
  carer_email  text NOT NULL,
  carer_id     uuid REFERENCES auth.users,
  token        text UNIQUE DEFAULT encode(gen_random_bytes(20), 'hex'),
  status       text DEFAULT 'pending',  -- pending | active | revoked
  created_at   timestamptz DEFAULT now(),
  accepted_at  timestamptz,
  UNIQUE(profile_id, carer_email)
);
ALTER TABLE profile_carers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Owners manage their carers"
    ON profile_carers FOR ALL USING (auth.uid() = owner_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Carers read their relationships"
    ON profile_carers FOR SELECT USING (auth.uid() = carer_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════
-- system_settings: key-value store for server-side flags
-- Used for things like tracking last SMS alert threshold
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS system_settings (
  key        text PRIMARY KEY,
  value      text,
  updated_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- Done!
-- ═══════════════════════════════════════════════════════════════════
