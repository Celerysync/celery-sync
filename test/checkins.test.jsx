// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";

vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({}) }));
vi.mock("@anthropic-ai/sdk", () => ({ default: class { constructor() { this.messages = { create: vi.fn() }; } } }));
vi.mock("web-push", () => ({ default: { setVapidDetails: () => {}, sendNotification: vi.fn() } }));

const { dueWindow, enforceLength, buildDynamicPrompt, DEFAULT_PREFS } = await import("../server/routes/encouragement.js");

describe("check-in moments", () => {
  it("only morning and midday when chosen; afternoon and evening on by default", () => {
    expect(dueWindow(null, 15)).toBe("afternoon");
    expect(dueWindow(null, 20)).toBe("evening");
    expect(dueWindow(null, 10)).toBeNull();
    expect(dueWindow({ morning: { enabled: true, hour: 9 } }, 9)).toBe("morning");
    expect(dueWindow({ afternoon: { enabled: false, hour: 15 } }, 15)).toBeNull();
    expect(DEFAULT_PREFS.morning.enabled).toBe(false);
  });

  it("never sends more than a notification can show", () => {
    const long = "This is a long sentence that goes on. ".repeat(10);
    expect(enforceLength(long).length).toBeLessThanOrEqual(140);
  });

  it("is written from their own day: steps, program day, their own snacks and planned meal", () => {
    const prompt = buildDynamicPrompt({
      name: "Jo", helperName: "Sage", program: { name: "3-day mono cleanse", day: 2, total: 3 },
      steps: [{ name: "Celery juice", time: "07:00", done: true }, { name: "Adrenal snack", time: "15:30", done: false }],
      snacks: ["Adrenal snack", "Apple and celery"], planned: ["dinner: Potato bake"],
      energyNote: "no check-in yet today", streakDays: 4, localTime: "3:00 pm",
    }, "afternoon");
    expect(prompt).toMatch(/3-day mono cleanse, day 2 of 3/);
    expect(prompt).toMatch(/done: Celery juice \(7am\)/);
    expect(prompt).toMatch(/still ahead: Adrenal snack \(3:30pm\)/);
    expect(prompt).toMatch(/Their own snacks .*: Adrenal snack, Apple and celery/);
    expect(prompt).toMatch(/dinner: Potato bake/);
  });

  it("the app's own snack list is gone: food only from their own lists", () => {
    const src = fs.readFileSync(new URL("../server/routes/encouragement.js", import.meta.url), "utf8");
    expect(src).not.toMatch(/nut butter|walnuts|tahini|APPROVED GENERIC SNACK/i);
    expect(src).toMatch(/only ever mention a food, drink, snack or meal by a name that appears in THEIR OWN lists/);
  });
});
