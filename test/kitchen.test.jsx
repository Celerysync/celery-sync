import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { normalizeRecipe, stepTimerSeconds, formatTimer, matchRecipe, recipesWith } from "../src/lib/kitchen.js";
import { kitchenVoiceTools, _resetKitchenVoice } from "../src/lib/kitchenVoice.js";
import { rhythmRowToItem, rhythmItemToRow } from "../src/lib/rhythmSchedule.js";
import { buildProgramItem } from "../src/lib/savedRhythms.js";
import { resolveDestination } from "../src/lib/voiceTabContext.js";
import CookMode from "../src/components/CookMode.jsx";

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("recipes are kept exactly as the person gave them", () => {
  it("tidies lists without changing their words", () => {
    const r = normalizeRecipe({
      name: "  Green smoothie ", kind: "smoothie",
      ingredients: "- 2 bananas\n1. a cup of wild blueberries\n\n• handful of spinach",
      steps: ["Blend the bananas", "  ", "Add the rest"],
      tags: "Morning, quick, morning",
    });
    expect(r).toEqual({
      name: "Green smoothie", kind: "smoothie",
      ingredients: [{ text: "2 bananas" }, { text: "a cup of wild blueberries" }, { text: "handful of spinach" }],
      steps: ["Blend the bananas", "Add the rest"], notes: null, tags: ["morning", "quick"],
    });
  });

  it("an unknown kind goes under Other", () => {
    expect(normalizeRecipe({ name: "x", kind: "dessert" }).kind).toBe("other");
  });

  it("cook mode finds the time in a step", () => {
    expect(stepTimerSeconds("Blend for 30 seconds")).toBe(30);
    expect(stepTimerSeconds("Steam the potatoes 20 mins, then rest 5 minutes")).toBe(1200);
    expect(stepTimerSeconds("Bake 1.5 hours")).toBe(5400);
    expect(stepTimerSeconds("Peel the potatoes")).toBeNull();
    expect(formatTimer(1200)).toBe("20:00");
    expect(formatTimer(5400)).toBe("1:30:00");
  });

  it("finds a recipe by name and never guesses between several", () => {
    const list = [{ name: "Green smoothie" }, { name: "Berry smoothie" }, { name: "Celery juice" }];
    expect(matchRecipe(list, "celery").match.name).toBe("Celery juice");
    expect(matchRecipe(list, "smoothie").error).toBe("ambiguous");
    expect(matchRecipe(list, "soup").error).toBe("not_found");
  });

  it("'what can I make with' only searches their own recipes", () => {
    const list = [
      { name: "Potato bake", favourite: false, ingredients: [{ text: "4 potatoes" }, { text: "spinach" }] },
      { name: "Green smoothie", favourite: true, ingredients: [{ text: "spinach" }, { text: "bananas" }] },
    ];
    expect(recipesWith(list, "potatoes and spinach").map((r) => r.name)).toEqual(["Potato bake", "Green smoothie"]);
    expect(recipesWith(list, "kale")).toEqual([]);
  });
});

describe("a rhythm or program step can open a recipe", () => {
  it("carries the link through both ways", () => {
    expect(rhythmRowToItem({ id: "1", name: "Smoothie", recipe_id: "r1" }).recipeId).toBe("r1");
    expect(rhythmItemToRow({ name: "Smoothie", recipeId: "r1" }, "p").recipe_id).toBe("r1");
    expect(rhythmItemToRow({ name: "Smoothie", recipeId: null }, "p").recipe_id).toBeNull();
  });

  it("older writers that don't know about recipes never unlink one", () => {
    expect("recipe_id" in rhythmItemToRow({ name: "Smoothie" }, "p")).toBe(false);
  });

  it("program steps keep their recipe", () => {
    expect(buildProgramItem({ name: "Smoothie", recipeId: "r1" }, 3, 1).recipeId).toBe("r1");
  });

  it("'recipes' and 'smoothies' take you to the Kitchen", () => {
    expect(resolveDestination("recipes")).toEqual({ tab: "kitchen", section: null });
    expect(resolveDestination("smoothies")).toEqual({ tab: "kitchen", section: "smoothie" });
    expect(resolveDestination("kitchen:meal")).toEqual({ tab: "kitchen", section: "meal" });
  });
});

describe("Fern saving and changing recipes by voice", () => {
  let recipes;
  let inserts;
  let updates;
  let deletes;
  let tools;

  beforeEach(() => {
    _resetKitchenVoice();
    recipes = [{ id: "r1", kind: "juice", name: "Celery juice", ingredients: [{ text: "1 bunch celery" }], steps: ["Juice it"], notes: null, tags: [], favourite: false, photo_path: null }];
    inserts = []; updates = []; deletes = [];
    vi.stubGlobal("fetch", vi.fn(async (url, init = {}) => {
      const u = String(url);
      const method = init.method || "GET";
      if (u.includes("kitchen_items") && method === "POST") { const b = JSON.parse(init.body); inserts.push(b); return jsonResponse({ id: "new", name: b.name, kind: b.kind }, 201); }
      if (u.includes("kitchen_items") && method === "PATCH") { updates.push(JSON.parse(init.body)); return jsonResponse([]); }
      if (u.includes("kitchen_items") && method === "DELETE") { deletes.push(u); return jsonResponse([]); }
      if (u.includes("kitchen_items")) return jsonResponse(recipes);
      if (u.includes("rhythm_items") && method === "PATCH") { updates.push(JSON.parse(init.body)); return jsonResponse([]); }
      return jsonResponse([]);
    }));
    tools = kitchenVoiceTools("profile-1");
  });

  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  const smoothie = { name: "Green smoothie", kind: "smoothie", ingredients: ["2 bananas", "a handful of spinach"], steps: ["Blend"] };

  it("reads it back first and saves nothing", async () => {
    const res = await tools.save_recipe(smoothie);
    expect(res.needs_confirmation).toBe(true);
    expect(res.read_back).toContain("2 bananas");
    expect(inserts).toHaveLength(0);
  });

  it("won't save on confirmed: true unless it was read back", async () => {
    const res = await tools.save_recipe({ ...smoothie, confirmed: true });
    expect(res.needs_confirmation).toBe(true);
    expect(inserts).toHaveLength(0);
  });

  it("won't save a changed recipe on the old yes", async () => {
    await tools.save_recipe(smoothie);
    const res = await tools.save_recipe({ ...smoothie, ingredients: ["2 bananas", "kale"], confirmed: true });
    expect(res.needs_confirmation).toBe(true);
    expect(inserts).toHaveLength(0);
  });

  it("saves after the read-back and a yes, in the right section, as said", async () => {
    await tools.save_recipe(smoothie);
    const res = await tools.save_recipe({ ...smoothie, confirmed: true });
    expect(res.saved).toBe(true);
    expect(res.section).toBe("Smoothies");
    expect(inserts[0]).toMatchObject({
      profile_id: "profile-1", kind: "smoothie", name: "Green smoothie", created_via: "voice",
      ingredients: [{ text: "2 bananas" }, { text: "a handful of spinach" }], steps: ["Blend"],
    });
  });

  it("never overwrites a recipe with the same name", async () => {
    const res = await tools.save_recipe({ name: "celery juice", kind: "juice", ingredients: ["celery"] });
    expect(res.error).toBe("name_taken");
    expect(inserts).toHaveLength(0);
  });

  it("adding an ingredient needs no yes; replacing or removing does", async () => {
    const add = await tools.update_recipe({ recipe_name: "celery", add_ingredients: ["a little lemon"] });
    expect(add.saved).toBe(true);
    expect(updates[0].ingredients).toEqual([{ text: "1 bunch celery" }, { text: "a little lemon" }]);

    const rem = await tools.update_recipe({ recipe_name: "celery", remove_ingredients: ["celery"] });
    expect(rem.needs_confirmation).toBe(true);
    expect(updates).toHaveLength(1);
  });

  it("deleting needs a yes", async () => {
    expect((await tools.delete_recipe({ recipe_name: "celery juice" })).needs_confirmation).toBe(true);
    expect(deletes).toHaveLength(0);
    expect((await tools.delete_recipe({ recipe_name: "celery juice", confirmed: true })).deleted).toBe("Celery juice");
    expect(deletes).toHaveLength(1);
  });

  it("finds only their own recipes by ingredient", async () => {
    expect((await tools.find_recipe({ ingredients: "celery" })).recipes).toEqual(["Celery juice"]);
    expect((await tools.find_recipe({ ingredients: "kale" })).recipes).toEqual([]);
  });

  it("links a recipe to a step in their rhythm", async () => {
    const res = await tools.link_recipe({ item_name: "celery", recipe_name: "celery juice" }, [{ id: "s1", name: "Celery juice" }, { id: "s2", name: "Lemon water" }]);
    expect(res.saved).toBe(true);
    expect(updates[0]).toMatchObject({ recipe_id: "r1", changed_via: "voice" });
  });
});

describe("cook mode", () => {
  afterEach(cleanup);
  it("shows ingredients, then one step at a time, with a timer when a step has a time", () => {
    const onClose = vi.fn();
    render(<CookMode recipe={{ name: "Potatoes", ingredients: [{ text: "4 potatoes" }], steps: ["Peel them", "Steam 20 minutes"] }} onClose={onClose} />);
    expect(screen.getByText("4 potatoes")).toBeTruthy();
    fireEvent.click(screen.getByText("Start →"));
    expect(screen.getByText("Peel them")).toBeTruthy();
    expect(screen.queryByText(/timer/)).toBeNull();
    fireEvent.click(screen.getByText("Next →"));
    expect(screen.getByText("⏱ Start 20:00 timer")).toBeTruthy();
    fireEvent.click(screen.getByText("Finished ✓"));
    expect(onClose).toHaveBeenCalled();
  });
});
