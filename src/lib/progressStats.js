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

  const totalScheduled = sorted.reduce((s, c) => s + (c.rhythm_total || 0), 0);
  const totalCompleted = sorted.reduce((s, c) => s + (c.rhythm_completed || 0), 0);
  const adherencePct = totalScheduled ? Math.round((totalCompleted / totalScheduled) * 100) : null;

  // Streaks — consecutive days with celery juice logged
  let currentStreak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if ((sorted[i].celery_oz || 0) > 0) currentStreak++;
    else break;
  }
  let longestStreak = 0, run = 0;
  for (const c of sorted) {
    if ((c.celery_oz || 0) > 0) { run++; longestStreak = Math.max(longestStreak, run); }
    else run = 0;
  }

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
    streaks: { current: currentStreak, longest: longestStreak },
    weeklyRhythm,
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
