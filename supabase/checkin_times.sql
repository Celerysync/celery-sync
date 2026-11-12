-- Check-in moments: allow morning and midday check-ins as well as afternoon
-- and evening. RUN by Alli 2026-11-13 (Success).

--
-- What it does: only widens the list of allowed times on one table
-- (encouragement_messages.time_window). No data is changed or removed.
-- Safe to run more than once.
--
-- To undo (only if no morning/midday rows exist yet):
--   ALTER TABLE encouragement_messages DROP CONSTRAINT IF EXISTS encouragement_messages_time_window_check;
--   ALTER TABLE encouragement_messages ADD CONSTRAINT encouragement_messages_time_window_check
--     CHECK (time_window IN ('afternoon','evening'));

ALTER TABLE encouragement_messages DROP CONSTRAINT IF EXISTS encouragement_messages_time_window_check;
ALTER TABLE encouragement_messages ADD CONSTRAINT encouragement_messages_time_window_check
  CHECK (time_window IN ('morning','midday','afternoon','evening'));
