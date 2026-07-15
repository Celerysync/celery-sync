import { useEffect, useState } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { supabase } from "../lib/supabase.js";

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDaysStr(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}

function StatPill({ label, value, bg, color }) {
  return (
    <div style={{ background: bg, borderRadius: 10, padding: "8px 12px", textAlign: "center", flex: 1, minWidth: 90 }}>
      <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "Georgia,serif", color }}>{value}</div>
      <div style={{ fontSize: 10, color: C.mid, marginTop: 1 }}>{label}</div>
    </div>
  );
}

// Adherence + streaks + tap-vs-voice split, all derived from activity_events
// (spec §5) — zero extra bookkeeping, reads the same ledger everything else
// writes to. NOTE: "perfect" streak/adherence compares each historical day
// against today's CURRENT item count (approximation — we don't reconstruct
// which items were actually scheduled on past days, e.g. weekday-only items
// or since-removed items). Labelled honestly in the UI rather than implying
// more precision than this actually has.
export default function AdherenceStreaks({ profileId }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!profileId) { setLoading(false); setStats(null); return; }
    let cancelled = false;
    setLoading(true);

    (async () => {
      const today = localDateStr(new Date());
      const since60 = addDaysStr(today, -60);
      const since7 = addDaysStr(today, -6);

      const [statusRes, itemsRes, eventsRes] = await Promise.all([
        supabase.from("v_daily_status")
          .select("item_id, local_date, status")
          .eq("profile_id", profileId)
          .gte("local_date", since60),
        supabase.from("rhythm_items")
          .select("id", { count: "exact", head: true })
          .eq("profile_id", profileId),
        supabase.from("activity_events")
          .select("source")
          .eq("profile_id", profileId)
          .eq("event_type", "completed")
          .gte("local_date", since7),
      ]);

      if (cancelled) return;

      const totalItems = itemsRes.count || 0;

      const byDay = {};
      for (const row of statusRes.data || []) {
        if (row.status !== "completed") continue;
        (byDay[row.local_date] ||= new Set()).add(row.item_id);
      }

      // Walk backwards from today for both streaks (spec §5: a gentler
      // "showed up" streak alongside the strict "100%" one — kinder for
      // chronically ill users than all-or-nothing).
      let perfectStreak = 0;
      let showedUpStreak = 0;
      let perfectBroken = false;
      let showedUpBroken = false;
      for (let i = 0; i < 60; i++) {
        const day = addDaysStr(today, -i);
        const doneCount = byDay[day]?.size || 0;
        const isToday = i === 0;

        if (!showedUpBroken) {
          if (doneCount > 0) showedUpStreak++;
          else if (!isToday) showedUpBroken = true;
        }
        if (!perfectBroken) {
          if (totalItems > 0 && doneCount >= totalItems) perfectStreak++;
          else if (!isToday) perfectBroken = true;
        }
      }

      let weekCompletedCount = 0;
      for (const [day, ids] of Object.entries(byDay)) {
        if (day >= since7) weekCompletedCount += ids.size;
      }
      const weekScheduled = totalItems * 7;
      const weekAdherence = weekScheduled > 0 ? Math.round((weekCompletedCount / weekScheduled) * 100) : null;

      const sourceCounts = { tap: 0, voice: 0, auto: 0 };
      for (const row of eventsRes.data || []) {
        sourceCounts[row.source] = (sourceCounts[row.source] || 0) + 1;
      }

      setStats({ perfectStreak, showedUpStreak, weekAdherence, totalItems, sourceCounts });
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [profileId]);

  if (loading) {
    return <Card><div style={{ color: C.muted, fontSize: 13 }}>Loading your adherence…</div></Card>;
  }
  if (!stats || stats.totalItems === 0) return null;

  const { perfectStreak, showedUpStreak, weekAdherence, sourceCounts } = stats;
  const totalSourceEvents = sourceCounts.tap + sourceCounts.voice + sourceCounts.auto;

  return (
    <Card>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 4 }}>
        🔥 Adherence & Streaks
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
        From your daily rhythm ledger — compared against your current {stats.totalItems}-item rhythm.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: totalSourceEvents > 0 ? 12 : 0 }}>
        <StatPill label="Showed-up streak" value={`${showedUpStreak}d`} bg={C.sageLight} color={C.sageDark} />
        <StatPill label="Perfect streak" value={`${perfectStreak}d`} bg="#fffbeb" color={C.gold} />
        {weekAdherence != null && (
          <StatPill label="This week" value={`${weekAdherence}%`} bg="#f0fdf4" color={C.sage} />
        )}
      </div>
      {totalSourceEvents > 0 && (
        <div style={{ fontSize: 11, color: C.muted }}>
          Last 7 days: {sourceCounts.tap} tapped · {sourceCounts.voice} by voice
          {sourceCounts.auto ? ` · ${sourceCounts.auto} auto` : ""}
        </div>
      )}
    </Card>
  );
}
