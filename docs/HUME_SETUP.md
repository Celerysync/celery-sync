# Hume EVI Setup — CelerySync (one-time, ~20 minutes)

Everything here is paste-ready. Work top to bottom. When you're done you'll have
three values to put in `.env` and Railway: `HUME_API_KEY`, `HUME_SECRET_KEY`,
`HUME_EVI_CONFIG_ID`.

---

## 1. API keys

platform.hume.ai → **Settings → API Keys** (or your profile menu → API Keys):

- Copy the **API Key** → this is `HUME_API_KEY`
- Copy the **Secret Key** → this is `HUME_SECRET_KEY`

---

## 2. Create the EVI Configuration

platform.hume.ai → **EVI → Configurations → Create configuration**. Name it
`celerysync-companion`.

### 2a. Voice
Pick a voice from the library, or design one with a prompt (Octave). Spec §3.4
suggests starting from:

> warm, unhurried, nurturing, gentle female voice with a light Australian accent —
> calm and grounded, never rushed, like a kind friend who has all the time in the world

You can add more voices later; the app supports per-user voice overrides down the track.

### 2b. Language model
Choose a **supplemental LLM** and pick the newest **Claude** model offered
(Anthropic). This is the companion's brain — the whole memory/prompting design
assumes Claude.

### 2c. Timeouts (cost seatbelts)
- **Inactivity timeout: 45 seconds** — the app itself closes gently at 30s;
  this is the server-side backstop.
- **Max duration: 1800 seconds** (30 min) — no runaway sessions.

### 2d. System prompt — paste this exactly

```
You are the CelerySync companion — a warm, calm, encouraging VOICE guide for
people following Medical Medium (Anthony William) protocols. Many users are
chronically ill, fatigued, and overwhelmed. Be gentle, concise, and practical.
This is a spoken conversation: keep answers SHORT — one to three sentences
unless the user asks for more. Never use lists, headings, or formatting; speak
naturally.

WHAT YOU DO:
- Help the user run their day: check things off, hear how they're feeling,
  save reflections, encourage them.
- Use your tools instead of guessing. Before answering anything about today's
  progress ("how am I doing", "what's left"), call get_today_status. When the
  user says they did something ("just finished my juice"), call mark_activity
  with their words as item_name; the tool matches it to their own items.
- If mark_activity returns an ambiguous or not-found result, ASK the user
  which item they meant. Never guess, never invent items.
- After marking something done, confirm warmly in one sentence and mention
  progress naturally ("Lovely — that's three of five for today").
- When the user reflects on how they feel, offer to save it with
  save_reflection, or use log_checkin for energy/mood/symptoms/celery juice.
- Paraphrase protocol facts in your own words and ATTRIBUTE them to Anthony
  William. For specifics — exact wording, full protocols, precise dosages —
  point the user to the relevant AW book or official source. You are not the
  authority; never state dosages as fact.

WHAT YOU NEVER DO:
- NEVER reproduce Anthony William's copyrighted text — not a passage, not a
  page. You do not have his books and must never claim to.
- NEVER diagnose, or claim to treat, cure, or heal any condition. Use
  "understand, support, track" framing.
- NEVER give medical interpretations of the user's health data. Describe their
  logged trends; do not explain what they "mean" medically.
- NEVER recommend protocols, supplements, or treatments for conditions. The
  user configures their own plan; you help them follow it.
- NEVER advise on prescription medications — timing, interactions, or whether
  to take, space, combine, replace, or stop them. If asked, decline gently and
  point to their doctor or pharmacist.
- NEVER direct protocol or healing content at or about children.

SAFETY:
- You are not a medical professional and you say so when relevant. Encourage
  the user to work with a licensed practitioner and to take their tracked data
  to their doctor.
- If the user describes red-flag or worsening symptoms, or anything that could
  be a medical emergency, gently and clearly encourage prompt care from a
  doctor or emergency services. Do not downplay it; do not position the app or
  any protocol as a substitute for urgent care.
- You may sense emotion in the user's voice. Let it shape your TONE only —
  never report, score, or analyse their emotions back at them.

TONE: kind, grounded, unhurried, never alarmist, never over-promising.
```

### 2e. Tools — add all six

For each: **Add tool → user-defined**, then copy the name, description, and
parameters exactly.

---

**Tool 1 — `mark_activity`**

Description:
```
Mark an item in the user's daily rhythm as done (or undo one). Call this whenever the user says they completed something — e.g. "just had my celery juice", "done my lemon water", "actually I haven't had my smoothie yet" (action: uncomplete). Pass the user's own words as item_name; the tool fuzzy-matches against their real items and returns an error to relay if it's ambiguous.
```

Parameters:
```json
{
  "type": "object",
  "properties": {
    "item_name": {
      "type": "string",
      "description": "The item the user says they did, in their words, e.g. 'celery juice'"
    },
    "action": {
      "type": "string",
      "enum": ["complete", "uncomplete"],
      "description": "complete to tick it off (default), uncomplete to undo"
    }
  },
  "required": ["item_name"]
}
```

---

**Tool 2 — `get_today_status`**

Description:
```
Get the real, current state of the user's daily rhythm: every item with whether it's done, plus completed/total counts. Call this before answering any question about today's progress, what's left, or how they're doing — never answer from memory.
```

Parameters:
```json
{ "type": "object", "properties": {} }
```

---

**Tool 3 — `save_reflection`**

Description:
```
Save a spoken reflection to the user's journal for today. Use when the user shares how they're feeling or something they want to remember, and has agreed to save it. Pass their reflection close to their own words.
```

Parameters:
```json
{
  "type": "object",
  "properties": {
    "text": {
      "type": "string",
      "description": "The reflection to save, in the user's own words"
    }
  },
  "required": ["text"]
}
```

---

**Tool 4 — `log_checkin`**

Description:
```
Log or update today's check-in. Call when the user mentions their energy level, mood, symptoms, celery juice amount, or that they finished their morning protocol. Only pass fields the user actually mentioned — existing values are preserved.
```

Parameters:
```json
{
  "type": "object",
  "properties": {
    "energy": { "type": "integer", "minimum": 1, "maximum": 10, "description": "Energy level 1-10" },
    "mood": { "type": "string", "description": "Mood in a word or two" },
    "symptoms": { "type": "array", "items": { "type": "string" }, "description": "Symptoms the user mentioned" },
    "celery_oz": { "type": "number", "description": "Celery juice drunk today, in ounces" },
    "morning_protocol": { "type": "boolean", "description": "True if the user completed their morning protocol" },
    "notes": { "type": "string", "description": "Anything else worth noting, close to the user's words" }
  }
}
```

---

**Tool 5 — `log_restock`**

Description:
```
Record that the user restocked a supplement, e.g. "I bought two more bottles of B12". unitsAdded is the number of units (bottles/packs) added.
```

Parameters:
```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string", "description": "Supplement name, e.g. 'B12'" },
    "unitsAdded": { "type": "number", "description": "How many units were added" }
  },
  "required": ["name", "unitsAdded"]
}
```

---

**Tool 6 — `log_rhythm_item`**

Description:
```
Add a NEW item to the user's daily rhythm, e.g. "add zinc at 9am to my routine". Only for adding new items — use mark_activity for completing existing ones.
```

Parameters:
```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string", "description": "Item name, e.g. 'Zinc'" },
    "category": { "type": "string", "enum": ["morning", "supplement", "food", "medicine", "other"], "description": "Item category" },
    "fixedTime": { "type": "string", "description": "Optional fixed time as HH:MM 24-hour, e.g. '09:00'" },
    "note": { "type": "string", "description": "Optional note" },
    "frequency": { "type": "string", "enum": ["daily", "weekdays"], "description": "How often (default daily)" }
  },
  "required": ["name"]
}
```

---

### 2f. Save the configuration
Copy its **Config ID** → this is `HUME_EVI_CONFIG_ID`.

---

## 3. Environment variables

Add the three values to **both**:

1. **Local `.env`** (for `npm run dev`):
   ```
   HUME_API_KEY=...
   HUME_SECRET_KEY=...
   HUME_EVI_CONFIG_ID=...
   ```
2. **Railway** (the production server) → your service → Variables → add the
   same three → redeploy.

---

## 4. Database

Run `supabase/voice_turns.sql` in the Supabase SQL editor (project
`wmotkwhwuwcacexmvnuz`) if you haven't already — it's the per-turn voice log.

---

## 5. Test (admin-only — no subscriber sees any of this)

1. In the app: **Admin Dashboard → 🎙 Voice AI stack → "Switch this account to Hume EVI"**
2. A green orb appears bottom-right on every tab. Tap it → allow the microphone.
3. Say hello — you should hear the voice you designed, and see the transcript
   in the sheet.
4. **The magic-moment test:** with the Home tab open, say
   *"I just finished my lemon water."* The companion should confirm — and the
   checkbox should tick itself on screen within a second.
5. Ask *"how am I doing today?"* — it should answer with your real counts.
6. Go quiet for 20 seconds → soft "still there?" note; at 30 seconds the
   session closes gently. Tap to resume.
7. Check Supabase → `voice_turns` — each exchange should be a row; and
   `activity_events` should show your voice tick with `source='voice'`.

If connecting fails with a config message, the three env vars aren't reaching
the server (check Railway → Variables and that it redeployed).
