// Kitchen: each person's own library of juices, smoothies, meals and more.
// Everything in it is what they typed, pasted or said. The app ships no
// recipes, never adds to theirs, and nothing is shared between people
// (docs/KITCHEN_PLAN.md).
import { callClaude } from "./api.js";

export const KITCHEN_KINDS = [
  { id: "juice", label: "Juices", one: "juice", emoji: "🥤" },
  { id: "smoothie", label: "Smoothies", one: "smoothie", emoji: "🍓" },
  { id: "meal", label: "Meals", one: "meal", emoji: "🍽" },
  { id: "snack", label: "Snacks", one: "snack", emoji: "🍎" },
  { id: "drink", label: "Drinks", one: "drink", emoji: "🍵" },
  { id: "other", label: "Other", one: "recipe", emoji: "📖" },
];
export const KIND_BY_ID = Object.fromEntries(KITCHEN_KINDS.map((k) => [k.id, k]));
export const KITCHEN_CHANGED_EVENT = "cs:kitchen-changed";

const clean = (s) => String(s ?? "").trim();

// One shape for every writer (the screen, paste-and-sort, the voice helper).
export function normalizeRecipe(raw) {
  const lines = (v) => (Array.isArray(v) ? v : String(v ?? "").split("\n"))
    .map((x) => clean(typeof x === "object" && x ? x.text : x))
    .map((x) => x.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, ""))
    .filter(Boolean);
  const kind = KIND_BY_ID[raw?.kind] ? raw.kind : "other";
  return {
    name: clean(raw?.name),
    kind,
    ingredients: lines(raw?.ingredients).map((text) => ({ text })),
    steps: lines(raw?.steps),
    notes: clean(raw?.notes) || null,
    tags: [...new Set((Array.isArray(raw?.tags) ? raw.tags : String(raw?.tags ?? "").split(",")).map((t) => clean(t).toLowerCase()).filter(Boolean))],
  };
}

export function recipeSummary(r) {
  const n = r.ingredients?.length || 0;
  const s = r.steps?.length || 0;
  return `${KIND_BY_ID[r.kind]?.one || "recipe"} called "${r.name}", with ${n} ingredient${n === 1 ? "" : "s"} and ${s} step${s === 1 ? "" : "s"}`;
}

// Find one of their recipes by name: exact first, then contains either way.
// Never guesses between several.
export function matchRecipe(recipes, query) {
  const q = clean(query).toLowerCase();
  if (!q) return { error: "name_required", message: "Ask which recipe they mean." };
  const exact = recipes.filter((r) => r.name.toLowerCase() === q);
  if (exact.length === 1) return { match: exact[0] };
  const loose = recipes.filter((r) => { const n = r.name.toLowerCase(); return n.includes(q) || q.includes(n); });
  if (loose.length === 1) return { match: loose[0] };
  if (loose.length > 1) return { error: "ambiguous", message: `Several recipes match "${query}": ${loose.map((r) => r.name).join(", ")}. Ask which one — never guess.` };
  return { error: "not_found", message: `They have no recipe called "${query}". Their recipes: ${recipes.map((r) => r.name).join(", ") || "none yet"}. Ask which they meant.` };
}

// Ingredients search: "what can I make with potatoes and spinach?"
export function recipesWith(recipes, words) {
  const want = (Array.isArray(words) ? words : String(words || "").split(/,|\band\b/)).map((w) => clean(w).toLowerCase()).filter(Boolean);
  if (!want.length) return [];
  return recipes
    .map((r) => {
      const hay = r.ingredients.map((i) => i.text.toLowerCase()).join(" | ");
      const hits = want.filter((w) => hay.includes(w.replace(/s$/, "")));
      return { recipe: r, hits: hits.length };
    })
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits || Number(b.recipe.favourite) - Number(a.recipe.favourite))
    .map((x) => x.recipe);
}

// A time mentioned in a step ("blend for 30 seconds", "simmer 10 mins"), in
// seconds, for cook mode's timer. The largest one if several are mentioned.
export function stepTimerSeconds(step) {
  const re = /(\d+(?:\.\d+)?)\s*(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/gi;
  let best = 0;
  for (const m of String(step || "").matchAll(re)) {
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    const secs = unit.startsWith("h") ? n * 3600 : unit.startsWith("m") ? n * 60 : n;
    if (secs > best) best = secs;
  }
  return best ? Math.round(best) : null;
}

export const formatTimer = (secs) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
};

const SORT_SYSTEM = `You sort a person's OWN recipe, which they typed, pasted or said, into fields. Output ONLY JSON:
{"name": string, "kind": "juice"|"smoothie"|"meal"|"snack"|"drink"|"other", "ingredients": [string], "steps": [string], "notes": string|null}

Rules, strictly:
- Use only what they gave. Never add, invent, suggest, complete or "improve" any ingredient, amount or step. Never correct their amounts.
- Keep their own words and amounts. One ingredient per entry; split "bananas and spinach" into two only if they listed them as separate ingredients.
- Steps in the order they gave them, one action per step, no numbering.
- If they didn't give a name, make a short plain one from what it is (e.g. "Green smoothie").
- kind: pick the closest; "other" if unsure.
- Anything that isn't an ingredient or a step (page numbers, who it's for, tips) goes in notes.
- If they gave no steps, steps is [].`;

export async function sortRecipeText(text, { signal } = {}) {
  const raw = await callClaude({
    system: SORT_SYSTEM,
    messages: [{ role: "user", content: String(text || "").slice(0, 6000) }],
    maxTokens: 1200,
    tier: "quick",
    signal,
  });
  const json = String(raw).match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error("Couldn't sort that recipe. Please check the fields by hand.");
  return normalizeRecipe(JSON.parse(json));
}
