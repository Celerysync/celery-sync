import { useEffect, useState } from "react";
import C from "../lib/colors.js";
import { callClaude } from "../lib/api.js";
import { useVoice } from "../hooks/useVoice.js";

export default function WeeklyReport({ last7, celeryStreak, avgEnergy7, protocolDays, user }) {
  const [report, setReport] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const voiceName = localStorage.getItem("cs_voiceName") || "";
  const units = localStorage.getItem("cs_units") === "imperial" ? "imperial" : "metric";
  const { speak, speaking, stopSpeaking } = useVoice(voiceName, units);

  useEffect(() => {
    if (!last7?.length || dismissed) return;
    const today = new Date();
    const isSunday = today.getDay() === 0;
    const weekKey = `cs_weekly_${today.getFullYear()}_${Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000 / 7)}`;
    if (!isSunday || localStorage.getItem(weekKey)) return;

    const celerDays = last7.filter(d => d.celery > 0).length;
    const avgEnergy = avgEnergy7 || "not logged";
    const bestDay = [...last7].sort((a, b) => (b.energy || 0) - (a.energy || 0))[0];

    callClaude({
      system: `You are a warm Medical Medium healing companion writing a brief, encouraging weekly healing summary. Keep it to 3-4 sentences. Be specific about the numbers. Start with "Of course!" or a short opener so the voice starts fast. Be celebratory and motivating.`,
      messages: [{ role: "user", content: `Generate a warm weekly healing summary for ${user?.name || "this healer"}: They had celery juice ${celerDays}/7 days this week, their average energy was ${avgEnergy}/10, their current streak is ${celeryStreak} days, and they have logged ${protocolDays} total protocol days since they started. What should they know and feel proud of?` }],
      tier: "quick",
      maxTokens: 200,
    }).then((text) => {
      if (text) {
        setReport(text.replace(/\*\*/g, "").replace(/[*_`#]/g, "").trim());
        localStorage.setItem(weekKey, "1");
      }
    }).catch(() => {});
  }, [last7]);

  if (!report || dismissed) return null;

  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.goldLight}, #fff9ee)`,
      border: `2px solid ${C.gold}60`,
      borderRadius: 20, padding: "18px 18px 14px",
      marginBottom: 16,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.gold }}>
          🌟 Your Weekly Healing Summary
        </div>
        <button
          onClick={() => { stopSpeaking(); setDismissed(true); }}
          style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16, padding: "0 2px" }}
        >✕</button>
      </div>
      <div style={{ fontSize: 13.5, color: C.charcoal, lineHeight: 1.75, marginBottom: 12 }}>
        {report}
      </div>
      <button
        onClick={() => speaking ? stopSpeaking() : speak(report)}
        style={{
          background: speaking ? C.gold : "transparent",
          border: `1px solid ${C.gold}`,
          color: speaking ? C.white : C.gold,
          borderRadius: 30, padding: "6px 16px",
          fontFamily: "Georgia,serif", fontSize: 12, fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {speaking ? "⏹ Stop" : "🔊 Hear it"}
      </button>
    </div>
  );
}
