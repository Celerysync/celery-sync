// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import process from "node:process";

const db = vi.hoisted(() => ({ tables: {}, ranges: [] }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table) => {
      let range = null;
      const rows = () => {
        const all = db.tables[table] ?? [];
        return range ? all.slice(range[0], range[1] + 1) : all;
      };
      const chain = {
        select: () => chain, eq: () => chain, not: () => chain, gte: () => chain, lte: () => chain, order: () => chain, limit: () => chain,
        range: (a, b) => { range = [a, b]; db.ranges.push([a, b]); return chain; },
        maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
        then: (resolve) => resolve({ data: rows(), error: null }),
      };
      return chain;
    },
  }),
}));

const { makeProgressReport, makeDoctorReport, buildWeeklyPDF, supplementSummaryFor } = await import("../server/routes/memory.js");

const today = new Date().toISOString().split("T")[0];
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString().split("T")[0];
const supp = (id, name, timing, dose_label = null) => ({ id, name, dose_label, timing, created_at: "2026-01-01T00:00:00Z" });
const tick = (id, n) => ({ item_id: `supp:${id}`, item_name: id, occurrence_slot: "morning_food", local_date: daysAgo(n), status: "completed" });

// Set SAVE_PDFS=<folder> to look at the real output by eye.
const keep = (name, buffer) => {
  if (process.env.SAVE_PDFS) fs.writeFileSync(`${process.env.SAVE_PDFS}/${name}.pdf`, buffer);
};
const isPdf = (buffer) => buffer.subarray(0, 5).toString() === "%PDF-";

describe("supplements in the PDF reports", () => {
  beforeEach(() => {
    db.ranges = [];
    const many = Array.from({ length: 30 }, (_, i) => supp(`s${i}`, `Supplement number ${i}`, "midday"));
    db.tables = {
      profiles: [{ name: "Sam" }],
      daily_checkins: [{ check_date: today, energy: 7, mood: 4, symptoms: [], rhythm_completed: 2, rhythm_total: 3 }],
      cycle_logs: [],
      weekly_summaries: [{ week_start: daysAgo(7), week_end: today, avg_energy: 7, avg_mood: 4, protocol_days: 5, rhythm_completion_pct: 80 }],
      healing_milestones: [],
      healing_profiles: [{ healing_summary: "" }],
      user_supplements: [
        supp("a", "Vitamin C", "morning_food", "1 scoop"),
        supp("b", "A very long supplement name that the person typed out in full, with every detail", "evening"),
        ...many,
      ],
      v_daily_status: [tick("a", 0), tick("a", 1), tick("gone", 3)],
    };
  });

  it("builds the wellness log, with enough supplements to run over a page", async () => {
    const pdf = await makeProgressReport("p1", "weekly");
    keep("wellness-log", pdf);
    expect(isPdf(pdf)).toBe(true);
  });

  it("builds the doctor report", async () => {
    const pdf = await makeDoctorReport("p1", 3);
    keep("doctor-report", pdf);
    expect(isPdf(pdf)).toBe(true);
  });

  it("adds 'what they made' to the doctor report only when they ask", async () => {
    db.tables.activity_events = [
      { item_id: "dinner", occurrence_slot: null, local_date: daysAgo(1), event_type: "completed", recipe_name: "Potato bake", occurred_at: `${daysAgo(1)}T08:00:00Z` },
      { item_id: "dinner", occurrence_slot: null, local_date: daysAgo(2), event_type: "completed", recipe_name: "Potato bake", occurred_at: `${daysAgo(2)}T08:00:00Z` },
    ];
    const without = await makeDoctorReport("p1", 3);
    const withMeals = await makeDoctorReport("p1", 3, false, { meals: true });
    keep("doctor-report-meals", withMeals);
    expect(isPdf(withMeals)).toBe(true);
    expect(withMeals.length).toBeGreaterThan(without.length);
  });

  it("builds the weekly summary", async () => {
    const supplements = await supplementSummaryFor("p1", daysAgo(7), today);
    const pdf = await buildWeeklyPDF(db.tables.weekly_summaries[0], false, supplements);
    keep("weekly-summary", pdf);
    expect(isPdf(pdf)).toBe(true);
  });

  it("still builds when someone has no supplements", async () => {
    db.tables.user_supplements = [];
    db.tables.v_daily_status = [];
    expect(isPdf(await makeProgressReport("p1", "weekly"))).toBe(true);
    expect(isPdf(await makeDoctorReport("p1", 3))).toBe(true);
  });

  it("includes a tick dated ahead of the server's UTC day", async () => {
    const tomorrow = new Date(Date.now() + 864e5).toISOString().split("T")[0];
    db.tables.user_supplements = [supp("a", "Vitamin C", "midday")];
    db.tables.v_daily_status = [{ ...tick("a", 0), local_date: tomorrow }];
    const summary = await supplementSummaryFor("p1", daysAgo(30));
    expect(summary.current[0].days).toBe(1);
  });

  it("reads past the 1,000 rows one request returns", async () => {
    db.tables.user_supplements = [supp("a", "Vitamin C", "midday")];
    db.tables.v_daily_status = Array.from({ length: 1500 }, () => tick("a", 0));
    const summary = await supplementSummaryFor("p1", daysAgo(180), today);
    expect(summary.totalTicks).toBe(1500);
    expect(db.ranges).toEqual([[0, 999], [1000, 1999]]);
  });
});
