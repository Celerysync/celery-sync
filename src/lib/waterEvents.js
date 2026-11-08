// Water, in the same history as every tick (activity_events), so it shows in
// Progress and for carers, the companion can log it, and it isn't lost when
// they change phones. One glass = one slot ("1", "2", …) of the "water" item;
// taking one back is a reversal on the last slot, like any un-tick.
// Water never counts towards rhythm streaks or percentages.
export const WATER_ITEM_ID = "water";
export const WATER_CATEGORY = "water";
export const WATER_CHANGED_EVENT = "cs:water-changed";
export const WATER_GOAL = 8;

export function waterRow({ userId, profileId, glass, taken, source = "tap", date }) {
  return {
    user_id: userId,
    profile_id: profileId,
    item_id: WATER_ITEM_ID,
    item_name: "Water",
    item_category: WATER_CATEGORY,
    occurrence_slot: String(glass),
    event_type: taken ? "completed" : "uncompleted",
    source,
    occurred_at: new Date().toISOString(),
    local_date: date,
  };
}

// Glasses per day from v_daily_status rows (latest per slot already applied).
export function glassesByDay(statusRows) {
  const out = {};
  for (const r of statusRows || []) {
    if (r.item_id !== WATER_ITEM_ID || r.status !== "completed") continue;
    out[r.local_date] = (out[r.local_date] || 0) + 1;
  }
  return out;
}

// Steps in the rhythm only — not supplements, not water.
export const isRhythmCategory = (category) => category !== "supplement" && category !== WATER_CATEGORY;

// Add or take back glasses: rows to write, given how many are logged now.
export function waterChanges({ current, add = 0, remove = 0, ...ctx }) {
  const rows = [];
  for (let i = 1; i <= add; i++) rows.push(waterRow({ ...ctx, glass: current + i, taken: true }));
  for (let i = 0; i < Math.min(remove, current); i++) rows.push(waterRow({ ...ctx, glass: current - i, taken: false }));
  return rows;
}
