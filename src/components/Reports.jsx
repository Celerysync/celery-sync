import { useState, useEffect } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import WeeklyReport from "./WeeklyReport.jsx";

const DISCLAIMER =
  "All data is self-reported by the user. This document is not a medical record and does not constitute medical advice. Please share with your GP or licensed health practitioner for clinical interpretation.";

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-AU", {
    day: "numeric", month: "short",
  });
}

function fmtMonth(ym) {
  const [year, month] = ym.split("-");
  return new Date(year, month - 1, 1).toLocaleDateString("en-AU", {
    month: "long", year: "numeric",
  });
}

function groupByMonth(summaries) {
  const map = {};
  for (const s of summaries) {
    const ym = s.week_start?.slice(0, 7);
    if (!ym) continue;
    if (!map[ym]) map[ym] = [];
    map[ym].push(s);
  }
  return Object.entries(map)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([ym, weeks]) => {
      const eVals = weeks.filter((w) => w.avg_energy).map((w) => w.avg_energy);
      const mVals = weeks.filter((w) => w.avg_mood).map((w) => w.avg_mood);
      return {
        ym,
        weeks: weeks.length,
        avgEnergy: eVals.length
          ? (eVals.reduce((a, b) => a + b, 0) / eVals.length).toFixed(1)
          : null,
        avgMood: mVals.length
          ? (mVals.reduce((a, b) => a + b, 0) / mVals.length).toFixed(1)
          : null,
        celeryDays: weeks.reduce((s, w) => s + (w.celery_days || 0), 0),
        protocolDays: weeks.reduce((s, w) => s + (w.protocol_days || 0), 0),
        journalEntries: weeks.reduce((s, w) => s + (w.journal_entries || 0), 0),
      };
    });
}

function StatPill({ label, value, bg, color }) {
  return (
    <div style={{ background: bg, borderRadius: 10, padding: "8px 12px", textAlign: "center" }}>
      <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "Georgia,serif", color }}>{value}</div>
      <div style={{ fontSize: 10, color: C.mid, marginTop: 1 }}>{label}</div>
    </div>
  );
}

function DailyTable({ checkins }) {
  if (!checkins.length) {
    return (
      <div style={{ textAlign: "center", padding: "24px 0", color: C.muted, fontSize: 13 }}>
        No check-in data yet — complete your first check-in on the Today tab.
      </div>
    );
  }
  const headers = ["Date", "Energy", "Mood", "🥬 oz", "Protocol", "Sleep", "Quality"];
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${C.sage}50` }}>
            {headers.map((h) => (
              <th key={h} style={{
                padding: "8px 6px", textAlign: "left",
                fontSize: 10, fontWeight: 700, color: C.mid,
                textTransform: "uppercase", letterSpacing: 0.3,
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {checkins.map((c, i) => (
            <tr key={c.check_date} style={{
              borderBottom: `1px solid ${C.border}`,
              background: i % 2 === 0 ? "#fff" : C.cream,
            }}>
              <td style={{ padding: "9px 6px", fontWeight: 600, color: C.charcoal, whiteSpace: "nowrap" }}>
                {fmtDate(c.check_date)}
              </td>
              <td style={{ padding: "9px 6px", color: c.energy ? C.leaf : C.muted }}>
                {c.energy ? `${c.energy}/10` : "—"}
              </td>
              <td style={{ padding: "9px 6px", color: c.mood ? C.gold : C.muted }}>
                {c.mood ? `${c.mood}/5` : "—"}
              </td>
              <td style={{ padding: "9px 6px", color: c.celery_oz ? C.sage : C.muted }}>
                {c.celery_oz != null ? c.celery_oz : "—"}
              </td>
              <td style={{ padding: "9px 6px", color: C.charcoal }}>
                {c.protocol_done ? "✓" : "—"}
              </td>
              <td style={{ padding: "9px 6px", color: C.mid }}>
                {c.sleep_hours != null ? `${c.sleep_hours}h` : "—"}
              </td>
              <td style={{ padding: "9px 6px", color: C.mid }}>
                {c.sleep_quality ? `${c.sleep_quality}/5` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MonthCard({ month }) {
  return (
    <div style={{
      background: "#fff", border: `1.5px solid ${C.border}`,
      borderRadius: 16, padding: "16px", marginBottom: 10,
    }}>
      <div style={{
        fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14,
        color: C.charcoal, marginBottom: 12,
      }}>
        {fmtMonth(month.ym)}
        <span style={{ fontSize: 11, fontWeight: 400, color: C.muted, marginLeft: 8 }}>
          ({month.weeks} {month.weeks === 1 ? "week" : "weeks"} logged)
        </span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {month.avgEnergy && (
          <StatPill label="Avg Energy" value={`${month.avgEnergy}/10`} bg={C.sageLight} color={C.leaf} />
        )}
        {month.avgMood && (
          <StatPill label="Avg Mood" value={`${month.avgMood}/5`} bg="#fffbeb" color={C.gold} />
        )}
        <StatPill label="Celery days" value={`${month.celeryDays}`} bg="#f0fdf4" color={C.sage} />
        <StatPill label="Protocol days" value={`${month.protocolDays}`} bg={C.sageLight} color={C.sageDark} />
        {month.journalEntries > 0 && (
          <StatPill label="Journal entries" value={`${month.journalEntries}`} bg="#f5f3ff" color="#7c3aed" />
        )}
      </div>
    </div>
  );
}

export default function Reports({ authUser, profileId, user }) {
  const [view, setView] = useState("weekly");
  const [checkins, setCheckins] = useState([]);
  const [weeklies, setWeeklies] = useState([]);
  const [loadingCheckins, setLoadingCheckins] = useState(false);
  const [loadingWeeklies, setLoadingWeeklies] = useState(true);
  const [drMonths, setDrMonths] = useState(3);
  const [drDownloading, setDrDownloading] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    fetch(`/api/memory/weekly/${profileId}`)
      .then((r) => r.json())
      .then((d) => setWeeklies(d.summaries || []))
      .catch(() => {})
      .finally(() => setLoadingWeeklies(false));
  }, [profileId]);

  useEffect(() => {
    if (!profileId || view !== "daily" || checkins.length) return;
    setLoadingCheckins(true);
    fetch(`/api/memory/checkins/${profileId}?days=30`)
      .then((r) => r.json())
      .then((d) => setCheckins(d.checkins || []))
      .catch(() => {})
      .finally(() => setLoadingCheckins(false));
  }, [profileId, view, checkins.length]);

  const months = groupByMonth(weeklies);

  const downloadDoctorReport = async () => {
    setDrDownloading(true);
    try {
      const res = await fetch(`/api/memory/doctor/${profileId}/pdf?months=${drMonths}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `health-report-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDrDownloading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <Card>
        <div style={{
          fontFamily: "Georgia,serif", fontWeight: 700,
          fontSize: 16, color: C.charcoal, marginBottom: 6,
        }}>
          📋 Your Health Reports
        </div>
        <div style={{ fontSize: 12, color: C.mid, lineHeight: 1.6 }}>
          A summary of your self-logged data — designed to share with your GP or health practitioner.
        </div>
        <div style={{
          marginTop: 10, background: "#fff9f0",
          border: "1px solid #f59e0b30", borderRadius: 10,
          padding: "10px 12px", fontSize: 11, color: "#92400e", lineHeight: 1.6,
        }}>
          <strong>Note:</strong> {DISCLAIMER}
        </div>
      </Card>

      {/* View selector */}
      <div style={{
        display: "flex", gap: 6, background: C.sageLight,
        borderRadius: 14, padding: 4,
      }}>
        {[["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"]].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            style={{
              flex: 1, padding: "9px 0",
              background: view === id ? C.sageDark : "transparent",
              color: view === id ? "#fff" : C.mid,
              border: "none", borderRadius: 10,
              fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13,
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Daily view */}
      {view === "daily" && (
        <Card>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 6 }}>
            Daily Log — Last 30 Days
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>
            Your self-reported data exactly as you entered it. No calculations or interpretations applied.
          </div>
          {loadingCheckins
            ? <div style={{ color: C.muted, fontSize: 13, padding: "12px 0" }}>Loading…</div>
            : <DailyTable checkins={checkins} />
          }
        </Card>
      )}

      {/* Weekly view — reuses the existing WeeklyReport component */}
      {view === "weekly" && (
        loadingWeeklies ? (
          <Card><div style={{ color: C.muted, fontSize: 13 }}>Loading weekly summaries…</div></Card>
        ) : weeklies.length === 0 ? (
          <Card>
            <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: "16px 0" }}>
              Weekly summaries are generated each Sunday. Check back after your first full week of check-ins.
            </div>
          </Card>
        ) : (
          <WeeklyReport authUser={authUser} profileId={profileId} user={user} />
        )
      )}

      {/* Monthly view */}
      {view === "monthly" && (
        <Card>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 6 }}>
            Monthly Overview
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>
            Aggregated from your weekly summaries. Values are averages or totals of your self-reported data.
          </div>
          {loadingWeeklies ? (
            <div style={{ color: C.muted, fontSize: 13 }}>Loading…</div>
          ) : months.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: "16px 0" }}>
              Monthly data builds from weekly summaries — check back after a few weeks of logging.
            </div>
          ) : (
            months.map((m) => <MonthCard key={m.ym} month={m} />)
          )}
        </Card>
      )}

      {/* Doctor report download — always shown */}
      {profileId && (
        <Card>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 8 }}>
            🏥 Share with Your GP
          </div>
          <div style={{ fontSize: 12, color: C.mid, lineHeight: 1.6, marginBottom: 14 }}>
            Generate a clean PDF to bring to your doctor's appointment. Contains only your logged data — no interpretation or diagnoses included.
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: C.mid, flexShrink: 0 }}>Period:</div>
            {[1, 3, 6, 12].map((m) => (
              <button
                key={m}
                onClick={() => setDrMonths(m)}
                style={{
                  padding: "5px 12px", borderRadius: 20,
                  background: drMonths === m ? C.sageDark : C.sageLight,
                  color: drMonths === m ? "#fff" : C.mid,
                  border: "none", fontFamily: "Georgia,serif",
                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}
              >
                {m} mo
              </button>
            ))}
          </div>
          <button
            onClick={downloadDoctorReport}
            disabled={drDownloading}
            style={{
              background: C.sageDark, color: "#fff",
              border: "none", borderRadius: 20, padding: "10px 22px",
              fontFamily: "Georgia,serif", fontSize: 13, fontWeight: 700,
              cursor: drDownloading ? "default" : "pointer",
              opacity: drDownloading ? 0.7 : 1,
            }}
          >
            {drDownloading ? "Generating…" : "⬇ Download GP Report PDF"}
          </button>
        </Card>
      )}
    </div>
  );
}
