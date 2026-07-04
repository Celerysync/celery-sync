import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase.js";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export function useCycleTracking(profileId) {
  const [loggedToday, setLoggedToday] = useState(false);
  const [periodStartDates, setPeriodStartDates] = useState([]);

  const load = useCallback(async () => {
    if (!profileId) return;
    const { data } = await supabase
      .from("cycle_logs")
      .select("period_start_date")
      .eq("profile_id", profileId)
      .order("period_start_date", { ascending: true });
    const dates = (data || []).map((r) => r.period_start_date);
    setPeriodStartDates(dates);
    setLoggedToday(dates.includes(todayStr()));
  }, [profileId]);

  useEffect(() => { load(); }, [load]);

  const logPeriodStart = useCallback(async (date = todayStr()) => {
    if (!profileId) return;
    await supabase.from("cycle_logs").upsert(
      { profile_id: profileId, period_start_date: date },
      { onConflict: "profile_id,period_start_date" }
    );
    setPeriodStartDates((prev) => [...new Set([...prev, date])].sort());
    if (date === todayStr()) setLoggedToday(true);
  }, [profileId]);

  const undoToday = useCallback(async () => {
    if (!profileId) return;
    await supabase.from("cycle_logs").delete().eq("profile_id", profileId).eq("period_start_date", todayStr());
    setPeriodStartDates((prev) => prev.filter((d) => d !== todayStr()));
    setLoggedToday(false);
  }, [profileId]);

  return { loggedToday, periodStartDates, logPeriodStart, undoToday };
}
