import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { localDateStr } from "../lib/rhythmSchedule.js";
import { WATER_CHANGED_EVENT, WATER_ITEM_ID, glassesByDay, waterChanges } from "../lib/waterEvents.js";

// Today's glasses of water, from the history. Glasses counted on this phone
// before water was saved to the history are moved across once.
export function useWater(authUser, profileId) {
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");
  const countRef = useRef(0);
  const today = localDateStr();

  const load = useCallback(async () => {
    if (!profileId) return;
    const { data, error: e } = await supabase.from("v_daily_status")
      .select("item_id, local_date, status, occurrence_slot")
      .eq("profile_id", profileId).eq("item_id", WATER_ITEM_ID).eq("local_date", today);
    if (e) return;
    let n = glassesByDay(data)[today] || 0;
    // One-time move of the old phone-only count for today.
    const oldKey = `cs_water_${today}`;
    let old = 0;
    try { old = Number(JSON.parse(localStorage.getItem(oldKey) || "0")) || 0; } catch { old = 0; }
    if (old > n && authUser?.id) {
      const rows = waterChanges({ current: n, add: old - n, userId: authUser.id, profileId, date: today });
      const { error: me } = await supabase.from("activity_events").insert(rows);
      if (!me) n = old;
    }
    if (old) { try { localStorage.removeItem(oldKey); } catch { /* ignore */ } }
    countRef.current = n;
    setCount(n);
  }, [profileId, authUser?.id, today]);

  useEffect(() => {
    load();
    window.addEventListener(WATER_CHANGED_EVENT, load);
    return () => window.removeEventListener(WATER_CHANGED_EVENT, load);
  }, [load]);

  const change = useCallback(async (delta) => {
    if (!authUser?.id || !profileId) return;
    const current = countRef.current;
    const rows = waterChanges({ current, add: delta > 0 ? delta : 0, remove: delta < 0 ? -delta : 0, userId: authUser.id, profileId, date: today });
    if (!rows.length) return;
    const next = Math.max(0, current + delta);
    countRef.current = next;
    setCount(next);
    setError("");
    const { error: e } = await supabase.from("activity_events").insert(rows);
    if (e) {
      countRef.current = current;
      setCount(current);
      setError("That didn't save. Please try again.");
    }
  }, [authUser?.id, profileId, today]);

  return { count, add: () => change(1), remove: () => change(-1), error };
}
