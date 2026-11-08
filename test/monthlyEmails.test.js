// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({}) }));
vi.mock("resend", () => ({ Resend: class {} }));
process.env.EMAIL_LINK_SECRET = "test-secret";

const { monthlyEmailDue, lastMonthRange, localParts, monthlyEmailContent, offLinkFor } = await import("../server/routes/monthlyEmails.js");
const { buildMonthSummary } = await import("../src/lib/monthSummary.js");

const user = { id: "u1", email: "jo@example.com", user_metadata: {} };
// 1 Dec 2026, 9:00am in Sydney (AEDT, UTC+11) = 30 Nov 22:00 UTC
const sydney9am = new Date("2026-11-30T22:00:00Z");

describe("the monthly email is sent at the right time, once", () => {
  it("on the 1st, in their morning, for last month", () => {
    expect(localParts("Australia/Sydney", sydney9am)).toMatchObject({ day: 1, month: 12, hour: 9 });
    expect(monthlyEmailDue({ user, profileId: "p1", tz: "Australia/Sydney", now: sydney9am })).toMatchObject({ key: "2026-11", label: "November", start: "2026-11-01", end: "2026-11-30", days: 30 });
  });

  it("not at night, not on other days, not in someone else's morning", () => {
    expect(monthlyEmailDue({ user, profileId: "p1", tz: "Australia/Sydney", now: new Date("2026-11-30T14:00:00Z") })).toBeNull(); // 1am
    expect(monthlyEmailDue({ user, profileId: "p1", tz: "Australia/Sydney", now: new Date("2026-12-01T22:00:00Z") })).toBeNull(); // the 2nd
    expect(monthlyEmailDue({ user, profileId: "p1", tz: "Europe/London", now: sydney9am })).toBeNull(); // 30 Nov in London
  });

  it("only once per profile per month, and never if they turned it off", () => {
    expect(monthlyEmailDue({ user: { ...user, user_metadata: { monthly_sent: { p1: "2026-11" } } }, profileId: "p1", tz: "Australia/Sydney", now: sydney9am })).toBeNull();
    expect(monthlyEmailDue({ user: { ...user, user_metadata: { monthly_sent: { p1: "2026-11" } } }, profileId: "p2", tz: "Australia/Sydney", now: sydney9am })).not.toBeNull();
    expect(monthlyEmailDue({ user: { ...user, user_metadata: { monthly_email_off: true } }, profileId: "p1", tz: "Australia/Sydney", now: sydney9am })).toBeNull();
  });

  it("January looks back at December", () => {
    expect(lastMonthRange({ year: 2027, month: 1 })).toMatchObject({ start: "2026-12-01", end: "2026-12-31", label: "December", key: "2026-12" });
  });
});

describe("what the email says", () => {
  const range = lastMonthRange({ year: 2026, month: 12 });
  const summary = buildMonthSummary({
    range,
    statusRows: [{ item_id: "a", item_name: "Celery juice", item_category: "morning", local_date: "2026-11-03", status: "completed" }],
    checkins: [{ check_date: "2026-11-03", energy: 6 }],
  });
  const { subject, html, text } = monthlyEmailContent({ summary, name: "Jo", offUrl: offLinkFor("u1") });

  it("is their month, in plain words, with a way to turn it off", () => {
    expect(subject).toBe("Your November with CelerySync 🌿");
    expect(text).toMatch(/In November, Jo, you kept up your routine on 1 day of 30/);
    expect(html).toMatch(/Turn off these monthly emails/);
    expect(html).toMatch(/not medical advice/);
    expect(html).toMatch(/Here's to December/);
    expect(text).not.toMatch(/improv|better|heal|cure|treat|worked/i);
  });

  it("the off link is signed for that person only", () => {
    const a = offLinkFor("u1");
    expect(a).toMatch(/\/api\/email\/monthly-off\?u=u1&s=[0-9a-f]{32}$/);
    expect(offLinkFor("u2").split("s=")[1]).not.toBe(a.split("s=")[1]);
  });

  it("escapes anything odd in names", () => {
    const { html: h } = monthlyEmailContent({ summary, name: "<b>Jo</b>", offUrl: "x" });
    expect(h).not.toMatch(/<b>Jo<\/b>/);
  });
});
