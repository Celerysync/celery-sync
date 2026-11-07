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
  let tools;

  beforeEach(() => {
    localStorage.clear();
    rows = [item("a", "Lemon water"), item("b", "Morning walk"), item("c", "Evening walk")];
    ledgerWrites = [];
    rhythmWrites = [];
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
