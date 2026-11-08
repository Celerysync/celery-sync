// "What you made": which of their own recipes they ticked, and how often.
// Read from the activity_events ledger (each tick notes the recipe), with the
// ledger's rule that the latest event per step, day and slot wins — so a tick
// that was taken back doesn't count. Descriptive only: names and counts,
// never what it did for them (docs/KITCHEN_PLAN.md rules).
//
// Used by Progress, the carer view and the GP report (server), so it takes a
// Supabase client rather than importing one.

const keyOf = (e) => `${e.item_id}|${e.occurrence_slot || ""}|${e.local_date}`;

// events: rows with item_id, occurrence_slot, local_date, event_type,
// recipe_name, occurred_at. → [{ name, count, lastDate }] most first.
export function madeCounts(events) {
  const latest = new Map();
  for (const e of events) {
    const k = keyOf(e);
    const prev = latest.get(k);
    if (!prev || String(e.occurred_at) > String(prev.occurred_at)) latest.set(k, e);
  }
  const counts = new Map();
  for (const e of latest.values()) {
    if (e.event_type !== "completed" || !e.recipe_name) continue;
    const c = counts.get(e.recipe_name) || { name: e.recipe_name, count: 0, lastDate: e.local_date };
    c.count += 1;
    if (e.local_date > c.lastDate) c.lastDate = e.local_date;
    counts.set(e.recipe_name, c);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

const COLS = "item_id, occurrence_slot, local_date, event_type, recipe_name, occurred_at";

// The recipe ticks in [from, to], plus any un-ticks in the same days so taken
// back ticks drop out. Two small queries instead of the whole ledger.
export async function loadMade(client, profileId, from, to) {
  const base = () => client.from("activity_events").select(COLS).eq("profile_id", profileId).gte("local_date", from).lte("local_date", to).limit(5000);
  const [ticks, undos] = await Promise.all([
    base().not("recipe_name", "is", null),
    base().eq("event_type", "uncompleted"),
  ]);
  if (ticks.error) throw new Error(ticks.error.message);
  return madeCounts([...(ticks.data || []), ...(undos.data || [])]);
}

export const timesText = (n) => (n === 1 ? "once" : n === 2 ? "twice" : `${n} times`);

// Local YYYY-MM-DD n days before `date` (inclusive ranges: 7 days = date-6..date).
export function daysBefore(date, n) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
