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
export function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export const TODAY = () => localDateStr();

// The calendar day for someone in a given time zone, as YYYY-MM-DD. For server
// jobs: the server runs in UTC, where an Australian morning is still yesterday.
export function localDateInZone(timeZone, now = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return now.toISOString().split("T")[0]; // unrecognised zone name
  }
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return localDateStr(d); // toISOString() here lands a day early east of UTC
}

// Which day of a program a date is (1-based), counted from its start.
function programDayIndex(startDate, dateStr) {
  return Math.round((Date.parse(`${dateStr}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000) + 1;
}

export function programDayNumber(startDate, totalDays, dateStr = TODAY()) {
  if (!startDate) return null;
  const day = programDayIndex(startDate, dateStr);
  if (day < 1 || day > totalDays) return null;
  return day;
}

// "upcoming" before its first day, "running", then "finished". A program set to
// start tomorrow used to count as finished the moment it was saved.
export function programPhase(startDate, totalDays, dateStr = TODAY()) {
  if (!startDate) return "finished";
  const day = programDayIndex(startDate, dateStr);
  return day < 1 ? "upcoming" : day > totalDays ? "finished" : "running";
}

// During a running program, everyday items carry on unless the person chose to
// pause them: keepEveryday lists the ones kept, and null means keep them all.
export function everydayItemsDuring(baseItems, activeProgram, dateStr = TODAY()) {
  const keep = activeProgram?.keepEveryday;
  if (!Array.isArray(keep)) return baseItems;
  if (programPhase(activeProgram.startDate, activeProgram.totalDays, dateStr) !== "running") return baseItems;
  return baseItems.filter((item) => keep.includes(item.id));
}

// True once an item shouldn't appear any more: its "for N days" run has
// finished, or it's a cleanse item left over with no program. The Rhythm
// screen, voice tools and reminder job all share this, so nothing can keep
// reminding about an item that has gone from the screen.
export function itemIsOver(item, dateStr) {
  if (item.durationType === "days" && item.durationDays && item.startDate) {
    if (dateStr > addDays(item.startDate, item.durationDays - 1)) return true;
  }
  return item.durationType === "cleanse" && !item.programId;
}

// Today in time order, wherever items were added. Something with no time of its
// own stays straight after the item it follows, which keeps "then my juice"
// steps together; anything before the first timed item stays at the top.
export function orderForDay(items) {
  const blocks = [];
  for (const item of items) {
    if (item.fixedTime || !blocks.length) blocks.push({ time: item.fixedTime || "", items: [item] });
    else blocks[blocks.length - 1].items.push(item);
  }
  return blocks
    .map((block, i) => ({ ...block, i }))
    .sort((a, b) => (a.time || "").localeCompare(b.time || "") || a.i - b.i)
    .flatMap((block) => block.items);
}

export function filterTodaysItems(baseItems, activeProgram, today = TODAY(), dow = new Date().getDay()) {
  const isWeekday = dow >= 1 && dow <= 5;

  let programDay = null;
  if (activeProgram) {
    programDay = programDayNumber(activeProgram.startDate, activeProgram.totalDays, today);
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

  // Each list keeps its own order. Sorting them together by sortOrder (both
  // count from 1) wedged program steps into the middle of the everyday
  // sequence, so "smoothie, after celery juice" followed a program step instead.
  const bySort = (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  const keep = (item) => {
    if (item.frequency === "weekdays" && !isWeekday) return false;
    return !itemIsOver(item, today);
  };
  return [
    ...everydayItemsDuring(baseItems, activeProgram, today).filter(keep).sort(bySort),
    ...programItems.filter(keep).sort(bySort),
  ];
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
    recipeId: row.recipe_id ?? null, // a recipe in their Kitchen this step opens
  };
}

// The inverse of rhythmRowToItem — one shape for every writer (taps, voice).
export function rhythmItemToRow(item, profileId) {
  return {
    profile_id: profileId,
    name: item.name,
    emoji: item.emoji || "🌿",
    category: item.category || "other",
    spacing_minutes: item.spacingMinutes ?? 0,
    fixed_time: item.fixedTime ?? null,
    schedule: item.schedule ?? null,
    frequency: item.frequency ?? "daily",
    duration_type: item.durationType ?? "ongoing",
    duration_days: item.durationDays ?? null,
    start_date: item.startDate ?? null,
    is_medicine: item.isMedicine ?? false,
    note: item.note ?? "",
    sort_order: item.sortOrder ?? 0,
    // Only written when the caller knows it, so older writers never unlink one.
    ...(item.recipeId !== undefined ? { recipe_id: item.recipeId || null } : {}),
    // Who made the change — read by the rhythm_item_changes diary trigger.
    changed_via: item.changedVia ?? "tap",
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

// Steps timed from another step being done: "30 minutes after lemon water", or
// "every 90 minutes after celery juice, until 6pm". The clock starts at the real
// tick. ctx.doneMinutes maps an item id to when it was first done today, as
// minutes after midnight in the person's own time; until then there's no time.
export function relativeTimes(item, ctx) {
  const s = item?.schedule;
  const started = ctx?.doneMinutes?.[s?.after];
  if (started == null) return [];
  if (s.type === "after") {
    const t = started + Number(s.minutes || 0);
    return t < 24 * 60 ? [toHHMM(t)] : [];
  }
  if (s.type === "every_after") {
    const every = Number(s.everyMinutes);
    const until = s.until ? toMinutes(s.until) : 24 * 60 - 1;
    if (!Number.isFinite(every) || every < 15 || until === null) return [];
    const out = [];
    for (let t = started + every; t <= until && t < 24 * 60 && out.length < MAX_OCCURRENCES; t += every) out.push(toHHMM(t));
    return out;
  }
  return [];
}

export const isRelative = (item) => item?.schedule?.type === "after" || item?.schedule?.type === "every_after";

export function scheduleTimes(item, ctx) {
  const s = item?.schedule;
  if (isRelative(item)) return relativeTimes(item, ctx);
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
export function occurrencesFor(item, ctx) {
  const times = scheduleTimes(item, ctx);
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
export function expandOccurrences(items, ctx) {
  return items.flatMap((item) =>
    occurrencesFor(item, ctx).map((occ) => ({
      ...item,
      id: occurrenceId(item.id, occ.slot),
      baseItemId: item.id,
      slot: occ.slot,
      fixedTime: occ.time ?? item.fixedTime ?? null,
    }))
  );
}

// When each step was first done today, as minutes after midnight, from a map
// of occurrence id → ISO time. minutesOf turns a Date into local minutes (the
// server passes one for the person's time zone).
export function doneMinutesFrom(completions, minutesOf = (d) => d.getHours() * 60 + d.getMinutes()) {
  const out = {};
  for (const [occId, iso] of Object.entries(completions || {})) {
    if (!iso) continue;
    const { itemId } = parseOccurrenceId(occId);
    const m = minutesOf(new Date(iso));
    if (out[itemId] == null || m < out[itemId]) out[itemId] = m;
  }
  return out;
}

// Fired on window whenever rhythm_items change outside useRhythm (the voice
// companion's tools), so every mounted rhythm list reloads.
export const RHYTHM_CHANGED_EVENT = "cs:rhythm-changed";
