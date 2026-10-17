/**
 * Pure, descriptive-only aggregation over daily_checkins rows — shared between
 * the client (Reports/Progress view) and the server (PDF export), so both
 * always show identical numbers. No interpretation, no correlation, no
 * causation — every value here is "what was logged," never "what it means."
 */

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayOfWeek(dateStr) {
  return new Date(dateStr + "T12:00:00").getDay();
}

// ISO-ish week bucket key: the Monday of the check-in's week
function weekBucketKey(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diffToMonday = (day + 6) % 7;
  d.setDate(d.getDate() - diffToMonday);
  return d.toISOString().split("T")[0];
}

function bucketTrend(rows, field, bucket) {
  if (bucket === "day") {
    return rows.map((c) => ({ date: c.check_date, value: c[field] || null }));
  }
  const byWeek = {};
  for (const c of rows) {
    if (!c[field]) continue;
    const key = weekBucketKey(c.check_date);
    if (!byWeek[key]) byWeek[key] = [];
    byWeek[key].push(c[field]);
  }
  return Object.entries(byWeek)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, vals]) => ({
      date,
      value: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
    }));
}

export function computeProgressStats(checkins, { bucket = "day" } = {}) {
  const sorted = [...checkins].sort((a, b) => a.check_date.localeCompare(b.check_date));

  const energyTrend = bucketTrend(sorted, "energy", bucket);
  const moodTrend = bucketTrend(sorted, "mood", bucket);

  const symptomCounts = {};
  for (const c of sorted) {
    for (const s of (c.symptoms || [])) {
      symptomCounts[s] = (symptomCounts[s] || 0) + 1;
    }
  }
  const daysLogged = sorted.length;
  const symptomFrequency = Object.entries(symptomCounts)
    .map(([name, count]) => ({ name, count, ofDays: daysLogged }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Adherence over the period. rhythm_completed/rhythm_total are written by
  // useRhythm's syncRhythmCountsToCheckin from the ledger-backed completion
  // state, so this is a denormalised view of activity_events rather than a
  // competing definition of "done".
  //
  // Streaks deliberately do NOT live here. They are owned by
  // AdherenceStreaks.jsx, which derives them from activity_events/v_daily_status
  // per spec §5. A second implementation here previously counted consecutive
  // days with celery_oz > 0 — which both contradicted those figures on the same
  // screen and silently reported zero forever for anyone whose own protocol
  // doesn't include celery juice.

  const totalScheduled = sorted.reduce((s, c) => s + (c.rhythm_total || 0), 0);
  const totalCompleted = sorted.reduce((s, c) => s + (c.rhythm_completed || 0), 0);
  const adherencePct = totalScheduled ? Math.round((totalCompleted / totalScheduled) * 100) : null;

  // Weekly rhythm — average energy by day of week across the period
  const weeklyRhythm = DOW_LABELS.map((label, idx) => {
    const vals = sorted.filter((c) => dayOfWeek(c.check_date) === idx && c.energy).map((c) => c.energy);
    return {
      label,
      avgEnergy: vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null,
      daysLogged: vals.length,
    };
  });

  return {
    daysLogged,
    energyTrend,
    moodTrend,
    symptomFrequency,
    adherence: { completed: totalCompleted, scheduled: totalScheduled, pct: adherencePct },
    weeklyRhythm,
  };
}

// ── Then and now ───────────────────────────────────────────────────────────
// Compares the user's first N logged days against their most recent N. The
// trend charts already hold this information, but a column of weekly bars
// does not answer "am I different than when I started" for someone with brain
// fog, which is the question people actually have.
//
// Descriptive only, and deliberately constrained:
//  - Adherence is NOT compared here. Showing "adherence up" beside "energy up"
//    asserts a cause even with no words between them, which the compliance
//    rails forbid (see the encouragement engine's rule 7).
//  - Output is plain numbers for a template to render. No generated prose —
//    causal phrasing is exactly what an LLM would add here.
//  - A misleading "you improved" to someone deciding whether to keep going is
//    a real harm, so thin data returns null rather than a flattering guess.

const YMD = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const parseYMD = (s) => new Date(s + "T12:00:00");

function shiftDays(dateStr, n) {
  const d = parseYMD(dateStr);
  d.setDate(d.getDate() + n);
  return YMD(d);
}

function spanDays(a, b) {
  return Math.round((parseYMD(b) - parseYMD(a)) / 86_400_000) + 1;
}

function average(rows, field) {
  const vals = rows.map((r) => r[field]).filter((v) => typeof v === "number" && v > 0);
  if (!vals.length) return null;
  return { avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10, n: vals.length };
}

// Scale-appropriate floors: below these, a difference is indistinguishable
// from day-to-day noise and is reported as "about the same" rather than an
// arrow that implies a real move.
const METRICS = [
  { key: "energy", label: "Energy", scale: 10, noiseFloor: 0.5 },
  { key: "mood", label: "Mood", scale: 5, noiseFloor: 0.3 },
  { key: "sleep_hours", label: "Sleep", scale: 12, noiseFloor: 0.5, unit: "h" },
];

export function computeThenAndNow(
  checkins,
  { windowDays = 30, minPerWindow = 10, minHistoryDays = 60 } = {}
) {
  const sorted = [...(checkins || [])].sort((a, b) => a.check_date.localeCompare(b.check_date));
  if (sorted.length < minPerWindow * 2) return null;

  const firstDate = sorted[0].check_date;
  const lastDate = sorted[sorted.length - 1].check_date;
  if (spanDays(firstDate, lastDate) < minHistoryDays) return null;

  const thenEnd = shiftDays(firstDate, windowDays - 1);
  const nowStart = shiftDays(lastDate, -(windowDays - 1));
  // Overlapping windows would compare a period against itself.
  if (thenEnd >= nowStart) return null;

  const thenRows = sorted.filter((c) => c.check_date <= thenEnd);
  const nowRows = sorted.filter((c) => c.check_date >= nowStart);
  if (thenRows.length < minPerWindow || nowRows.length < minPerWindow) return null;

  const metrics = [];
  for (const m of METRICS) {
    const then = average(thenRows, m.key);
    const now = average(nowRows, m.key);
    // Each metric earns its place independently — energy and mood are required
    // at check-in, but sleep only arrives via voice or a wearable.
    if (!then || !now || then.n < minPerWindow || now.n < minPerWindow) continue;
    const delta = Math.round((now.avg - then.avg) * 10) / 10;
    metrics.push({
      ...m,
      then,
      now,
      delta,
      direction: Math.abs(delta) < m.noiseFloor ? "same" : delta > 0 ? "up" : "down",
    });
  }

  // Symptoms compare as a rate, since the two windows rarely hold the same
  // number of logged days.
  const rateFor = (rows, name) => rows.filter((r) => (r.symptoms || []).includes(name)).length;
  const names = new Set([...thenRows, ...nowRows].flatMap((r) => r.symptoms || []));
  const symptoms = [...names]
    .map((name) => {
      const thenCount = rateFor(thenRows, name);
      const nowCount = rateFor(nowRows, name);
      const thenPct = thenCount / thenRows.length;
      const nowPct = nowCount / nowRows.length;
      return {
        name,
        then: { count: thenCount, of: thenRows.length },
        now: { count: nowCount, of: nowRows.length },
        // 10 percentage points — below that, call it unchanged.
        direction: Math.abs(nowPct - thenPct) < 0.1 ? "same" : nowPct > thenPct ? "up" : "down",
        weight: Math.max(thenCount, nowCount),
      };
    })
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4);

  if (!metrics.length && !symptoms.length) return null;

  return {
    windowDays,
    then: { start: firstDate, end: thenEnd, daysLogged: thenRows.length },
    now: { start: nowStart, end: lastDate, daysLogged: nowRows.length },
    metrics,
    symptoms,
  };
}

// Cycle-day for each check-in, given a sorted list of period start dates
// (ascending). null if no period has been logged yet, or the gap since the
// last logged start is implausibly long (> 60 days — likely missed logging
// a period rather than an actual 2-month cycle).
export function computeCycleOverlay(checkins, periodStartDates) {
  if (!periodStartDates?.length) return null;
  const starts = [...periodStartDates].sort();

  const cycleDayFor = (dateStr) => {
    const date = new Date(dateStr + "T00:00:00");
    let lastStart = null;
    for (const s of starts) {
      const startDate = new Date(s + "T00:00:00");
      if (startDate <= date) lastStart = startDate;
      else break;
    }
    if (!lastStart) return null;
    const day = Math.floor((date - lastStart) / 86_400_000) + 1;
    return day > 60 ? null : day;
  };

  const byCycleDay = {};
  for (const c of checkins) {
    if (!c.energy) continue;
    const day = cycleDayFor(c.check_date);
    if (day == null) continue;
    if (!byCycleDay[day]) byCycleDay[day] = [];
    byCycleDay[day].push(c.energy);
  }

  const maxDay = Math.max(0, ...Object.keys(byCycleDay).map(Number));
  if (!maxDay) return null;

  const points = [];
  for (let day = 1; day <= maxDay; day++) {
    const vals = byCycleDay[day];
    points.push({
      day,
      avgEnergy: vals?.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null,
    });
  }
  return points;
}
