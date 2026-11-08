import { useEffect, useState } from "react";
import C, { alpha } from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { supabase } from "../lib/supabase.js";
import { buildMonthSummary, monthRange, monthSentences } from "../lib/monthSummary.js";
import { useVoice } from "../hooks/useVoice.js";
import { useVoicePrefs } from "../context/VoiceContext.jsx";
import { realName } from "../hooks/useProfiles.js";

async function loadMonth(profileId, range) {
  const status = [];
  for (let from = 0; from < 6000; from += 1000) {
    const { data, error } = await supabase.from("v_daily_status")
      .select("item_id, item_name, item_category, local_date, status, occurrence_slot")
      .eq("profile_id", profileId).gte("local_date", range.start).lte("local_date", range.end)
      .order("local_date").range(from, from + 999);
    if (error) throw new Error(error.message);
    status.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  const cols = "item_id, occurrence_slot, local_date, event_type, recipe_name, occurred_at";
  const [ticks, undos, checkins, programs] = await Promise.all([
    supabase.from("activity_events").select(cols).eq("profile_id", profileId).gte("local_date", range.start).lte("local_date", range.end).not("recipe_name", "is", null).limit(5000),
    supabase.from("activity_events").select(cols).eq("profile_id", profileId).gte("local_date", range.start).lte("local_date", range.end).eq("event_type", "uncompleted").limit(5000),
    supabase.from("daily_checkins").select("check_date, energy").eq("profile_id", profileId).gte("check_date", range.start).lte("check_date", range.end),
    supabase.from("active_protocols").select("program_name, end_date, completed").eq("profile_id", profileId).gte("end_date", range.start).lte("end_date", range.end),
  ]);
  return buildMonthSummary({
    range, statusRows: status,
    events: [...(ticks.data || []), ...(undos.data || [])],
    checkins: checkins.data || [], programs: programs.data || [],
  });
}

function Tile({ value, label }) {
  return (
    <div style={{ flex: "1 1 30%", minWidth: 92, background: C.sageLight, borderRadius: 14, padding: "12px 10px", textAlign: "center" }}>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 24, color: C.sageDark }}>{value}</div>
      <div style={{ fontSize: 13.5, color: C.mid, marginTop: 2 }}>{label}</div>
    </div>
  );
}

// Progress: "Your month". In the first week of a month it opens on last month.
export default function MonthSummary({ profileId, user }) {
  const startOnLast = new Date().getDate() <= 7;
  const [which, setWhich] = useState(startOnLast ? "last" : "this");
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(false);
  const { voiceName } = useVoicePrefs();
  const { speak, speaking, stopSpeaking } = useVoice(voiceName);

  useEffect(() => {
    if (!profileId) return;
    let on = true;
    setSummary(null); setError(false);
    loadMonth(profileId, monthRange(which)).then((s) => on && setSummary(s)).catch(() => on && setError(true));
    return () => { on = false; };
  }, [profileId, which]);

  const pill = (active) => ({
    padding: "7px 14px", borderRadius: 30, border: `1.5px solid ${active ? C.sage : C.border}`,
    background: active ? C.sageLight : "transparent", color: active ? C.sageDark : C.mid,
    fontFamily: "Georgia,serif", fontSize: 14, fontWeight: active ? 700 : 400, cursor: "pointer",
  });
  const lines = summary ? monthSentences(summary, realName(user)) : [];

  return (
    <Card style={{ border: `2px solid ${alpha(C.sage, "55")}` }}>
      <div id="section-month" style={{ scrollMarginTop: 80, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 18, color: C.charcoal }}>
          📅 Your {summary?.range.label || "month"}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={pill(which === "this")} onClick={() => setWhich("this")}>This month</button>
          <button style={pill(which === "last")} onClick={() => setWhich("last")}>Last month</button>
        </div>
      </div>

      {!summary && !error && <div style={{ fontSize: 14, color: C.muted, marginTop: 10 }}>Putting your month together…</div>}
      {error && <div style={{ fontSize: 14, color: C.muted, marginTop: 10 }}>Your month couldn't load just now. Please try again soon.</div>}

      {summary && !summary.empty && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "14px 0 6px" }}>
          <Tile value={summary.showedUpDays} label={`${summary.showedUpDays === 1 ? "day" : "days"} kept up`} />
          <Tile value={summary.totalTicks} label={summary.totalTicks === 1 ? "step ticked" : "steps ticked"} />
          <Tile value={summary.checkinCount} label={summary.checkinCount === 1 ? "check-in" : "check-ins"} />
        </div>
      )}
      {summary && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          {lines.map((l) => <p key={l} style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: C.charcoal }}>{l}</p>)}
        </div>
      )}
      {summary && !summary.empty && (
        <button
          onClick={() => (speaking ? stopSpeaking() : speak(lines.join(" ")))}
          style={{
            marginTop: 14, padding: "10px 18px", borderRadius: 30, border: "none", background: C.sageDark, color: C.white,
            fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, cursor: "pointer",
          }}
        >
          {speaking ? "⏹ Stop" : "🔊 Read it to me"}
        </button>
      )}
      <div style={{ fontSize: 13, color: C.muted, marginTop: 10 }}>From what you ticked and logged. Just your own records.</div>
    </Card>
  );
}
