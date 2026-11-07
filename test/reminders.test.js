// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const db = vi.hoisted(() => ({ tables: {}, updates: [] }));
const sendNotification = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("web-push", () => ({ default: { sendNotification, setVapidDetails: vi.fn() } }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table) => {
      const result = () => ({ data: db.tables[table] ?? [], error: null });
      const chain = {
        select: () => chain, eq: () => chain, is: () => chain, or: () => chain,
        order: () => chain, limit: () => chain,
        maybeSingle: async () => ({ data: (db.tables[table] ?? [])[0] ?? null, error: null }),
        update: (values) => { db.updates.push(values); return chain; },
        then: (resolve) => resolve(result()),
      };
      return chain;
    },
  }),
}));

const { sendRhythmReminders } = await import("../server/routes/rhythm.js");

const item = (over) => ({
  id: "a", name: "Lemon water", emoji: "🍋", frequency: "daily", sort_order: 1,
  schedule: { type: "times", times: ["07:00"] },
  duration_type: "ongoing", duration_days: null, start_date: null,
  last_reminded_on: null, reminded_slots: [],
  ...over,
});

describe("rhythm reminders", () => {
  beforeEach(() => {
    sendNotification.mockClear();
    db.updates = [];
    db.tables = {
      push_subscriptions: [{ user_id: "u1", endpoint: "e", keys: {}, timezone: "Australia/Sydney" }],
      profiles: [{ id: "p1" }],
    };
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-08T20:00:00Z")); // 7am, 9 Nov in Sydney
  });

  afterEach(() => vi.useRealTimers());

  it("reminds about an ongoing item at its time", async () => {
    db.tables.rhythm_items = [item()];
    await sendRhythmReminders();
    expect(sendNotification).toHaveBeenCalledTimes(1);
  });

  it("files the reminder under the person's own day, not UTC's", async () => {
    db.tables.rhythm_items = [item()];
    await sendRhythmReminders();
    expect(db.updates[0].last_reminded_on).toBe("2026-11-09");
  });

  it("still reminds on the last day of a 7-day item", async () => {
    db.tables.rhythm_items = [item({ duration_type: "days", duration_days: 7, start_date: "2026-11-03" })];
    await sendRhythmReminders();
    expect(sendNotification).toHaveBeenCalledTimes(1);
  });

  it("stops reminding once a 7-day item has finished", async () => {
    db.tables.rhythm_items = [item({ duration_type: "days", duration_days: 7, start_date: "2026-11-02" })];
    await sendRhythmReminders();
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("doesn't send the same reminder twice in a day", async () => {
    db.tables.rhythm_items = [item({ last_reminded_on: "2026-11-09", reminded_slots: ["07:00"] })];
    await sendRhythmReminders();
    expect(sendNotification).not.toHaveBeenCalled();
  });
});
