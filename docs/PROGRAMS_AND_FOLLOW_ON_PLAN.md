# Programs and follow-on reminders: plan

Status: **waiting for Alli's approval.** Nothing in here has been built or run.
Database change: `supabase/programs_and_follow_on.sql` (additive, safe to re-run, undo included).

Every step, time and supplement here is typed or spoken by the person. The app
supplies no protocol content of its own (CLAUDE.md, LEGAL_CONSTRAINTS.md).

## What people do (from Alli, 2026-11-08)

- **Everyday routine:** a morning sequence (lemon water, celery juice, smoothie with
  supplements taken at the same time), a snack every 1.5 hours, afternoon juice,
  dinner, an evening routine, a supplement before bed.
- **Mono cleanse:** its own steps each day for a set number of days (e.g. 3).
- What carries on during a cleanse is **individual**: most of the basics stay,
  some people drop parts, some add.
- The snack clock starts **when they finish** celery juice, or the smoothie if
  they have one. It's not a fixed time.
- People **often do another round**, not always.

## What changes for the person

1. **"During this program" choice.** Starting a program asks what carries on:
   everything (the default), or untick what to pause. By voice: "start my
   mono cleanse and pause dinner and the snacks". Paused items leave Today and
   stop reminding until the program ends, then come back by themselves.

2. **Program steps get times and reminders**, with the same "When" options as
   everyday items: a time, several times, every N minutes between two times,
   or one of the two below.

3. **Reminders that follow on.** A step can be timed from another step being
   done:
   - "celery juice 30 minutes after lemon water"
   - "a snack every 90 minutes after celery juice, until 6pm"
   The clock starts from the real tick (tap or voice). If the step it follows
   isn't ticked, nothing follows on that day. Today shows the expected time
   ("about 10:40") once the earlier step is done. Existing "after the previous
   step" items get these reminders too.

4. **Supplements "with" a step.** On a supplement: "Take with: smoothie". The
   reminder becomes one note ("Smoothie, with B12 and zinc"), and ticking the
   smoothie offers "Also tick B12 and zinc?" (one tap, never automatic).
   Supplements typed during sign-up go on the supplement list, so they have one
   home. Streaks, the supplement card and reports keep working as now.

5. **The running program lives in the account.** It shows on phone and laptop,
   carers can see it, and reinstalling the app doesn't lose your place. A
   program already running on a phone is copied up the next time it's opened.

6. **Another round.** On a program's last day, and when it ends: "Do another
   round". By voice: "start another round". The new round links to the last
   one, with the same steps and choices.

## How it's built (for later sessions)

- Ledger rule kept: every tick is still one `activity_events` row; nothing new
  stores "done".
- **Server reminders:** a new every-5-minutes job sends follow-on reminders.
  It uses the same `rhythmSchedule.js` code as Today, plus today's real ticks from
  `v_daily_status`, so the screen and the notification always agree. Dedupe uses
  `reminded_on` / `reminded_slots`, as now. The hourly job keeps the fixed times.
- **Program on the server:** `active_protocols.items` and `keep_everyday` are
  written when a program starts (tap or voice). `filterTodaysItems` reads keep
  choices. The phone's copy becomes a cache.
- **Voice tools:** `start_program` gains pause/keep names and "another round";
  `save_program` and `log_rhythm_item` accept the new timing shapes. Fern
  confirms before pausing anything, as with removals.
- **Tests:** each new shape and the pause choice in unit tests; a reminder-job
  test with real-style ticks; then a full walk on the real server with a test
  account, deleted afterwards.

## Order

1. Run the SQL (Alli, after approval).
2. Running program in the account (5): everything else builds on it.
3. Pause choice (1) and another round (6).
4. Times for program steps (2) and follow-on reminders (3).
5. Supplements with a step (4).

Each step goes live separately, after testing, with Alli's OK.

## Not included

- No suggested routines or templates from the app.
- No change to how voice minutes, plans or reports work.
