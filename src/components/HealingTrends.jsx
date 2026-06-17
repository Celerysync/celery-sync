import { useState, useEffect } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { callClaude } from "../lib/api.js";

const W = 280, H = 72;
const XS = [20, 60, 100, 140, 180, 220, 260];
const YBOT = 64, YTOP = 8;

function yPos(val, max) {
  if (!val) return null;
  return YTOP + (1 - (val - 1) / (max - 1)) * (YBOT - YTOP);
}

function Sparkline({ points, color, max = 10 }) {
  const mapped = points.map((v) => yPos(v, max));
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
      {/* Gridlines */}
      {[YTOP, (YTOP + YBOT) / 2, YBOT].map((y) => (
        <line key={y} x1={0} y1={y} x2={W} y2={y} stroke={C.border} strokeWidth={0.8} />
      ))}
      {/* Line segments */}
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
      {/* Dots */}
      {mapped.map((y, i) =>
        y !== null ? (
          <circle key={i} cx={XS[i]} cy={y} r={4} fill={color} stroke={C.white} strokeWidth={1.5} />
        ) : (
          <circle key={i} cx={XS[i]} cy={YBOT / 2 + YTOP / 2} r={2.5} fill={C.border} opacity={0.5} />
        )
      )}
    </svg>
  );
}

const INSIGHT_KEY = "cs_weekly_insight_";

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
      `${d.day}: energy=${d.energy || "?"}/10, mood=${d.mood || "?"}/5, celery=${d.celery}oz`
    ).join(" | ");

    callClaude({
      maxTokens: 180,
      messages: [{
        role: "user",
        content: `You are a Medical Medium healing companion. Based on this user's 7-day check-in data: ${summary}.
Write a 2-sentence warm, encouraging healing insight. Mention any positive trend (or gentle encouragement if flat/declining). Reference Anthony William's teachings briefly. Keep it under 60 words. No headers, just the insight.`,
      }],
    }).then((text) => {
      localStorage.setItem(key, text);
      setInsight(text);
    }).catch(() => {}).finally(() => setLoadingInsight(false));
  }, [daysWithData]);

  const energyVals = last7.map((d) => d.energy);
  const moodVals = last7.map((d) => d.mood);
  const celeryVals = last7.map((d) => d.celery);
  const maxCelery = Math.max(...celeryVals, 16);

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
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            {avgEnergy7 !== null && (
              <div style={{
                flex: 1, textAlign: "center", padding: "10px 6px",
                background: C.sageLight, borderRadius: 12,
              }}>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "Georgia,serif", color: C.leaf }}>{avgEnergy7}</div>
                <div style={{ fontSize: 10, color: C.mid, marginTop: 2 }}>avg energy</div>
              </div>
            )}
            <div style={{
              flex: 1, textAlign: "center", padding: "10px 6px",
              background: "#f0fdf4", borderRadius: 12,
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "Georgia,serif", color: C.sage }}>{celeryStreak}</div>
              <div style={{ fontSize: 10, color: C.mid, marginTop: 2 }}>🥬 day streak</div>
            </div>
            <div style={{
              flex: 1, textAlign: "center", padding: "10px 6px",
              background: C.plumLight, borderRadius: 12,
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "Georgia,serif", color: C.plum }}>{daysWithData}</div>
              <div style={{ fontSize: 10, color: C.mid, marginTop: 2 }}>days tracked</div>
            </div>
          </div>

          {/* Energy chart */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.leaf }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: C.mid }}>Energy (1–10)</div>
            </div>
            <Sparkline points={energyVals} color={C.leaf} max={10} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
              {last7.map((d) => (
                <div key={d.date} style={{ fontSize: 9, color: C.muted, width: 40, textAlign: "center" }}>{d.day}</div>
              ))}
            </div>
          </div>

          {/* Mood chart */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.plum }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: C.mid }}>Mood (1–5)</div>
            </div>
            <Sparkline points={moodVals} color={C.plum} max={5} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
              {last7.map((d) => (
                <div key={d.date} style={{ fontSize: 9, color: C.muted, width: 40, textAlign: "center" }}>{d.day}</div>
              ))}
            </div>
          </div>

          {/* Celery chart */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.sage }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: C.mid }}>🥬 Celery Juice (oz)</div>
            </div>
            <Sparkline points={celeryVals} color={C.sage} max={maxCelery} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
              {last7.map((d) => (
                <div key={d.date} style={{ fontSize: 9, color: C.muted, width: 40, textAlign: "center" }}>{d.day}</div>
              ))}
            </div>
          </div>

          {/* AI insight */}
          {(insight || loadingInsight) && (
            <div style={{
              background: C.goldLight, border: `1px solid ${C.gold}40`,
              borderRadius: 12, padding: "12px 14px",
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, marginBottom: 5 }}>✨ Weekly Insight</div>
              {loadingInsight
                ? <div style={{ fontSize: 12, color: C.mid }}>Generating your insight…</div>
                : <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.7, fontStyle: "italic" }}>{insight}</div>
              }
            </div>
          )}
        </>
      )}
    </Card>
  );
}
