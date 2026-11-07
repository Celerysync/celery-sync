import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import SupplementSummary from "../src/components/SupplementSummary.jsx";

const jsonResponse = (body) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

const serve = ({ supplements = [], ticks = [] }) =>
  vi.stubGlobal("fetch", vi.fn(async (url) => {
    if (String(url).includes("user_supplements")) return jsonResponse(supplements);
    if (String(url).includes("v_daily_status")) return jsonResponse(ticks);
    return jsonResponse([]);
  }));

describe("the supplements card in Progress", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows what was ticked, and what's no longer on the list", async () => {
    const today = new Date();
    const local_date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    serve({
      supplements: [{ id: "a", name: "B12", dose_label: "2 drops", timing: "evening", created_at: "2026-01-01T00:00:00Z" }],
      ticks: [
        { item_id: "supp:a", item_name: "B12 (2 drops)", occurrence_slot: "evening", local_date, status: "completed" },
        { item_id: "supp:old", item_name: "Zinc", occurrence_slot: "midday", local_date, status: "completed" },
      ],
    });
    render(<SupplementSummary profileId="p1" />);
    expect(await screen.findByText("B12 (2 drops)")).toBeTruthy();
    expect(screen.getByText("Evening")).toBeTruthy();
    expect(screen.getByText(/1 of \d+ days/)).toBeTruthy();
    expect(screen.getByText("No longer on your list")).toBeTruthy();
    expect(screen.getByText("Zinc")).toBeTruthy();
  });

  it("stays out of the way when someone has no supplements", async () => {
    serve({});
    const { container } = render(<SupplementSummary profileId="p1" />);
    await new Promise((r) => setTimeout(r, 20));
    expect(container.textContent).toBe("");
  });
});
