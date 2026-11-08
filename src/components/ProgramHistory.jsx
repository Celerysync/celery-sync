import { useEffect, useState } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { supabase } from "../lib/supabase.js";
import { TODAY } from "../lib/rhythmSchedule.js";
import { PROGRAM_STATUS_LABELS, summarizePrograms } from "../lib/programHistory.js";

const fmt = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "");

// "Your programs": every program run, newest first. What they did, never
// what it did for them.
export default function ProgramHistory({ profileId }) {
  const [history, setHistory] = useState(null);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    (async () => {
      const { data: rows, error } = await supabase
        .from("active_protocols")
        .select("id, program_id, program_name, start_date, end_date, total_days, completed, abandoned, chained_from_id")
        .eq("profile_id", profileId)
        .order("start_date", { ascending: false })
        .limit(50);
      if (cancelled || error || !rows?.length) return;
      const earliest = rows[rows.length - 1].start_date;
      const { data: ticks } = await supabase
        .from("v_daily_status")
        .select("program_id, local_date, status")
        .eq("profile_id", profileId)
        .not("program_id", "is", null)
        .gte("local_date", earliest);
      if (!cancelled) setHistory(summarizePrograms(rows, ticks || [], TODAY()));
    })();
    return () => { cancelled = true; };
  }, [profileId]);

  if (!history?.length) return null;

  return (
    <Card>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 4 }}>
        ✨ Your programs
      </div>
      <div style={{ fontSize: 13.5, color: C.muted, marginBottom: 12 }}>
        Every program you've run, and the days you ticked something from it.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {history.map((p) => (
          <div key={p.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14, color: C.charcoal }}>
              <span style={{ fontWeight: 700 }}>{p.name}</span>
              <span style={{ color: C.mid, whiteSpace: "nowrap" }}>{PROGRAM_STATUS_LABELS[p.status]}</span>
            </div>
            <div style={{ fontSize: 13.5, color: C.muted, marginTop: 2 }}>
              {fmt(p.startDate)} – {fmt(p.endDate)} · {p.totalDays} days · ticked on {p.daysTicked} {p.daysTicked === 1 ? "day" : "days"}
              {p.round ? " · another round" : ""}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
