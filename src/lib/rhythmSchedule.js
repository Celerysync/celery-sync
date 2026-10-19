// Shared "what's actually on today" logic — used by both the Rhythm screen
// (useRhythm.js) and the voice tools (useVoiceTools.js) so a voice tick can
// never mark something the user wouldn't even see on screen (a weekday-only
// item on a weekend, an expired multi-day item, etc.). Keeping this in one
// place means the two can't drift out of sync with each other.
//
// Program items come from the activeProgram object itself (denormalized when
// the user starts one of their own saved programs) — the app ships no program
// content of its own (LEGAL_CONSTRAINTS.md: user supplies the protocol).

// Local calendar day, NOT UTC — toISOString() would put anything ticked
// before ~10am AEST on yesterday's date (spec §2.1: local_date is computed
// from the user's timezone, never from UTC).
export const TODAY = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

export function programDayNumber(startDate, totalDays) {
  if (!startDate) return null;
  const start = new Date(startDate + "T00:00:00");
  const today = new Date(TODAY() + "T00:00:00");
  const diff = Math.floor((today - start) / 86_400_000) + 1;
  if (diff < 1 || diff > totalDays) return null;
  return diff;
}

export function filterTodaysItems(baseItems, activeProgram) {
  const today = TODAY();
  const dow = new Date().getDay();
  const isWeekday = dow >= 1 && dow <= 5;

  let programDay = null;
  if (activeProgram) {
    programDay = programDayNumber(activeProgram.startDate, activeProgram.totalDays);
  }

  const programItems = [];
  if (programDay !== null && activeProgram?.items) {
    for (const item of activeProgram.items) {
      const [from, to] = item.programDayRange || [1, activeProgram.totalDays];
      if (programDay >= from && programDay <= to) {
        programItems.push(item);
      }
    }
  }

  return [...baseItems, ...programItems].filter((item) => {
    if (item.frequency === "weekdays" && !isWeekday) return false;
    if (item.durationType === "days" && item.durationDays && item.startDate) {
      const endDate = addDays(item.startDate, item.durationDays - 1);
      if (today > endDate) return false;
    }
    if (item.durationType === "cleanse" && !item.programId) return false;
    return true;
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function rhythmRowToItem(row) {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    category: row.category,
    spacingMinutes: row.spacing_minutes,
    fixedTime: row.fixed_time,
    schedule: row.schedule || null,
    frequency: row.frequency,
    durationType: row.duration_type,
    durationDays: row.duration_days,
    startDate: row.start_date,
    isMedicine: row.is_medicine,
    note: row.note,
    sortOrder: row.sort_order,
  };
}

// ── Occurrences ────────────────────────────────────────────────────────────
// An item can happen more than once a day ("supplements morning and night",
// "a snack every 90 minutes"), so the screen, the reminder cron and the voice
// tools all expand items into occurrences through here. One implementation,
// or they drift and a voice tick marks a slot the screen never showed.

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

const toHHMM = (mins) =>
  `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

// Guards a malformed or hostile schedule from generating an unbounded list.
const MAX_OCCURRENCES = 24;

export function scheduleTimes(item) {
  const s = item?.schedule;
  if (s?.type === "times" && Array.isArray(s.times)) {
    return [...new Set(s.times.filter((t) => toMinutes(t) !== null))].sort();
  }
  if (s?.type === "interval") {
    const every = Number(s.everyMinutes);
    const from = toMinutes(s.from);
    const to = toMinutes(s.to);
    if (!Number.isFinite(every) || every < 15 || from === null || to === null || to < from) return [];
    const out = [];
    for (let t = from; t <= to && out.length < MAX_OCCURRENCES; t += every) out.push(toHHMM(t));
    return out;
  }
  // No schedule yet — fall back to the single legacy fixed_time.
  return item?.fixedTime ? [item.fixedTime] : [];
}

// A slot is only assigned when the item genuinely happens more than once that
// day. Single-occurrence items keep slot === null, which is exactly what every
// pre-existing ledger row and every single-time item already uses — so this
// change is invisible to them.
export function occurrencesFor(item) {
  const times = scheduleTimes(item);
  if (times.length <= 1) return [{ slot: null, time: times[0] ?? null }];
  return times.map((t) => ({ slot: t, time: t }));
}

// Item ids are uuids, or app-generated program ids like "sr-<uuid>" — neither
// contains "@", so it is safe as the separator.
export const occurrenceId = (itemId, slot) => (slot ? `${itemId}@${slot}` : itemId);

export function parseOccurrenceId(occId) {
  const i = String(occId).lastIndexOf("@");
  if (i === -1) return { itemId: String(occId), slot: null };
  return { itemId: String(occId).slice(0, i), slot: String(occId).slice(i + 1) };
}

// Expands today's items into the tickable occurrences the screen shows.
export function expandOccurrences(items) {
  return items.flatMap((item) =>
    occurrencesFor(item).map((occ) => ({
      ...item,
      id: occurrenceId(item.id, occ.slot),
      baseItemId: item.id,
      slot: occ.slot,
      fixedTime: occ.time ?? item.fixedTime ?? null,
    }))
  );
}
