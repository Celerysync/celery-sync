import { useState, useEffect } from "react";
import C from "../lib/colors.js";
import { useVoice } from "../hooks/useVoice.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { Tag, Card, Btn } from "./ui.jsx";
import { CLEANSES_SUMMARY, ORIGINAL_369 } from "../data/cleanses.js";
import { AVOID_ALL } from "../data/avoidList.js";

export default function Cleanse({ navQuery }) {
  const [sel, setSel] = useState(null);
  const [activeDay, setActiveDay] = useState(null);
  const [started, setStarted] = useLocalStorage("cs_started_cleanses", {});
  const { speak, speaking, stopSpeaking } = useVoice();

  useEffect(() => {
    if (!navQuery) return;
    const q = navQuery.toLowerCase();
    const match = CLEANSES_SUMMARY.find(c => c.name.toLowerCase().includes(q) || q.includes(c.name.toLowerCase().split(" ")[0]));
    if (match) setSel(match.name);
  }, [navQuery]);

  if (sel === "Original 3:6:9") {
    const days = Object.keys(ORIGINAL_369);
    const day = activeDay || days[0];
    const d = ORIGINAL_369[day];

    const readIt = () =>
      speak(
        `${day}. ${d.theme}. Upon waking: ${d.uponWaking}. Morning: ${d.morning}. ${
          d.lunch ? "Lunch: " + d.lunch + "." : ""
        } ${d.dinner ? "Dinner: " + d.dinner + "." : ""} ${
          d.allDay ? "Throughout the day: " + d.allDay : ""
        } Tips: ${d.tips?.join(". ")}`
      );

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <button
          onClick={() => { setSel(null); setActiveDay(null); }}
          style={{
            background: "none",
            border: "none",
            color: C.sage,
            cursor: "pointer",
            fontFamily: "Georgia,serif",
            fontSize: 14,
            padding: 0,
            textAlign: "left",
          }}
        >
          ← All Cleanses
        </button>

        <div
          style={{
            background: `linear-gradient(135deg,${C.sage},${C.sageDark})`,
            borderRadius: 18,
            padding: 20,
            color: C.white,
          }}
        >
          <div style={{ fontSize: 32 }}>🌿</div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 22, marginTop: 6 }}>
            Original 3:6:9 Cleanse
          </div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
            9 days · Cleanse to Heal Chapter 10 · Anthony William
          </div>
          {!started["Original 3:6:9"] ? (
            <button
              onClick={() =>
                setStarted((s) => ({
                  ...s,
                  "Original 3:6:9": new Date().toISOString().split("T")[0],
                }))
              }
              style={{
                marginTop: 12,
                background: "rgba(255,255,255,0.25)",
                color: C.white,
                border: "2px solid rgba(255,255,255,0.5)",
                borderRadius: 30,
                padding: "8px 18px",
                fontFamily: "Georgia,serif",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Start This Cleanse
            </button>
          ) : (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
              ✅ Started {started["Original 3:6:9"]}
            </div>
          )}
        </div>

        {/* Day tabs */}
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            paddingBottom: 4,
            scrollbarWidth: "none",
          }}
        >
          {days.map((d) => (
            <div
              key={d}
              onClick={() => setActiveDay(d)}
              style={{
                flexShrink: 0,
                padding: "8px 14px",
                borderRadius: 30,
                fontSize: 12,
                cursor: "pointer",
                border: `2px solid ${(activeDay || days[0]) === d ? C.sage : C.border}`,
                background: (activeDay || days[0]) === d ? C.sageLight : "transparent",
                color: (activeDay || days[0]) === d ? C.sageDark : C.muted,
                fontFamily: "Georgia,serif",
                fontWeight: 700,
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day detail */}
        <Card>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16, color: C.sage }}>
              {day}
            </div>
            <Btn small onClick={speaking ? stopSpeaking : readIt} color={C.sage}>
              {speaking ? "⏹ Stop" : "🔊 Listen"}
            </Btn>
          </div>
          <div
            style={{
              background: C.sageLight,
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: 13,
              color: C.sageDark,
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            {d.theme}
          </div>
          {[
            ["🌅 Upon Waking", d.uponWaking],
            ["☀️ Morning", d.morning],
            ["🕐 Mid-Morning", d.midMorning],
            ["🥗 Lunch", d.lunch],
            ["🍎 Mid-Afternoon", d.midAfternoon],
            ["🌆 Dinner", d.dinner],
            ["📅 All Day", d.allDay],
            ["🌇 Early Evening", d.earlyEvening],
            ["🌙 Evening", d.evening],
          ]
            .filter(([, v]) => v)
            .map(([label, val]) => (
              <div key={label} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 3 }}>
                  {label}
                </div>
                <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.6 }}>{val}</div>
              </div>
            ))}
          {d.tips && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.charcoal, marginBottom: 8 }}>
                📋 Guidelines
              </div>
              {d.tips.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 8, padding: "5px 0", fontSize: 13, color: C.mid }}>
                  <span style={{ color: C.sage, fontWeight: 700 }}>•</span>
                  {t}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Avoid all */}
        <Card>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 8 }}>
            🚫 Avoid All 9 Days
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {AVOID_ALL.map((a) => (
              <Tag key={a} color={C.terracotta}>{a}</Tag>
            ))}
          </div>
        </Card>

        <Card style={{ background: C.goldLight, border: `1px solid ${C.gold}40` }}>
          <div style={{ fontSize: 12, color: C.mid, lineHeight: 1.6 }}>
            📚 Full protocol in <strong>Cleanse to Heal</strong> by Anthony William, Chapter 10.
            Buy the book for complete recipes, adaptations, and guidance.
          </div>
          <a
            href="https://www.amazon.com/dp/1401957587"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-block", marginTop: 8, color: C.gold, fontWeight: 700, fontSize: 12 }}
          >
            Get Cleanse to Heal →
          </a>
        </Card>
      </div>
    );
  }

  // Cleanse list view
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 style={{ margin: 0, fontFamily: "Georgia,serif", fontSize: 22, color: C.charcoal }}>
        🌿 Healing Cleanses
      </h2>
      <Card style={{ background: C.sageLight, border: `1px solid ${C.sage}40` }}>
        <div style={{ fontSize: 12, color: C.sageDark, lineHeight: 1.6 }}>
          📚 All protocols from <strong>Cleanse to Heal</strong> by Anthony William. This app is a
          companion tool — buy the book for the complete picture.
        </div>
      </Card>
      {CLEANSES_SUMMARY.map((c) => (
        <Card
          key={c.name}
          onClick={() => setSel(c.name)}
          style={{ border: started[c.name] ? `2px solid ${c.color}` : undefined }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 28 }}>{c.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal }}>
                {c.name}
              </div>
              <div style={{ fontSize: 11, color: C.muted }}>
                {c.days > 0 ? `${c.days} days` : "Daily practice"}
              </div>
              <div style={{ fontSize: 12, color: C.mid, marginTop: 3, lineHeight: 1.4 }}>
                {c.desc}
              </div>
              <div style={{ fontSize: 11, color: c.color, fontWeight: 700, marginTop: 4 }}>
                Best for: {c.best.substring(0, 60)}...
              </div>
            </div>
            {started[c.name] && <Tag color={c.color}>Active</Tag>}
            <div style={{ color: C.sage, fontSize: 20, flexShrink: 0 }}>›</div>
          </div>
        </Card>
      ))}
    </div>
  );
}
