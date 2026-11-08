import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { useVoiceTools } from "../src/hooks/useVoiceTools.js";
import { summarizePrograms } from "../src/lib/programHistory.js";

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("Fern and programs", () => {
  let rhythm, saved, writes, patches, tools;

  beforeEach(() => {
    localStorage.clear();
    rhythm = [
      { id: "cj", name: "Celery juice", category: "morning", frequency: "daily", sort_order: 1, fixed_time: "07:00" },
      { id: "sm", name: "Smoothie", category: "morning", frequency: "daily", sort_order: 2, spacing_minutes: 15 },
      { id: "mg", name: "Magnesium", category: "supplement", frequency: "daily", sort_order: 3, fixed_time: "21:00" },
    ];
    saved = [];
    writes = [];
    patches = [];
    vi.stubGlobal("fetch", vi.fn(async (url, init = {}) => {
      const u = String(url);
      const method = init.method || "GET";
      if (u.includes("activity_events") && method === "POST") { writes.push(JSON.parse(init.body)); return json([], 201); }
      if (u.includes("active_protocols") && method === "PATCH") { patches.push(JSON.parse(init.body)); return json([]); }
      if (u.includes("saved_rhythms") && method === "GET") return json(u.includes("limit=1") ? (saved[0] ?? null) : saved);
      if (u.includes("saved_rhythms")) { writes.push({ saved: JSON.parse(init.body) }); return json([], 201); }
      if (u.includes("rhythm_items")) return json(rhythm);
      return json([]);
    }));
    tools = renderHook(() => useVoiceTools({ id: "u1" }, "p1", () => {})).result.current;
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("after a tick, knows what comes next and when", async () => {
    const res = await tools.mark_activity({ item_name: "celery juice" });
    expect(res.marked).toBe("Celery juice");
    expect(res.next_up).toMatchObject({ name: "Smoothie", minutes_after_previous: 15 });
  });

  it("knows the program day, and that a program step is next", async () => {
    const today = new Date();
    const start = new Date(today.getTime() - 86_400_000);
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    localStorage.setItem("cs_active_program", JSON.stringify({
      id: "sr-x", name: "Mono cleanse", startDate: iso(start), totalDays: 3, dbId: "row1",
      items: [{ id: "pot", name: "Steamed potatoes", fixedTime: "12:00", programDayRange: [1, 3], durationType: "cleanse", programId: "sr-x", frequency: "daily", sortOrder: 1 }],
    }));
    const res = await tools.mark_activity({ item_name: "smoothie" });
    expect(res.program).toEqual({ name: "Mono cleanse", day: 2, total_days: 3 });
    expect(res.next_up).toMatchObject({ name: "Steamed potatoes", time: "12:00", in_program: true });
  });

  it("never overwrites a saved program without asking", async () => {
    saved = [{ id: "s1" }];
    const args = { name: "Mono cleanse", total_days: 3, items: [{ name: "Steamed potatoes" }] };
    // Saying replace: true before being asked doesn't count.
    const early = await tools.save_program({ ...args, replace: true });
    expect(early.needs_choice).toBe(true);
    expect(writes).toHaveLength(0);
    const res = await tools.save_program(args);
    expect(res.needs_choice).toBe(true);
    expect(writes).toHaveLength(0);
    await tools.save_program({ ...args, replace: true });
    expect(writes).toHaveLength(1);
  });

  it("records 'I've finished' as finished, not ended early", async () => {
    localStorage.setItem("cs_active_program", JSON.stringify({ id: "sr-x", name: "9-day", startDate: "2026-11-01", totalDays: 9, dbId: "row1", items: [{ id: "a", name: "x" }] }));
    const ask = await tools.end_program({ finished: true });
    expect(ask.message).toContain("finished");
    const res = await tools.end_program({ finished: true, confirmed: true });
    expect(res.finished).toBe(true);
    expect(patches[0]).toMatchObject({ completed: true });
  });
});

describe("program history", () => {
  const row = (over) => ({ id: "r", program_id: "sr-a", program_name: "9-day", start_date: "2026-11-01", end_date: null, total_days: 9, completed: false, abandoned: false, chained_from_id: null, ...over });
  const tick = (local_date, program_id = "sr-a") => ({ program_id, local_date, status: "completed" });

  it("lists each run with its status and the days ticked, newest first", () => {
    const h = summarizePrograms([
      row({ id: "a", completed: true }),
      row({ id: "b", program_id: "sr-m", program_name: "Mono", start_date: "2026-11-12", total_days: 3, chained_from_id: null }),
    ], [tick("2026-11-01"), tick("2026-11-01"), tick("2026-11-02"), tick("2026-11-12", "sr-m")], "2026-11-13");
    expect(h.map((p) => p.name)).toEqual(["Mono", "9-day"]);
    expect(h[1]).toMatchObject({ status: "finished", daysTicked: 2, endDate: "2026-11-09" });
    expect(h[0]).toMatchObject({ status: "running", daysTicked: 1 });
  });

  it("an early end shows its real end date and counts only up to it", () => {
    const [p] = summarizePrograms([row({ abandoned: true, end_date: "2026-11-03" })], [tick("2026-11-02"), tick("2026-11-05")], "2026-11-13");
    expect(p).toMatchObject({ status: "ended_early", endDate: "2026-11-03", daysTicked: 1 });
  });

  it("a program finished before its planned end shows the day it finished", () => {
    const [p] = summarizePrograms([row({ completed: true, end_date: "2026-11-04" })], [], "2026-11-13");
    expect(p).toMatchObject({ status: "finished", endDate: "2026-11-04" });
  });

  it("a repeated round is marked as another round, counted separately", () => {
    const h = summarizePrograms([
      row({ id: "1", start_date: "2026-10-01", completed: true }),
      row({ id: "2", start_date: "2026-11-01", chained_from_id: "1" }),
    ], [tick("2026-10-02"), tick("2026-11-02")], "2026-11-05");
    expect(h[0]).toMatchObject({ round: "another round", daysTicked: 1 });
    expect(h[1]).toMatchObject({ round: null, daysTicked: 1 });
  });
});
