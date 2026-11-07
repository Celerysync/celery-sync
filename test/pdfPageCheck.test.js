// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({ tables: {} }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table) => {
      const rows = () => db.tables[table] ?? [];
      const chain = {
        select: () => chain, eq: () => chain, gte: () => chain, lte: () => chain, order: () => chain, limit: () => chain, range: () => chain,
        maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
        then: (resolve) => resolve({ data: rows(), error: null }),
      };
      return chain;
    },
  }),
}));

const { makeProgressReport, makeDoctorReport, buildWeeklyPDF } = await import("../server/routes/memory.js");

const today = new Date().toISOString().split("T")[0];
const pages = (pdf) => (pdf.toString("latin1").match(/\/Type \/Page\b/g) || []).length;
const week = { week_start: today, week_end: today, avg_energy: 7, avg_mood: 4, protocol_days: 5, rhythm_completion_pct: 80 };

describe("a short report stays on one page", () => {
  beforeEach(() => {
    db.tables = {
      profiles: [{ name: "Sam" }],
      daily_checkins: [{ check_date: today, energy: 7, mood: 4, symptoms: [], rhythm_completed: 2, rhythm_total: 3 }],
      weekly_summaries: [week],
    };
  });

  it("wellness log", async () => expect(pages(await makeProgressReport("p1", "weekly"))).toBe(1));
  it("doctor report", async () => expect(pages(await makeDoctorReport("p1", 3))).toBe(1));
  it("weekly summary", async () => expect(pages(await buildWeeklyPDF(week))).toBe(1));
});
