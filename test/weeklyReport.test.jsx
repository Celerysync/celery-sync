import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import WeeklyReport from "../src/components/WeeklyReport.jsx";

vi.mock("../src/hooks/useVoice.js", () => ({ useVoice: () => ({ speak: vi.fn(), stopSpeaking: vi.fn(), speaking: false }) }));
vi.mock("../src/context/VoiceContext.jsx", () => ({ useVoicePrefs: () => ({}) }));

describe("the weekly summary card", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("draws an older summary without crashing, celery tiles, or raw marks", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      summaries: [{
        id: "w1", week_start: "2026-10-26", week_end: "2026-11-01",
        celery_days: 0, protocol_days: 1, avg_energy: 6, avg_mood: null,
        ai_observations: "# Your Week in Review\nYou showed up on *one* day.",
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } })));

    render(<WeeklyReport authUser={{ id: "u1" }} profileId="p1" user={{ name: "Sam" }} />);
    expect(await screen.findByText("Your Week in Review")).toBeTruthy();
    const text = document.body.textContent;
    expect(text).not.toMatch(/celery/i);
    expect(text).not.toContain("# Your Week");
    expect(text).toContain("Rhythm days");
  });
});
