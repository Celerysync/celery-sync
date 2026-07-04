/**
 * Voice intake parser — takes a raw voice transcript and returns structured
 * check-in data plus a spoken confirmation the companion reads before writing.
 *
 * Rules:
 * - Quick model only (claude-sonnet-4-6 via tier: 'quick')
 * - Extraction / organisation only — no diagnose, treat, cure, or heal language
 * - Never generates AW protocol content; companion language only
 * - Returns null on network failure (caller handles retry)
 */

// ENERGY_OPTS and MOOD_OPTS mirror the check-in UI values so the parser maps
// natural language ("exhausted", "doing okay") to the same integers the UI writes.
const ENERGY_OPTS = [
  { val: 2, labels: ["exhausted", "terrible", "awful", "crashed", "bed-bound", "barely"] },
  { val: 4, labels: ["struggling", "rough", "low energy", "drained", "hard day", "tired"] },
  { val: 6, labels: ["okay", "alright", "so-so", "managing", "middle", "average", "fine"] },
  { val: 8, labels: ["good", "well", "better", "pretty good", "decent", "solid"] },
  { val: 10, labels: ["great", "excellent", "amazing", "fantastic", "best", "energised", "wonderful"] },
];

const MOOD_OPTS = [
  { val: 1, labels: ["terrible", "awful", "very low", "really down", "horrible"] },
  { val: 2, labels: ["low", "down", "sad", "blue", "not great", "rough"] },
  { val: 3, labels: ["okay", "alright", "so-so", "middle", "neutral", "fine"] },
  { val: 4, labels: ["good", "well", "positive", "better", "decent"] },
  { val: 5, labels: ["great", "excellent", "amazing", "fantastic", "wonderful", "happy"] },
];

const KNOWN_SYMPTOMS = [
  "Fatigue", "Brain fog", "Anxiety", "Depression", "Joint pain",
  "Bloating", "Headache", "Nausea", "Insomnia", "Skin flare",
  "Heart palpitations", "Nerve pain", "Hot flashes", "Sinus issues",
  "Dizziness", "Swollen glands", "Muscle aches", "Constipation",
  "Fatigue", "Brain fog", "Headache", "Bloating", "Joint pain",
  "Anxiety", "Low mood", "Overwhelm", "Insomnia", "Nausea",
  "Skin issues", "Heart palpitations", "Panic attacks", "Irritability",
];
// Deduplicate
const SYMPTOM_LIST = [...new Set(KNOWN_SYMPTOMS)].sort();

const PARSE_SYSTEM = `You are a data extraction assistant for CelerySync, a wellness tracking app.

Your job: extract structured check-in data from what the user said. Output ONLY valid JSON. No prose, no explanation.

EXTRACT these fields if mentioned — leave them null/empty if not mentioned:
- energy: integer 2/4/6/8/10 (map from natural language: exhausted→2, struggling→4, okay→6, good→8, great→10)
- mood: integer 1-5 (1=terrible, 2=low, 3=okay, 4=good, 5=great)
- symptoms: array of strings — match to this exact list where possible: ${SYMPTOM_LIST.join(", ")}. Include unmatched symptoms as free text.
- celery_oz: integer — 0 (skipped), 8 (one glass/small), 16 (standard/500ml), 32 (large/1 litre+). null if not mentioned.
- morning_protocol: boolean — true if they mention doing their morning routine/lemon water/protocol. null if not mentioned.
- notes: string — supplements taken, meals/snacks, cycle notes, free text. Keep it brief. null if nothing extra.
- restock: object — ONLY when the user reports adding to their supplement supply (e.g.
  "I've got two new bottles of zinc, 60 capsules each", "just bought more B12, 100 tablets").
  { "name": string (the supplement name as they said it), "unitsAdded": number (total units —
  do the multiplication yourself, e.g. 2 bottles x 60 capsules = 120) }. null if not mentioned.
  This is inventory bookkeeping only — never a product recommendation or dosage instruction.
- hasData: boolean — true if ANY of the above fields (including restock) have non-null values.
- conversationalReply: string — if the user asked a question (not just reporting data), answer it warmly in 1-2 sentences. Use supportive wellness language only. Never diagnose, treat, or use heal/cure language. null if it was purely a data report.
- confirmation: string — a short spoken confirmation of what was captured, e.g. "Got it — energy 6, headache noted, B12 logged. Anything else?" Read naturally aloud. Only include what was actually captured. If hasData is false, use null.

LANGUAGE RULES:
- Never use: heal, cure, treat, diagnose, prescribe, or claim any outcome
- Use: noted, logged, recorded, captured, tracked
- Keep confirmation under 25 words
- Keep conversationalReply under 40 words

OUTPUT FORMAT (strict JSON, no markdown):
{
  "hasData": boolean,
  "fields": {
    "energy": number|null,
    "mood": number|null,
    "symptoms": string[],
    "celery_oz": number|null,
    "morning_protocol": boolean|null,
    "notes": string|null,
    "restock": { "name": string, "unitsAdded": number }|null
  },
  "confirmation": string|null,
  "conversationalReply": string|null
}`;

/**
 * Parse a voice transcript into structured check-in data.
 *
 * @param {string} transcript - raw speech transcript
 * @param {object} opts
 * @param {AbortSignal} [opts.signal] - AbortController signal for cancellation
 * @returns {Promise<{hasData, fields, confirmation, conversationalReply}|null>}
 *   Returns null on network error or if the response couldn't be parsed as JSON.
 */
export async function parseVoiceTranscript(transcript, { signal } = {}) {
  if (!transcript?.trim()) return null;

  try {
    const res = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        system: PARSE_SYSTEM,
        messages: [{ role: "user", content: transcript.trim() }],
        tier: "quick",
        maxTokens: 400,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const raw = (data.text ?? "").trim();

    // Strip any accidental markdown fences
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

    const parsed = JSON.parse(jsonStr);

    // Normalise — ensure fields object always exists
    if (!parsed.fields) parsed.fields = {};
    if (!Array.isArray(parsed.fields.symptoms)) parsed.fields.symptoms = [];

    return parsed;
  } catch (err) {
    if (err?.name === "AbortError") throw err; // re-throw so caller can detect cancellation
    return null;
  }
}

/**
 * Build a display summary of what was captured, for showing in the UI panel.
 * Returns an array of { label, value } pairs for the confirmed fields.
 */
export function summariseParsed(fields) {
  const items = [];

  if (fields.energy != null) {
    const e = ENERGY_OPTS.find((o) => o.val === fields.energy);
    items.push({ label: "Energy", value: e ? `${fields.energy}/10 (${e.labels[0]})` : `${fields.energy}/10` });
  }
  if (fields.mood != null) {
    const m = MOOD_OPTS.find((o) => o.val === fields.mood);
    items.push({ label: "Mood", value: m ? `${fields.mood}/5 (${m.labels[0]})` : `${fields.mood}/5` });
  }
  if (fields.symptoms?.length) {
    items.push({ label: "Noted", value: fields.symptoms.join(", ") });
  }
  if (fields.celery_oz != null) {
    const metric = localStorage.getItem("cs_units") !== "imperial";
    const label = fields.celery_oz === 0 ? "Skipped"
      : fields.celery_oz === 8  ? (metric ? "240 ml" : "8 oz")
      : fields.celery_oz === 16 ? (metric ? "500 ml" : "16 oz")
      : (metric ? "1 litre+" : "32 oz+");
    items.push({ label: "Celery juice", value: label });
  }
  if (fields.morning_protocol) {
    items.push({ label: "Morning routine", value: "done ✓" });
  }
  if (fields.notes) {
    items.push({ label: "Notes", value: fields.notes });
  }
  if (fields.restock?.name && fields.restock?.unitsAdded) {
    items.push({ label: "Restock", value: `${fields.restock.name} +${fields.restock.unitsAdded} units` });
  }

  return items;
}
