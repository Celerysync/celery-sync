// Planning their own recipes onto days ("the potato bake for dinner",
// "my liver smoothie tomorrow morning"). One row per plan in
// meal_plan_entries. A plan attaches to the matching step in their rhythm
// that day, so Today shows it there and the tick records which recipe it was.
import { supabase } from "./supabase.js";
import { localDateStr } from "./rhythmSchedule.js";

export const PLAN_SLOTS = [
  { id: "morning", label: "Morning" },
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "snack", label: "Snack" },
  { id: "dinner", label: "Dinner" },
  { id: "evening", label: "Evening" },
];
export const SLOT_LABEL = Object.fromEntries(PLAN_SLOTS.map((s) => [s.id, s.label]));
export const MEAL_PLAN_CHANGED_EVENT = "cs:meal-plan-changed";

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// "today", "tonight", "tomorrow", "friday", "2026-11-12" → YYYY-MM-DD (local).
// A weekday means the next one (today if it's today). Null if not understood.
export function resolvePlanDay(word, now = new Date()) {
  const w = String(word || "today").trim().toLowerCase();
  if (/^\d{4}-\d{2}-\d{2}$/.test(w)) return w;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (["today", "tonight", "this morning", "this evening", "this afternoon"].includes(w)) return localDateStr(d);
  if (["tomorrow", "tomorrow morning", "tomorrow night", "tomorrow evening"].includes(w)) { d.setDate(d.getDate() + 1); return localDateStr(d); }
  const wd = WEEKDAYS.findIndex((x) => w.replace(/^(this|next|on)\s+/, "").startsWith(x));
  if (wd >= 0) { d.setDate(d.getDate() + ((wd - d.getDay() + 7) % 7)); return localDateStr(d); }
  return null;
}

// A slot when they didn't say one: only where it's obvious.
export function defaultSlot(kind) {
  if (["juice", "smoothie", "drink"].includes(kind)) return "morning";
  if (kind === "snack") return "snack";
  return null; // a meal: ask lunch or dinner
}

const words = { breakfast: ["breakfast"], lunch: ["lunch"], dinner: ["dinner", "tea", "supper"], snack: ["snack"] };
const has = (name, w) => new RegExp(`\\b${w}\\b`, "i").test(name);

// Which of today's steps a plan belongs to. Never guesses between several.
export function stepForEntry(entry, recipe, steps) {
  const one = (list) => (list.length === 1 ? list[0] : null);
  const linked = one(steps.filter((s) => s.recipeId && s.recipeId === entry.recipe_id));
  if (linked) return linked;
  const bySlot = one(steps.filter((s) => (words[entry.slot] || []).some((w) => has(s.name, w))));
  if (bySlot) return bySlot;
  if (recipe && ["juice", "smoothie"].includes(recipe.kind)) {
    const sameSlotKind = steps.filter((s) => has(s.name, recipe.kind));
    if (sameSlotKind.length === 1) return sameSlotKind[0];
  }
  return null;
}

// For today: { byItem: { itemId: { recipeId, recipeName } }, loose: [entry…] }
// A plan for the day wins over a step's usual recipe ("tonight's dinner").
export function planForSteps(entries, steps) {
  const byItem = {};
  const loose = [];
  for (const e of entries) {
    const step = stepForEntry(e, e.recipe, steps);
    if (step && !byItem[step.id]) byItem[step.id] = { recipeId: e.recipe_id, recipeName: e.recipe?.name || null };
    else loose.push(e);
  }
  return { byItem, loose };
}

const SELECT = "id, plan_date, slot, recipe_id, note, recipe:kitchen_items(id, name, kind)";
const slotOrder = (s) => PLAN_SLOTS.findIndex((x) => x.id === s);

export async function loadPlan(profileId, from, to = from) {
  const { data, error } = await supabase.from("meal_plan_entries").select(SELECT)
    .eq("profile_id", profileId).gte("plan_date", from).lte("plan_date", to).order("plan_date");
  if (error) throw new Error(error.message);
  return (data || []).filter((e) => e.recipe).sort((a, b) => a.plan_date.localeCompare(b.plan_date) || slotOrder(a.slot) - slotOrder(b.slot));
}

// One recipe per day and slot: planning the same slot again swaps it.
export async function planRecipe(profileId, { recipeId, date, slot }) {
  await supabase.from("meal_plan_entries").delete().eq("profile_id", profileId).eq("plan_date", date).eq("slot", slot);
  const { error } = await supabase.from("meal_plan_entries").insert({ profile_id: profileId, recipe_id: recipeId, plan_date: date, slot });
  if (error) throw new Error(error.message);
  window.dispatchEvent(new Event(MEAL_PLAN_CHANGED_EVENT));
}

export async function unplan(id) {
  const { error } = await supabase.from("meal_plan_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
  window.dispatchEvent(new Event(MEAL_PLAN_CHANGED_EVENT));
}

// Which of their recipes ticking this step means today, for the ledger:
// today's plan for the step first, else the step's usual recipe.
export async function recipeForTick(profileId, item, todaysSteps, date = localDateStr()) {
  try {
    const steps = todaysSteps.map((s) => ({ id: s.id, name: s.name, recipeId: s.recipeId ?? null }));
    const { byItem } = planForSteps(await loadPlan(profileId, date), steps);
    if (byItem[item.id]) return byItem[item.id];
    if (!item.recipeId) return null;
    const { data } = await supabase.from("kitchen_items").select("name").eq("id", item.recipeId).maybeSingle();
    return { recipeId: item.recipeId, recipeName: data?.name ?? null };
  } catch { return null; }
}

export function dayLabel(date, today = localDateStr()) {
  if (date === today) return "Today";
  const t = new Date(`${today}T00:00:00`);
  t.setDate(t.getDate() + 1);
  if (date === localDateStr(t)) return "Tomorrow";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" });
}
