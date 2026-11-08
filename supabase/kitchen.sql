-- Kitchen: each person's own library of juices, smoothies, meals and more.
-- NOT RUN YET. Plan: docs/KITCHEN_PLAN.md. Paste into the Supabase SQL editor
-- only after Alli approves.
--
-- Everything here is what the person types or says. The app ships no recipes,
-- and nothing is shared between people.
--
-- Additive only: new tables, new nullable columns, a private photo bucket.
-- No existing data changes; safe to run more than once.
--
-- To undo:
--   DROP TABLE IF EXISTS shopping_list_items;
--   ALTER TABLE rhythm_items DROP COLUMN IF EXISTS recipe_id;
--   ALTER TABLE activity_events DROP COLUMN IF EXISTS recipe_id, DROP COLUMN IF EXISTS recipe_name;
--   DROP TABLE IF EXISTS kitchen_items;
--   DELETE FROM storage.buckets WHERE id = 'kitchen-photos';  (after emptying it)

-- 1. The library.
CREATE TABLE IF NOT EXISTS kitchen_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'meal'
    CHECK (kind IN ('juice', 'smoothie', 'meal', 'snack', 'drink', 'other')),
  name text NOT NULL,
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{ "text": "2 bananas" }, ...] as they said them
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,        -- ["Blend the bananas and water", ...]
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  favourite boolean NOT NULL DEFAULT false,
  photo_path text,                                 -- their own photo, in the private bucket below
  created_via text NOT NULL DEFAULT 'tap',          -- 'tap' | 'voice' | 'paste'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One name per person, so Fern can always tell recipes apart.
CREATE UNIQUE INDEX IF NOT EXISTS kitchen_items_profile_name
  ON kitchen_items (profile_id, lower(name));
CREATE INDEX IF NOT EXISTS kitchen_items_profile_kind
  ON kitchen_items (profile_id, kind);

ALTER TABLE kitchen_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own kitchen" ON kitchen_items;
CREATE POLICY "Users manage own kitchen" ON kitchen_items
  FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- 2. A rhythm step can open a recipe ("Celery juice" → "My celery juice";
--    tonight's dinner → the meal they chose). Program steps keep their link
--    inside active_protocols.items / saved_rhythms.items, so no change there.
ALTER TABLE rhythm_items ADD COLUMN IF NOT EXISTS recipe_id uuid
  REFERENCES kitchen_items(id) ON DELETE SET NULL;

-- 3. Which recipe a tick was ("dinner: potato bake"), for "what you made"
--    in Progress. The ledger stays append-only: no foreign key, and the name
--    is copied, so history survives if a recipe is later deleted.
ALTER TABLE activity_events ADD COLUMN IF NOT EXISTS recipe_id uuid;
ALTER TABLE activity_events ADD COLUMN IF NOT EXISTS recipe_name text;

-- 4. Shopping list.
CREATE TABLE IF NOT EXISTS shopping_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text text NOT NULL,
  from_recipe_id uuid REFERENCES kitchen_items(id) ON DELETE SET NULL,
  checked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shopping_list_items_profile ON shopping_list_items (profile_id, checked);

ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own shopping list" ON shopping_list_items;
CREATE POLICY "Users manage own shopping list" ON shopping_list_items
  FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- 5. Photos of their own dishes: a PRIVATE bucket. Files live under
--    <user id>/..., and each person can only see and change their own folder.
--    Never public; the app shows them with short-lived signed links.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('kitchen-photos', 'kitchen-photos', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Own kitchen photos: read" ON storage.objects;
CREATE POLICY "Own kitchen photos: read" ON storage.objects FOR SELECT
  USING (bucket_id = 'kitchen-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Own kitchen photos: add" ON storage.objects;
CREATE POLICY "Own kitchen photos: add" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'kitchen-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Own kitchen photos: change" ON storage.objects;
CREATE POLICY "Own kitchen photos: change" ON storage.objects FOR UPDATE
  USING (bucket_id = 'kitchen-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Own kitchen photos: remove" ON storage.objects;
CREATE POLICY "Own kitchen photos: remove" ON storage.objects FOR DELETE
  USING (bucket_id = 'kitchen-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
