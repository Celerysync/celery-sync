-- TTS Audio Cache
-- Run this in the Supabase SQL Editor

-- 1. Create the tts-audio storage bucket (public — audio files are non-sensitive)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tts-audio',
  'tts-audio',
  true,
  5242880,          -- 5MB max per file (audio/mpeg files are 50–500KB typically)
  ARRAY['audio/mpeg', 'audio/mp3']
)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read (audio is non-sensitive, served from CDN)
CREATE POLICY "Public read tts audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tts-audio');

-- Only service role can insert/delete (backend only)
CREATE POLICY "Service role upload tts audio"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'tts-audio');

CREATE POLICY "Service role delete tts audio"
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'tts-audio');

-- 2. Create tts_cache lookup table
CREATE TABLE IF NOT EXISTS tts_cache (
  hash       TEXT PRIMARY KEY,       -- sha256(voiceId + ":" + cleanText)
  audio_url  TEXT NOT NULL,          -- Supabase Storage public URL
  voice_id   TEXT NOT NULL,
  char_count INTEGER,                -- original character count (for analytics)
  hit_count  INTEGER DEFAULT 0,      -- how many times this entry has been served
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups (PRIMARY KEY already creates this, but explicit for clarity)
-- No RLS — this table is only accessed by the service role on the backend

-- Optional: function to increment hit_count atomically
CREATE OR REPLACE FUNCTION increment_tts_hit(p_hash TEXT)
RETURNS void LANGUAGE sql AS $$
  UPDATE tts_cache SET hit_count = hit_count + 1 WHERE hash = p_hash;
$$;

-- View to see which content is most cached (run in SQL editor to analyse)
-- SELECT voice_id, char_count, hit_count, LEFT(audio_url, 60) FROM tts_cache ORDER BY hit_count DESC LIMIT 20;
