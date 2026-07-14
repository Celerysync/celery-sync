# CLAUDE.md — CelerySync

Read `docs/CELERYSYNC_COMPANION_SPEC.md` before starting any feature work on the voice companion, Daily Rhythm, or reporting layer. It defines the single-source-of-truth data model everything else in this file assumes.

## What this app is

CelerySync is an independent wellness companion app for people following Medical Medium (Anthony William / "AW") protocols — the engine (reminders, tracking, adherence, voice), not the content. The user supplies their own protocol; the app never stores or serves a reconstructable copy of AW's compilation. See `LEGAL_CONSTRAINTS.md` and `PRODUCT_SPEC.md` for the full reasoning.

## Compliance rails (non-negotiable, every surface)

- **No AW content.** Never reproduce, ingest, cache, or store Anthony William's text — not a passage, not a page. No pre-loaded condition→protocol lookup, no curated recipe compilation. Paraphrase + attribute ("Anthony William associates X with Y") and point to his official books/videos/podcast for specifics. Link only official AW sources, never fan reposts, and never let the LLM generate those URLs itself.
- **User's own notes only.** The AI/companion may reference `protocol_items.user_notes` — the user's own paraphrased entry — and nothing else. The app never ships or serves protocol content of its own.
- **TGA safety (AU wellness-software exclusion, item 14B).** Claims determine regulatory status, not the underlying function. Use "supports / involved in / plays a role in / may help with general wellbeing." Never "heals / cures / treats / prevents / diagnoses," and never tie any claim to a named serious condition. Reports are descriptive-only (show the user's own logged trends; never interpret them medically). Never advise on prescription medications — timing, interactions, whether to take/space/stop — decline gently and redirect to the user's doctor/pharmacist.
- These rails apply to in-app copy, AI system prompts, marketing, and any other user-facing surface alike — the claim is the regulated thing, not the feature.

## The single-source-of-truth rule

Every completion in the app — tap, voice, auto — is written as one row in `activity_events`. Nothing else keeps a private copy of "done/not done." The Daily Rhythm screen, the companion's live awareness, streaks, and every report all read from this same ledger (via `v_daily_status` and friends). Before building anything that tracks state, check whether it should just be another `activity_events` row instead of new bookkeeping. Full schema and rationale: `docs/CELERYSYNC_COMPANION_SPEC.md` §1–2.

## Model strategy: Fable 5 vs Sonnet

- **Fable 5 / Opus-class (strongest available):** architecture-heavy work — spec design, data-model migrations, the voice/companion session shell, anything touching the event ledger or compliance rails. Use for build Phases 0–2 and 4 below.
- **Sonnet:** small fixes, styling, isolated bug fixes, and mechanical refactors once the architecture is settled. Use to save usage on Phases 3 and 5, and on day-to-day maintenance.
- When in doubt about which a task needs: if getting it wrong risks a compliance rail, the data model, or is hard to unwind later, use the stronger model.

## Working rules

- **Always explain root cause before editing.** Diagnose first (reproduce, check logs/network/RLS/state as relevant), explain what's actually broken and why, then fix. Don't patch symptoms.
- **Always show a plan before running any migration.** Any Supabase migration (schema change, data migration, RLS policy) gets a written plan shown to the user first — never run it unannounced.
- **Always read `docs/CELERYSYNC_COMPANION_SPEC.md` before starting feature work** on the companion, Daily Rhythm, or reports — it's the shared contract for how those pieces sync.
- Don't refactor beyond what the task asks for, especially on bug fixes.

## Build phase order (current)

Work through phases in order; don't skip ahead. Full prompts for each are in `docs/CELERYSYNC_COMPANION_SPEC.md` §6.

- **Phase 0 — Checkbox bug fix.** Daily Rhythm tap-to-complete must persist, survive refresh, show a satisfying visual change. Diagnose before editing.
- **Phase 1 — Event ledger migration.** Create `activity_events`, `protocol_items`, `companion_sessions`, `voice_usage_meter`, `user_voice_prefs`, `v_daily_status`, with RLS everywhere. Migrate existing checklist data. Show the migration plan first.
- **Phase 2 — Single companion button + session shell.** One persistent floating companion button across all tabs, replacing per-tab mics. Build against a mocked voice layer first.
- **Phase 3 — Hume EVI integration.** Wire real Hume EVI (Claude as supplemental LLM), per-user `voice_id`, tools (`mark_activity`, `get_today_status`, `save_reflection`) writing to `activity_events`. Compliance rails from spec §3.5 apply exactly.
- **Phase 4 — TTS layer + session shapes.** Octave TTS for greetings/nudges/wrap-ups with caching; morning check-in and evening reflection flows.
- **Phase 5 — Reports.** Adherence, dual streaks, per-item consistency, weekly rollup, Sunday TTS summary — all derived from `activity_events`.

Test checklist before calling any phase done: `docs/CELERYSYNC_COMPANION_SPEC.md` §7.
