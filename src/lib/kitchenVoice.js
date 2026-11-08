// Fern's Kitchen tools. Everything saved is what the person said — Fern sorts
// it into the right section and fields, reads it back, and saves only after a
// yes. Never overwrites a recipe; never adds anything they didn't say.
import { supabase } from "./supabase.js";
import { KIND_BY_ID, KITCHEN_CHANGED_EVENT, matchRecipe, normalizeRecipe, recipesWith } from "./kitchen.js";
import { RHYTHM_CHANGED_EVENT } from "./rhythmSchedule.js";

const COLUMNS = "id, kind, name, ingredients, steps, notes, tags, favourite, photo_path";
const kitchenChanged = () => window.dispatchEvent(new Event(KITCHEN_CHANGED_EVENT));

// Recipes we've read back, and when. A save only counts as confirmed if this
// exact recipe was read back to them in the last few minutes, so the model
// can't skip the read-back by passing confirmed: true on its own.
const readBack = new Map(); // key → time
const keyOf = (r) => JSON.stringify([r.name.toLowerCase(), r.kind, r.ingredients.map((i) => i.text), r.steps]);
const recentlyRead = (key) => { const t = readBack.get(key); return t && Date.now() - t < 10 * 60_000; };
export const _resetKitchenVoice = () => readBack.clear();

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
