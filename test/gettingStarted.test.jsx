import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

vi.mock("../src/hooks/useWebPush.js", () => ({ useWebPush: () => ({ supported: true, subscribed: false, subscribe: vi.fn(async () => {}) }) }));
const openSheet = vi.fn();
vi.mock("../src/context/HumeVoiceContext.jsx", () => ({ useHumeVoiceOrchestrator: () => ({ openSheet }) }));

const { default: GettingStarted } = await import("../src/components/GettingStarted.jsx");

const base = {
  profileId: "p1", user: { created_at: new Date().toISOString() }, authUser: { id: "u" }, hasVoice: true,
  stepsCount: 3, doneToday: 0, hasCheckin: false, supplementsCount: 0, recipesCount: 0,
  onAddStep: vi.fn(), onShowCheckin: vi.fn(), onOpenSupplements: vi.fn(), onOpenKitchen: vi.fn(),
};

describe("Getting started on Today", () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  it("shows the list with what's done, and the next thing to do", () => {
    render(<GettingStarted {...base} />);
    expect(screen.getByText("👋 Getting started")).toBeTruthy();
    expect(screen.getByText("1 of 7 done")).toBeTruthy();
    expect(screen.getByText(/Tap the box next to a step/)).toBeTruthy();
  });

  it("ticks itself when they tick a step, and remembers it", () => {
    const { rerender } = render(<GettingStarted {...base} />);
    rerender(<GettingStarted {...base} doneToday={1} />);
    expect(screen.getByText("2 of 7 done")).toBeTruthy();
    cleanup();
    render(<GettingStarted {...base} doneToday={0} />);
    expect(screen.getByText("2 of 7 done")).toBeTruthy();
  });

  it("'Not for me' counts as done", () => {
    render(<GettingStarted {...base} doneToday={1} hasCheckin />);
    fireEvent.click(screen.getByRole("button", { name: "Not for me" }));
    expect(screen.getByText("4 of 7 done")).toBeTruthy();
  });

  it("'I've got it' hides it for good", () => {
    render(<GettingStarted {...base} />);
    fireEvent.click(screen.getByRole("button", { name: /I've got it/ }));
    expect(screen.queryByText("👋 Getting started")).toBeNull();
    cleanup();
    render(<GettingStarted {...base} />);
    expect(screen.queryByText("👋 Getting started")).toBeNull();
  });

  it("people who joined over a month ago don't see it", () => {
    render(<GettingStarted {...base} user={{ created_at: "2026-01-01T00:00:00Z" }} />);
    expect(screen.queryByText("👋 Getting started")).toBeNull();
  });

  it("no Fern item on the plan without voice", () => {
    render(<GettingStarted {...base} hasVoice={false} />);
    expect(screen.getByText("1 of 6 done")).toBeTruthy();
    expect(screen.queryByText(/Fern/)).toBeNull();
  });

  it("'Try it' opens Fern", () => {
    render(<GettingStarted {...base} doneToday={1} hasCheckin supplementsCount={1} recipesCount={1} />);
    // reminders is next; then Fern
    expect(screen.getByRole("button", { name: "Turn on" })).toBeTruthy();
  });
});
