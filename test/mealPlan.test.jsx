import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolvePlanDay, stepForEntry, planForSteps, defaultSlot, recipeForTick } from "../src/lib/mealPlan.js";
import { kitchenVoiceTools, _resetKitchenVoice, COOK_ALONG_EVENT, syncCookAlong } from "../src/lib/kitchenVoice.js";

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("which day they mean", () => {
  const wed = new Date(2026, 10, 11, 15, 0); // Wednesday 11 Nov 2026
  it("today, tonight, tomorrow and weekdays", () => {
    expect(resolvePlanDay("tonight", wed)).toBe("2026-11-11");
    expect(resolvePlanDay("tomorrow morning", wed)).toBe("2026-11-12");
    expect(resolvePlanDay("Friday", wed)).toBe("2026-11-13");
    expect(resolvePlanDay("next monday", wed)).toBe("2026-11-16");
    expect(resolvePlanDay("wednesday", wed)).toBe("2026-11-11");
    expect(resolvePlanDay("2026-12-01", wed)).toBe("2026-12-01");
    expect(resolvePlanDay("someday", wed)).toBeNull();
  });
  it("only assumes a time of day where it's obvious", () => {
    expect(defaultSlot("smoothie")).toBe("morning");
    expect(defaultSlot("meal")).toBeNull();
  });
});

describe("a plan shows on the matching step", () => {
  const steps = [
    { id: "a", name: "Celery juice", recipeId: null },
    { id: "b", name: "Smoothie", recipeId: "green" },
    { id: "c", name: "Dinner", recipeId: null },
    { id: "d", name: "Afternoon snack", recipeId: null },
  ];
  it("dinner goes on Dinner", () => {
    expect(stepForEntry({ slot: "dinner", recipe_id: "bake" }, { kind: "meal" }, steps).id).toBe("c");
  });
  it("a smoothie goes on the smoothie step", () => {
    expect(stepForEntry({ slot: "morning", recipe_id: "liver" }, { kind: "smoothie" }, steps).id).toBe("b");
  });
  it("a step already linked to that recipe wins", () => {
    expect(stepForEntry({ slot: "evening", recipe_id: "green" }, { kind: "smoothie" }, steps).id).toBe("b");
  });
  it("no matching step: listed on its own, not guessed", () => {
    const { byItem, loose } = planForSteps([{ id: "p", slot: "lunch", recipe_id: "soup", recipe: { name: "Soup", kind: "meal" } }], steps);
    expect(byItem).toEqual({});
    expect(loose).toHaveLength(1);
  });
});

describe("Fern planning and cooking along", () => {
  let recipes;
  let plans;
  let inserts;
  let deletes;
  let tools;
  let shown;
  const onShow = (e) => shown.push(e.detail);

  beforeEach(() => {
    _resetKitchenVoice();
    recipes = [
      { id: "bake", kind: "meal", name: "Potato bake", ingredients: [{ text: "4 potatoes" }], steps: ["Steam the potatoes 20 minutes", "Mash with spinach"], notes: null, tags: [], favourite: false, photo_path: null },
      { id: "liver", kind: "smoothie", name: "Liver smoothie", ingredients: [{ text: "papaya" }], steps: [], notes: null, tags: [], favourite: false, photo_path: null },
    ];
    plans = []; inserts = []; deletes = []; shown = [];
    window.addEventListener(COOK_ALONG_EVENT, onShow);
    vi.stubGlobal("fetch", vi.fn(async (url, init = {}) => {
      const u = String(url);
      const method = init.method || "GET";
      if (u.includes("meal_plan_entries") && method === "POST") { const b = JSON.parse(init.body); inserts.push(b); return jsonResponse([], 201); }
      if (u.includes("meal_plan_entries") && method === "DELETE") { deletes.push(u); return jsonResponse([]); }
      if (u.includes("meal_plan_entries")) return jsonResponse(plans);
      if (u.includes("kitchen_items") && u.includes("select=name&")) return jsonResponse({ name: "Potato bake" });
      if (u.includes("kitchen_items")) return jsonResponse(recipes);
      return jsonResponse([]);
    }));
    tools = kitchenVoiceTools("profile-1");
  });
  afterEach(() => { window.removeEventListener(COOK_ALONG_EVENT, onShow); vi.unstubAllGlobals(); });

  it("plans a meal for a day, asking lunch or dinner when it isn't said", async () => {
    expect((await tools.plan_recipe({ recipe_name: "potato bake", day: "tomorrow" })).error).toBe("which_meal");
    expect(inserts).toHaveLength(0);
    const res = await tools.plan_recipe({ recipe_name: "potato bake", day: "tomorrow", slot: "dinner" });
    expect(res.saved).toBe(true);
    expect(inserts[0]).toMatchObject({ profile_id: "profile-1", recipe_id: "bake", slot: "dinner" });
  });

  it("a smoothie goes in the morning without asking", async () => {
    await tools.plan_recipe({ recipe_name: "liver", day: "tomorrow" });
    expect(inserts[0]).toMatchObject({ recipe_id: "liver", slot: "morning" });
  });

  it("won't plan a recipe they don't have", async () => {
    expect((await tools.plan_recipe({ recipe_name: "lasagne", day: "today", slot: "dinner" })).error).toBe("not_found");
    expect(inserts).toHaveLength(0);
  });

  it("cooks along one step at a time, and the screen follows", async () => {
    const start = await tools.cook_along({ action: "start", recipe_name: "potato bake" });
    expect(start.showing).toBe("ingredients");
    expect(shown.at(-1).page).toBe(0);
    const one = await tools.cook_along({ action: "next" });
    expect(one).toMatchObject({ step: 1, of: 2, text: "Steam the potatoes 20 minutes", timer: "20:00" });
    expect((await tools.cook_along({ action: "repeat" })).step).toBe(1);
    expect((await tools.cook_along({ action: "next" })).step).toBe(2);
    expect((await tools.cook_along({ action: "back" })).step).toBe(1);
    syncCookAlong(2); // they tapped Next on the screen
    const done = await tools.cook_along({ action: "next" });
    expect(done.finished).toBe(true);
    expect(shown.at(-1)).toBeNull();
  });

  it("a tick notes the recipe planned for that step today", async () => {
    plans = [{ id: "p1", plan_date: "2026-11-11", slot: "dinner", recipe_id: "bake", recipe: { id: "bake", name: "Potato bake", kind: "meal" } }];
    const steps = [{ id: "c", name: "Dinner" }, { id: "a", name: "Celery juice" }];
    expect(await recipeForTick("profile-1", steps[0], steps, "2026-11-11")).toEqual({ recipeId: "bake", recipeName: "Potato bake" });
    expect(await recipeForTick("profile-1", steps[1], steps, "2026-11-11")).toBeNull();
  });

  it("otherwise the step's usual recipe", async () => {
    const step = { id: "b", name: "Smoothie", recipeId: "bake" };
    expect(await recipeForTick("profile-1", step, [step], "2026-11-11")).toEqual({ recipeId: "bake", recipeName: "Potato bake" });
  });
});
