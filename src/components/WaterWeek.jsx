import { useEffect, useState } from "react";
import C, { alpha } from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { supabase } from "../lib/supabase.js";
import { localDateStr } from "../lib/rhythmSchedule.js";
import { WATER_ITEM_ID, glassesByDay } from "../lib/waterEvents.js";
import { daysBefore } from "../lib/whatYouMade.js";

// Progress: glasses of water logged each of the last 7 days. Counts only.
export default function WaterWeek({ profileId }) {
  const [byDay, setByDay] = useState(null);
  const today = localDateStr();
  useEffect(() => {
    if (!profileId) return;
    let on = true;
    supabase.from("v_daily_status").select("item_id, local_date, status")
      .eq("profile_id", profileId).eq("item_id", WATER_ITEM_ID).gte("local_date", daysBefore(today, 6))
      .then(({ data }) => { if (on) setByDay(glassesByDay(data)); });
    return () => { on = false; };
  }, [profileId, today]);

  if (!byDay || !Object.keys(byDay).length) return null;
  const days = Array.from({ length: 7 }, (_, i) => daysBefore(today, 6 - i));
  const max = Math.max(8, ...days.map((d) => byDay[d] || 0));
  return (
    <Card>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16, color: C.charcoal, marginBottom: 10 }}>💧 Water, last 7 days</div>
      <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 90 }}>
        {days.map((d) => {
          const n = byDay[d] || 0;
          return (
            <div key={d} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ fontSize: 12, color: C.mid }}>{n || ""}</div>
              <div style={{ width: "100%", height: `${Math.max(4, (n / max) * 60)}px`, background: n ? "#3b82f6" : alpha("#3b82f6", "25"), borderRadius: 6 }} />
              <div style={{ fontSize: 11, color: C.muted }}>{new Date(`${d}T12:00:00`).toLocaleDateString("en-AU", { weekday: "short" }).slice(0, 2)}</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Glasses you logged each day.</div>
    </Card>
  );
}
