import { useEffect, useState } from "react";
import C from "../lib/colors.js";
import { useVoice } from "../hooks/useVoice.js";

function Bar({ value, max, color = C.sage }) {
  const pct = value && max ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ height: 6, background: C.border, borderRadius: 4, marginTop: 5 }}>
      <div style={{ height: 6, borderRadius: 4, background: color, width: `${pct}%`, transition: "width 0.6s ease" }} />
    </div>
  );
}

function MetricCard({ emoji, label, value, display, max, color }) {
  return (
    <div style={{
      background: C.sageLight, borderRadius: 14, padding: "13px 14px",
      flex: "1 1 calc(50% - 6px)", minWidth: 0,
    }}>
      <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2 }}>
        {emoji} {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || C.sageDark, fontFamily: "Georgia,serif" }}>
        {display}
      </div>
      {max && <Bar value={value} max={max} color={color || C.sage} />}
    </div>
  );
}

function SummaryCard({ summary, onDownloadPDF, onDownloadDoctor, isLatest }) {
  const voiceName = localStorage.getItem("cs_voiceName") || "";
  const units = localStorage.getItem("cs_units") === "imperial" ? "imperial" : "metric";
  const { speak, speaking, stopSpeaking } = useVoice(voiceName, units);
  const [expanded, setExpanded] = useState(isLatest);
  const [downloading, setDownloading] = useState(false);
  const [doctorDownloading, setDoctorDownloading] = useState(false);

  const fmtDate = (d) => {
    if (!d) return "";
    return new Date(d + "T12:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  };

  const weekRange = `${fmtDate(summary.week_start)} — ${fmtDate(summary.week_end)}`;
  const milestones = Array.isArray(summary.milestones_this_week) ? summary.milestones_this_week : [];

  const handlePDF = async () => {
    setDownloading(true);
    try { await onDownloadPDF(summary); } finally { setDownloading(false); }
  };

  return (
    <div style={{
      background: "#fff",
      border: `1.5px solid ${isLatest ? C.sage + "60" : C.border}`,
      borderRadius: 18, overflow: "hidden",
      boxShadow: isLatest ? "0 4px 20px #3D6B4412" : "none",
      marginBottom: 12,
    }}>
      {/* Card header */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: "100%", background: isLatest
            ? `linear-gradient(135deg, ${C.sageDark}, ${C.leaf})`
            : C.sageLight,
          border: "none", padding: "14px 16px", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <div style={{ textAlign: "left" }}>
          <div style={{
            fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13,
            color: isLatest ? "#fff" : C.charcoal,
          }}>
            {isLatest ? "🌟 This Week's Summary" : `Week of ${fmtDate(summary.week_start)}`}
          </div>
          <div style={{ fontSize: 11, color: isLatest ? "rgba(255,255,255,0.75)" : C.muted, marginTop: 2 }}>
            {weekRange}
          </div>
        </div>
        <div style={{
          fontSize: 11, color: isLatest ? "rgba(255,255,255,0.8)" : C.muted,
          display: "flex", gap: 16, alignItems: "center",
        }}>
          <span>🥬 {summary.celery_days}/7</span>
          {summary.avg_energy && <span>⚡ {summary.avg_energy}/10</span>}
          <span style={{ fontSize: 14 }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: "16px 16px 14px" }}>
          {/* Metrics */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            <MetricCard emoji="🥬" label="Celery Juice" value={summary.celery_days} max={7} display={`${summary.celery_days}/7 days`} />
            <MetricCard emoji="⚡" label="Avg Energy" value={summary.avg_energy} max={10} display={summary.avg_energy ? `${summary.avg_energy}/10` : "—"} />
            <MetricCard emoji="☀️" label="Protocol" value={summary.protocol_days} max={7} display={`${summary.protocol_days}/7 days`} color={C.leaf} />
            <MetricCard emoji="😊" label="Avg Mood" value={summary.avg_mood} max={5} display={summary.avg_mood ? `${summary.avg_mood}/5` : "—"} color={C.gold} />
          </div>

          {/* AI Observations */}
          {summary.ai_observations && (
            <div style={{
              background: C.sageLight, borderRadius: 14,
              padding: "14px 16px", marginBottom: 12,
              borderLeft: `4px solid ${C.sage}`,
            }}>
              <div style={{ fontSize: 10, color: C.sageDark, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>
                Your healing companion's observations
              </div>
              <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.75 }}>
                {summary.ai_observations}
              </div>
              <button
                onClick={() => speaking ? stopSpeaking() : speak(summary.ai_observations)}
                style={{
                  marginTop: 10, background: speaking ? C.sage : "transparent",
                  border: `1px solid ${C.sage}`, color: speaking ? "#fff" : C.sage,
                  borderRadius: 20, padding: "5px 14px",
                  fontFamily: "Georgia,serif", fontSize: 11, fontWeight: 700, cursor: "pointer",
                }}
              >
                {speaking ? "⏹ Stop" : "🔊 Hear it"}
              </button>
            </div>
          )}

          {/* Key moments */}
          {milestones.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>
                ✨ Key moments this week
              </div>
              {milestones.map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
                  <span style={{ color: C.sage, fontWeight: 700, flexShrink: 0 }}>•</span>
                  <span style={{ fontSize: 12.5, color: C.charcoal, lineHeight: 1.6 }}>{m.insight || m}</span>
                </div>
              ))}
            </div>
          )}

          {/* Download buttons */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={handlePDF}
              disabled={downloading}
              style={{
                background: C.sageDark, color: "#fff", border: "none",
                borderRadius: 20, padding: "8px 16px",
                fontFamily: "Georgia,serif", fontSize: 12, fontWeight: 700,
                cursor: downloading ? "default" : "pointer", opacity: downloading ? 0.7 : 1,
              }}
            >
              {downloading ? "Generating…" : "⬇ Download PDF"}
            </button>
            {isLatest && (
              <button
                onClick={async () => {
                  setDoctorDownloading(true);
                  try { await onDownloadDoctor(); } finally { setDoctorDownloading(false); }
                }}
                disabled={doctorDownloading}
                style={{
                  background: "transparent", color: C.sageDark,
                  border: `1px solid ${C.sage}`, borderRadius: 20, padding: "8px 16px",
                  fontFamily: "Georgia,serif", fontSize: 12, fontWeight: 700,
                  cursor: doctorDownloading ? "default" : "pointer", opacity: doctorDownloading ? 0.7 : 1,
                }}
              >
                {doctorDownloading ? "Generating…" : "🏥 Doctor Report (3 months)"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WeeklyReport({ authUser, profileId, user }) {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    fetch(`/api/memory/weekly/${profileId}`)
      .then(r => r.json())
      .then(d => setSummaries(d.summaries || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [profileId]);

  const downloadPDF = async (summary) => {
    const res = await fetch(`/api/memory/weekly/${profileId}/pdf`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `healing-summary-${summary.week_start}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadDoctor = async () => {
    const res = await fetch(`/api/memory/doctor/${profileId}/pdf?months=3`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `health-report-${new Date().toISOString().split("T")[0]}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !summaries.length) return null;

  const visible = showAll ? summaries : summaries.slice(0, 3);

  return (
    <div style={{ marginBottom: 16 }}>
      {visible.map((s, i) => (
        <SummaryCard
          key={s.id || i}
          summary={s}
          isLatest={i === 0}
          onDownloadPDF={downloadPDF}
          onDownloadDoctor={downloadDoctor}
        />
      ))}
      {summaries.length > 3 && (
        <button
          onClick={() => setShowAll(v => !v)}
          style={{
            background: "none", border: "none", color: C.sage,
            fontFamily: "Georgia,serif", fontSize: 13, fontWeight: 700,
            cursor: "pointer", padding: "4px 0",
          }}
        >
          {showAll ? "▲ Show less" : `▼ View all ${summaries.length} weekly summaries`}
        </button>
      )}
    </div>
  );
}
