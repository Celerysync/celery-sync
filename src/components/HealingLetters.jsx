import { useState, useEffect } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function fmtDate(str) {
  if (!str) return "";
  return new Date(str).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

function LetterCard({ letter, profileId }) {
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    setDone(false);
    try {
      const res = await fetch(`/api/memory/letters/${profileId}/${letter.id}/pdf`);
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `healing-letter-year-${letter.year_number}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch {
      alert("Couldn't download this letter. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const preview = letter.letter_text?.slice(0, 220);

  return (
    <div style={{
      background: "#fffef8",
      borderRadius: 16,
      border: `1px solid ${C.sage}40`,
      padding: "16px 18px",
      marginBottom: 14,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{
            fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15,
            color: C.charcoal,
          }}>
            {ordinal(letter.year_number)} healing anniversary 💚
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
            {fmtDate(letter.created_at)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              padding: "5px 12px", borderRadius: 20, fontSize: 11,
              fontFamily: "Georgia,serif", fontWeight: 600,
              border: `1px solid ${C.border}`,
              background: expanded ? C.sageLight : "#fff",
              color: C.charcoal, cursor: "pointer",
            }}
          >
            {expanded ? "Close" : "Read"}
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              padding: "5px 12px", borderRadius: 20, fontSize: 11,
              fontFamily: "Georgia,serif", fontWeight: 600,
              border: `1px solid ${done ? C.sage : C.sageDark}`,
              background: done ? C.sage : C.sageDark,
              color: "#fff", cursor: downloading ? "default" : "pointer",
            }}
          >
            {done ? "✓" : downloading ? "…" : "⬇ PDF"}
          </button>
        </div>
      </div>

      {/* Preview or full text */}
      {!expanded && (
        <div style={{
          fontSize: 13, color: C.charcoal, lineHeight: 1.7,
          fontFamily: "Georgia,serif", fontStyle: "italic",
          opacity: 0.85,
        }}>
          "{preview}{letter.letter_text?.length > 220 ? "…" : ""}"
        </div>
      )}
      {expanded && (
        <div style={{
          fontSize: 13, color: C.charcoal, lineHeight: 1.8,
          fontFamily: "Georgia,serif",
          borderTop: `1px solid ${C.border}`,
          paddingTop: 14, marginTop: 4,
          whiteSpace: "pre-wrap",
        }}>
          {letter.letter_text}
        </div>
      )}
    </div>
  );
}

export default function HealingLetters({ profileId }) {
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) return;
    fetch(`/api/memory/letters/${profileId}`)
      .then(r => r.json())
      .then(data => {
        setLetters(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [profileId]);

  return (
    <Card>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 4 }}>
        💌 Healing Anniversary Letters
      </div>
      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 16 }}>
        Each year on your healing anniversary, your AI guide writes you a personal letter — reflecting on how far you've come, what it witnessed in your journey, and its hopes for the year ahead. These are yours to keep forever.
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "24px 0", color: C.muted, fontSize: 13, fontFamily: "Georgia,serif" }}>
          Loading your letters…
        </div>
      )}

      {!loading && letters.length === 0 && (
        <div style={{
          background: C.sageLight,
          borderRadius: 14, padding: "18px 16px",
          border: `1px solid ${C.sage}30`,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🌱</div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 6 }}>
            Your first letter is being written
          </div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
            On each anniversary of when you joined CelerySync, your AI guide will write you a personal healing letter. Check back on your anniversary date — it will be here waiting.
          </div>
        </div>
      )}

      {!loading && letters.length > 0 && letters.map(l => (
        <LetterCard key={l.id} letter={l} profileId={profileId} />
      ))}

      {!loading && letters.length > 0 && (
        <div style={{
          marginTop: 4, padding: "10px 14px",
          background: C.sageLight, borderRadius: 12,
          border: `1px solid ${C.sage}30`,
        }}>
          <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
            Letters are generated automatically on your anniversary each year and emailed to you. They're also stored here permanently — you'll never lose them.
          </div>
        </div>
      )}
    </Card>
  );
}
