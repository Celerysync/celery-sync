// Fern's Kitchen tools. Everything saved is what the person said — Fern sorts
// it into the right section and fields, reads it back, and saves only after a
// yes. Never overwrites a recipe; never adds anything they didn't say.
import { supabase } from "./supabase.js";
import { KIND_BY_ID, KITCHEN_CHANGED_EVENT, matchRecipe, normalizeRecipe, recipesWith } from "./kitchen.js";
import { RHYTHM_CHANGED_EVENT } from "./rhythmSchedule.js";
import { SLOT_LABEL, dayLabel, defaultSlot, loadPlan, planRecipe, resolvePlanDay, unplan } from "./mealPlan.js";
import { stepTimerSeconds, formatTimer } from "./kitchen.js";
import { addLines, groupList, lineKey, linesFromRecipes, loadList, setChecked } from "./shopping.js";
import { localDateStr } from "./rhythmSchedule.js";

// Cook-along: which recipe and step Fern is on. Page 0 is the ingredients,
// then one page per step — the same pages as cook mode on the screen, which
// follows along (COOK_ALONG_EVENT) and reports taps back (syncCookAlong).
export const COOK_ALONG_EVENT = "cs:cook-along";
let cooking = null; // { recipe, page }
export function syncCookAlong(page) { if (cooking) cooking.page = page; if (page == null) cooking = null; }
const showCook = () => window.dispatchEvent(new CustomEvent(COOK_ALONG_EVENT, { detail: cooking ? { recipe: cooking.recipe, page: cooking.page } : null }));

const COLUMNS = "id, kind, name, ingredients, steps, notes, tags, favourite, photo_path";
const kitchenChanged = () => window.dispatchEvent(new Event(KITCHEN_CHANGED_EVENT));

// Recipes we've read back, and when. A save only counts as confirmed if this
// exact recipe was read back to them in the last few minutes, so the model
// can't skip the read-back by passing confirmed: true on its own.
const readBack = new Map(); // key → time
const keyOf = (r) => JSON.stringify([r.name.toLowerCase(), r.kind, r.ingredients.map((i) => i.text), r.steps]);
const recentlyRead = (key) => { const t = readBack.get(key); return t && Date.now() - t < 10 * 60_000; };
export const _resetKitchenVoice = () => { readBack.clear(); cooking = null; };

async function loadRecipes(profileId) {
  const { data, error } = await supabase.from("kitchen_items").select(COLUMNS).eq("profile_id", profileId).order("name");
  if (error) throw new Error(error.message);
  return data || [];
}

function spoken(r) {
  const kind = KIND_BY_ID[r.kind]?.one || "recipe";
  const ing = r.ingredients.length ? `Ingredients: ${r.ingredients.map((i) => i.text).join("; ")}.` : "No ingredients.";
  const steps = r.steps.length ? ` Steps: ${r.steps.map((s, i) => `${i + 1}. ${s}`).join(" ")}` : " No steps.";
  return `"${r.name}" (${kind}). ${ing}${steps}${r.notes ? ` Note: ${r.notes}` : ""}`;
}

export function kitchenVoiceTools(profileId) {
  return {
    // "Save a new smoothie: ..." — sort what they said into fields, read it
    // back, save on yes.
    async save_recipe(args) {
      if (!profileId) throw new Error("No active profile");
      const r = normalizeRecipe(args || {});
      if (!r.name) return { error: "name_required", changed_nothing: true, message: "Ask what they'd like to call it (or offer a short plain name from what it is)." };
      if (!r.ingredients.length && !r.steps.length) return { error: "empty", changed_nothing: true, message: "Nothing to save yet. Ask them to tell you the ingredients, and the steps if they have them." };
      const recipes = await loadRecipes(profileId);
      const clash = recipes.find((x) => x.name.toLowerCase() === r.name.toLowerCase());
      if (clash) {
        return {
          error: "name_taken", changed_nothing: true,
          message: `They already have a recipe called "${clash.name}". Nothing is saved. Ask: change that one (use update_recipe), or save this under another name?`,
        };
      }
      const key = keyOf(r);
      if (!(args?.confirmed === true && recentlyRead(key))) {
        readBack.set(key, Date.now());
        return {
          needs_confirmation: true, changed_nothing: true,
          read_back: spoken(r),
          message: `Nothing is saved yet. Read this back to them, briefly and warmly: ${spoken(r)} Then ask "Shall I save it like that?" If yes, call save_recipe again with exactly the same details and confirmed: true. If they change anything, call again with the changes (and read it back again).`,
        };
      }
      const { data, error } = await supabase.from("kitchen_items")
        .insert({ ...r, profile_id: profileId, favourite: args?.favourite === true, created_via: "voice" })
        .select("id, name, kind").single();
      if (error) throw new Error(error.message);
      readBack.delete(key);
      kitchenChanged();
      return {
        saved: true, recipe: data.name, section: KIND_BY_ID[data.kind]?.label,
        message: `Saved "${data.name}" in their Kitchen under ${KIND_BY_ID[data.kind]?.label}. Offer to link it to a step in their rhythm (link_recipe) or open it (switch_tab "kitchen").`,
      };
    },

    // Change one of their recipes. Adding things is safe; replacing whole
    // lists or removing ingredients needs a yes.
    async update_recipe(args) {
      if (!profileId) throw new Error("No active profile");
      const recipes = await loadRecipes(profileId);
      const found = matchRecipe(recipes, args?.recipe_name);
      if (found.error) return { ...found, changed_nothing: true };
      const cur = found.match;
      const patch = {};
      const said = [];
      let destructive = false;
      const lines = (v) => normalizeRecipe({ ingredients: v }).ingredients.map((i) => i.text);
      const stepLines = (v) => normalizeRecipe({ steps: v }).steps;

      if (args?.new_name && String(args.new_name).trim()) {
        const n = String(args.new_name).trim();
        if (recipes.some((x) => x.id !== cur.id && x.name.toLowerCase() === n.toLowerCase())) {
          return { error: "name_taken", changed_nothing: true, message: `They already have a recipe called "${n}". Ask for another name.` };
        }
        patch.name = n; said.push(`renamed to "${n}"`);
      }
      if (KIND_BY_ID[args?.kind] && args.kind !== cur.kind) { patch.kind = args.kind; said.push(`moved to ${KIND_BY_ID[args.kind].label}`); }
      let ingredients = cur.ingredients.map((i) => i.text);
      if (args?.ingredients !== undefined) { ingredients = lines(args.ingredients); destructive = true; said.push("ingredients replaced"); }
      if (args?.remove_ingredients !== undefined) {
        const gone = lines(args.remove_ingredients).map((x) => x.toLowerCase());
        const before = ingredients.length;
        ingredients = ingredients.filter((t) => !gone.some((g) => t.toLowerCase().includes(g)));
        if (ingredients.length === before) return { error: "not_found", changed_nothing: true, message: `None of those are in "${cur.name}". Its ingredients: ${cur.ingredients.map((i) => i.text).join("; ")}.` };
        destructive = true; said.push(`removed ${before - ingredients.length} ingredient(s)`);
      }
      if (args?.add_ingredients !== undefined) { const add = lines(args.add_ingredients); ingredients = [...ingredients, ...add]; if (add.length) said.push(`added ${add.join(", ")}`); }
      if (said.some((s) => /ingredient|added/.test(s))) patch.ingredients = ingredients.map((text) => ({ text }));

      let steps = [...cur.steps];
      if (args?.steps !== undefined) { steps = stepLines(args.steps); destructive = true; said.push("steps replaced"); }
      if (args?.add_steps !== undefined) { const add = stepLines(args.add_steps); steps = [...steps, ...add]; if (add.length) said.push(`added ${add.length} step(s)`); }
      if (args?.steps !== undefined || args?.add_steps !== undefined) patch.steps = steps;

      if (typeof args?.notes === "string") { patch.notes = args.notes.trim() || null; said.push("note updated"); }
      if (typeof args?.favourite === "boolean") { patch.favourite = args.favourite; said.push(args.favourite ? "marked a favourite" : "no longer a favourite"); }
      if (!said.length) return { error: "nothing_to_change", changed_nothing: true, message: "Ask what they'd like to change about it." };

      if (destructive && args?.confirmed !== true) {
        return {
          needs_confirmation: true, changed_nothing: true,
          message: `Nothing is changed yet. Ask: "For ${cur.name}, I'll ${said.join(", ")}. Is that right?" Only if they clearly say yes, call again with the same details and confirmed: true.`,
        };
      }
      const { error } = await supabase.from("kitchen_items").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", cur.id);
      if (error) throw new Error(error.message);
      kitchenChanged();
      return { saved: true, recipe: patch.name || cur.name, changes: said, message: `"${cur.name}": ${said.join("; ")}.` };
    },

    // "Read me my green smoothie" / "what can I make with potatoes?" /
    // "what smoothies have I got?"
    async find_recipe(args) {
      if (!profileId) throw new Error("No active profile");
      const recipes = (await loadRecipes(profileId)).map((r) => ({ ...r, ...normalizeRecipe(r) }));
      if (!recipes.length) return { recipes: [], message: "Their Kitchen is empty. Offer to save one now: they can just tell you the ingredients and steps." };
      if (args?.recipe_name) {
        const found = matchRecipe(recipes, args.recipe_name);
        if (found.error) return found;
        return { recipe: found.match.name, read_out: spoken(found.match), message: "Read it to them in their own words, a bit at a time if it's long. Never add to it or change it." };
      }
      if (args?.ingredients) {
        const hits = recipesWith(recipes, args.ingredients);
        return {
          recipes: hits.map((r) => r.name),
          message: hits.length
            ? `Their own recipes with those: ${hits.map((r) => r.name).join(", ")}. Only these — never suggest a recipe that isn't theirs.`
            : "None of their own recipes have those. Say so plainly; never invent or suggest a recipe.",
        };
      }
      const list = KIND_BY_ID[args?.kind] ? recipes.filter((r) => r.kind === args.kind) : recipes;
      return { recipes: list.map((r) => `${r.name} (${KIND_BY_ID[r.kind]?.one})`), message: "These are all of them — never add others." };
    },

    async delete_recipe(args) {
      if (!profileId) throw new Error("No active profile");
      const recipes = await loadRecipes(profileId);
      const found = matchRecipe(recipes, args?.recipe_name);
      if (found.error) return { ...found, changed_nothing: true };
      if (args?.confirmed !== true) {
        return {
          needs_confirmation: true, changed_nothing: true,
          message: `Nothing has been changed yet. Ask the user: "Delete your recipe ${found.match.name}? It can't be brought back." Only if they clearly say yes, call this tool again with confirmed: true.`,
        };
      }
      if (found.match.photo_path) await supabase.storage.from("kitchen-photos").remove([found.match.photo_path]);
      const { error } = await supabase.from("kitchen_items").delete().eq("id", found.match.id);
      if (error) throw new Error(error.message);
      kitchenChanged();
      window.dispatchEvent(new Event(RHYTHM_CHANGED_EVENT)); // any 📖 link goes
      return { saved: true, deleted: found.match.name, message: `"${found.match.name}" is deleted from their Kitchen.` };
    },

    // "Put my liver smoothie on tomorrow morning", "potato bake for dinner".
    async plan_recipe(args) {
      if (!profileId) throw new Error("No active profile");
      const recipes = await loadRecipes(profileId);
      const found = matchRecipe(recipes, args?.recipe_name);
      if (found.error) return { ...found, changed_nothing: true };
      const recipe = found.match;
      const date = resolvePlanDay(args?.day);
      if (!date) return { error: "unclear_day", changed_nothing: true, message: "Ask which day: today, tomorrow, or a day of the week." };
      const slot = SLOT_LABEL[args?.slot] ? args.slot : defaultSlot(recipe.kind);
      if (!slot) return { error: "which_meal", changed_nothing: true, message: `Ask whether "${recipe.name}" is for breakfast, lunch or dinner.` };
      if (args?.remove === true) {
        const hit = (await loadPlan(profileId, date)).find((e) => e.recipe_id === recipe.id && (!args?.slot || e.slot === slot));
        if (!hit) return { changed_nothing: true, message: `"${recipe.name}" isn't planned for ${dayLabel(date).toLowerCase()}.` };
        await unplan(hit.id);
        return { saved: true, message: `Taken "${recipe.name}" off ${dayLabel(date).toLowerCase()}.` };
      }
      const before = (await loadPlan(profileId, date)).find((e) => e.slot === slot);
      await planRecipe(profileId, { recipeId: recipe.id, date, slot });
      return {
        saved: true, recipe: recipe.name, day: dayLabel(date), slot: SLOT_LABEL[slot],
        replaced: before && before.recipe_id !== recipe.id ? before.recipe.name : undefined,
        message: `Planned "${recipe.name}" for ${dayLabel(date).toLowerCase()}, ${SLOT_LABEL[slot].toLowerCase()}${before && before.recipe_id !== recipe.id ? ` (instead of ${before.recipe.name})` : ""}. On that day it shows on the matching step in their rhythm (or under it), and opens with 📖.`,
      };
    },

    // "What's for dinner tonight?", "what have I planned this week?"
    async get_meal_plan(args) {
      if (!profileId) throw new Error("No active profile");
      const from = resolvePlanDay(args?.day || "today");
      if (!from) return { error: "unclear_day", message: "Ask which day they mean." };
      const to = args?.whole_week ? (() => { const d = new Date(`${from}T00:00:00`); d.setDate(d.getDate() + 6); return d.toLocaleDateString("en-CA"); })() : from;
      const entries = await loadPlan(profileId, from, to);
      return {
        planned: entries.map((e) => `${dayLabel(e.plan_date)}, ${SLOT_LABEL[e.slot].toLowerCase()}: ${e.recipe.name}`),
        message: entries.length ? "Only these are planned." : "Nothing is planned then. Offer to plan one of their own recipes (plan_recipe) — never suggest a recipe that isn't theirs.",
      };
    },

    // Read a recipe one step at a time: start, next, back, repeat, stop.
    async cook_along(args) {
      if (!profileId) throw new Error("No active profile");
      const action = ["start", "next", "back", "repeat", "stop"].includes(args?.action) ? args.action : "start";
      if (action === "start" || (args?.recipe_name && (!cooking || cooking.recipe.name.toLowerCase() !== String(args.recipe_name).toLowerCase()))) {
        const found = matchRecipe(await loadRecipes(profileId), args?.recipe_name);
        if (found.error) return found;
        cooking = { recipe: { ...found.match, ...normalizeRecipe(found.match), id: found.match.id, photo_path: found.match.photo_path }, page: 0 };
      } else if (!cooking) {
        return { error: "not_cooking", message: "Nothing is open to cook along with. Ask which of their recipes they'd like." };
      } else if (action === "stop") {
        const name = cooking.recipe.name;
        cooking = null; showCook();
        return { stopped: true, message: `Stopped cooking along with "${name}".` };
      } else if (action === "next") {
        if (cooking.page >= cooking.recipe.steps.length) {
          const name = cooking.recipe.name;
          cooking = null; showCook();
          return { finished: true, message: `That was the last step of "${name}". Cook mode is closed. Tell them warmly that's it.` };
        }
        cooking.page += 1;
      } else if (action === "back") {
        cooking.page = Math.max(0, cooking.page - 1);
      }
      showCook();
      const r = cooking.recipe;
      if (cooking.page === 0) {
        return {
          recipe: r.name, showing: "ingredients", ingredients: r.ingredients.map((i) => i.text), steps_total: r.steps.length,
          message: `Cook mode is open on their screen. Read the ingredients, in their words, then ask them to say "next" when they're ready for step 1.${r.steps.length ? "" : " This recipe has no steps saved."}`,
        };
      }
      const text = r.steps[cooking.page - 1];
      const secs = stepTimerSeconds(text);
      return {
        recipe: r.name, step: cooking.page, of: r.steps.length, text, timer: secs ? formatTimer(secs) : undefined,
        message: `Read ONLY step ${cooking.page} of ${r.steps.length}, word for word: "${text}". Then stop and wait for "next", "repeat" or "back".${secs ? ` There's a ${formatTimer(secs)} timer button on their screen for this step.` : ""}${cooking.page === r.steps.length ? " This is the last step." : ""}`,
      };
    },

    // "Add lemons to my list", "add the potato bake to my shopping list",
    // "put this week's recipes on my list".
    async add_to_shopping_list(args) {
      if (!profileId) throw new Error("No active profile");
      const lines = (Array.isArray(args?.items) ? args.items : []).map((text) => ({ text }));
      const from = [];
      const recipes = (args?.recipe_names?.length || args?.this_week) ? await loadRecipes(profileId) : [];
      for (const name of args?.recipe_names || []) {
        const found = matchRecipe(recipes, name);
        if (found.error) return { ...found, changed_nothing: true };
        from.push(found.match);
      }
      if (args?.this_week) {
        const end = new Date(); end.setDate(end.getDate() + 6);
        const plan = await loadPlan(profileId, localDateStr(), localDateStr(end));
        if (!plan.length) return { error: "nothing_planned", changed_nothing: true, message: "Nothing is planned for this week, so there's nothing to add from it. Offer to plan some of their recipes first, or add items one by one." };
        from.push(...plan.map((e) => ({ id: e.recipe_id, ingredients: e.recipe.ingredients })));
      }
      const all = [...lines, ...linesFromRecipes(from)];
      if (!all.length) return { error: "nothing_to_add", changed_nothing: true, message: "Ask what they'd like on their list." };
      const n = await addLines(profileId, all);
      return { saved: true, added: n, message: `Added ${n} item${n === 1 ? "" : "s"} to their shopping list, as written. It's in Kitchen, Shopping list, grouped by aisle.` };
    },

    async get_shopping_list() {
      if (!profileId) throw new Error("No active profile");
      const groups = groupList(await loadList(profileId));
      const still = groups.map((g) => ({ aisle: g.label, items: g.lines.filter((l) => !l.checked).map((l) => (l.count > 1 ? `${l.text} (x${l.count})` : l.text)) })).filter((g) => g.items.length);
      const done = groups.reduce((n, g) => n + g.lines.filter((l) => l.checked).length, 0);
      return {
        still_to_get: still, ticked: done,
        message: still.length ? "Read it aisle by aisle if they want the whole list; keep it short." : (done ? "Everything on their list is ticked." : "Their shopping list is empty."),
      };
    },

    // "Got the celery" in the shop.
    async tick_shopping_item(args) {
      if (!profileId) throw new Error("No active profile");
      const q = lineKey(args?.item);
      if (!q) return { error: "item_required", message: "Ask which item." };
      const lines = groupList(await loadList(profileId)).flatMap((g) => g.lines);
      const exact = lines.filter((l) => l.key === q);
      const loose = exact.length ? exact : lines.filter((l) => l.key.includes(q) || q.includes(l.key));
      if (!loose.length) return { error: "not_found", changed_nothing: true, message: `"${args.item}" isn't on their list. It has: ${lines.map((l) => l.text).join(", ") || "nothing"}.` };
      if (loose.length > 1) return { error: "ambiguous", changed_nothing: true, message: `Several lines match: ${loose.map((l) => l.text).join(", ")}. Ask which one.` };
      const untick = args?.untick === true;
      await setChecked(loose[0].ids, !untick);
      return { saved: true, item: loose[0].text, ticked: !untick };
    },

    // "Link my green smoothie to my morning smoothie step" — Today then shows
    // 📖 on that step. Pass recipe_name null/"" to unlink.
    async link_recipe(args, rhythmRows) {
      if (!profileId) throw new Error("No active profile");
      const { match: step, ...stepErr } = matchByNameLocal(rhythmRows, args?.item_name);
      if (!step) return { ...stepErr, changed_nothing: true };
      let recipe = null;
      if (args?.recipe_name) {
        const found = matchRecipe(await loadRecipes(profileId), args.recipe_name);
        if (found.error) return { ...found, changed_nothing: true };
        recipe = found.match;
      }
      const { error } = await supabase.from("rhythm_items").update({ recipe_id: recipe?.id ?? null, changed_via: "voice" }).eq("id", step.id);
      if (error) throw new Error(error.message);
      window.dispatchEvent(new Event(RHYTHM_CHANGED_EVENT));
      return recipe
        ? { saved: true, item: step.name, recipe: recipe.name, message: `"${step.name}" now opens "${recipe.name}" — they'll see 📖 next to it on Today.` }
        : { saved: true, item: step.name, message: `"${step.name}" no longer opens a recipe.` };
    },
  };
}

function matchByNameLocal(rows, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return { error: "name_required", message: "Ask which step in their rhythm they mean." };
  const exact = rows.filter((r) => r.name.toLowerCase() === q);
  if (exact.length === 1) return { match: exact[0] };
  const loose = rows.filter((r) => { const n = r.name.toLowerCase(); return n.includes(q) || q.includes(n); });
  if (loose.length === 1) return { match: loose[0] };
  if (loose.length > 1) return { error: "ambiguous", message: `Several steps match "${query}": ${loose.map((r) => r.name).join(", ")}. Ask which one.` };
  return { error: "not_found", message: `No step called "${query}" in their rhythm. Their steps: ${rows.map((r) => r.name).join(", ")}.` };
}
