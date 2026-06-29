import { useState, useEffect } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { ORGANS } from "../data/bodyEducation.js";
import { useVoice } from "../hooks/useVoice.js";
import { useVoicePrefs } from "../context/VoiceContext.jsx";

function OrganDetail({ organ, onBack, voiceName }) {
  const { speak, speaking, stopSpeaking } = useVoice(voiceName);

  const healingText = `Best healing foods for the ${organ.name}: ${organ.healingFoods.join(", ")}. Key supplements: ${organ.supplements.join(", ")}.`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Back */}
      <button
        onClick={onBack}
        style={{ background: "none", border: "none", color: C.sage, fontSize: 13, cursor: "pointer", textAlign: "left", padding: 0, fontFamily: "Georgia,serif" }}
      >
        ← All organs
      </button>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${organ.color}22, ${organ.color}11)`,
        border: `1.5px solid ${organ.color}44`,
        borderRadius: 20, padding: "20px 18px",
      }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>{organ.emoji}</div>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 22, color: organ.color }}>
          {organ.name}
        </div>
        <div style={{ fontSize: 13, color: C.mid, marginTop: 4, fontStyle: "italic" }}>
          {organ.tagline}
        </div>
        <button
          onClick={() => speaking ? stopSpeaking() : speak(healingText)}
          style={{
            marginTop: 12, background: speaking ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.5)", color: "#fff",
            borderRadius: 30, padding: "7px 16px", fontSize: 12,
            cursor: "pointer", fontFamily: "Georgia,serif", fontWeight: 700,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          {speaking ? "⏹ Stop" : "🔊 Read this aloud"}
        </button>
      </div>

      {/* Healing foods */}
      <Card>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: "#16a34a", marginBottom: 10 }}>
          🌿 Best healing foods
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {organ.healingFoods.map((f) => (
            <div key={f} style={{
              padding: "5px 12px", borderRadius: 20,
              background: "#f0fdf4", border: "1px solid #86efac",
              fontSize: 12, color: "#15803d", fontFamily: "Georgia,serif",
            }}>
              {f}
            </div>
          ))}
        </div>
      </Card>

      {/* Supplements */}
      <Card>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.sageDark, marginBottom: 10 }}>
          💊 Key supplements
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {organ.supplements.map((s) => (
            <div key={s} style={{
              padding: "5px 12px", borderRadius: 20,
              background: C.sageLight, border: `1px solid ${C.sage}60`,
              fontSize: 12, color: C.sageDark, fontFamily: "Georgia,serif",
            }}>
              {s}
            </div>
          ))}
        </div>
      </Card>

      {/* Link-out */}
      <Card>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.sageDark, marginBottom: 8 }}>
          📚 Full teachings and protocols
        </div>
        <div style={{ fontSize: 12.5, color: C.mid, lineHeight: 1.7, marginBottom: 10 }}>
          For Anthony William's complete {organ.name.toLowerCase()} teachings — protocols, supplement specifics, and underlying causes — visit his official website or read <em>{organ.book}</em>.
        </div>
        <a
          href="https://www.medicalmedium.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            background: organ.color,
            color: "#fff",
            padding: "8px 16px",
            borderRadius: 20,
            fontSize: 12,
            fontFamily: "Georgia,serif",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Visit medicalmedium.com →
        </a>
      </Card>

      {/* Disclaimer */}
      <div style={{ fontSize: 11, color: C.muted, textAlign: "center", lineHeight: 1.6, padding: "0 8px 8px" }}>
        📖 Paraphrased from Anthony William's publicly shared teachings. This is not medical advice — always work with your healthcare provider. For in-depth detail and book links, see the <strong>Resources</strong> tab.
      </div>
    </div>
  );
}

export default function Body({ navQuery, onPageContext }) {
  const [selected, setSelected] = useState(null);
  const { voiceName } = useVoicePrefs();

  useEffect(() => {
    if (!navQuery) return;
    const q = navQuery.toLowerCase();
    const match = ORGANS.find(o => o.name.toLowerCase().includes(q) || q.includes(o.name.toLowerCase().split(" ")[0]));
    if (match) { setSelected(match); onPageContext?.({ tab: "body", label: match.name, detail: match.tagline }); }
  }, [navQuery]);

  if (selected) {
    return <OrganDetail organ={selected} onBack={() => setSelected(null)} voiceName={voiceName} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: "Georgia,serif", fontSize: 20, color: C.charcoal }}>
          🫁 The Body — AW's View
        </h2>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
          How your organs work according to Anthony William · Tap to explore
        </div>
      </div>

      {/* Intro card */}
      <div style={{
        background: `linear-gradient(135deg,${C.sageLight},#fdf9f0)`,
        border: `1px solid ${C.sage}40`,
        borderRadius: 16, padding: "14px 16px",
      }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.sageDark, marginBottom: 6 }}>
          A different way of understanding your body
        </div>
        <div style={{ fontSize: 12.5, color: C.mid, lineHeight: 1.7 }}>
          Anthony William's teachings offer a unique lens on how each organ functions and what supports it. Tap any organ to explore, then follow the link to his official site for full protocols.
        </div>
      </div>

      {/* Organ grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {ORGANS.map((organ) => (
          <button
            key={organ.id}
            onClick={() => { setSelected(organ); onPageContext?.({ tab: "body", label: organ.name, detail: organ.tagline }); }}
            style={{
              background: organ.lightColor,
              border: `1.5px solid ${organ.color}33`,
              borderRadius: 18, padding: "18px 14px",
              textAlign: "center", cursor: "pointer",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 8,
              boxShadow: "0 2px 8px #00000008",
            }}
          >
            <div style={{ fontSize: 34 }}>{organ.emoji}</div>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: organ.color }}>
              {organ.name}
            </div>
            <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.4 }}>
              {organ.tagline}
            </div>
            <div style={{ fontSize: 10, color: organ.color, fontFamily: "Georgia,serif", marginTop: 2 }}>
              Explore →
            </div>
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: C.muted, textAlign: "center", lineHeight: 1.6, padding: "0 8px 8px" }}>
        Based on teachings from Anthony William's Medical Medium book series
      </div>
    </div>
  );
}
