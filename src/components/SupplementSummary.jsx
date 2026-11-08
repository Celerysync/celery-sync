import { useEffect, useState } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { supabase } from "../lib/supabase.js";
import { addDays, TODAY } from "../lib/rhythmSchedule.js";
import { SUPPLEMENT_CATEGORY, summarizeSupplements } from "../lib/supplementEvents.js";

const PERIOD_DAYS = 30;

function Row({ item }) {
  const pct = item.ofDays ? Math.round((item.days / item.ofDays) * 100) : 0;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14, color: C.charcoal }}>
        <span>{item.name}</span>
        <span style={{ whiteSpace: "nowrap", color: C.mid }}>
          {item.ofDays ? `${item.days} of ${item.ofDays} days` : `${item.days} ${item.days === 1 ? "day" : "days"}`}
        </span>
      </div>
      {item.timingLabel && <div style={{ fontSize: 13.5, color: C.muted, marginTop: 1 }}>{item.timingLabel}</div>}
      {item.ofDays && (
        <div style={{ height: 6, borderRadius: 3, background: C.border, marginTop: 5, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: C.sage }} />
        </div>
      )}
    </div>
  );
}

// What was ticked over the last 30 days. Shows only what the person logged.
export default function SupplementSummary({ profileId }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    const to = TODAY();
    const from = addDays(to, -(PERIOD_DAYS - 1));
    (async () => {
      const [listRes, statusRes] = await Promise.all([
        supabase.from("user_supplements")
          .select("id, name, dose_label, timing, created_at")
          .eq("profile_id", profileId),
        supabase.from("v_daily_status")
          .select("item_id, item_name, occurrence_slot, local_date, status")
          .eq("profile_id", profileId)
          .eq("item_category", SUPPLEMENT_CATEGORY)
          .gte("local_date", from),
      ]);
      if (cancelled || listRes.error || statusRes.error) return;
      setSummary(summarizeSupplements({ supplements: listRes.data || [], statusRows: statusRes.data || [], from, to }));
    })();
    return () => { cancelled = true; };
  }, [profileId]);

  if (!summary || (!summary.current.length && !summary.previous.length)) return null;

  return (
    <Card>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 4 }}>
        💊 Your supplements
      </div>
      <div style={{ fontSize: 13.5, color: C.muted, marginBottom: 12 }}>
        What you ticked in the last {summary.periodDays} days.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {summary.current.map((item) => <Row key={item.id} item={item} />)}
      </div>
      {summary.previous.length > 0 && (
        <>
          <div style={{ fontSize: 13.5, color: C.muted, margin: "14px 0 8px" }}>No longer on your list</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {summary.previous.map((item) => <Row key={item.id} item={item} />)}
          </div>
        </>
      )}
    </Card>
  );
}
