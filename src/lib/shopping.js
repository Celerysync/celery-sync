// Shopping list: lines from their own recipes (or typed / said), ticked off
// in the shop, grouped by aisle. Honest combining: identical lines show once
// with "×2"; nothing is converted, added up or guessed.
import { supabase } from "./supabase.js";
import { callClaude } from "./api.js";

export const AISLES = [
  { id: "produce", label: "Fruit & veg", emoji: "🥬" },
  { id: "herbs", label: "Herbs & spices", emoji: "🌿" },
  { id: "pantry", label: "Pantry", emoji: "🥫" },
  { id: "bakery", label: "Bakery", emoji: "🍞" },
  { id: "fridge", label: "Fridge", emoji: "🧊" },
  { id: "freezer", label: "Freezer", emoji: "❄️" },
  { id: "drinks", label: "Drinks", emoji: "🍵" },
  { id: "health", label: "Health & supplements", emoji: "💊" },
  { id: "household", label: "Household", emoji: "🧽" },
  { id: "other", label: "Other", emoji: "🛒" },
];
const AISLE_IDS = AISLES.map((a) => a.id);
export const SHOPPING_CHANGED_EVENT = "cs:shopping-changed";
const changed = () => window.dispatchEvent(new Event(SHOPPING_CHANGED_EVENT));

export const lineKey = (text) => String(text || "").trim().replace(/\s+/g, " ").toLowerCase();
export const cleanLine = (text) => String(text || "").trim().replace(/\s+/g, " ").slice(0, 200);

// Rows → [{ aisle, label, emoji, lines: [{ key, text, ids, count, checked }] }].
// Identical lines (ignoring case and spacing) become one line with a count;
// it's ticked when all of them are.
export function groupList(rows) {
  const byKey = new Map();
  for (const r of rows) {
    const k = lineKey(r.text);
    const line = byKey.get(k) || { key: k, text: r.text, ids: [], count: 0, checkedCount: 0, aisle: r.aisle || "other", created: r.created_at };
    line.ids.push(r.id);
    line.count += 1;
    if (r.checked) line.checkedCount += 1;
    byKey.set(k, line);
  }
  const lines = [...byKey.values()].map((l) => ({ ...l, checked: l.checkedCount === l.count }));
  return AISLES
    .map((a) => ({ aisle: a.id, label: a.label, emoji: a.emoji, lines: lines.filter((l) => (AISLE_IDS.includes(l.aisle) ? l.aisle : "other") === a.id).sort((x, y) => Number(x.checked) - Number(y.checked) || x.text.localeCompare(y.text)) }))
    .filter((g) => g.lines.length);
}

// The aisle for each line, sorted by AI from their own words. Only sorts —
// never changes a line. Remembered on the phone so a line is sorted once.
const CACHE = "cs_aisles";
const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE) || "{}"); } catch { return {}; } };
const writeCache = (c) => { try { localStorage.setItem(CACHE, JSON.stringify(c)); } catch { /* full */ } };

const AISLE_SYSTEM = `You sort shopping list lines into supermarket aisles. Reply with ONLY a JSON array of aisle ids, one per line, in the same order.
Aisle ids: ${AISLE_IDS.join(", ")}.
produce = fresh fruit and vegetables (incl. fresh leafy greens, celery, lemons, potatoes, bananas, wild blueberries if fresh). herbs = fresh or dried herbs and spices. pantry = dry and packaged goods, oils, honey, maple syrup, nuts, dates, dried fruit. bakery = bread. fridge = chilled items. freezer = frozen items (e.g. "frozen wild blueberries"). drinks = teas, coconut water, bottled drinks. health = supplements and powders. household = non-food. other = unsure.`;

export async function aislesFor(texts) {
  const cache = readCache();
  const want = [...new Set(texts.map(lineKey))].filter((k) => k && !cache[k]);
  if (want.length) {
    try {
      const raw = await callClaude({ system: AISLE_SYSTEM, messages: [{ role: "user", content: JSON.stringify(want) }], maxTokens: 400, tier: "quick" });
      const arr = JSON.parse(String(raw).match(/\[[\s\S]*\]/)?.[0] || "[]");
      want.forEach((k, i) => { if (AISLE_IDS.includes(arr[i])) cache[k] = arr[i]; });
      writeCache(cache);
    } catch { /* sorting is a nicety: unsorted lines go under Other */ }
  }
  return texts.map((t) => cache[lineKey(t)] || "other");
}

export async function loadList(profileId) {
  const { data, error } = await supabase.from("shopping_list_items").select("id, text, checked, aisle, from_recipe_id, created_at")
    .eq("profile_id", profileId).order("created_at");
  if (error) throw new Error(error.message);
  return data || [];
}

// Add lines (each { text, fromRecipeId? }). Returns how many were added.
export async function addLines(profileId, lines) {
  const clean = lines.map((l) => ({ ...l, text: cleanLine(l.text) })).filter((l) => l.text);
  if (!clean.length) return 0;
  const aisles = await aislesFor(clean.map((l) => l.text));
  const { error } = await supabase.from("shopping_list_items").insert(clean.map((l, i) => ({
    profile_id: profileId, text: l.text, from_recipe_id: l.fromRecipeId || null, aisle: aisles[i], checked: false,
  })));
  if (error) throw new Error(error.message);
  changed();
  return clean.length;
}

// Every ingredient of these recipes, one line each, as they wrote it.
export const linesFromRecipes = (recipes) =>
  recipes.flatMap((r) => (r.ingredients || []).map((i) => ({ text: i.text, fromRecipeId: r.id })));

export async function setChecked(ids, checked) {
  const { error } = await supabase.from("shopping_list_items").update({ checked }).in("id", ids);
  if (error) throw new Error(error.message);
  changed();
}

export async function removeLines(ids) {
  const { error } = await supabase.from("shopping_list_items").delete().in("id", ids);
  if (error) throw new Error(error.message);
  changed();
}

export async function clearTicked(profileId) {
  const { error } = await supabase.from("shopping_list_items").delete().eq("profile_id", profileId).eq("checked", true);
  if (error) throw new Error(error.message);
  changed();
}
