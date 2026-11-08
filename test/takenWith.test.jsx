import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, renderHook, cleanup, waitFor } from "@testing-library/react";
import RhythmView from "../src/components/RhythmView.jsx";
import { useVoiceTools } from "../src/hooks/useVoiceTools.js";
import { supplementsByStep } from "../src/lib/supplementTicks.js";

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("supplements taken with a step", () => {
  it("are grouped by the step they go with", () => {
    const by = supplementsByStep([{ id: "1", name: "B12", with_item_id: "sm" }, { id: "2", name: "Zinc", with_item_id: "sm" }, { id: "3", name: "Mag" }]);
    expect(by.sm.map((s) => s.name)).toEqual(["B12", "Zinc"]);
    expect(Object.keys(by)).toEqual(["sm"]);
  });

  describe("on Today", () => {
    const smoothie = { id: "sm", name: "Smoothie", emoji: "🥤", completedAt: null, scheduledMs: null };
    const takenWith = { sm: [{ id: "1", name: "B12", timing: "morning_food" }, { id: "2", name: "Zinc", timing: "morning_food" }] };
    const show = (props) => render(<RhythmView sequence={[smoothie]} onComplete={vi.fn()} onUncomplete={vi.fn()} onEdit={vi.fn()} takenWith={takenWith} {...props} />);

    it("the step says what's taken with it", () => {
      show();
      expect(screen.getByText("💊 with B12, Zinc")).toBeTruthy();
    });

    it("ticking it offers to tick them too, and only ticks them if asked", async () => {
      const onTickTakenWith = vi.fn(async () => {});
      show({ onTickTakenWith });
      fireEvent.click(screen.getByRole("button", { name: "Mark Smoothie as done" }));
      expect(screen.getByText("Did you have B12 and Zinc with it?")).toBeTruthy();
      expect(onTickTakenWith).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "Tick them too" }));
      await waitFor(() => expect(onTickTakenWith).toHaveBeenCalledWith(takenWith.sm));
    });

    it("'Not now' just closes the offer", () => {
      const onTickTakenWith = vi.fn();
      show({ onTickTakenWith });
      fireEvent.click(screen.getByRole("button", { name: "Mark Smoothie as done" }));
      fireEvent.click(screen.getByRole("button", { name: "Not now" }));
      expect(screen.queryByText(/Did you have/)).toBeNull();
      expect(onTickTakenWith).not.toHaveBeenCalled();
    });
  });

  describe("with Fern", () => {
    let rhythm, supps, writes, patches, tools;
    beforeEach(() => {
      localStorage.clear();
      rhythm = [{ id: "sm", name: "Smoothie", category: "morning", frequency: "daily", sort_order: 1, archived_at: null }];
      supps = [{ id: "b12", name: "B12", dose_label: null, with_item_id: "sm" }];
      writes = []; patches = [];
      vi.stubGlobal("fetch", vi.fn(async (url, init = {}) => {
        const u = String(url); const method = init.method || "GET";
        if (u.includes("activity_events") && method === "POST") { writes.push(JSON.parse(init.body)); return json([], 201); }
        if (u.includes("user_supplements") && method === "PATCH") { patches.push(JSON.parse(init.body)); return json([]); }
        if (u.includes("user_supplements") && method === "POST") { writes.push({ supp: JSON.parse(init.body) }); return json([], 201); }
        if (u.includes("user_supplements")) return json(u.includes("with_item_id=eq.sm") ? supps : supps.map(({ with_item_id: _w, ...s }) => s));
        if (u.includes("rhythm_items")) return json(rhythm);
        return json([]);
      }));
      tools = renderHook(() => useVoiceTools({ id: "u1" }, "p1", () => {})).result.current;
    });

    it("after a tick, knows what's usually taken with it and asks first", async () => {
      const res = await tools.mark_activity({ item_name: "smoothie" });
      expect(res.taken_with).toEqual(["B12"]);
      expect(res.message).toMatch(/Ask if they had it too; only if they say yes/);
      expect(writes).toHaveLength(1); // the smoothie only, not the B12
    });

    it("'I take B12 with my smoothie' links the one they already have", async () => {
      const res = await tools.add_supplement({ name: "B12", with_item: "smoothie" });
      expect(res.linked).toBe("B12");
      expect(patches[0]).toEqual({ with_item_id: "sm" });
    });

    it("a new supplement can be added already linked", async () => {
      await tools.add_supplement({ name: "Zinc", with_item: "smoothie" });
      expect(writes[0].supp).toMatchObject({ name: "Zinc", with_item_id: "sm" });
    });
  });
});
