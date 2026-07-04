import { useState, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase.js";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayNumber(startDate, totalDays) {
  if (!startDate) return null;
  const start = new Date(startDate + "T00:00:00");
  const today = new Date(todayStr() + "T00:00:00");
  const diff = Math.floor((today - start) / 86_400_000) + 1;
  if (diff < 1 || (totalDays && diff > totalDays)) return null;
  return diff;
}

export function useActiveProtocol(authUser, profileId) {
  const [protocol, setProtocol] = useState(null);

  const loadActiveProtocol = useCallback(async () => {
    if (!authUser?.id || !profileId) { setProtocol(null); return; }
    const { data } = await supabase
      .from("active_protocols")
      .select("program_name, start_date, total_days")
      .eq("profile_id", profileId)
      .eq("completed", false)
      .eq("abandoned", false)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    setProtocol(data || null);
  }, [authUser?.id, profileId]);

  const activeProtocol = useMemo(() => {
    if (!protocol) return null;
    const day = dayNumber(protocol.start_date, protocol.total_days);
    if (day == null) return null;
    return { name: protocol.program_name, day, totalDays: protocol.total_days };
  }, [protocol]);

  return { activeProtocol, loadActiveProtocol };
}
