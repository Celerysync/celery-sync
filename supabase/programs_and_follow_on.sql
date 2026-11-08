-- Programs that follow you, and reminders that follow on.
-- NOT RUN YET. Plan: docs/PROGRAMS_AND_FOLLOW_ON_PLAN.md. Paste into the
-- Supabase SQL editor only after Alli approves.
--
-- Additive only: new columns, no data changed, safe to run more than once.
-- Existing screens keep working before and after (they ignore new columns).
--
-- To undo:
--   ALTER TABLE active_protocols DROP COLUMN IF EXISTS items,
--     DROP COLUMN IF EXISTS keep_everyday, DROP COLUMN IF EXISTS saved_rhythm_id,
--     DROP COLUMN IF EXISTS reminded_on, DROP COLUMN IF EXISTS reminded_slots;
--   ALTER TABLE user_supplements DROP COLUMN IF EXISTS with_item_id;

-- 1. A running program lives in the account, not only on one phone.
--    items          the program's own steps as they were when it started
--                   (their names, days, and now times), so every device,
--                   carer and the reminder job sees the same thing.
--    keep_everyday  which everyday rhythm items carry on during it.
--                   NULL = keep them all (the default). Very individual.
--    saved_rhythm_id  the saved program it came from, for "another round".
--                   chained_from_id already exists for linking rounds.
--    reminded_on / reminded_slots  the same once-a-day reminder bookkeeping
--                   rhythm_items already uses.
ALTER TABLE active_protocols ADD COLUMN IF NOT EXISTS items jsonb;
ALTER TABLE active_protocols ADD COLUMN IF NOT EXISTS keep_everyday text[];
ALTER TABLE active_protocols ADD COLUMN IF NOT EXISTS saved_rhythm_id uuid REFERENCES saved_rhythms(id) ON DELETE SET NULL;
ALTER TABLE active_protocols ADD COLUMN IF NOT EXISTS reminded_on date;
ALTER TABLE active_protocols ADD COLUMN IF NOT EXISTS reminded_slots jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. A supplement can be taken "with" a step ("B12 and zinc with my smoothie").
--    Text, like activity_events.item_id, because program steps aren't rows.
ALTER TABLE user_supplements ADD COLUMN IF NOT EXISTS with_item_id text;

-- 3. No change needed for follow-on timing: rhythm_items.schedule (jsonb)
--    already exists and simply gains two shapes, written by the app:
--      {"type":"after","after":"<item id>","minutes":30}
--      {"type":"every_after","after":"<item id>","everyMinutes":90,"until":"18:00"}
--    Program steps use the same shapes inside active_protocols.items.

-- Row-level security is unchanged: both tables already allow each person to
-- manage only rows for their own profiles. The reminder job uses the service
-- role, as it does today.
