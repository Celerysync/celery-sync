// "Your month": what they logged in a calendar month, in plain words. It
// describes only their own records (counts, days, their own averages) and
// never says what anything did for them (TGA: descriptive only).
import { madeCounts, timesText } from "./whatYouMade.js";
import { WATER_ITEM_ID, isRhythmCategory } from "./waterEvents.js";

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// { start, end, label, days } for this month (to today) or last month.
export function monthRange(which = "this", now = new Date()) {
  const first = new Date(now.getFullYear(), now.getMonth() + (which === "last" ? -1 : 0), 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const end = which === "last" ? lastDay : now;
  return {
    start: ymd(first),
    end: ymd(end),
    label: first.toLocaleDateString("en-AU", { month: "long" }),
    year: first.getFullYear(),
    days: end.getDate(),
    sofar: which !== "last",
  };
}

const round1 = (n) => Math.round(n * 10) / 10;

// statusRows: v_daily_status rows (item_id, item_name, item_category,
// local_date, status, occurrence_slot) for the month. events: raw
// activity_events with recipe ticks + un-ticks (for "what you made").
// checkins: daily_checkins rows. programs: active_protocols rows.
export function buildMonthSummary({ range, statusRows = [], events = [], checkins = [], programs = [] }) {
  const done = statusRows.filter((r) => r.status === "completed");
  const rhythm = done.filter((r) => isRhythmCategory(r.item_category));
  const showedUpDays = new Set(rhythm.map((r) => r.local_date)).size;

  const stepCounts = new Map();
  for (const r of rhythm) stepCounts.set(r.item_name, (stepCounts.get(r.item_name) || 0) + 1);
  const topSteps = [...stepCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3)
    .map(([name, count]) => ({ name, count }));

  const supp = done.filter((r) => r.item_category === "supplement");
  const suppDays = new Set(supp.map((r) => r.local_date)).size;

  const water = done.filter((r) => r.item_id === WATER_ITEM_ID);
  const waterByDay = {};
  for (const r of water) waterByDay[r.local_date] = (waterByDay[r.local_date] || 0) + 1;
  const waterDays = Object.keys(waterByDay).length;
  const waterAvg = waterDays ? round1(water.length / waterDays) : null;

  const made = madeCounts(events).slice(0, 3);

  const inMonth = checkins.filter((c) => c.check_date >= range.start && c.check_date <= range.end);
  const withEnergy = inMonth.filter((c) => Number(c.energy) > 0);
  const midDay = Math.ceil(range.days / 2);
  const day = (c) => Number(c.check_date.slice(8, 10));
  const avg = (list) => (list.length ? round1(list.reduce((s, c) => s + Number(c.energy), 0) / list.length) : null);
  const firstHalf = withEnergy.filter((c) => day(c) <= midDay);
  const secondHalf = withEnergy.filter((c) => day(c) > midDay);
  const energy = firstHalf.length >= 3 && secondHalf.length >= 3
    ? { first: avg(firstHalf), second: avg(secondHalf) }
    : withEnergy.length ? { all: avg(withEnergy) } : null;

  const finished = programs.filter((p) => p.completed && p.end_date >= range.start && p.end_date <= range.end)
    .map((p) => p.program_name);

  return {
    range,
    showedUpDays,
    topSteps,
    totalTicks: rhythm.length,
    suppDays,
    waterDays,
    waterAvg,
    made,
    checkinCount: inMonth.length,
    energy,
    finished,
    empty: !rhythm.length && !supp.length && !water.length && !inMonth.length,
  };
}

// The same summary as a few plain sentences (for reading aloud, and the card).
export function monthSentences(s, name = "") {
  const r = s.range;
  const period = r.sofar ? `So far in ${r.label}` : `In ${r.label}`;
  const out = [];
  if (s.empty) return [r.sofar ? `${period} there's nothing logged yet. Tick a step on Today and it'll start showing here.` : `Nothing was logged in ${r.label}.`];
  out.push(`${period}${name ? `, ${name},` : ""} you kept up your routine on ${s.showedUpDays} ${s.showedUpDays === 1 ? "day" : "days"}${r.sofar ? ` out of ${r.days}` : ` of ${r.days}`}.`);
  if (s.topSteps.length) out.push(`Your most-ticked steps: ${s.topSteps.map((t) => `${t.name} (${timesText(t.count)})`).join(", ")}.`);
  if (s.suppDays) out.push(`You ticked supplements on ${s.suppDays} ${s.suppDays === 1 ? "day" : "days"}.`);
  if (s.made.length) out.push(`From your Kitchen you made ${s.made.map((m) => `${m.name} ${timesText(m.count)}`).join(", ")}.`);
  if (s.checkinCount) out.push(`You logged how you were feeling ${timesText(s.checkinCount)}.`);
  if (s.energy?.first != null) out.push(`Your logged energy averaged ${s.energy.first} out of 10 in the first half of the month, and ${s.energy.second} in the second half.`);
  else if (s.energy?.all != null) out.push(`Your logged energy averaged ${s.energy.all} out of 10.`);
  if (s.waterDays) out.push(`You logged water on ${s.waterDays} ${s.waterDays === 1 ? "day" : "days"}, ${s.waterAvg} glasses a day on average.`);
  if (s.finished.length) out.push(`You finished ${s.finished.join(" and ")}.`);
  return out;
}
