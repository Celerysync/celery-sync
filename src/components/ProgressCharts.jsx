import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { computeProgressStats, computeCycleOverlay } from "../lib/progressStats.js";

function fmtShortDate(dateStr) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function BarRow({ label, value, max, display, color }) {
  const pct = value != null && max ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "84px 1fr 44px", alignItems: "center", gap: 10, marginBottom: 5 }}>
      <div style={{ fontSize: 10.5, color: C.muted, fontFamily: "Georgia,serif" }}>{label}</div>
      <div style={{ height: 8, background: C.mist, borderRadius: 4 }}>
        {value != null && <div style={{ height: 8, borderRadius: 4, background: color, width: `${pct}%`, transition: "width 0.4s" }} />}
      </div>
      <div style={{ fontSize: 11, color: C.charcoal, textAlign: "right" }}>{value != null ? display : "—"}</div>
    </div>
  );
}

function SectionHeader({ title, tag }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13.5, color: C.charcoal }}>
        {title} <span style={{ fontSize: 10, fontWeight: 400, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>{tag}</span>
      </div>
      <div style={{ height: 1, background: C.border, marginTop: 6 }} />
    </div>
  );
}

export default function ProgressCharts({ checkins, periodStartDates = [], bucket = "day" }) {
  if (!checkins?.length) {
    return (
      <Card>
        <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: "16px 0" }}>
          Not enough logged data yet for this period.
        </div>
      </Card>
    );
  }

  const stats = computeProgressStats(checkins, { bucket });
  const cycleOverlay = computeCycleOverlay(checkins, periodStartDates);
  const trendLabel = (dateStr) => (bucket === "week" ? `Wk of ${fmtShortDate(dateStr)}` : fmtShortDate(dateStr));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Stat strip */}
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
          <StatTile label="Days logged" value={stats.daysLogged} />
          <StatTile label="Adherence" value={stats.adherence.pct != null ? `${stats.adherence.pct}%` : "—"} sub={stats.adherence.scheduled ? `${stats.adherence.completed} of ${stats.adherence.scheduled} doses` : null} />
          <StatTile label="Current streak" value={`${stats.streaks.current}d`} />
          <StatTile label="Longest streak" value={`${stats.streaks.longest}d`} />
        </div>
      </Card>

      {/* Energy */}
      <Card>
        <SectionHeader title="Energy" tag="what you logged · 1–10" />
        {stats.energyTrend.map((d) => (
          <BarRow key={d.date} label={trendLabel(d.date)} value={d.value} max={10} display={d.value ? `${d.value}/10` : "—"} color={C.sage} />
        ))}
      </Card>

      {/* Mood */}
      <Card>
        <SectionHeader title="Mood" tag="what you logged · 1–5" />
        {stats.moodTrend.map((d) => (
          <BarRow key={d.date} label={trendLabel(d.date)} value={d.value} max={5} display={d.value ? `${d.value}/5` : "—"} color={C.gold} />
        ))}
      </Card>

      {/* Symptoms */}
      <Card>
        <SectionHeader title="Symptoms" tag="what you logged · frequency" />
        {stats.symptomFrequency.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 12 }}>No symptoms logged this period.</div>
        ) : (
          stats.symptomFrequency.map((s) => (
            <div key={s.name} style={{ display: "grid", gridTemplateColumns: "1fr 90px", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ fontSize: 12, color: C.charcoal }}>{s.name}</div>
              <div style={{ fontSize: 10.5, color: C.muted, textAlign: "right" }}>{s.count} of {s.ofDays} days</div>
            </div>
          ))
        )}
      </Card>

      {/* Weekly rhythm */}
      <Card>
        <SectionHeader title="Weekly rhythm" tag="what you logged · avg energy by day" />
        {stats.weeklyRhythm.map((d) => (
          <BarRow key={d.label} label={d.label} value={d.avgEnergy} max={10} display={d.avgEnergy ? `${d.avgEnergy}/10` : "—"} color={C.sage} />
        ))}
      </Card>

      {/* Cycle overlay */}
      <Card>
        <SectionHeader title="Cycle overlay" tag="what you logged" />
        {!cycleOverlay ? (
          <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.6 }}>
            Turn on cycle tracking in Settings and log a period start date to see energy by cycle day here.
          </div>
        ) : (
          cycleOverlay.map((d) => (
            <BarRow key={d.day} label={`Day ${d.day}`} value={d.avgEnergy} max={10} display={d.avgEnergy ? `${d.avgEnergy}/10` : "—"} color={C.plum} />
          ))
        )}
      </Card>
    </div>
  );
}

function StatTile({ label, value, sub }) {
  return (
    <div style={{ background: C.sageLight, borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ fontSize: 9.5, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "Georgia,serif", color: C.sageDark, marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}
