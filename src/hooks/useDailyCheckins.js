import { useState, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase.js";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabel(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][d.getDay()];
}

export function useDailyCheckins(authUser, profileId) {
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCheckins = useCallback(async () => {
    if (!authUser?.id || !profileId) { setLoading(false); return; }
    try {
      const { data } = await supabase
        .from("daily_checkins")
        .select("*")
        .eq("profile_id", profileId)
        .order("check_date", { ascending: false })
        .limit(60);
      if (data) setCheckins(data);
    } catch (e) {
      console.warn("Load checkins:", e.message);
    }
    setLoading(false);
  }, [authUser?.id]);

  const saveCheckin = useCallback(async (data) => {
    if (!authUser?.id || !profileId) return;
    const row = { user_id: authUser.id, profile_id: profileId, check_date: todayStr(), ...data };
    const { data: saved, error } = await supabase
      .from("daily_checkins")
      .upsert(row, { onConflict: "profile_id,check_date" })
      .select()
      .single();
    if (!error && saved) {
      setCheckins((prev) => {
        const without = prev.filter((c) => c.check_date !== todayStr());
        return [saved, ...without];
      });
    }
    return saved;
  }, [authUser?.id]);

  const todaysCheckin = useMemo(
    () => checkins.find((c) => c.check_date === todayStr()) ?? null,
    [checkins]
  );

  // Last 7 days in ascending order for graphs
  const last7 = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const found = checkins.find((c) => c.check_date === ds);
      days.push({ date: ds, day: dayLabel(ds), energy: found?.energy ?? 0, mood: found?.mood ?? 0, celery: found?.celery_oz ?? 0 });
    }
    return days;
  }, [checkins]);

  const celeryStreak = useMemo(() => {
    let streak = 0;
    const sorted = [...checkins].sort((a, b) => b.check_date.localeCompare(a.check_date));
    for (const c of sorted) {
      if (c.celery_oz > 0) streak++;
      else break;
    }
    return streak;
  }, [checkins]);

  const protocolDays = checkins.length;

  const avgEnergy7 = useMemo(() => {
    const vals = last7.filter((d) => d.energy > 0).map((d) => d.energy);
    return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
  }, [last7]);

  return {
    checkins,
    todaysCheckin,
    last7,
    celeryStreak,
    protocolDays,
    avgEnergy7,
    loading,
    loadCheckins,
    saveCheckin,
    todayStr,
  };
}
