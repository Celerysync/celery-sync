import { useState } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";

const PERIODS = [
  { months: 1,  label: "1 month" },
  { months: 3,  label: "3 months" },
  { months: 6,  label: "6 months" },
  { months: 12, label: "12 months" },
];

export default function DoctorReport({ profileId }) {
  const [months, setMonths] = useState(3);
  const [extended, setExtended] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    setDone(false);
    try {
      const url = `/api/memory/doctor/${profileId}/pdf?months=${months}&extended=${extended}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to generate report");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `health-report-${new Date().toISOString().split("T")[0]}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      alert("Couldn't generate report. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 4 }}>
        🏥 Doctor Report
      </div>
      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>
        A professional PDF you can hand to any doctor or health practitioner — objective data, symptom notes, supplement list, and energy trends. No AW language unless you choose Extended.
      </div>

      {/* Period selector */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.charcoal, fontFamily: "Georgia,serif", marginBottom: 8 }}>
          Report period
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PERIODS.map(p => (
            <button
              key={p.months}
              onClick={() => setMonths(p.months)}
              style={{
                padding: "7px 16px", borderRadius: 20, fontSize: 12,
                fontFamily: "Georgia,serif", fontWeight: 600, cursor: "pointer",
                border: `1.5px solid ${months === p.months ? C.sageDark : C.border}`,
                background: months === p.months ? C.sageDark : "#fff",
                color: months === p.months ? "#fff" : C.charcoal,
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Standard / Extended toggle */}
      <div style={{
        background: C.sageLight, borderRadius: 14, padding: "12px 14px",
        marginBottom: 16, border: `1px solid ${C.sage}30`,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.charcoal, fontFamily: "Georgia,serif" }}>
              {extended ? "Extended report" : "Standard report"}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>
              {extended
                ? "Includes healing protocol context — suitable for naturopaths and integrative practitioners"
                : "Objective data and clinical language only — suitable for any GP or specialist"}
            </div>
          </div>
          <button
            onClick={() => setExtended(v => !v)}
            style={{
              width: 46, height: 26, borderRadius: 13, border: "none",
              background: extended ? C.sage : "#d1d5db",
              position: "relative", cursor: "pointer", flexShrink: 0, marginLeft: 12,
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: "50%", background: "#fff",
              position: "absolute", top: 3,
              left: extended ? 23 : 3,
              transition: "left 0.2s",
              boxShadow: "0 1px 4px #00000030",
            }} />
          </button>
        </div>
      </div>

      {/* What's included */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
          What's included
        </div>
        {[
          "Energy levels, mood, and sleep trends",
          "Celery juice and morning protocol consistency",
          `Supplement notes from the last ${months} months`,
          "Symptom observations and patterns",
          "Week-by-week energy chart",
          ...(extended ? ["Healing protocol context (for integrative practitioners)"] : []),
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5, alignItems: "flex-start" }}>
            <span style={{ color: C.sage, fontWeight: 700, flexShrink: 0 }}>✓</span>
            <span style={{ fontSize: 12, color: C.charcoal }}>{item}</span>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "flex-start" }}>
          <span style={{ color: C.terracotta, fontWeight: 700, flexShrink: 0 }}>!</span>
          <span style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
            Self-reported data only. Includes disclaimer on every page. Not a medical record.
          </span>
        </div>
      </div>

      <button
        onClick={handleDownload}
        disabled={downloading}
        style={{
          width: "100%", padding: "13px", borderRadius: 30,
          background: done ? C.sage : downloading ? C.muted : C.sageDark,
          color: "#fff", border: "none",
          fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15,
          cursor: downloading ? "default" : "pointer",
          transition: "background 0.3s",
        }}
      >
        {done ? "✓ Downloaded" : downloading ? "Generating your report…" : `⬇ Download ${extended ? "Extended" : "Standard"} Report (${months} months)`}
      </button>
    </Card>
  );
}
