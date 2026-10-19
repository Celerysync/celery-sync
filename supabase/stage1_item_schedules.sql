-- ============================================================
-- Stage 1 — per-item schedules + per-occurrence completions
-- Run in Supabase SQL Editor BEFORE deploying the matching app code.
-- Safe to re-run (idempotent). Additive only: nothing is dropped, no data
-- is rewritten, and fixed_time stays populated as the rollback path.
--
-- Why: rhythm_items.fixed_time holds a single time, so an item could fire
-- once a day at most. Worse, v_daily_status was DISTINCT ON
-- (profile_id, item_id, local_date) — one completion per item per day — so
-- even with several reminders, ticking one would have marked the whole day
-- done. "Supplements morning and night" and "a snack every 90 minutes"
-- were both unrepresentable in the ledger, not just in the UI.
-- ============================================================

-- 1. The schedule itself. Shapes:
--      {"type":"times","times":["08:00","20:00"]}
--      {"type":"interval","everyMinutes":90,"from":"09:00","to":"17:00"}
--    NULL keeps the legacy behaviour (spacing_minutes cascade, or fixed_time).
ALTER TABLE rhythm_items ADD COLUMN IF NOT EXISTS schedule jsonb;

-- 2. Which occurrence a completion belongs to, e.g. '20:00'.
--    NULL means "the item's single occurrence that day", which is every row
--    written before now — so existing history and existing single-time items
--    keep working untouched. The app only sets a slot when an item genuinely
--    has more than one occurrence that day.
ALTER TABLE activity_events ADD COLUMN IF NOT EXISTS occurrence_slot text;

-- 3. Per-slot reminder dedupe. last_reminded_on alone could only express
--    "reminded today", which would silently swallow the second and later
--    reminders of a multi-time item.
ALTER TABLE rhythm_items ADD COLUMN IF NOT EXISTS reminded_slots jsonb DEFAULT '[]'::jsonb;

-- 4. Express existing timed items in the new shape. fixed_time is left in
--    place deliberately: it is the rollback path, and the app still reads it
--    when schedule is NULL.
UPDATE rhythm_items
   SET schedule = jsonb_build_object('type', 'times',
                                     'times', jsonb_build_array(fixed_time))
 WHERE fixed_time IS NOT NULL
   AND schedule IS NULL;

-- 5. Status is now per occurrence, not per item-day. Adding occurrence_slot
--    to the DISTINCT ON key is what makes "3 of your 5 snacks" representable.
--    Rows with a NULL slot continue to resolve exactly as before.
--
--    occurrence_slot is appended LAST deliberately. CREATE OR REPLACE VIEW
--    may only add columns to the end of the existing list — inserting one in
--    the middle shifts the rest and Postgres rejects it ("cannot change name
--    of view column"). Column order is irrelevant to the app, which selects
--    by name.
CREATE OR REPLACE VIEW v_daily_status
WITH (security_invoker = true) AS
SELECT DISTINCT ON (profile_id, item_id, local_date, occurrence_slot)
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
  program_day,
  occurrence_slot
FROM activity_events
ORDER BY profile_id, item_id, local_date, occurrence_slot, created_at DESC, id DESC;

-- ── Rollback ────────────────────────────────────────────────────────────
-- Restore the previous view and ignore the new columns; fixed_time was never
-- cleared, so timed items keep firing as they did before.
--
--   CREATE OR REPLACE VIEW v_daily_status WITH (security_invoker = true) AS
--   SELECT DISTINCT ON (profile_id, item_id, local_date)
--     profile_id, user_id, item_id, item_name, item_category, local_date,
--     event_type AS status, source, occurred_at, program_id, program_day
--   FROM activity_events
--   ORDER BY profile_id, item_id, local_date, created_at DESC, id DESC;
