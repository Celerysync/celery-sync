import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { useVoiceTools } from "../src/hooks/useVoiceTools.js";

const item = (id, name) => ({ id, name, category: "other", frequency: "daily", sort_order: 1 });
const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("what the voice helper can do to someone's rhythm", () => {
  let rows;
  let ledgerWrites;
  let rhythmWrites;
  let supplements;
  let suppStatus;
  let inventory;
  let stockWrites;
  let tools;

  beforeEach(() => {
    localStorage.clear();
    rows = [item("a", "Lemon water"), item("b", "Morning walk"), item("c", "Evening walk")];
    ledgerWrites = [];
    rhythmWrites = [];
    supplements = [];
    suppStatus = [];
    inventory = null;
    stockWrites = [];
    vi.stubGlobal("fetch", vi.fn(async (url, init = {}) => {
      const u = String(url);
      const method = init.method || "GET";
      if (u.includes("activity_events") && method === "POST") {
        ledgerWrites.push(JSON.parse(init.body));
        return jsonResponse([], 201);
      }
      if (u.includes("rhythm_items") && method === "PATCH") {
        rhythmWrites.push(JSON.parse(init.body));
        return jsonResponse([]);
      }
      if (u.includes("rhythm_items")) return jsonResponse(rows);
      if (u.includes("user_supplements")) return jsonResponse(supplements);
      if (u.includes("v_daily_status") && u.includes("item_category")) return jsonResponse(suppStatus);
      if (u.includes("supplement_inventory") && method === "PATCH") {
        stockWrites.push(JSON.parse(init.body));
        return jsonResponse([]);
      }
      if (u.includes("supplement_inventory")) return jsonResponse(inventory);
      return jsonResponse([]);
    }));
    const { result } = renderHook(() => useVoiceTools({ id: "user-1" }, "profile-1", () => {}));
    tools = result.current;
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("ticks an item as one 'voice' row in the ledger", async () => {
    const res = await tools.mark_activity({ item_name: "lemon water" });
    expect(res.marked).toBe("Lemon water");
    expect(ledgerWrites).toHaveLength(1);
    expect(ledgerWrites[0]).toMatchObject({
      user_id: "user-1", profile_id: "profile-1", item_id: "a",
      event_type: "completed", source: "voice",
    });
  });

  it("un-ticks by adding a reversal, never deleting", async () => {
    await tools.mark_activity({ item_name: "lemon water", action: "uncomplete" });
    expect(ledgerWrites[0].event_type).toBe("uncompleted");
  });

  it("asks rather than guesses when several items match", async () => {
    const res = await tools.mark_activity({ item_name: "walk" });
    expect(res.error).toBe("ambiguous");
    expect(ledgerWrites).toHaveLength(0);
  });

  it("asks when nothing matches, and writes nothing", async () => {
    const res = await tools.mark_activity({ item_name: "yoga" });
    expect(res.error).toBe("not_found");
    expect(ledgerWrites).toHaveLength(0);
  });

  describe("supplements", () => {
    const supp = (id, name, timing = "morning_food") => ({ id, name, dose_label: null, timing });

    it("ticks a supplement as one 'voice' row in the ledger", async () => {
      supplements = [supp("s1", "Vitamin C")];
      const res = await tools.mark_activity({ item_name: "took my vitamin c" });
      expect(res).toMatchObject({ saved: true, marked: "Vitamin C", is_supplement: true });
      expect(ledgerWrites[0]).toMatchObject({
        item_id: "supp:s1", item_category: "supplement", event_type: "completed", source: "voice",
      });
    });

    it("ticks the next one not yet taken when it's on the list twice", async () => {
      supplements = [supp("am", "B12"), supp("pm", "B12", "evening")];
      suppStatus = [{ item_id: "supp:am", status: "completed" }];
      await tools.mark_activity({ item_name: "b12" });
      expect(ledgerWrites[0]).toMatchObject({ item_id: "supp:pm", occurrence_slot: "evening" });
    });

    it("writes nothing when it's already ticked", async () => {
      supplements = [supp("s1", "Vitamin C")];
      suppStatus = [{ item_id: "supp:s1", status: "completed" }];
      const res = await tools.mark_activity({ item_name: "vitamin c" });
      expect(res.changed_nothing).toBe(true);
      expect(ledgerWrites).toHaveLength(0);
    });

    it("asks when two different supplements match", async () => {
      supplements = [supp("c", "Vitamin C"), supp("d", "Vitamin D")];
      const res = await tools.mark_activity({ item_name: "vitamin" });
      expect(res.error).toBe("ambiguous");
      expect(ledgerWrites).toHaveLength(0);
    });

    it("asks when a rhythm item and a supplement both match", async () => {
      rows = [item("a", "Lemon water")];
      supplements = [supp("s1", "Lemon balm")];
      const res = await tools.mark_activity({ item_name: "lemon" });
      expect(res.error).toBe("ambiguous");
    });

    it("follows the dose in optional stock tracking", async () => {
      supplements = [supp("s1", "Vitamin C")];
      inventory = { units_on_hand: 10, units_per_dose: 2 };
      await tools.mark_activity({ item_name: "vitamin c" });
      expect(stockWrites[0].units_on_hand).toBe(8);
    });

    it("tells the helper what's ticked today, apart from the rhythm count", async () => {
      supplements = [supp("s1", "Vitamin C")];
      suppStatus = [{ item_id: "supp:s1", status: "completed" }];
      const res = await tools.get_today_status();
      expect(res.supplements).toEqual([{ name: "Vitamin C", when: "Morning, with food", taken: true }]);
      expect(res.total).toBe(3);
      expect(res.completed).toBe(0);
    });
  });

  it("won't remove anything without a spoken yes", async () => {
    const res = await tools.remove_rhythm_item({ item_name: "Lemon water" });
    expect(res.needs_confirmation).toBe(true);
    expect(rhythmWrites).toHaveLength(0);
  });

  it("removes by archiving, so history is kept", async () => {
    const res = await tools.remove_rhythm_item({ item_name: "Lemon water", confirmed: true });
    expect(res.removed).toBe("Lemon water");
    expect(rhythmWrites[0]).toMatchObject({ changed_via: "voice" });
    expect(rhythmWrites[0].archived_at).toBeTruthy();
  });
});
