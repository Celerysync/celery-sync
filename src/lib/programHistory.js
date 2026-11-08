// Which programs someone has run, when, and how it went: a plain record for
// Progress and the GP report. Descriptive only (what they ticked), never what
// it did for them. Shared by the app and the server's PDF code.
import { programPhase } from "./rhythmSchedule.js";

const addDaysStr = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// rows: active_protocols rows. ticks: v_daily_status rows with program_id,
// local_date and status. today: YYYY-MM-DD.
export function summarizePrograms(rows = [], ticks = [], today) {
  return rows
    .map((row) => {
      const plannedEnd = addDaysStr(row.start_date, row.total_days - 1);
      const phase = row.completed ? "finished"
        : row.abandoned ? "ended_early"
        : programPhase(row.start_date, row.total_days, today);
      const lastDay = row.end_date && row.end_date < plannedEnd ? row.end_date : plannedEnd;
      const counted = new Set(
        ticks
          .filter((t) => t.status === "completed" && t.program_id === row.program_id
            && t.local_date >= row.start_date && t.local_date <= lastDay && t.local_date <= today)
          .map((t) => t.local_date),
      );
      return {
        id: row.id,
        name: row.program_name,
        startDate: row.start_date,
        endDate: (phase === "ended_early" || phase === "finished") && row.end_date && row.end_date < plannedEnd ? row.end_date : plannedEnd,
        totalDays: row.total_days,
        status: phase === "running" ? "running" : phase === "upcoming" ? "upcoming" : phase === "finished" ? "finished" : "ended_early",
        daysTicked: counted.size,
        round: row.chained_from_id ? "another round" : null,
      };
    })
    .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
}

export const PROGRAM_STATUS_LABELS = {
  running: "Running now",
  upcoming: "Starts soon",
  finished: "Finished",
  ended_early: "Ended early",
};
