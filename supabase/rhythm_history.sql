-- Rhythm history: a change diary for every rhythm item, and "remove" that
-- hides instead of destroying.
--
-- Why: rhythm_items was the only record of someone's routine, and a removal
-- was a hard DELETE — so reports could never say "changed their morning on
-- 20 Oct", and a misheard voice command could never be undone. Completions
-- were already safe (activity_events copies item_name and has no FK).
--
-- Safe to run more than once. Changes no existing rows. To undo:
--   DROP TRIGGER rhythm_item_change_log ON rhythm_items;
--   DROP FUNCTION log_rhythm_item_change();
--   DROP TABLE rhythm_item_changes;
--   ALTER TABLE rhythm_items DROP COLUMN archived_at, DROP COLUMN changed_via;

-- 1. Removing an item sets archived_at; every screen, reminder and the
--    companion only use rows where it's null. changed_via is set by whoever
--    writes the row ('tap', 'voice', 'carer') so the diary knows the source.
ALTER TABLE rhythm_items ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE rhythm_items ADD COLUMN IF NOT EXISTS changed_via text;

CREATE INDEX IF NOT EXISTS idx_rhythm_items_profile_active
  ON rhythm_items(profile_id) WHERE archived_at IS NULL;

-- 2. The diary — append-only. Written ONLY by the trigger below; users can
--    read their own rows but never edit or delete them.
CREATE TABLE IF NOT EXISTS rhythm_item_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  item_name text,
  change_type text NOT NULL CHECK (change_type IN ('added', 'updated', 'removed', 'restored')),
  changed_fields text[],
  before jsonb,
  after jsonb,
  source text NOT NULL DEFAULT 'tap',
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rhythm_item_changes_profile
  ON rhythm_item_changes(profile_id, occurred_at DESC);

ALTER TABLE rhythm_item_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own rhythm changes" ON rhythm_item_changes;
CREATE POLICY "Users read own rhythm changes" ON rhythm_item_changes
  FOR SELECT USING (auth.uid() = user_id);

-- 3. The trigger: every add / edit / remove / restore, from any path (app,
--    voice, server), lands in the diary. Bookkeeping-only updates (sort
--    order, reminder-sent markers) are not routine changes and are skipped.
--    Hard DELETEs are not logged on purpose: the app no longer hard-deletes,
--    so a DELETE only happens when a profile or account is erased — and then
--    the history should go too.
CREATE OR REPLACE FUNCTION log_rhythm_item_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  watched text[] := ARRAY['name', 'emoji', 'category', 'fixed_time', 'schedule', 'frequency',
                          'note', 'duration_type', 'duration_days', 'start_date',
                          'spacing_minutes', 'is_medicine'];
  o jsonb;
  n jsonb := to_jsonb(NEW);
  changed text[] := '{}';
  f text;
  kind text;
  owner uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    kind := 'added';
  ELSE
    o := to_jsonb(OLD);
    IF OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL THEN
      kind := 'removed';
    ELSIF OLD.archived_at IS NOT NULL AND NEW.archived_at IS NULL THEN
      kind := 'restored';
    ELSE
      FOREACH f IN ARRAY watched LOOP
        IF (o -> f) IS DISTINCT FROM (n -> f) THEN changed := changed || f; END IF;
      END LOOP;
      IF array_length(changed, 1) IS NULL THEN RETURN NEW; END IF;
      kind := 'updated';
    END IF;
  END IF;

  SELECT user_id INTO owner FROM profiles WHERE id = NEW.profile_id;

  INSERT INTO rhythm_item_changes
    (user_id, profile_id, item_id, item_name, change_type, changed_fields, before, after, source)
  VALUES (
    owner, NEW.profile_id, NEW.id::text, NEW.name, kind,
    NULLIF(changed, '{}'),
    CASE WHEN o IS NULL THEN NULL
         ELSE (SELECT jsonb_object_agg(key, value) FROM jsonb_each(o) WHERE key = ANY (watched)) END,
    (SELECT jsonb_object_agg(key, value) FROM jsonb_each(n) WHERE key = ANY (watched)),
    COALESCE(NEW.changed_via, 'tap')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rhythm_item_change_log ON rhythm_items;
CREATE TRIGGER rhythm_item_change_log
  AFTER INSERT OR UPDATE ON rhythm_items
  FOR EACH ROW EXECUTE FUNCTION log_rhythm_item_change();
