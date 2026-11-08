// What's due for a reminder right now, for one person. Pure, so the server's
// reminder job and the tests share it, and built from the same pieces as Today
// (filterTodaysItems, expandOccurrences, orderForDay), so a reminder never
// disagrees with the screen.
//
// Due means: a set time, a time worked out from another step being ticked
// ("30 minutes after lemon water", "every 90 minutes after celery juice"), or
// "N minutes after the previous step" once that step is ticked. Anything already
// done today is skipped.
import { doneMinutesFrom, expandOccurrences, filterTodaysItems, orderForDay } from "./rhythmSchedule.js";

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};
const toHHMM = (mins) => `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

export function planReminders({
  baseItems, program = null, completions = {}, today, dow, nowMinutes, minutesOf, windowMinutes = 10,
}) {
  const todays = filterTodaysItems(baseItems, program, today, dow);
  const ctx = { doneMinutes: doneMinutesFrom(completions, minutesOf) };
  const occs = orderForDay(expandOccurrences(todays, ctx));
  const doneAt = (occId) => (completions[occId] ? minutesOf(new Date(completions[occId])) : null);

  const due = [];
  occs.forEach((occ, i) => {
    if (completions[occ.id]) return;
    let at = null;
    if (occ.fixedTime) {
      at = toMinutes(occ.fixedTime);
    } else if (!occ.schedule && occ.spacingMinutes > 0 && i > 0) {
      const prev = doneAt(occs[i - 1].id);
      if (prev != null) at = prev + occ.spacingMinutes;
    }
    if (at == null || at >= 24 * 60) return;
    if (at <= nowMinutes && nowMinutes - at < windowMinutes) {
      due.push({
        occurrenceId: occ.id,
        itemId: occ.baseItemId ?? occ.id,
        inProgram: !!occ.programId,
        name: occ.name,
        emoji: occ.emoji,
        note: occ.note,
        time: toHHMM(at),
      });
    }
  });
  return due;
}

// Minutes after midnight for a moment, in a time zone.
export function minutesInZone(timeZone) {
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return (d) => {
    const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
    return Number(parts.hour) * 60 + Number(parts.minute);
  };
}
