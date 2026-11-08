import { describe, it, expect } from "vitest";
import { madeCounts, timesText, daysBefore, loadMade } from "../src/lib/whatYouMade.js";

const ev = (item, date, type, recipe, at, slot = null) => ({ item_id: item, occurrence_slot: slot, local_date: date, event_type: type, recipe_name: recipe, occurred_at: at });

describe("what you made", () => {
  it("counts each recipe once per step and day", () => {
    const out = madeCounts([
      ev("dinner", "2026-11-09", "completed", "Potato bake", "2026-11-09T08:00:00Z"),
      ev("dinner", "2026-11-10", "completed", "Potato bake", "2026-11-10T08:00:00Z"),
      ev("smoothie", "2026-11-10", "completed", "Green smoothie", "2026-11-09T21:00:00Z"),
    ]);
    expect(out).toEqual([
      { name: "Potato bake", count: 2, lastDate: "2026-11-10" },
      { name: "Green smoothie", count: 1, lastDate: "2026-11-10" },
    ]);
  });

  it("a tick that was taken back doesn't count", () => {
    const out = madeCounts([
      ev("dinner", "2026-11-09", "completed", "Potato bake", "2026-11-09T08:00:00Z"),
      ev("dinner", "2026-11-09", "uncompleted", null, "2026-11-09T08:05:00Z"),
    ]);
    expect(out).toEqual([]);
  });

  it("ticked again after taking it back counts once", () => {
    const out = madeCounts([
      ev("dinner", "2026-11-09", "completed", "Potato bake", "2026-11-09T08:00:00Z"),
      ev("dinner", "2026-11-09", "uncompleted", null, "2026-11-09T08:05:00Z"),
      ev("dinner", "2026-11-09", "completed", "Potato bake", "2026-11-09T08:10:00Z"),
    ]);
    expect(out[0].count).toBe(1);
  });

  it("ticks without a recipe aren't counted", () => {
    expect(madeCounts([ev("walk", "2026-11-09", "completed", null, "2026-11-09T08:00:00Z")])).toEqual([]);
  });

  it("says it plainly", () => {
    expect([timesText(1), timesText(2), timesText(5)]).toEqual(["once", "twice", "5 times"]);
    expect(daysBefore("2026-11-08", 6)).toBe("2026-11-02");
    expect(daysBefore("2026-03-01", 1)).toBe("2026-02-28");
  });

  it("reads only that person's recipe ticks and un-ticks in the range", async () => {
    const calls = [];
    const q = (rows) => {
      const b = { filters: [] };
      const chain = new Proxy(b, { get: (t, k) => (k === "then" ? (res) => res({ data: rows, error: null }) : (...a) => { calls.push([k, ...a]); return chain; }) });
      return chain;
    };
    let n = 0;
    const client = { from: () => { n += 1; return q(n === 1 ? [ev("d", "2026-11-09", "completed", "Soup", "2026-11-09T08:00:00Z")] : []); } };
    const out = await loadMade(client, "p1", "2026-11-02", "2026-11-08");
    expect(out).toEqual([{ name: "Soup", count: 1, lastDate: "2026-11-09" }]);
    expect(calls).toContainEqual(["eq", "profile_id", "p1"]);
    expect(calls).toContainEqual(["not", "recipe_name", "is", null]);
    expect(calls).toContainEqual(["eq", "event_type", "uncompleted"]);
  });
});
