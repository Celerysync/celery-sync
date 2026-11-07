// Supplement ticks live in the same activity_events ledger as everything else
// (spec §1). This file is the one definition of how they're written and how
// they're summed up, shared by the tracker, the voice tools, the Progress card
// and the server's PDF reports, so those can't disagree.
//
// Descriptive only: counts of what the person ticked, using the names and
// amounts they typed. Never a suggestion, and never a link to how they felt.

export const SUPPLEMENT_CATEGORY = "supplement";

const TIMING_ORDER = ["morning_empty", "morning_food", "midday", "evening"];
export const SUPPLEMENT_TIMING_LABELS = {
  morning_empty: "Morning, empty stomach",
  morning_food: "Morning, with food",
  midday: "Midday",
  evening: "Evening",
};

export const supplementLabel = (s) => (s.dose_label ? `${s.name} (${s.dose_label})` : s.name);

export function supplementEventRow({ userId, profileId, supplement, taken, source, date }) {
  return {
    user_id: userId,
    profile_id: profileId,
    item_id: `supp:${supplement.id}`,
    item_name: supplementLabel(supplement),
    item_category: SUPPLEMENT_CATEGORY,
    occurrence_slot: supplement.timing,
    event_type: taken ? "completed" : "uncompleted",
    source,
    occurred_at: new Date().toISOString(),
    local_date: date,
  };
}

// Before this date a bug stopped ticks being saved at all. Counting from earlier
// would report "2 of 93 days" for someone who may have taken it every day, in a
// document that gets handed to a doctor.
export const SUPPLEMENT_TRACKING_START = "2026-11-07";

const dayNumber = (dateStr) => Math.round(Date.parse(`${dateStr}T00:00:00Z`) / 86_400_000);

// supplements: user_supplements rows. statusRows: v_daily_status rows for the
// period. `from` and `to` are inclusive YYYY-MM-DD dates.
//
// A supplement added partway through is counted only from the day it was added
// ("3 of 3 days", not a misleading "3 of 30"). One no longer on the list keeps
// its history but has no denominator, because the period it ran for isn't known.
export function summarizeSupplements({ supplements = [], statusRows = [], from, to, trackingStart = SUPPLEMENT_TRACKING_START }) {
  const periodDays = dayNumber(to) - dayNumber(from) + 1;
  const countFrom = trackingStart > from ? trackingStart : from;
  const ticksById = new Map();
  const ticksDays = new Set();
  let totalTicks = 0;

  for (const row of statusRows) {
    if (row.status !== "completed") continue;
    if (row.local_date < from || row.local_date > to) continue;
    const entry = ticksById.get(row.item_id) || { days: new Set(), name: row.item_name, timing: row.occurrence_slot };
    entry.days.add(row.local_date);
    ticksById.set(row.item_id, entry);
    ticksDays.add(row.local_date);
    totalTicks++;
  }

  const current = supplements
    .map((s) => {
      const added = s.created_at ? String(s.created_at).slice(0, 10) : from;
      const start = added > countFrom ? added : countFrom;
      return {
        id: s.id,
        name: supplementLabel(s),
        timing: s.timing,
        timingLabel: SUPPLEMENT_TIMING_LABELS[s.timing] || "",
        days: ticksById.get(`supp:${s.id}`)?.days.size || 0,
        ofDays: Math.max(1, dayNumber(to) - dayNumber(start) + 1),
        onList: true,
      };
    })
    .sort((a, b) => TIMING_ORDER.indexOf(a.timing) - TIMING_ORDER.indexOf(b.timing));

  const listedIds = new Set(supplements.map((s) => `supp:${s.id}`));
  const previous = [...ticksById.entries()]
    .filter(([id]) => !listedIds.has(id))
    .map(([id, e]) => ({
      id,
      name: e.name || "A supplement",
      timing: e.timing,
      timingLabel: SUPPLEMENT_TIMING_LABELS[e.timing] || "",
      days: e.days.size,
      ofDays: null,
      onList: false,
    }))
    .sort((a, b) => b.days - a.days);

  return { periodDays, totalTicks, daysWithTicks: ticksDays.size, current, previous };
}
