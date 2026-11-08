import { describe, it, expect } from "vitest";
import { buildMonthSummary, monthRange, monthSentences } from "../src/lib/monthSummary.js";

const range = { start: "2026-10-01", end: "2026-10-31", label: "October", year: 2026, days: 31, sofar: false };
const tick = (date, name, cat = "morning", id = name) => ({ item_id: id, item_name: name, item_category: cat, local_date: date, status: "completed" });

describe("Your month", () => {
  const statusRows = [
    tick("2026-10-01", "Celery juice"), tick("2026-10-02", "Celery juice"), tick("2026-10-03", "Celery juice"),
    tick("2026-10-02", "Lemon water"),
    { ...tick("2026-10-04", "Lemon water"), status: "uncompleted" },
    tick("2026-10-01", "B12", "supplement", "supp:1"), tick("2026-10-05", "B12", "supplement", "supp:1"),
    { item_id: "water", item_name: "Water", item_category: "water", local_date: "2026-10-01", status: "completed" },
    { item_id: "water", item_name: "Water", item_category: "water", local_date: "2026-10-01", status: "completed" },
    { item_id: "water", item_name: "Water", item_category: "water", local_date: "2026-10-02", status: "completed" },
  ];
  const checkins = ["01", "03", "05", "20", "22", "25"].map((d, i) => ({ check_date: `2026-10-${d}`, energy: i < 3 ? 4 : 6 }));
  const events = [{ item_id: "d", occurrence_slot: null, local_date: "2026-10-03", event_type: "completed", recipe_name: "Potato bake", occurred_at: "2026-10-03T08:00:00Z" }];
  const programs = [{ program_name: "Mono cleanse", end_date: "2026-10-12", completed: true }, { program_name: "Old", end_date: "2026-09-01", completed: true }];
  const s = buildMonthSummary({ range, statusRows, events, checkins, programs });

  it("counts what they kept up, from their own ticks", () => {
    expect(s.showedUpDays).toBe(3); // supplements and water don't count as routine days
    expect(s.totalTicks).toBe(4);
    expect(s.topSteps[0]).toEqual({ name: "Celery juice", count: 3 });
    expect(s.suppDays).toBe(2);
    expect(s.waterDays).toBe(2);
    expect(s.waterAvg).toBe(1.5);
    expect(s.made).toEqual([{ name: "Potato bake", count: 1, lastDate: "2026-10-03" }]);
    expect(s.energy).toEqual({ first: 4, second: 6 });
    expect(s.finished).toEqual(["Mono cleanse"]);
  });

  it("says it in plain, descriptive words, never what it did for them", () => {
    const text = monthSentences(s, "Jo").join(" ");
    expect(text).toMatch(/In October, Jo, you kept up your routine on 3 days of 31/);
    expect(text).toMatch(/Celery juice \(3 times\)/);
    expect(text).toMatch(/averaged 4 out of 10 in the first half of the month, and 6 in the second half/);
    expect(text).toMatch(/You finished Mono cleanse/);
    expect(text).not.toMatch(/improv|better|heal|cure|treat|worked|because/i);
  });

  it("an empty month says how to start", () => {
    const e = buildMonthSummary({ range, statusRows: [], checkins: [] });
    expect(monthSentences(e)[0]).toBe("Nothing was logged in October.");
    expect(monthSentences({ ...e, range: { ...range, sofar: true } })[0]).toMatch(/nothing logged yet/);
  });

  it("this month and last month", () => {
    const now = new Date(2026, 10, 8);
    expect(monthRange("this", now)).toMatchObject({ start: "2026-11-01", end: "2026-11-08", label: "November", days: 8, sofar: true });
    expect(monthRange("last", now)).toMatchObject({ start: "2026-10-01", end: "2026-10-31", label: "October", days: 31, sofar: false });
    expect(monthRange("last", new Date(2026, 0, 3))).toMatchObject({ start: "2025-12-01", end: "2025-12-31" });
  });
});
