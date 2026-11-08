// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({}) }));
vi.mock("resend", () => ({ Resend: vi.fn() }));
const { trialEmailDue, trialEmailContent } = await import("../server/routes/trialEmails.js");

const now = new Date("2026-11-08T23:00:00Z");
const user = (createdHoursAgo, over = {}) => ({
  id: "u", email: "someone@example.com",
  created_at: new Date(now.getTime() - createdHoursAgo * 3_600_000).toISOString(),
  user_metadata: {}, ...over,
});

describe("trial-ending reminder", () => {
  it("is due once the trial has between one and two days left", () => {
    expect(trialEmailDue(user(5 * 24 + 1), now)).toBe(true);   // just under 2 days left
    expect(trialEmailDue(user(6 * 24 - 1), now)).toBe(true);   // just over 1 day left
  });

  it("isn't due too early, too late, or twice", () => {
    expect(trialEmailDue(user(4 * 24), now)).toBe(false);      // 3 days left
    expect(trialEmailDue(user(6 * 24 + 1), now)).toBe(false);  // under a day left
    expect(trialEmailDue(user(8 * 24), now)).toBe(false);      // already ended
    expect(trialEmailDue(user(5 * 24 + 1, { user_metadata: { trial_reminder_sent: "x" } }), now)).toBe(false);
  });

  it("never goes to the owner", () => {
    expect(trialEmailDue(user(5 * 24 + 1, { email: "allij@live.com.au" }), now)).toBe(false);
  });

  it("is calm, honest and claim-free", () => {
    const { subject, text } = trialEmailContent({ name: "Sam", endsOn: "Tuesday 10 November" });
    expect(subject).toContain("2 days");
    expect(text).toContain("Hi Sam,");
    expect(text).toContain("nothing will be charged");
    expect(text).toContain("safe either way");
    expect(text).not.toMatch(/heal|cure|treat|don't lose|hurry|last chance/i);
  });

  it("works without a name", () => {
    expect(trialEmailContent({ name: null, endsOn: "Tuesday" }).text).toContain("Hi there,");
  });
});
