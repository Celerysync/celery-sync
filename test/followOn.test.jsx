import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";
import { expandOccurrences, relativeTimes, doneMinutesFrom } from "../src/lib/rhythmSchedule.js";
import { buildProgramItem } from "../src/lib/savedRhythms.js";
import { useVoiceTools } from "../src/hooks/useVoiceTools.js";

describe("steps timed from another step", () => {
  const snack = { id: "s", name: "Snack", schedule: { type: "every_after", after: "cj", everyMinutes: 90, until: "18:00" } };
  const cj30 = { id: "c", name: "Celery juice", schedule: { type: "after", after: "lemon", minutes: 30 } };

  it("have no time until the earlier step is ticked", () => {
    expect(relativeTimes(cj30, { doneMinutes: {} })).toEqual([]);
    expect(expandOccurrences([cj30], { doneMinutes: {} })[0].fixedTime).toBeNull();
  });

  it("then get their real time", () => {
    expect(relativeTimes(cj30, { doneMinutes: { lemon: 7 * 60 + 10 } })).toEqual(["07:40"]);
  });

  it("repeat every N minutes until the end time", () => {
    const times = relativeTimes(snack, { doneMinutes: { cj: 7 * 60 } });
    expect(times[0]).toBe("08:30");
    expect(times.at(-1)).toBe("17:30");
    expect(times).toHaveLength(7);
    const occs = expandOccurrences([snack], { doneMinutes: { cj: 7 * 60 } });
    expect(occs.map((o) => o.id)).toContain("s@08:30");
  });

  it("use the first tick of the day", () => {
    const done = doneMinutesFrom({ cj: "2026-11-09T07:20:00", "cj@x": "2026-11-09T07:05:00" }, (d) => d.getHours() * 60 + d.getMinutes());
    expect(done.cj).toBe(7 * 60 + 5);
  });
});

describe("program steps", () => {
  it("can carry a set time", () => {
    const it1 = buildProgramItem({ name: "Steamed potatoes", time: "12:00" }, 3, 1);
    expect(it1).toMatchObject({ fixedTime: "12:00", schedule: { type: "times", times: ["12:00"] } });
    expect(buildProgramItem({ name: "Rest" }, 3, 2).fixedTime).toBeNull();
  });
});

describe("Fern setting timing by voice", () => {
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  let rows, inserts, patches, tools;
  beforeEach(() => {
    rows = [{ id: "cj", name: "Celery juice", sort_order: 1, archived_at: null }, { id: "lw", name: "Lemon water", sort_order: 0, archived_at: null }];
    inserts = []; patches = [];
    vi.stubGlobal("fetch", vi.fn(async (url, init = {}) => {
      const method = init.method || "GET";
      if (String(url).includes("rhythm_items") && method === "POST") { inserts.push(JSON.parse(init.body)); return json([], 201); }
      if (String(url).includes("rhythm_items") && method === "PATCH") { patches.push(JSON.parse(init.body)); return json([]); }
      if (String(url).includes("rhythm_items")) return json(rows);
      return json([]);
    }));
    tools = renderHook(() => useVoiceTools({ id: "u1" }, "p1", () => {})).result.current;
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("'a snack every 90 minutes after celery juice until 6pm'", async () => {
    const res = await tools.log_rhythm_item({ name: "Snack", after_item: "celery juice", every_minutes: 90, until: "18:00" });
    expect(res.saved).toBe(true);
    expect(inserts[0].schedule).toEqual({ type: "every_after", after: "cj", everyMinutes: 90, until: "18:00" });
    expect(inserts[0].fixed_time).toBeNull();
    expect(res.message).toContain("once they tick Celery juice");
  });

  it("'my celery juice 30 minutes after lemon water'", async () => {
    const res = await tools.update_rhythm_item({ item_name: "celery juice", after_item: "lemon water", after_minutes: 30 });
    expect(res.saved).toBe(true);
    expect(patches[0].schedule).toEqual({ type: "after", after: "lw", minutes: 30 });
  });

  it("asks when it can't tell which step they mean", async () => {
    const res = await tools.log_rhythm_item({ name: "Snack", after_item: "yoga", after_minutes: 30 });
    expect(res.error).toBe("not_found");
    expect(inserts).toHaveLength(0);
  });
});
