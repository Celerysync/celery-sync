import { describe, it, expect } from "vitest";
import { describeRhythmChange, describeRhythmChangeSource } from "../src/lib/rhythmChanges.js";

describe("rhythm change wording", () => {
  it("describes adds, removals and restores", () => {
    expect(describeRhythmChange({ item_name: "Lemon water", change_type: "added" })).toBe("Added Lemon water");
    expect(describeRhythmChange({ item_name: "Lemon water", change_type: "removed" })).toBe("Removed Lemon water");
    expect(describeRhythmChange({ item_name: "Lemon water", change_type: "restored" })).toBe("Brought back Lemon water");
  });

  it("says what changed, in plain words, without repeats", () => {
    expect(describeRhythmChange({
      item_name: "Lemon water", change_type: "updated", changed_fields: ["fixed_time", "schedule", "note"],
    })).toBe("Changed Lemon water: time and note");
  });

  it("describes a rename", () => {
    expect(describeRhythmChange({
      item_name: "Warm lemon water", change_type: "updated", changed_fields: ["name"], before: { name: "Lemon water" },
    })).toBe("Renamed Lemon water to Warm lemon water");
  });

  it("describes a rename with another change", () => {
    expect(describeRhythmChange({
      item_name: "Warm lemon water", change_type: "updated", changed_fields: ["name", "frequency"], before: { name: "Lemon water" },
    })).toBe("Renamed Lemon water to Warm lemon water, changed days");
  });

  it("only names voice and carer changes", () => {
    expect(describeRhythmChangeSource("voice")).toBe("by voice");
    expect(describeRhythmChangeSource("carer")).toBe("by a carer");
    expect(describeRhythmChangeSource("tap")).toBeNull();
  });

  it("never interprets a change", () => {
    const text = describeRhythmChange({ item_name: "Lemon water", change_type: "added" });
    expect(text).not.toMatch(/heal|cure|treat|improv|because|help/i);
  });
});
