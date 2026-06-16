-- CelerySync — Book Intelligence Schema
-- Run in Supabase Dashboard → SQL Editor → New Query → Run
-- Safe to re-run

-- ─────────────────────────────────────────────────────────
-- user_books — one row per uploaded book/video/note
-- Shared across all family profiles on the account
-- ─────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────
-- book_chunks — extracted text chunks with full-text search
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS book_chunks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book_id uuid REFERENCES user_books(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  chunk_index int NOT NULL,
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at timestamptz DEFAULT now()
);

-- GIN index for fast full-text search
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
