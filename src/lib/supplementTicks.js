// Ticking supplements from outside the Supplements card (Today's "also tick
// them?" offer, and the voice helper). One ledger row each, the same as a tap
// in the card, and optional stock tracking follows the dose. App-only: this
// uses the signed-in database client, so the server never imports it.
import { supabase } from "./supabase.js";
import { supplementEventRow } from "./supplementEvents.js";
import { TODAY } from "./rhythmSchedule.js";

export const SUPPLEMENTS_TICKED_EVENT = "cs:supplements-changed";

export async function adjustSupplementStock(profileId, name, taken) {
  const { data: row } = await supabase.from("supplement_inventory")
    .select("units_on_hand, units_per_dose")
    .eq("profile_id", profileId)
    .eq("supplement_name", name)
    .maybeSingle();
  if (!row || row.units_on_hand == null) return;
  const delta = (taken ? -1 : 1) * (row.units_per_dose || 1);
  await supabase.from("supplement_inventory")
    .update({ units_on_hand: Math.max(0, row.units_on_hand + delta), updated_at: new Date().toISOString() })
    .eq("profile_id", profileId)
    .eq("supplement_name", name);
}

export async function tickSupplements({ userId, profileId, supplements, source = "tap", date = TODAY() }) {
  if (!supplements?.length) return;
  const rows = supplements.map((supplement) => supplementEventRow({ userId, profileId, supplement, taken: true, source, date }));
  const { error } = await supabase.from("activity_events").insert(rows);
  if (error) throw new Error(error.message);
  await Promise.all(supplements.map((s) => adjustSupplementStock(profileId, s.name, true).catch(() => {})));
  window.dispatchEvent(new Event(SUPPLEMENTS_TICKED_EVENT));
}

// Supplements taken with each step: step id → its supplements.
export function supplementsByStep(supplements = []) {
  const out = {};
  for (const s of supplements) {
    if (!s.with_item_id) continue;
    (out[s.with_item_id] ||= []).push(s);
  }
  return out;
}
