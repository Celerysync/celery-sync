import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import RhythmView from "../src/components/RhythmView.jsx";
import { stepEmoji, withStepWords } from "../src/lib/stepEmoji.js";
import { glassesByDay, waterChanges, isRhythmCategory } from "../src/lib/waterEvents.js";

const seq = [
  { id: "a", baseItemId: "a", name: "Lemon water", emoji: "🌿", category: "morning", scheduledMs: null },
  { id: "b", baseItemId: "b", name: "Celery juice", emoji: "🌿", category: "morning", scheduledMs: null },
  { id: "p1", baseItemId: "p1", name: "Mono potatoes", emoji: "✨", category: "food", scheduledMs: null, programId: "sr-1" },
];

describe("Today's rhythm: one clear door per job", () => {
  afterEach(cleanup);
  const setup = (extra = {}) => {
    const onOpen = vi.fn();
    render(<RhythmView sequence={seq} onComplete={() => {}} onUncomplete={() => {}} onOpen={onOpen} {...extra} />);
    return onOpen;
  };

  it("+ Add goes straight to adding a step", () => {
    const onOpen = setup();
    fireEvent.click(screen.getByRole("button", { name: "+ Add" }));
    expect(onOpen).toHaveBeenCalledWith("add", undefined);
  });

  it("tapping a step's name opens just that step", () => {
    const onOpen = setup();
    fireEvent.click(screen.getByRole("button", { name: "Change Celery juice" }));
    expect(onOpen).toHaveBeenCalledWith("step", "b");
  });

  it("a program step opens the program", () => {
    const onOpen = setup();
    fireEvent.click(screen.getByRole("button", { name: "Change Mono potatoes" }));
    expect(onOpen).toHaveBeenCalledWith("programs", undefined);
  });

  it("⋯ More has order, saved days, wake time and programs", () => {
    const onOpen = setup();
    fireEvent.click(screen.getByRole("button", { name: "More options for your rhythm" }));
    const items = screen.getAllByRole("menuitem").map((b) => b.textContent);
    expect(items.join("|")).toMatch(/order[\s\S]*saved days[\s\S]*wake time[\s\S]*Programs/);
    fireEvent.click(screen.getByRole("menuitem", { name: /saved days/ }));
    expect(onOpen).toHaveBeenCalledWith("saved", undefined);
  });

  it("Programs has its own button when none is running", () => {
    const onOpen = setup();
    fireEvent.click(screen.getByRole("button", { name: /Start a program/ }));
    expect(onOpen).toHaveBeenCalledWith("programs", undefined);
  });

  it("steps get a picture from their name; a chosen one is kept", () => {
    setup();
    expect(screen.getByText("🍋")).toBeTruthy();
    expect(screen.getByText("🥬")).toBeTruthy();
    expect(stepEmoji({ name: "Celery juice", emoji: "🌟" })).toBe("🌟");
    expect(stepEmoji({ name: "Something else", emoji: "🌿" })).toBe("🌿");
  });

  it("the tick still works the same", () => {
    const onComplete = vi.fn();
    render(<RhythmView sequence={seq} onComplete={onComplete} onUncomplete={() => {}} onOpen={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Mark Lemon water as done" }));
    expect(onComplete).toHaveBeenCalledWith("a");
  });
});

describe("'with my smoothie' at sign-up", () => {
  it("finds the step words", () => {
    expect(withStepWords("B12 and zinc with my smoothie")).toBe("smoothie");
    expect(withStepWords("B12 with the heavy metal smoothie, daily")).toBe("heavy metal smoothie");
    expect(withStepWords("zinc at 9am")).toBeNull();
  });
});

describe("water in the history", () => {
  const ctx = { userId: "u", profileId: "p", date: "2026-11-08" };
  it("each glass is a slot; taking one back reverses the last", () => {
    const add = waterChanges({ current: 2, add: 2, ...ctx });
    expect(add.map((r) => [r.occurrence_slot, r.event_type])).toEqual([["3", "completed"], ["4", "completed"]]);
    const undo = waterChanges({ current: 4, remove: 1, ...ctx });
    expect(undo.map((r) => [r.occurrence_slot, r.event_type])).toEqual([["4", "uncompleted"]]);
    expect(waterChanges({ current: 0, remove: 1, ...ctx })).toEqual([]);
    expect(add[0]).toMatchObject({ item_id: "water", item_category: "water", local_date: "2026-11-08" });
  });

  it("counts glasses per day from the latest state", () => {
    const rows = [
      { item_id: "water", local_date: "2026-11-08", status: "completed" },
      { item_id: "water", local_date: "2026-11-08", status: "completed" },
      { item_id: "water", local_date: "2026-11-08", status: "uncompleted" },
      { item_id: "x", local_date: "2026-11-08", status: "completed" },
    ];
    expect(glassesByDay(rows)).toEqual({ "2026-11-08": 2 });
  });

  it("water never counts towards rhythm streaks or percentages", () => {
    expect(isRhythmCategory("water")).toBe(false);
    expect(isRhythmCategory("supplement")).toBe(false);
    expect(isRhythmCategory("morning")).toBe(true);
  });
});
