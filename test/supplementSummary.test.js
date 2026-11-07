import { describe, it, expect } from "vitest";
import { summarizeSupplements, supplementEventRow, supplementLabel } from "../src/lib/supplementEvents.js";

const FROM = "2026-10-09";
const TO = "2026-11-07";
const supp = (id, name, over = {}) => ({ id, name, dose_label: null, timing: "morning_food", created_at: "2026-01-01T00:00:00Z", ...over });
const tick = (id, local_date, status = "completed") => ({ item_id: `supp:${id}`, item_name: id, occurrence_slot: "morning_food", local_date, status });

describe("the supplement summary", () => {
  it("counts the days each one was ticked, out of the period", () => {
    const s = summarizeSupplements({
      supplements: [supp("a", "Vitamin C")],
      statusRows: [tick("a", "2026-11-06"), tick("a", "2026-11-07")],
      from: FROM, to: TO, trackingStart: FROM,
    });
    expect(s.periodDays).toBe(30);
    expect(s.current[0]).toMatchObject({ name: "Vitamin C", days: 2, ofDays: 30, onList: true });
  });

  it("only counts from the day a supplement was added", () => {
    const s = summarizeSupplements({
      supplements: [supp("a", "Vitamin C", { created_at: "2026-11-05T02:00:00Z" })],
      statusRows: [tick("a", "2026-11-05"), tick("a", "2026-11-06"), tick("a", "2026-11-07")],
      from: FROM, to: TO, trackingStart: FROM,
    });
    expect(s.current[0]).toMatchObject({ days: 3, ofDays: 3 });
  });

  it("doesn't count days from before ticks could be saved", () => {
    const s = summarizeSupplements({
      supplements: [supp("a", "Vitamin C")],
      statusRows: [tick("a", "2026-11-07"), tick("a", "2026-11-08")],
      from: "2026-08-10", to: "2026-11-08",
    });
    expect(s.current[0]).toMatchObject({ days: 2, ofDays: 2 });
  });

  it("ignores un-ticked days and days outside the period", () => {
    const s = summarizeSupplements({
      supplements: [supp("a", "Vitamin C")],
      statusRows: [tick("a", "2026-11-07", "uncompleted"), tick("a", "2026-01-01")],
      from: FROM, to: TO, trackingStart: FROM,
    });
    expect(s.current[0].days).toBe(0);
    expect(s.totalTicks).toBe(0);
  });

  it("keeps history for a supplement no longer on the list, with no made-up total", () => {
    const s = summarizeSupplements({ supplements: [], statusRows: [tick("gone", "2026-11-01")], from: FROM, to: TO, trackingStart: FROM });
    expect(s.current).toHaveLength(0);
    expect(s.previous[0]).toMatchObject({ name: "gone", days: 1, ofDays: null, onList: false });
  });

  it("shows supplements in the order of the day", () => {
    const s = summarizeSupplements({
      supplements: [supp("c", "Night", { timing: "evening" }), supp("a", "Early", { timing: "morning_empty" })],
      from: FROM, to: TO, trackingStart: FROM,
    });
    expect(s.current.map((x) => x.name)).toEqual(["Early", "Night"]);
  });
});

describe("a supplement tick", () => {
  it("uses the person's own name and amount", () => {
    expect(supplementLabel(supp("a", "B12", { dose_label: "2 drops" }))).toBe("B12 (2 drops)");
  });

  it("becomes one ledger row", () => {
    const row = supplementEventRow({
      userId: "u", profileId: "p", supplement: supp("a", "B12"), taken: false, source: "voice", date: TO,
    });
    expect(row).toMatchObject({
      user_id: "u", profile_id: "p", item_id: "supp:a", item_category: "supplement",
      occurrence_slot: "morning_food", event_type: "uncompleted", source: "voice", local_date: TO,
    });
  });
});
