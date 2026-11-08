import { describe, it, expect } from "vitest";
import { splitRoutine, timeIn } from "../src/lib/routineSplit.js";

describe("sign-up never saves a whole day as one step", () => {
  it("splits their words into steps with plain times", () => {
    const out = splitRoutine("Lemon water when I wake, celery juice at 6:30, heavy metal smoothie at 8, snack every 2 hours, dinner at 6, herbal tea at 8pm");
    expect(out.map((i) => [i.name, i.fixedTime])).toEqual([
      ["Lemon water when I wake", null], ["Celery juice", "06:30"], ["Heavy metal smoothie", "08:00"],
      ["Snack every 2 hours", null], ["Dinner", "18:00"], ["Herbal tea", "20:00"],
    ]);
  });

  it("new lines and 'then' split too", () => {
    expect(splitRoutine("lemon water\nthen celery juice").map((i) => i.name)).toEqual(["Lemon water", "Celery juice"]);
  });

  it("reads plain times", () => {
    expect(timeIn("at 12am")).toBe("00:00");
    expect(timeIn("6:45pm")).toBe("18:45");
    expect(timeIn("no time here")).toBeNull();
  });
});
