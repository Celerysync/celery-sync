# CelerySync — Restructure & Build Specification

**For:** Claude Code (executing on the CelerySync codebase)
**Prepared from:** product + architecture decisions made with the founder
**Read this whole file before changing anything. Implement in the phase order at the end.**

---

## 0. What this app is (and the one rule that governs everything)

CelerySync is an **independent wellness companion app** for people following Medical Medium (Anthony William / "AW") protocols. It helps overwhelmed, often chronically ill users turn scattered protocol information into a clear daily plan they can actually follow, with a conversational AI guide.

**The governing rule, applied everywhere:**
> The app may **know and paraphrase facts** about protocols and **attribute them to Anthony William**. The app may **link and embed his official public content**. The app must **never reproduce his copyrighted text**, never ingest his books, and never make medical/diagnostic claims.

Every feature below is shaped by that rule. When in doubt, paraphrase + attribute + point to the source. Never reproduce, never diagnose.

---

## 1. LEGAL-SAFETY CHANGES (highest priority — do these first)

### 1a. Remove the book-upload feature entirely
The "upload your MM books" capability is the single highest legal risk and must be fully removed — not hidden, removed.

- **Delete** the "My Books" / "My Knowledge Base" upload flow (PDF upload, "Add Book", book ingestion, any storage of uploaded book text).
- **Remove every reference** to uploading books across the app, including but not limited to:
  - Landing/menu copy: "My Books — upload your MM books — I'll reference them in every answer"
  - My Books screen: "Upload your MM books… your AI and the entire app get smarter with every addition"
  - Recipes screen: "Upload your purchased books… to enrich your AI Guide with fuller detail"
  - AI Guide copy claiming it draws on "Anthony William's books with exact supplement dosages"
- **Repurpose the "My Books" tab** (optional) into a **"Resources"** tab that *links out* to official AW books, podcast, and YouTube — a place that points users TO his work, never hosts it. If not repurposing, remove the tab.
- The "Add Video" function may stay **only** as a way to save links to official AW YouTube videos for reference (embed/link, never download/rehost).

### 1b. Remove "Kids Corner" entirely
Delete the Kids tab and all child-directed content (Little Healers 4–7, Healing Kids 8–12, Teen Healers 13–17). Do not soften — remove. No protocol, healing, or AI content is to be directed at or about children in this app.

### 1c. Adults-only profiles
All user/family profiles must be **18+**. Onboarding should state profiles are for adults. Support for a loved one belongs in **Carer mode** (adult managing care, with explicit "work with your/their doctor" framing), never a child-facing experience.

### 1d. Soften therapeutic-claims language throughout
- Replace "heal/cure/treat" verbs with "understand / support / track" where they describe what the app does.
  - e.g. button "Understand & **Heal** This Symptom" → "Understand & **Support** This Symptom" or "Explore This Symptom"
- Remove "exact supplement dosages" phrasing. Use "general supplement guidance as shared by Anthony William" and always point to the book/official source for specifics.
- Keep and make prominent the existing disclaimer: *"Independent app — not affiliated with, endorsed by, or connected to Anthony William or Medical Medium LLC. 'Medical Medium' is a registered trademark of its owner."*
- Add a short, visible "This is not medical advice — consult a licensed practitioner" line in the AI Guide and on any symptom/protocol screen.

---

## 2. FRONT-DOOR RESTRUCTURE (the core UX fix)

**Problem:** the app currently opens tracker-first, assuming users already know their protocol. The real pain is "where do I even start."

**Fix:** make the **condition → start-here plan** flow the front door for new users.

### New-user flow (first session)
1. **Arrive → "Tell me what's going on."** A single, calm question (typed or spoken): what symptoms/conditions are you dealing with? (The existing Symptom Checker with ~100 conditions is this engine — promote it to the entry point.)
2. **Your Plan (start-here).** From their input, assemble a clear, ordered plan:
   - The likely AW angle (paraphrased + attributed, e.g. liver / EBV / heavy metals)
   - Baseline supplements **in the forms AW recommends**, with "see [book] / [official link] for specifics"
   - Foods to bring in / foods to reduce
   - Cleanse steps, sequenced
   - **Lead with "the first 3 things to do this week"** — not the whole library. Overwhelm → clarity.
   - Each item has a "go deeper" → links official AW video/podcast or points to the specific book.
3. Then they land in **Today** (the daily companion) for return visits.

### Returning-user flow
- Opens to **Today**: morning plan, today's supplement checklist + reminders, quick check-in.
- Symptoms/start-here remains accessible anytime to add a new condition.

---

## 3. NAVIGATION / SCOPE

**Keep (core loop — make excellent):**
- **Today** — daily companion, morning plan, supplement checklist, reminders, quick check-in
- **Symptoms** — condition → start-here plan (now also the new-user front door)
- **AI Guide** — conversational voice + text (see §4–5)
- **Journal / Track** — symptom + energy logging, trends over time (the "is it working" faith line)
- **Recipes** — paraphrased, attributed, links to official content
- **Cleanses** — paraphrased + attributed, "buy the book for the complete picture"
- **The Body** — paraphrased organ explanations, attributed
- **Reports** — descriptive progress reports (see §6)
- **Account** — tiers, accessibility settings, carer mode toggle, billing
- **Support AW** — keep (funnels users toward his official work)

**Park for later (build exists — deprioritise, don't lead with):**
- **Circles** (community) — highest moderation burden; not what makes the app work. Keep behind the core; revisit post-launch.
- **Carers** — keep available but secondary; ensure framing is "support an adult, work with their doctor."

**Remove:**
- **Kids** (see §1b)
- **My Books upload** (see §1a)

---

## 4. AI ARCHITECTURE (smart + seamless + survivable on cost)

Goal: feels super-intelligent, responds fast, **does not blow out cost**. The principle: **cheap where it's invisible, premium where it's felt.**

### 4a. Route by difficulty (do NOT use one big model for everything)
- **~90% of requests are simple** (daily plan, "did I take X", "which supplement for fatigue") → route to the **cheapest/fastest model**.
- **~10% are hard** (interpreting weeks of symptom data, multi-condition reasoning, emotional support) → route to the **stronger model**.
- Implement a lightweight router (keyword/intent + message complexity heuristics) that picks the tier per message.

### 4b. Prompt caching
- The paraphrased protocol knowledge base + the AI system instructions are identical on every call. Use **prompt caching** so the large static prefix is paid for once and reused cheaply. This is a major cost lever for this app.

### 4c. Compact per-user memory (this is the "evolving AI", done cheaply)
- Do **not** resend full chat history each call.
- Keep a small per-profile record in Supabase: conditions, current protocol, a rolling natural-language summary of how they've been responding, recent adherence.
- Inject that small record each call. Run a **cheap nightly summarisation** to update it.
- Result: feels personal and continuous; stays tiny and cheap.

### 4d. Retrieval beats model size
- A lot of "intelligence" is pulling the **right** slice of the paraphrased knowledge base into the prompt. Invest in good retrieval over the protocol library; even the cheap model then sounds expert.

### 4e. Output discipline
- Cap output length, especially for voice (short spoken answers save tokens, TTS cost, AND latency at once).

---

## 5. VOICE ARCHITECTURE (the "wow", made affordable)

### 5a. Swappable voice layer — do NOT hardcode a vendor
- Build a thin internal "voice service" interface the app talks to. The actual provider (speech-to-speech model, or STT + TTS combo) sits behind it and is **swappable via config**. This avoids lock-in (ElevenLabs or otherwise) and lets the founder move to a cheaper/better provider as the market shifts.

### 5b. Conversational voice-to-voice (no send button)
- Use **voice activity detection (VAD)**: app listens, detects end-of-speech, sends automatically, AI responds in voice, then resumes listening. Hands-free, conversational — critical accessibility feature for fatigued/foggy users.
- **Recommended starting point:** a native **speech-to-speech / realtime** model (single API doing STT→LLM→TTS) for lowest latency and simplest build. Keep the option to swap to **cheap STT + tiered LLM + premium streaming TTS** once real per-minute costs are observed.
- **Stream** the response (start speaking before full text is generated) for near-instant feel.

### 5c. Fix existing voice bugs
- **Autoplay blocked:** unlock audio with an explicit user tap/gesture at session start.
- **Double-voice / talking over itself:** ensure the mic stops listening while the AI is speaking, and cancel any prior audio stream before starting a new one. Clean listen/speak hand-off.

### 5d. Cost seatbelts (mandatory — voice is the most expensive mode)
- **Graceful session timeout:** after a stretch of silence, politely close the live loop ("I'm here when you need me — tap to chat again") instead of listening forever.
- **Fair-use ceiling even on top tiers:** "unlimited" = generous, never literally infinite. No one can leave the mic running for hours and rack up cost.
- Short spoken answers by default.

---

## 5B. DAILY RHYTHM & REMINDERS ENGINE (core of the Today tab — build from the start)

This is not a side feature. MM protocols are time-and-order based, so the daily companion
is really a **personalised daily rhythm engine**. Build it into Phase 2 alongside the front door.

### 5B-a. Model the day as a SEQUENCE, not a flat list
- Each protocol step has spacing rules relative to the previous step
  (e.g. wake → lemon water → +30 min celery juice → +30 min heavy metal detox smoothie
  → +~90 min adrenal snack → …).
- Reminders fire **relative to when the previous step was actually completed**, not at fixed
  clock times. The chain re-times itself off real behaviour.

### 5B-b. One anchor, not many alarms
- User sets one or two anchors (e.g. "I wake around 6:30"). The app calculates the whole
  cascade from the protocol spacing rules. One decision, not a dozen — essential for
  fatigued/foggy users.

### 5B-c. Self-adjusting timing
- If the user does a step late (or sleeps in), the rest of the day shifts with it. Never
  surface a reminder for something whose window already passed. Respect real life; never shame.

### 5B-d. Rhythm presets + full custom (a ladder, not a choice)
Presets and fully-custom are the same engine at different levels of control. Everyone starts
on a template (no blank page, no overwhelm); every part is editable; advanced users can build
from zero. One build serves the brand-new user AND the experienced practitioner.

- **Level 1 — Templates:** starting rhythms (e.g. Simplified morning, Full 3-6-9 day, Heavy
  Metal Detox day, gentle/low-energy day), each pre-filled with sensible MM-informed default
  timings. User picks one and adjusts.
- **Level 2 — Edit anything:** every item in a template is editable — timing, spacing,
  duration, frequency.
- **Level 3 — Build your own:** an "Advanced / Build Your Own" mode to create a rhythm from
  scratch — add any item, set its own timing/spacing/duration/frequency. For practitioners and
  experienced users.

### 5B-e. Per-item duration & frequency (the engine ages items in/out automatically)
Each supplement/step carries its own schedule rule, e.g.:
- *every day, ongoing* / *daily for X days* / *only during a cleanse* / *N times per week* / *as-needed*

The engine adds and retires items automatically based on these rules. Example: zinc set "for
14 days" drops off after day 14; lemon balm set "ongoing" stays. The user never has to manually
prune their list — the rhythm updates itself.

### 5B-f. Multi-day programs as dated arcs (3-6-9 etc.)
Some protocols are multi-day arcs (e.g. a 9-day cleanse) where items/amounts change by day.
The engine needs a **dated program** concept:
- User starts the program on a chosen date.
- The engine knows "what day am I on" and serves the correct items for that day
  (e.g. days 1–3, 4–6, 7–9, day 9 all-liquids).
- Show clear progress ("Day 4 of 9") — motivating and orienting.
- Programs end automatically and return the user to their baseline daily rhythm.

### 5B-g. MM supplement-timing defaults (paraphrased, attributed, editable)
MM has general timing principles (morning sequence on an empty stomach, spacing items out,
some items with/away from food, etc.). Weave sensible **default timings** into template items
so users aren't guessing. Guardrails:
- **Paraphrase + attribute, point to the book for specifics:** "Anthony William generally
  suggests taking this in the morning on an empty stomach — see [book] for full detail."
  Never reproduce his protocol text; never present the app as the dosing authority.
- **Defaults, not prescriptions:** timing is an editable starting suggestion, never a fixed
  instruction. For supplement **amounts**, lean on "see the book / check with your
  practitioner" rather than stating precise doses as fact.

### 5B-h. Prescriptions & other medicines (SAFETY-CRITICAL — read carefully)
The app should let users hold their WHOLE day in one schedule, including doctor-prescribed
medicines. But there is a hard boundary:

- **DO:** let the user add their own prescribed medications and personal items as reminders,
  with timing THEY enter (as instructed by their own doctor). Mark these clearly as
  user-entered medicines.
- **NEVER:** the app and the AI must never advise on prescription medication — never suggest
  timing relative to medicines, never imply spacing/combining/replacing/adjusting a protocol
  item against a prescription, never hint at stopping or changing a doctor's medicine.
- **When meds and protocol items fall near each other:** the app does NOT opine. Show a gentle
  standing note: *"You have prescribed medicines in your rhythm — please confirm timing and any
  interactions with your doctor or pharmacist."*
- Principle (same as Reports): **hold the data, defer judgement to the professional.**
  Supplement–drug and food–drug interactions can be dangerous and are strictly a
  doctor/pharmacist decision. This boundary is also what keeps the app safe at app-store
  review and legally.

> Add to the AI system instructions (§8): "NEVER advise on prescription medications, their
> timing, interactions, or whether to take/space/stop them. If asked, decline gently and tell
> the user to consult their doctor or pharmacist. You may help schedule reminders the user
> sets themselves, but never recommend medication timing or interactions."

---

## 6. REPORTS (safe, valuable, descriptive-only)

- Generate daily / weekly / monthly reports of the user's **own logged data** (energy, mood, symptoms, adherence, celery juice, supplements), designed to be shareable with a doctor.
- **Descriptive only.** Reports describe trends ("energy averaged 4/10, up from 3/10 last month; sleep logged as disrupted on 12 of 30 days"). They must **NOT** generate medical interpretations or diagnoses ("this means your liver is…"). Show the data; point to the doctor.
- Frame reports as something to **take to a GP/practitioner** — this points users toward real care, which is both responsible and a genuine selling point.

---

## 7. TIERS & PRICING (usage-based, gentle, no feature-crippling)

**Model:** everyone gets the full app **including voice-to-voice**. Tiers differ by **how much usage** is included. (Matches current best practice — e.g. Anthropic's "5x / 20x usage" multiplier tiers.)

### 7a. Tier shape (numbers are placeholders — make them CONFIGURABLE, set after a real cost test)
- **Light** (entry, ~$14ish TBD): voice-to-voice included; monthly allowance sized to comfortably cover "when needed" use (e.g. daily morning check-in + some questions). Most casual users never hit it.
- **Regular** (mid): larger allowance for daily active users.
- **Family** (top): large **shared** allowance across multiple adult profiles; for all-day, whole-household use.
- **Practitioner** ($79, exists): keep as-is, separate.

### 7b. How to meter (critical — must not stress vulnerable users)
- Meter against the real cost-driver (AI usage / response volume), but **display it gently** — a soft "conversations this month" or fuel-gauge, **never a stopwatch counting seconds**.
- **Rolling/frequent resets** rather than one monthly cliff (gentler, fairer — mirrors Anthropic's short-window + weekly approach).
- **Never hard-cut mid-conversation.** If allowance runs out, finish the current conversation, then gently offer top-up or "I'm still here by text."
- **User-capped pay-as-you-go overflow:** when a heavy user exceeds their allowance, let them continue at a metered rate **with a spending cap they set themselves**. This is the elegant fix for heavy family usage — they self-fund, no bill shock, no cutoff. (This is the current Anthropic model.)
- **Soft top-up bundles** instead of surprise overage.
- **Err generous.** A wellness app's trust dies fast if users feel over-charged. Test the meter hard before launch.

### 7c. Make tiers configurable
- Allowance sizes, prices, reset windows, and overflow caps must be config values, not hardcoded — they'll be tuned after observing real provider costs.

---

## 8. AI SYSTEM INSTRUCTIONS (drop-in — these are the safety rails)

Use this as the AI Guide's system prompt (adapt formatting to your stack). These rules are non-negotiable and must hold on every response.

```
You are the CelerySync companion — a warm, calm, encouraging guide for people
following Medical Medium (Anthony William) protocols. Many users are chronically
ill, fatigued, and overwhelmed. Be gentle, concise, and practical. Keep spoken
answers short.

WHAT YOU DO:
- Help users turn scattered protocol information into a clear, ordered starting plan.
- Paraphrase protocol facts in your own words and ATTRIBUTE them to Anthony William
  ("Anthony William associates migraines with the liver and heavy metals…").
- For specifics (exact wording, full protocols, precise dosages), POINT the user to
  the relevant AW book or official source. Do not state yourself as the authority.
- Reference and link Anthony William's OFFICIAL public content (his YouTube, podcast,
  medicalmedium.com) for depth.
- Personalise using the user's own logged data — their conditions, responses, history.

WHAT YOU NEVER DO:
- NEVER reproduce Anthony William's copyrighted text — not a passage, not a page.
  You do not have his books and must never claim to.
- NEVER diagnose, or claim to treat, cure, or heal any condition. Use "understand,
  support, track" framing.
- NEVER give medical interpretations of health data. Describe the user's logged
  trends; do not explain what they "mean" medically.
- NEVER direct protocol or healing content at or about children. Profiles are adults only.
- NEVER advise on prescription medications — their timing, interactions, or whether to
  take, space, combine, replace, or stop them. If asked, decline gently and tell the user
  to consult their doctor or pharmacist. You may help schedule reminders the user sets
  themselves, but never recommend medication timing or interactions.

SAFETY:
- You are not a medical professional and you say so when relevant. Encourage users to
  work with a licensed practitioner, and to take their tracked data to their doctor.
- If a user describes red-flag or worsening symptoms, or anything that could be a
  medical emergency or serious decline, gently and clearly encourage them to seek
  prompt care from a doctor or emergency services. Do not downplay it, and do not
  position the app or any protocol as a substitute for urgent medical care.
- Support emotional wellbeing warmly, but do not reinforce fear or false certainty.

TONE: kind, grounded, unhurried, never alarmist, never over-promising.
```

---

## 9. IMPLEMENTATION ORDER

Do these in order. Don't start later phases until earlier safety phases are done.

1. **Phase 1 — Legal safety (do first):** §1a remove book upload everywhere; §1b remove Kids; §1c adults-only; §1d soften claims language; install §8 system instructions on the AI.
2. **Phase 2 — Front door + daily rhythm:** §2 make condition→start-here the new-user entry; Today as the return screen; **§5B build the daily rhythm & reminders engine** (sequence-based, one-anchor, self-adjusting, presets, and the prescription-safety boundary).
3. **Phase 3 — AI cost architecture:** §4 model routing, prompt caching, compact memory, output caps.
4. **Phase 4 — Voice:** §5 swappable voice layer, voice-to-voice with VAD, fix autoplay + double-voice bugs, session timeout + fair-use ceilings.
5. **Phase 5 — Tiers & metering:** §7 configurable usage tiers, gentle meter, rolling resets, user-capped overflow, family tier.
6. **Phase 6 — Reports:** §6 descriptive-only progress reports.
7. **Phase 7 — Scope cleanup:** park Circles/Carers behind the core; finalise Resources tab (if repurposed from My Books).

**After each phase, summarise what changed in a CHANGELOG so there's a written record — especially the Phase 1 safety removals.**

---

## 10. NOTES / OPEN ITEMS FOR THE FOUNDER

- Pricing numbers, allowance sizes, reset windows, overflow caps: **set after a real per-minute cost test** with the chosen voice provider. Build them as config now; tune later.
- Voice provider choice: start on a native speech-to-speech model for speed of build; re-evaluate against cost once usage is real. The swappable layer means this is a config change, not a rewrite.
- This spec is not legal advice. Before public launch, have an IP/health-claims lawyer review the app, given it's a US-author topic operated from Australia.
```
