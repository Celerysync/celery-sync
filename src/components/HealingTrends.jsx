import { useState, useEffect } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { callClaude } from "../lib/api.js";

const W = 280, H = 72;
const XS = [20, 60, 100, 140, 180, 220, 260];
const YBOT = 64, YTOP = 8;

function yPos(val, min, max) {
  if (!val) return null;
  const clamped = Math.min(Math.max(val, min), max);
  return YTOP + (1 - (clamped - min) / (max - min)) * (YBOT - YTOP);
}

function Sparkline({ points, color, min = 0, max = 10 }) {
  const mapped = points.map((v) => yPos(v, min, max));
  const segs = [];
  let cur = [];

  for (let i = 0; i < mapped.length; i++) {
    if (mapped[i] === null) {
      if (cur.length > 1) segs.push(cur);
      cur = [];
    } else {
      cur.push([XS[i], mapped[i]]);
    }
  }
  if (cur.length > 1) segs.push(cur);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H }} preserveAspectRatio="none">
      {[YTOP, (YTOP + YBOT) / 2, YBOT].map((y) => (
        <line key={y} x1={0} y1={y} x2={W} y2={y} stroke={C.border} strokeWidth={0.8} />
      ))}
      {segs.map((seg, si) => (
        <polyline
          key={si}
          points={seg.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none"
          stroke={color}
          strokeWidth={2.2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {mapped.map((y, i) =>
        y !== null ? (
          <circle key={i} cx={XS[i]} cy={y} r={4} fill={color} stroke={C.white} strokeWidth={1.5} />
        ) : (
          <circle key={i} cx={XS[i]} cy={(YTOP + YBOT) / 2} r={2.5} fill={C.border} opacity={0.5} />
        )
      )}
    </svg>
  );
}

function ChartRow({ label, dot, points, min, max, days }) {
  const hasData = points.some((v) => v > 0);
  if (!hasData) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: dot }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: C.mid }}>{label}</div>
      </div>
      <Sparkline points={points} color={dot} min={min} max={max} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
        {days.map((d) => (
          <div key={d.date} style={{ fontSize: 9, color: C.muted, width: 40, textAlign: "center" }}>{d.day}</div>
        ))}
      </div>
    </div>
  );
}

const INSIGHT_KEY = "cs_weekly_insight_";
const VITALS_KEY = "cs_vitals_insight_";

function mmHrvNote(avgHrv) {
  if (!avgHrv) return null;
  if (avgHrv < 30) return "Your HRV suggests your nervous system is under significant load — Anthony William links low HRV to heavy metal accumulation and active viral replication. Prioritise rest, zinc, and B12.";
  if (avgHrv < 50) return "Your HRV is in a cautious range. According to Anthony William, this often reflects the vagus nerve under strain from EBV activity. Lemon balm and deep rest support recovery here.";
  if (avgHrv < 75) return "Good HRV range — your nervous system resilience is building. Anthony William's HMDS and heavy metal detox protocols support continued improvement.";
  return "Strong HRV — your nervous system is healing well. Anthony William attributes this kind of resilience to a clean, toxin-free body and consistent protocol adherence.";
}

function mmSleepNote(avgSleep, avgQuality) {
  if (!avgSleep && !avgQuality) return null;
  const parts = [];
  if (avgSleep && avgSleep < 6.5) parts.push("Under 7 hours of sleep limits your liver's 1–3am detox window — Anthony William says this is the liver's most active cleansing period.");
  if (avgQuality && avgQuality <= 2) parts.push("Poor sleep quality often reflects heavy metals disrupting brain chemistry and EBV activity — lemon balm and magnesium glycinate can support deeper sleep.");
  if (avgSleep && avgSleep >= 8 && avgQuality && avgQuality >= 4) parts.push("Your sleep is supporting healing well — the liver is getting its full cleansing window each night.");
  return parts.length > 0 ? parts[0] : null;
}

export default function HealingTrends({ last7, celeryStreak, protocolDays, avgEnergy7 }) {
  const [insight, setInsight] = useState(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const daysWithData = last7.filter((d) => d.energy > 0).length;

  useEffect(() => {
    if (daysWithData < 3) return;
    const today = new Date().toISOString().split("T")[0];
    const key = INSIGHT_KEY + today;
    const cached = localStorage.getItem(key);
    if (cached) { setInsight(cached); return; }

    setLoadingInsight(true);
    const summary = last7.map((d) =>
      `${d.day}: energy=${d.energy || "?"}/10, celery=${d.celery}oz, sleep=${d.sleep_hours || "?"}h (quality ${d.sleep_quality || "?"}/5), HRV=${d.hrv || "?"}`
    ).join(" | ");

    callClaude({
      maxTokens: 200,
      messages: [{
        role: "user",
        content: `You are a Medical Medium healing companion. Based on this user's 7-day check-in data: ${summary}.
Write a 2-3 sentence warm, encouraging healing insight. Mention any positive trend (energy, sleep, or celery streak) — or gentle encouragement if struggling. Reference Anthony William's teachings. Under 70 words. No headers, just the insight.`,
      }],
    }).then((text) => {
      localStorage.setItem(key, text);
      setInsight(text);
    }).catch(() => {}).finally(() => setLoadingInsight(false));
  }, [daysWithData]);

  const energyVals = last7.map((d) => d.energy || 0);
  const celeryVals = last7.map((d) => d.celery || 0);
  const sleepQualVals = last7.map((d) => d.sleep_quality || 0);
  const sleepHrVals = last7.map((d) => d.sleep_hours || 0);
  const hrvVals = last7.map((d) => d.hrv || 0);

  const maxCelery = Math.max(...celeryVals, 16);

  const hasSleep = sleepQualVals.some((v) => v > 0) || sleepHrVals.some((v) => v > 0);
  const hasHrv = hrvVals.some((v) => v > 0);

  const avgSleep = (() => {
    const vals = sleepHrVals.filter((v) => v > 0);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
  })();
  const avgSleepQual = (() => {
    const vals = sleepQualVals.filter((v) => v > 0);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  })();
  const avgHrv = (() => {
    const vals = hrvVals.filter((v) => v > 0);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  })();

  const sleepNote = mmSleepNote(avgSleep ? parseFloat(avgSleep) : null, avgSleepQual);
  const hrvNote = mmHrvNote(avgHrv);

  return (
    <Card>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 14 }}>
        📈 Your Healing Trends
      </div>

      {daysWithData === 0 ? (
        <div style={{ fontSize: 13, color: C.muted, textAlign: "center", padding: "12px 0" }}>
          Complete your first check-in above to start tracking your healing journey
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {avgEnergy7 !== null && (
              <div style={{ flex: "1 0 60px", textAlign: "center", padding: "10px 6px", background: C.sageLight, borderRadius: 12 }}>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "Georgia,serif", color: C.leaf }}>{avgEnergy7}</div>
                <div style={{ fontSize: 10, color: C.mid, marginTop: 2 }}>avg energy</div>
              </div>
            )}
            <div style={{ flex: "1 0 60px", textAlign: "center", padding: "10px 6px", background: "#f0fdf4", borderRadius: 12 }}>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "Georgia,serif", color: C.sage }}>{celeryStreak}</div>
              <div style={{ fontSize: 10, color: C.mid, marginTop: 2 }}>🥬 streak</div>
            </div>
            {avgSleep && (
              <div style={{ flex: "1 0 60px", textAlign: "center", padding: "10px 6px", background: C.plumLight, borderRadius: 12 }}>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "Georgia,serif", color: C.plum }}>{avgSleep}h</div>
                <div style={{ fontSize: 10, color: C.mid, marginTop: 2 }}>avg sleep</div>
              </div>
            )}
            {avgHrv && (
              <div style={{ flex: "1 0 60px", textAlign: "center", padding: "10px 6px", background: "#fef0f0", borderRadius: 12 }}>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "Georgia,serif", color: "#e05252" }}>{avgHrv}</div>
                <div style={{ fontSize: 10, color: C.mid, marginTop: 2 }}>HRV ms</div>
              </div>
            )}
          </div>

          <ChartRow label="Energy (1–10)" dot={C.leaf} points={energyVals} min={0} max={10} days={last7} />
          <ChartRow label="🥬 Celery Juice (oz)" dot={C.sage} points={celeryVals} min={0} max={maxCelery} days={last7} />
          <ChartRow label="💤 Sleep quality (1–5)" dot={C.plum} points={sleepQualVals} min={0} max={5} days={last7} />
          <ChartRow label="🌙 Sleep hours" dot="#7c6fcd" points={sleepHrVals} min={0} max={12} days={last7} />
          <ChartRow label="💓 HRV (ms)" dot="#e05252" points={hrvVals} min={Math.max(0, (avgHrv || 40) - 30)} max={(avgHrv || 40) + 30} days={last7} />

          {/* AI weekly insight */}
          {(insight || loadingInsight) && (
            <div style={{ background: C.goldLight, border: `1px solid ${C.gold}40`, borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, marginBottom: 5 }}>✨ Weekly Insight</div>
              {loadingInsight
                ? <div style={{ fontSize: 12, color: C.mid }}>Generating your insight…</div>
                : <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.7, fontStyle: "italic" }}>{insight}</div>
              }
            </div>
          )}

          {/* MM vitals interpretation */}
          {sleepNote && (
            <div style={{ background: C.plumLight, border: `1px solid ${C.plum}30`, borderRadius: 12, padding: "12px 14px", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.plum, marginBottom: 5 }}>🌙 Sleep & Liver Health</div>
              <div style={{ fontSize: 12, color: C.charcoal, lineHeight: 1.65 }}>{sleepNote}</div>
            </div>
          )}
          {hrvNote && (
            <div style={{ background: "#fff5f5", border: "1px solid #fca5a530", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#e05252", marginBottom: 5 }}>💓 HRV & Nervous System</div>
              <div style={{ fontSize: 12, color: C.charcoal, lineHeight: 1.65 }}>{hrvNote}</div>
            </div>
          )}

          {!hasSleep && !hasHrv && (
            <div style={{ fontSize: 11, color: C.muted, textAlign: "center", padding: "8px 0" }}>
              Add sleep & HRV to today's check-in to see nervous system trends
            </div>
          )}
        </>
      )}
    </Card>
  );
}
