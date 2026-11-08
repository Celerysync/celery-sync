import { useEffect, useState } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { supabase } from "../lib/supabase.js";
import { localDateStr } from "../lib/rhythmSchedule.js";
import { daysBefore, loadMade, timesText } from "../lib/whatYouMade.js";

// Progress: which of their own recipes they made, from their ticks.
// Names and counts only.
export default function WhatYouMade({ profileId }) {
  const [week, setWeek] = useState(null);
  const [month, setMonth] = useState(null);
  const [range, setRange] = useState("week");

  useEffect(() => {
    if (!profileId) return;
    const today = localDateStr();
    let on = true;
    Promise.all([
      loadMade(supabase, profileId, daysBefore(today, 6), today),
      loadMade(supabase, profileId, daysBefore(today, 29), today),
    ]).then(([w, m]) => { if (on) { setWeek(w); setMonth(m); } }).catch(() => { if (on) { setWeek([]); setMonth([]); } });
    return () => { on = false; };
  }, [profileId]);

  // Nothing to show until they've ticked a step that has a recipe.
  if (!month?.length) return null;
  const list = range === "week" ? week : month;
  const pill = (on) => ({
    padding: "6px 12px", borderRadius: 30, border: `1.5px solid ${on ? C.sage : C.border}`,
    background: on ? C.sageLight : "transparent", color: on ? C.sageDark : C.mid,
    fontFamily: "Georgia,serif", fontSize: 13, fontWeight: on ? 700 : 400, cursor: "pointer",
  });

  return (
    <Card>
      <div id="section-made" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16, color: C.charcoal }}>🍽 What you made</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={pill(range === "week")} onClick={() => setRange("week")}>7 days</button>
          <button style={pill(range === "month")} onClick={() => setRange("month")}>30 days</button>
        </div>
      </div>
      {list.length === 0
        ? <div style={{ fontSize: 14, color: C.muted }}>Nothing from your Kitchen ticked in the last 7 days.</div>
        : list.map((r) => (
          <div key={r.name} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}`, fontSize: 15, color: C.charcoal }}>
            <span>{r.name}</span>
            <span style={{ color: C.mid }}>{timesText(r.count)}</span>
          </div>
        ))}
      <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
        From the steps you ticked that had one of your recipes on them.
      </div>
    </Card>
  );
}
