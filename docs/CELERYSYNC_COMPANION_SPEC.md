# CelerySync — Companion & Sync Architecture Spec (V1.1 Addendum)

**Purpose:** This document extends V1_BUILD_PLAN.md. It defines how the voice companion, the Daily Rhythm checklist, and the reporting layer all stay in sync through ONE data model, and it contains ready-to-paste Claude Code prompts for each build phase.

**How to use:** Save this file into `~/celerysync/docs/`. Then work through the phases in order, pasting each prompt into Claude Code. Do not skip Phase 0.

---

## 1. The One Rule That Makes Everything Correlate

**Every completion in the app — no matter how it happens — is written as a row in a single `activity_events` table.**

- User taps the lemon water checkbox → one event row
- User tells the voice companion "just finished my celery juice" → one event row
- User un-ticks something → one event row (reversal)

The Daily Rhythm screen, the companion's awareness ("you've done 3 of 5 today"), streaks, and every report all READ from this same ledger. Nothing keeps its own private copy of "done/not done." This is the single-source-of-truth pattern, and it is the answer to "how does everything sync" — there is only one thing to sync.

---

## 2. Data Model (Supabase)

### 2.1 `activity_events` (the ledger — append-only)
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk → auth.users | RLS: user can only read/write own rows |
| protocol_item_id | uuid fk → protocol_items | what was done |
| event_type | text | 'completed', 'uncompleted', 'skipped' |
| source | text | 'tap', 'voice', 'auto' |
| occurred_at | timestamptz | when the user did the thing |
| local_date | date | user's local calendar day (CRITICAL for streaks — compute from user timezone, never from UTC) |
| session_id | uuid nullable | links to companion_sessions if source='voice' |
| created_at | timestamptz default now() | |

Current status of any item today = the most recent event for that item on `local_date`. A Postgres view `v_daily_status` derives this so the UI never computes it client-side.

### 2.2 `protocol_items` (the user's OWN protocol — compliance-critical)
| column | type | notes |
|---|---|---|
| id, user_id | | RLS as above |
| title | text | e.g. "Lemon water" — entered/edited by the user |
| user_notes | text | the user's own paraphrased protocol notes. The AI may reference these back. The app NEVER ships pre-loaded protocol content. |
| schedule | jsonb | time-of-day slot, days of week |
| sort_order, active | | |

### 2.3 `companion_sessions`
| column | type |
|---|---|
| id, user_id | |
| started_at, ended_at | timestamptz |
| evi_chat_id | text (Hume chat id) |
| duration_seconds | int (computed on close) |
| transcript_summary | text (short Claude-written summary, NOT full transcript, for the user's history view) |

### 2.4 `voice_usage_meter`
| column | type | notes |
|---|---|---|
| user_id, period_month | | one row per user per billing month |
| evi_seconds_used | int | incremented on session close AND every 60s heartbeat during a session (so a crash can't lose metering) |
| evi_seconds_included | int | from their plan |
| topup_seconds_remaining | int | from purchased voice packs |

Enforcement: before opening an EVI WebSocket, an edge function checks the meter. At cap → offer top-up, fall back to text chat (text is always available, never metered).

### 2.5 `user_voice_prefs`
`voice_id` (Hume voice), `companion_name` (optional), plus toggles for morning/evening TTS nudges.

---

## 3. Voice Companion Architecture

### 3.1 Two audio layers (cost architecture)
1. **One-way TTS (Hume Octave)** — morning greeting, protocol-time nudges, evening wrap-up, affirmations. Billed in characters, cheap. Pre-generate + cache common lines per voice to make repeats free.
2. **Two-way conversation (Hume EVI)** — only when the user opens a live session. Billed per minute. Claude runs as the supplemental LLM (brain); EVI handles ears, mouth, and emotional prosody.

### 3.2 One companion, everywhere
- ONE floating companion button, persistent across all tabs. Remove all per-tab mics.
- The button carries context: opening it on the Rhythm tab pre-loads today's status; on the journal tab, recent entries.
- Session auto-closes after 30s of silence (warn at 20s with a soft chime); one tap resumes. EVI config timeouts + client-side enforcement.

### 3.3 Voice → checkbox → ledger (tool use)
EVI supports tool/function calling with Claude as the supplemental LLM. Define these tools:

- `mark_activity(protocol_item_id, action)` → inserts an `activity_events` row with `source='voice'`, returns confirmation. Companion says: "Beautiful — celery juice ticked off. That's three of five for today."
- `get_today_status()` → reads `v_daily_status` so the companion always knows the real state.
- `save_reflection(text)` → writes a journal entry from spoken reflection.

Fuzzy matching ("done my juice" → "Celery juice 16oz") happens in the Claude system prompt using the user's own item titles injected as dynamic variables. If ambiguous, the companion asks, never guesses.

The Rhythm screen subscribes to Supabase Realtime on `activity_events` — so when the companion ticks something by voice, the checkbox animates ON SCREEN in real time. This moment is the product. Make it feel like magic.

### 3.4 Per-user voice
Store the user's chosen `voice_id`; pass it as a session-settings override when the EVI WebSocket connects. Offer 4–6 curated CelerySync voices (designed via Octave prompts, e.g. "warm, unhurried, nurturing, lightly Australian") rather than the full Hume library.

### 3.5 Compliance rails (restated — binding on all voice work)
- The companion references ONLY the user's own `protocol_items.user_notes`. It never reproduces Anthony William text, never recommends protocols, dosages, or treatments, never diagnoses.
- System prompt includes hard refusal patterns for medical advice + a gentle redirect to the user's practitioner.
- In-app disclaimer (model on Yuna's): "CelerySync is a wellness companion, not a medical device. It is not intended to diagnose, treat, cure, or prevent any disease or condition." → confirm exact wording with IP/regulatory lawyer (still an open V1 item).
- Emotion/prosody data from Hume is used ONLY to shape the companion's tone in-session. It is not stored, scored, or surfaced ("your anxiety was 62%") — storing emotion analytics would create both a privacy problem and a therapeutic-claims problem.

---

## 4. Session Shapes (patterns adapted from Yuna/Sonia/Headspace)

Give conversations structure — it feels premium AND naturally contains minutes:
- **Morning check-in (2–3 min):** greeting → today's rhythm preview → one intention. Mostly TTS with optional EVI follow-up.
- **Protocol-moment micro-chats (< 1 min):** "Juice done!" → tick → one warm sentence.
- **Evening reflection (3–5 min):** what got done (from ledger), how the body felt, one line saved to journal.
- **Open conversation:** available anytime, gently reminded of remaining minutes at 75% of cap.
- **Weekly insight (TTS + visual report):** Sunday summary voiced over the charts. Costs cents, feels premium.

---

## 5. Reporting Layer

All derived from `activity_events` — zero extra bookkeeping:
- **Adherence:** completions ÷ scheduled items, per day/week/month.
- **Streaks:** consecutive `local_date`s with 100% (and a gentler "showed up" streak for ≥1 completion — kinder for chronically ill users than all-or-nothing).
- **Per-item consistency:** which habits stick, which slip, by time of day.
- **Source split:** tap vs voice (tells YOU whether voice is earning its cost).
- Materialized view or nightly edge function computes weekly rollups into `weekly_insights` for instant loading + the Sunday voice summary.

---

## 6. Build Order + Claude Code Prompts

> Model note: run architecture-heavy phases (0–2, 4) on the strongest model available in Claude Code (`/model`, choose Fable 5 / Opus-class). Small fixes and styling can run on Sonnet to save usage. Work on the restructure branch; commit after every phase.

**Phase 0 — Fix the checkbox bug (do first, alone):**
"On the Daily Rhythm tab, tapping the checkbox on items like lemon water and celery juice doesn't persist as done. Diagnose before editing: does the tap handler fire, does state update optimistically, does the Supabase write succeed — check console/network for swallowed errors and RLS policies on the table. Explain the root cause to me, then fix so a tap toggles done/undone, persists, survives refresh, and shows a satisfying visual change. Do not refactor anything else."

**Phase 1 — Event ledger migration:**
"Read docs/CELERYSYNC_COMPANION_SPEC.md section 2. Create Supabase migrations for activity_events, protocol_items (migrate existing checklist data into it), companion_sessions, voice_usage_meter, user_voice_prefs, and the v_daily_status view, with RLS on every table so users only access their own rows. Refactor the Daily Rhythm screen to write completions as activity_events rows and read status from v_daily_status via Supabase Realtime. Write a data migration for existing users' current data. Show me the migration plan before running anything."

**Phase 2 — Single companion button + session shell:**
"Read spec sections 3.1–3.2 and 4. Remove all per-tab mic buttons. Build one persistent floating companion button across all tabs, opening a session sheet with: tap-to-talk, live transcript, 30s-silence auto-close with 20s warning, session timer, and remaining-minutes display fed from voice_usage_meter. Build the UI against a mocked voice layer first so we can test the shell before wiring Hume."

**Phase 3 — Hume EVI integration:**
"Read spec sections 3.3–3.4. Replace the mocked voice layer with Hume EVI (React SDK): Claude as supplemental LLM, per-user voice_id via session settings, tools mark_activity / get_today_status / save_reflection wired to Supabase edge functions writing to activity_events. Keep the existing swappable-voice-provider interface so ElevenLabs remains a fallback. System prompt must follow spec section 3.5 compliance rails exactly. Meter usage per section 2.4 with 60s heartbeats and a pre-session cap check."

**Phase 4 — TTS layer + session shapes:**
"Read spec sections 3.1 and 4. Implement Octave TTS for morning greeting, protocol-time nudges, and evening wrap-up, with caching of repeated lines per voice, honoring user_voice_prefs toggles. Implement the morning check-in and evening reflection session shapes as guided flows."

**Phase 5 — Reports:**
"Read spec section 5. Build the reports tab from activity_events: adherence, dual streaks, per-item consistency, weekly rollup via nightly edge function into weekly_insights, and the Sunday TTS voice summary."

---

## 7. Test Checklist (before calling any phase done)
- Tap tick → refresh page → still ticked. Un-tick → refresh → still un-ticked.
- Voice "done my juice" → row in activity_events with source='voice' → checkbox animates on screen without refresh → appears in tomorrow's report.
- Two devices logged in as same user → tick on one appears on the other (Realtime).
- Kill the app mid-voice-session → meter still counted the heartbeat minutes.
- At minute cap → session refused gracefully, text chat still works, top-up offered.
- New user with zero protocol items → companion handles it warmly, prompts them to add their own notes (never offers protocol content itself).
- Timezone check: complete an item at 11pm AEST → counts for the correct local day.

---

*Spec v1.1 — drafted July 2026. Amend V1_BUILD_PLAN.md to reference this file; pricing model (one plan ~$20 USD equiv., ~150 EVI min included, $5/100min top-ups) still pending final lock + lawyer review.*
