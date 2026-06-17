import { useState, useEffect } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { ORGANS } from "../data/bodyEducation.js";

function OrganDetail({ organ, onBack, searchBooks }) {
  const [section, setSection] = useState("overview");
  const [bookPassages, setBookPassages] = useState([]);

  useEffect(() => {
    if (!searchBooks) return;
    searchBooks(organ.name).then((chunks) => {
      if (chunks?.length > 0) setBookPassages(chunks.slice(0, 3));
    });
  }, [organ.name]);

  const SECTIONS = [
    { id: "overview", label: "Overview" },
    { id: "teachings", label: "AW Teaches" },
    { id: "healing", label: "Healing" },
    { id: "protocol", label: "Protocol" },
  ];

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
        <div style={{ marginTop: 10, fontSize: 11, background: organ.color, color: "#fff", display: "inline-block", padding: "3px 10px", borderRadius: 20, fontFamily: "Georgia,serif" }}>
          📚 {organ.book}
        </div>
      </div>

      {/* Section tabs */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            style={{
              flexShrink: 0, padding: "7px 14px", borderRadius: 20,
              border: `1.5px solid ${section === s.id ? organ.color : C.border}`,
              background: section === s.id ? organ.color : "transparent",
              color: section === s.id ? "#fff" : C.mid,
              fontFamily: "Georgia,serif", fontSize: 12, cursor: "pointer",
              fontWeight: section === s.id ? 700 : 400,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {section === "overview" && (
        <Card>
          <div style={{ fontSize: 13.5, color: C.charcoal, lineHeight: 1.85, whiteSpace: "pre-line" }}>
            {organ.overview}
          </div>
        </Card>
      )}

      {/* AW Teachings */}
      {section === "teachings" && (
        <Card>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 12 }}>
            What Anthony William teaches about the {organ.name}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {organ.awTeachings.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  background: organ.color, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, fontFamily: "Georgia,serif",
                  marginTop: 2,
                }}>
                  {i + 1}
                </div>
                <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.7 }}>{t}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Healing foods + avoid */}
      {section === "healing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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

          <Card>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: "#dc2626", marginBottom: 10 }}>
              ❌ Foods to avoid
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {organ.avoid.map((f) => (
                <div key={f} style={{
                  padding: "5px 12px", borderRadius: 20,
                  background: "#fef2f2", border: "1px solid #fca5a5",
                  fontSize: 12, color: "#dc2626", fontFamily: "Georgia,serif",
                }}>
                  {f}
                </div>
              ))}
            </div>
          </Card>

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
        </div>
      )}

      {/* Protocol */}
      {section === "protocol" && (
        <Card>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 10 }}>
            🌿 Healing protocol
          </div>
          <div style={{ fontSize: 13.5, color: C.charcoal, lineHeight: 1.85 }}>
            {organ.protocol}
          </div>
          <div style={{ marginTop: 14, padding: "12px 14px", background: C.sageLight, borderRadius: 12, border: `1px solid ${C.sage}40` }}>
            <div style={{ fontSize: 11, color: C.sageDark, fontFamily: "Georgia,serif", fontWeight: 700, marginBottom: 4 }}>
              📚 Go deeper
            </div>
            <div style={{ fontSize: 12, color: C.mid }}>
              Full protocol in <em>{organ.book}</em> by Anthony William
            </div>
          </div>
        </Card>
      )}

      {/* From your books */}
      {bookPassages.length > 0 && (
        <Card>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.sageDark, marginBottom: 10 }}>
            📚 From your uploaded books
          </div>
          {bookPassages.map((p, i) => (
            <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: i < bookPassages.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: "Georgia,serif", marginBottom: 4 }}>
                {p.user_books?.title || "Your library"}
              </div>
              <div style={{ fontSize: 12.5, color: C.charcoal, lineHeight: 1.7 }}>
                {p.content.slice(0, 280)}{p.content.length > 280 ? "…" : ""}
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Disclaimer */}
      <div style={{ fontSize: 11, color: C.muted, textAlign: "center", lineHeight: 1.6, padding: "0 8px 8px" }}>
        These teachings are from Anthony William's published books and are not a substitute for medical advice. Always work with your healthcare practitioner.
      </div>
    </div>
  );
}

export default function Body({ searchBooks, navQuery }) {
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!navQuery) return;
    const q = navQuery.toLowerCase();
    const match = ORGANS.find(o => o.name.toLowerCase().includes(q) || q.includes(o.name.toLowerCase().split(" ")[0]));
    if (match) setSelected(match);
  }, [navQuery]);

  if (selected) {
    return <OrganDetail organ={selected} onBack={() => setSelected(null)} searchBooks={searchBooks} />;
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
          Anthony William's teachings reveal how each organ truly functions, what burdens it, and exactly how to support it. Tap any organ below to explore.
        </div>
      </div>

      {/* Organ grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {ORGANS.map((organ) => (
          <button
            key={organ.id}
            onClick={() => setSelected(organ)}
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
