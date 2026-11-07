import { describe, it, expect, vi, afterEach } from "vitest";
import { addDays, localDateStr, filterTodaysItems, TODAY } from "../src/lib/rhythmSchedule.js";
import { countShowedUpStreak } from "../src/hooks/useDailyCheckins.js";

// All of this runs in Sydney time (see vitest.config.js).
afterEach(() => vi.useRealTimers());

describe("dates use the local day, not UTC", () => {
  it("is on the local day at 8am, while UTC is still on yesterday", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-05T21:00:00Z")); // 8am 6 Nov in Sydney
    expect(TODAY()).toBe("2026-11-06");
    expect(localDateStr()).toBe("2026-11-06");
  });

  it("adds and subtracts whole days", () => {
    expect(addDays("2026-11-05", 1)).toBe("2026-11-06");
    expect(addDays("2026-11-05", -1)).toBe("2026-11-04");
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
  });
});

describe("items set to run for a number of days", () => {
  const sevenDayItem = {
    id: "a", name: "Lemon water", sortOrder: 1, frequency: "daily",
    durationType: "days", durationDays: 7, startDate: "2026-11-02",
  };
  const onDay = (iso) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
    return filterTodaysItems([sevenDayItem], null).map((i) => i.id);
  };

  it("still shows on its 7th day, even first thing in the morning", () => {
    expect(onDay("2026-11-07T20:00:00Z")).toEqual(["a"]); // 7am 8 Nov Sydney = day 7
  });

  it("is gone on the 8th day", () => {
    expect(onDay("2026-11-08T20:00:00Z")).toEqual([]); // 7am 9 Nov Sydney
  });
});

describe("the showed-up streak", () => {
  const day = (check_date, rhythm_completed = 1) => ({ check_date, rhythm_completed });

  it("counts back through consecutive days", () => {
    expect(countShowedUpStreak([day("2026-11-07"), day("2026-11-06"), day("2026-11-05")], "2026-11-07")).toBe(3);
  });

  it("doesn't break just because today isn't done yet", () => {
    expect(countShowedUpStreak([day("2026-11-06"), day("2026-11-05")], "2026-11-07")).toBe(2);
  });

  it("stops at a missed day", () => {
    expect(countShowedUpStreak([day("2026-11-07"), day("2026-11-05")], "2026-11-07")).toBe(1);
  });

  it("ignores days with a check-in but nothing ticked", () => {
    expect(countShowedUpStreak([day("2026-11-07", 0)], "2026-11-07")).toBe(0);
  });
});
