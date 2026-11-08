// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({ tables: {}, updates: [] }));
const sendNotification = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("web-push", () => ({ default: { sendNotification, setVapidDetails: vi.fn() } }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table) => {
      const result = () => ({ data: db.tables[table] ?? [], error: null });
      const chain = {
        select: () => chain, eq: () => chain, is: () => chain, or: () => chain, not: () => chain,
        order: () => chain, limit: () => chain,
        maybeSingle: async () => ({ data: (db.tables[table] ?? [])[0] ?? null, error: null }),
        update: (values) => { db.updates.push({ table, values }); return chain; },
        delete: () => chain,
        then: (resolve) => resolve(result()),
      };
      return chain;
    },
  }),
}));

const { sendRhythmReminders } = await import("../server/routes/rhythm.js");

// Sydney is UTC+11 in November: 07:00 local on 9 Nov is 20:00 UTC on 8 Nov.
const at = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(2026, 10, 8, 20, 0) + ((h - 7) * 60 + m) * 60_000);
};
const tickedAt = (hhmm) => at(hhmm).toISOString();
const item = (over) => ({
  id: "a", name: "Lemon water", emoji: "🍋", frequency: "daily", sort_order: 1,
  schedule: null, fixed_time: null, spacing_minutes: 0,
  duration_type: "ongoing", duration_days: null, start_date: null,
  last_reminded_on: null, reminded_slots: [],
  ...over,
});
const titles = () => sendNotification.mock.calls.map((c) => JSON.parse(c[1]).title);

beforeEach(() => {
  sendNotification.mockClear();
  db.updates = [];
  db.tables = {
    push_subscriptions: [{ user_id: "u1", endpoint: "e", keys: {}, timezone: "Australia/Sydney" }],
    profiles: [{ id: "p1" }],
    v_daily_status: [],
    active_protocols: [],
  };
});

describe("reminders at a set time", () => {
  it("arrive at the time, in the person's own time zone", async () => {
    db.tables.rhythm_items = [item({ fixed_time: "07:00", schedule: { type: "times", times: ["07:00"] } })];
    await sendRhythmReminders(at("07:02"));
    expect(titles()).toEqual(["🍋 Lemon water"]);
    expect(db.updates[0]).toMatchObject({ table: "rhythm_items", values: { last_reminded_on: "2026-11-09", reminded_slots: ["07:00"] } });
  });

  it("a 7:30 step isn't reminded at 7:00", async () => {
    db.tables.rhythm_items = [item({ fixed_time: "07:30", schedule: { type: "times", times: ["07:30"] } })];
    await sendRhythmReminders(at("07:00"));
    expect(sendNotification).not.toHaveBeenCalled();
    await sendRhythmReminders(at("07:31"));
    expect(sendNotification).toHaveBeenCalledTimes(1);
  });

  it("aren't sent for something already ticked", async () => {
    db.tables.rhythm_items = [item({ fixed_time: "07:00" })];
    db.tables.v_daily_status = [{ item_id: "a", occurrence_slot: null, status: "completed", occurred_at: tickedAt("06:50") }];
    await sendRhythmReminders(at("07:02"));
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("aren't sent twice", async () => {
    db.tables.rhythm_items = [item({ fixed_time: "07:00", last_reminded_on: "2026-11-09", reminded_slots: ["07:00"] })];
    await sendRhythmReminders(at("07:04"));
    expect(sendNotification).not.toHaveBeenCalled();
  });
});

describe("reminders that follow on from a real tick", () => {
  const lemon = item({ id: "lemon", name: "Lemon water", fixed_time: null });

  it("'30 minutes after lemon water' comes 30 minutes after it was ticked", async () => {
    db.tables.rhythm_items = [lemon, item({ id: "cj", name: "Celery juice", sort_order: 2, schedule: { type: "after", after: "lemon", minutes: 30 } })];
    db.tables.v_daily_status = [{ item_id: "lemon", occurrence_slot: null, status: "completed", occurred_at: tickedAt("07:10") }];
    await sendRhythmReminders(at("07:30"));
    expect(sendNotification).not.toHaveBeenCalled();
    await sendRhythmReminders(at("07:41"));
    expect(titles()).toEqual(["🍋 Celery juice"]);
  });

  it("nothing follows on if the earlier step isn't ticked", async () => {
    db.tables.rhythm_items = [lemon, item({ id: "cj", name: "Celery juice", sort_order: 2, schedule: { type: "after", after: "lemon", minutes: 30 } })];
    await sendRhythmReminders(at("07:40"));
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("'every 90 minutes after celery juice, until 6pm' repeats from the tick", async () => {
    db.tables.rhythm_items = [
      item({ id: "cj", name: "Celery juice" }),
      item({ id: "snack", name: "Snack", sort_order: 2, schedule: { type: "every_after", after: "cj", everyMinutes: 90, until: "18:00" } }),
    ];
    db.tables.v_daily_status = [{ item_id: "cj", occurrence_slot: null, status: "completed", occurred_at: tickedAt("07:20") }];
    await sendRhythmReminders(at("08:52"));
    expect(titles()).toEqual(["🍋 Snack"]);
    sendNotification.mockClear();
    await sendRhythmReminders(at("17:52"));
    expect(titles()).toEqual(["🍋 Snack"]); // 07:20 + 7 × 90 = 17:50
  });

  it("'15 minutes after the previous step' works once that step is ticked", async () => {
    db.tables.rhythm_items = [
      item({ id: "cj", name: "Celery juice", fixed_time: "07:00" }),
      item({ id: "sm", name: "Smoothie", sort_order: 2, spacing_minutes: 15 }),
    ];
    db.tables.v_daily_status = [{ item_id: "cj", occurrence_slot: null, status: "completed", occurred_at: tickedAt("07:05") }];
    await sendRhythmReminders(at("07:21"));
    expect(titles()).toEqual(["🍋 Smoothie"]);
  });
});

describe("programs", () => {
  const program = (over) => ({
    id: "row1", program_id: "sr-x", start_date: "2026-11-08", total_days: 3, keep_everyday: null,
    reminded_on: null, reminded_slots: [],
    items: [{ id: "pot", name: "Steamed potatoes", emoji: "🥔", fixedTime: "12:00", programDayRange: [1, 3], durationType: "cleanse", frequency: "daily", sortOrder: 1 }],
    ...over,
  });

  it("program steps with a time are reminded on the program's days", async () => {
    db.tables.rhythm_items = [];
    db.tables.active_protocols = [program()];
    await sendRhythmReminders(at("12:01"));
    expect(titles()).toEqual(["🥔 Steamed potatoes"]);
    expect(db.updates[0]).toMatchObject({ table: "active_protocols", values: { reminded_on: "2026-11-09", reminded_slots: ["pot@12:00"] } });
  });

  it("and not once the program has finished", async () => {
    db.tables.rhythm_items = [];
    db.tables.active_protocols = [program({ start_date: "2026-11-01" })];
    await sendRhythmReminders(at("12:01"));
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("paused everyday steps stay quiet while it runs", async () => {
    db.tables.rhythm_items = [item({ id: "dinner", name: "Dinner", fixed_time: "12:00" }), item({ id: "mag", name: "Magnesium", fixed_time: "12:00" })];
    db.tables.active_protocols = [program({ keep_everyday: ["mag"] })];
    await sendRhythmReminders(at("12:01"));
    expect(titles().sort()).toEqual(["🍋 Magnesium", "🥔 Steamed potatoes"]);
  });
});

describe("items set to run for a number of days", () => {
  it("still remind on the last day, not after", async () => {
    db.tables.rhythm_items = [item({ fixed_time: "07:00", duration_type: "days", duration_days: 7, start_date: "2026-11-03" })];
    await sendRhythmReminders(at("07:01"));
    expect(sendNotification).toHaveBeenCalledTimes(1);
    sendNotification.mockClear();
    db.tables.rhythm_items = [item({ fixed_time: "07:00", duration_type: "days", duration_days: 7, start_date: "2026-11-02" })];
    await sendRhythmReminders(at("07:01"));
    expect(sendNotification).not.toHaveBeenCalled();
  });
});
