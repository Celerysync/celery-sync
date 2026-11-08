import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { reconcileRunningProgram, startProgramInAccount, endProgramInAccount, programFromRow } from "../src/lib/activeProgram.js";

// A tiny fake of the database's REST API: one active_protocols table.
let rows;
let calls;
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  rows = [];
  calls = [];
  vi.stubGlobal("fetch", vi.fn(async (url, init = {}) => {
    const u = new URL(String(url));
    const method = init.method || "GET";
    calls.push(method);
    const single = (new Headers(init.headers).get("accept") || "").includes("vnd.pgrst.object");
    const eqId = u.searchParams.get("id")?.replace("eq.", "");
    if (method === "POST") {
      const row = { id: `row${rows.length + 1}`, completed: false, abandoned: false, chained_from_id: null, ...JSON.parse(init.body) };
      rows.push(row);
      return json(single ? row : [row], 201);
    }
    if (method === "PATCH") {
      const patch = JSON.parse(init.body);
      const hit = rows.filter((r) => r.id === eqId);
      hit.forEach((r) => Object.assign(r, patch));
      return json(single ? hit[0] : hit);
    }
    let found = rows;
    if (eqId) found = found.filter((r) => r.id === eqId);
    if (u.searchParams.get("completed") === "eq.false") found = found.filter((r) => !r.completed && !r.abandoned && r.items);
    return json(single ? (found[found.length - 1] ?? null) : found);
  }));
});
afterEach(() => vi.unstubAllGlobals());

const program = { id: "sr-0b9c1d2e-3f40-4a5b-8c6d-7e8f9a0b1c2d", name: "My 3-day mono cleanse", totalDays: 3, items: [{ id: "i1", name: "Potatoes and lettuce", programDayRange: [1, 3] }] };

describe("the running program lives in the account", () => {
  it("is saved with its steps and its saved-program link", async () => {
    const started = await startProgramInAccount({ profileId: "p1", program, startDate: "2026-11-08" });
    expect(rows[0]).toMatchObject({ profile_id: "p1", program_name: "My 3-day mono cleanse", total_days: 3, saved_rhythm_id: "0b9c1d2e-3f40-4a5b-8c6d-7e8f9a0b1c2d" });
    expect(rows[0].items).toHaveLength(1);
    expect(started).toMatchObject({ name: "My 3-day mono cleanse", startDate: "2026-11-08", dbId: "row1" });
  });

  it("shows the account's program on a device that had nothing", async () => {
    await startProgramInAccount({ profileId: "p1", program, startDate: "2026-11-08" });
    const shown = await reconcileRunningProgram("p1", null);
    expect(shown?.name).toBe("My 3-day mono cleanse");
  });

  it("copies a phone-only program up once, instead of losing it", async () => {
    const legacy = { ...program, startDate: "2026-11-07", dbId: null };
    const shown = await reconcileRunningProgram("p1", legacy);
    expect(rows).toHaveLength(1);
    expect(rows[0].start_date).toBe("2026-11-07");
    expect(shown.dbId).toBe("row1");
  });

  it("fills in the steps for an older account row that had none", async () => {
    rows.push({ id: "old", profile_id: "p1", program_name: program.name, start_date: "2026-11-07", total_days: 3, items: null, completed: false, abandoned: false });
    const shown = await reconcileRunningProgram("p1", { ...program, startDate: "2026-11-07", dbId: "old" });
    expect(rows).toHaveLength(1);
    expect(rows[0].items).toHaveLength(1);
    expect(shown.dbId).toBe("old");
  });

  it("clears a phone's copy when it was ended on another device", async () => {
    rows.push({ id: "old", profile_id: "p1", program_name: program.name, items: program.items, completed: false, abandoned: true });
    const shown = await reconcileRunningProgram("p1", { ...program, dbId: "old" });
    expect(shown).toBeNull();
    expect(calls).not.toContain("POST");
  });

  it("marks an early end as abandoned and a finished one as completed", async () => {
    await startProgramInAccount({ profileId: "p1", program });
    await endProgramInAccount("row1");
    expect(rows[0].abandoned).toBe(true);
    await startProgramInAccount({ profileId: "p1", program });
    await endProgramInAccount("row2", { completed: true });
    expect(rows[1].completed).toBe(true);
  });

  it("saves an older program whose id isn't a saved-program link", async () => {
    await startProgramInAccount({ profileId: "p1", program: { ...program, id: "sr-legacy" } });
    expect(rows[0].saved_rhythm_id).toBeNull();
    await startProgramInAccount({ profileId: "p1", program: { ...program, id: "369" } });
    expect(rows[1].saved_rhythm_id).toBeNull();
  });

  it("still starts when its saved program was deleted", async () => {
    let first = true;
    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", vi.fn(async (url, init = {}) => {
      if ((init.method || "GET") === "POST" && first) {
        first = false;
        return json({ code: "23503", message: "violates foreign key constraint" }, 409);
      }
      return realFetch(url, init);
    }));
    const id = "sr-11111111-2222-3333-4444-555555555555";
    const started = await startProgramInAccount({ profileId: "p1", program: { ...program, id } });
    expect(started?.name).toBe("My 3-day mono cleanse");
    expect(rows[0].saved_rhythm_id).toBeNull();
  });

  it("ignores a row without steps", () => {
    expect(programFromRow({ id: "x", items: null })).toBeNull();
  });
});
