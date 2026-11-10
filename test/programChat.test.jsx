import { describe, it, expect } from "vitest";
import { todaySection } from "../src/components/Coach.jsx";

describe("typed chat knows the program they're running", () => {
  it("names the program, the day, and marks its steps", () => {
    const text = todaySection({
      items: [
        { name: "Celery juice", done: true, time: "07:00" },
        { name: "Steamed potatoes", done: false, in_program: true },
      ],
      program: { name: "3-day mono cleanse", day: 2, total_days: 3 },
      supplements: [],
    });
    expect(text).toMatch(/RUNNING A PROGRAM: 3-day mono cleanse, day 2 of 3/);
    expect(text).toMatch(/not yet: Steamed potatoes \[program step\]/);
    expect(text).toMatch(/never add steps of your own/);
  });

  it("says nothing about a program when none is running", () => {
    const text = todaySection({ items: [{ name: "Celery juice", done: false }], supplements: [] });
    expect(text).not.toMatch(/PROGRAM/);
  });
});
