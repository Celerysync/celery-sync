// Shared "what's actually on today" logic — used by both the Rhythm screen
// (useRhythm.js) and the voice tools (useVoiceTools.js) so a voice tick can
// never mark something the user wouldn't even see on screen (a weekday-only
// item on a weekend, an expired multi-day item, etc.). Keeping this in one
// place means the two can't drift out of sync with each other.
import { ALL_PROGRAMS } from "../data/rhythmTemplates.js";

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
  if (programDay !== null && activeProgram) {
    const program = ALL_PROGRAMS.find((p) => p.id === activeProgram.id);
    if (program) {
      for (const item of program.items) {
        const [from, to] = item.programDayRange;
        if (programDay >= from && programDay <= to) {
          programItems.push(item);
        }
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
    frequency: row.frequency,
    durationType: row.duration_type,
    durationDays: row.duration_days,
    startDate: row.start_date,
    isMedicine: row.is_medicine,
    note: row.note,
    sortOrder: row.sort_order,
  };
}
