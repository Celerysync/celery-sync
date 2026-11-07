import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import SupplementTracker from "../src/components/SupplementTracker.jsx";

vi.mock("../src/hooks/useUserSupplements.js", () => ({
  SUPPLEMENTS_CHANGED_EVENT: "cs:supplements-changed",
  useUserSupplements: () => ({
    supplements: [{ id: "s1", name: "Vitamin C", dose_label: "", timing: "morning_food" }],
    addSupplement: vi.fn(), removeSupplement: vi.fn(),
    inventoryFor: () => null, setInventoryFor: vi.fn(),
    adjustStockOnDoseChange: vi.fn().mockResolvedValue(undefined),
    runOutInfoFor: () => null,
  }),
}));

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("ticking a supplement", () => {
  let writes;
  let failWrites;

  beforeEach(() => {
    localStorage.clear();
    writes = [];
    failWrites = false;
    vi.stubGlobal("fetch", vi.fn(async (url, init = {}) => {
      if (String(url).includes("activity_events") && init.method === "POST") {
        writes.push(JSON.parse(init.body));
        return failWrites ? jsonResponse({ message: "nope" }, 500) : jsonResponse([], 201);
      }
      return jsonResponse([]);
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const openAndTick = () => {
    render(<SupplementTracker authUser={{ id: "user-1" }} profileId="profile-1" />);
    fireEvent.click(screen.getByText(/Today's Supplements/));
    fireEvent.click(screen.getByText("Vitamin C"));
  };

  it("saves the tick to the database and shows it as taken", async () => {
    openAndTick();
    await waitFor(() => expect(writes.length).toBe(1));
    expect(writes[0]).toMatchObject({
      user_id: "user-1", profile_id: "profile-1", item_id: "supp:s1", item_name: "Vitamin C",
      item_category: "supplement", occurrence_slot: "morning_food", event_type: "completed", source: "tap",
    });
    expect(screen.getByText(/1\/1 taken/)).toBeTruthy();
  });

  it("un-ticking adds a reversal to the ledger rather than deleting", async () => {
    openAndTick();
    await waitFor(() => expect(writes.length).toBe(1));
    fireEvent.click(screen.getByText("Vitamin C"));
    await waitFor(() => expect(writes.length).toBe(2));
    expect(writes[1].event_type).toBe("uncompleted");
  });

  it("takes the tick back and says so if the save fails", async () => {
    failWrites = true;
    openAndTick();
    await waitFor(() => expect(writes.length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.getByText(/0\/1 taken/)).toBeTruthy());
    expect(screen.getByRole("alert").textContent).toMatch(/didn't save/i);
  });
});
