import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { groupList, aislesFor, linesFromRecipes, lineKey } from "../src/lib/shopping.js";
import { kitchenVoiceTools, _resetKitchenVoice } from "../src/lib/kitchenVoice.js";
import ShoppingList from "../src/components/ShoppingList.jsx";

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const row = (id, text, aisle = "produce", checked = false) => ({ id, text, aisle, checked, created_at: `2026-11-08T0${id.length}:00:00Z` });

describe("the shopping list, honestly combined", () => {
  it("identical lines show once with a count; nothing is added up", () => {
    const g = groupList([row("a", "2 bananas"), row("b", "2  Bananas"), row("c", "3 bananas"), row("d", "Lemons", "produce")]);
    const lines = g[0].lines;
    expect(lines.map((l) => [l.text, l.count])).toEqual([["2 bananas", 2], ["3 bananas", 1], ["Lemons", 1]]);
  });

  it("groups by aisle in shop order, ticked lines last", () => {
    const g = groupList([row("a", "Honey", "pantry"), row("b", "Celery", "produce", true), row("c", "Spinach", "produce"), row("d", "Thing", "nonsense")]);
    expect(g.map((x) => x.aisle)).toEqual(["produce", "pantry", "other"]);
    expect(g[0].lines.map((l) => l.text)).toEqual(["Spinach", "Celery"]);
  });

  it("a merged line is ticked only when all of it is", () => {
    const g = groupList([row("a", "2 bananas", "produce", true), row("b", "2 bananas")]);
    expect(g[0].lines[0].checked).toBe(false);
  });

  it("ingredients go on as they wrote them", () => {
    expect(linesFromRecipes([{ id: "r", ingredients: [{ text: "a handful of spinach" }] }])).toEqual([{ text: "a handful of spinach", fromRecipeId: "r" }]);
    expect(lineKey("  2  Bananas ")).toBe("2 bananas");
  });
});

describe("aisles sorted by AI from their own words", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("asks once per new line, remembers it, and never changes the line", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ text: '["produce","pantry"]' }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await aislesFor(["Celery", "Raw honey"])).toEqual(["produce", "pantry"]);
    expect(await aislesFor(["celery"])).toEqual(["produce"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("if sorting fails, lines still go on, under Other", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: "busy" }, 503)));
    expect(await aislesFor(["Lemons"])).toEqual(["other"]);
  });
});

describe("Fern and the shopping list", () => {
  let list;
  let inserts;
  let patches;
  let tools;
  beforeEach(() => {
    localStorage.clear();
    _resetKitchenVoice();
    list = [row("a", "Celery"), row("bb", "Lemons"), row("ccc", "Lemons")];
    inserts = []; patches = [];
    vi.stubGlobal("fetch", vi.fn(async (url, init = {}) => {
      const u = String(url);
      const m = init.method || "GET";
      if (u.includes("/api/claude")) return jsonResponse({ text: JSON.stringify(JSON.parse(JSON.parse(init.body).messages[0].content).map(() => "produce")) });
      if (u.includes("shopping_list_items") && m === "POST") { inserts.push(...JSON.parse(init.body)); return jsonResponse([], 201); }
      if (u.includes("shopping_list_items") && m === "PATCH") { patches.push({ url: u, body: JSON.parse(init.body) }); return jsonResponse([]); }
      if (u.includes("shopping_list_items")) return jsonResponse(list);
      if (u.includes("kitchen_items")) return jsonResponse([{ id: "bake", kind: "meal", name: "Potato bake", ingredients: [{ text: "4 potatoes" }, { text: "spinach" }], steps: [], tags: [] }]);
      return jsonResponse([]);
    }));
    tools = kitchenVoiceTools("profile-1");
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("adds what they said and a recipe's ingredients, as written", async () => {
    const res = await tools.add_to_shopping_list({ items: ["lemons"], recipe_names: ["potato bake"] });
    expect(res.added).toBe(3);
    expect(inserts.map((r) => r.text)).toEqual(["lemons", "4 potatoes", "spinach"]);
    expect(inserts[1]).toMatchObject({ profile_id: "profile-1", from_recipe_id: "bake", aisle: "produce", checked: false });
  });

  it("a repeated request doesn't add everything twice", async () => {
    await tools.add_to_shopping_list({ items: ["lemons"], recipe_names: ["potato bake"] });
    const again = await tools.add_to_shopping_list({ recipe_names: ["Potato Bake"], items: ["Lemons"] });
    expect(again.already_added).toBe(true);
    expect(inserts).toHaveLength(3);
    const other = await tools.add_to_shopping_list({ items: ["celery"] });
    expect(other.added).toBe(1);
  });

  it("won't add a recipe they don't have", async () => {
    expect((await tools.add_to_shopping_list({ recipe_names: ["lasagne"] })).error).toBe("not_found");
    expect(inserts).toHaveLength(0);
  });

  it("reads what's still to get, with counts", async () => {
    const res = await tools.get_shopping_list();
    expect(res.still_to_get).toEqual([{ aisle: "Fruit & veg", items: ["Celery", "Lemons, twice"] }]);
    expect(res.message).toMatch(/twice/);
  });

  it("ticks a line off in the shop (both copies of a merged line)", async () => {
    const res = await tools.tick_shopping_item({ item: "lemons" });
    expect(res.ticked).toBe(true);
    expect(patches[0].body).toEqual({ checked: true });
    expect(patches[0].url).toContain("bb");
    expect(patches[0].url).toContain("ccc");
  });
});

describe("the shopping list screen", () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
  it("shows the phone's copy without signal and keeps ticks for later", async () => {
    localStorage.setItem("cs_kitchen_shop_p1", JSON.stringify([row("a", "Celery")]));
    vi.stubGlobal("navigator", { ...navigator, onLine: false });
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    render(<ShoppingList profileId="p1" recipes={[]} />);
    expect(screen.getByText(/No signal/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Tick Celery" }));
    await screen.findByRole("button", { name: "Untick Celery" });
    expect(JSON.parse(localStorage.getItem("cs_kitchen_shop_pending_p1"))).toEqual([{ ids: ["a"], checked: true }]);
  });
});
