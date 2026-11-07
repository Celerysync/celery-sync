import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { isRealCheckin } from "../src/hooks/useDailyCheckins.js";
import { orderForDay } from "../src/lib/rhythmSchedule.js";
import { crisisContacts } from "../src/lib/voiceTabContext.js";
import RichText from "../src/components/RichText.jsx";

afterEach(cleanup);

describe("what counts as a check-in", () => {
  it("doesn't count a row that only holds rhythm ticks", () => {
    expect(isRealCheckin({ check_date: "2026-11-07", rhythm_completed: 1, rhythm_total: 8, symptoms: [], emotional_state: [] })).toBe(false);
    expect(isRealCheckin(null)).toBe(false);
  });

  it("counts anything the person told us about how they feel", () => {
    expect(isRealCheckin({ energy: 6 })).toBe(true);
    expect(isRealCheckin({ mood: 2 })).toBe(true);
    expect(isRealCheckin({ symptoms: ["Headache"] })).toBe(true);
    expect(isRealCheckin({ healing_reaction: true })).toBe(true);
  });
});

describe("today's order", () => {
  const item = (name, fixedTime = null) => ({ name, fixedTime });
  const names = (items) => orderForDay(items).map((i) => i.name);

  it("puts timed items in time order, wherever they were added", () => {
    expect(names([item("Bedtime", "22:00"), item("Juice", "07:00"), item("Lunch", "13:00")]))
      .toEqual(["Juice", "Lunch", "Bedtime"]);
  });

  it("keeps a step with no time straight after the item it follows", () => {
    expect(names([item("Bedtime", "22:00"), item("Juice", "07:00"), item("Then a walk")]))
      .toEqual(["Juice", "Then a walk", "Bedtime"]);
  });

  it("keeps untimed items at the top if they come first", () => {
    expect(names([item("Warm water"), item("Juice", "07:00")])).toEqual(["Warm water", "Juice"]);
  });

  it("keeps the person's order for items at the same time", () => {
    expect(names([item("B12", "09:00"), item("Zinc", "09:00")])).toEqual(["B12", "Zinc"]);
  });
});

describe("crisis numbers", () => {
  const nums = (tz) => crisisContacts(tz).map((c) => c.num);

  it("follow the person's country", () => {
    expect(nums("Australia/Sydney")).toContain("000");
    expect(nums("Pacific/Auckland")).toContain("111");
    expect(nums("Europe/London")).toContain("999");
    expect(nums("America/New_York")).toContain("988");
    expect(nums("America/Toronto")).toContain("911");
  });

  it("are never another country's numbers", () => {
    expect(nums("Europe/London")).not.toContain("000");
    expect(nums("America/New_York")).not.toContain("000");
  });

  it("show nothing rather than guess for a country we don't have", () => {
    expect(crisisContacts("Asia/Tokyo")).toEqual([]);
  });

  it("make callable links", () => {
    expect(crisisContacts("Australia/Sydney")[0].href).toBe("tel:131114");
  });
});

describe("formatted AI replies", () => {
  it("shows italics and bold without the marks", () => {
    render(<RichText text="Read *Liver Rescue* and **rest**, 2 * 3 stays." />);
    expect(screen.getByText("Liver Rescue").tagName).toBe("EM");
    expect(screen.getByText("rest").tagName).toBe("STRONG");
    expect(document.body.textContent).toContain("2 * 3 stays.");
    expect(document.body.textContent).not.toContain("*Liver");
  });
});
