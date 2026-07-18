import { useMemo, useState } from "react";
import C from "../lib/colors.js";

function getDayInfo() {
  const start = localStorage.getItem("cs_journey_start");
  if (!start) return { day: 1, week: 1 };
  const days = Math.floor((Date.now() - new Date(start).getTime()) / 86400000);
  return { day: Math.max(days + 1, 1), week: Math.floor(days / 7) + 1 };
}

// Orientation-only surface for new users. The app ships no protocol content —
// the user's own copy of the books is the source (LEGAL_CONSTRAINTS.md), so
// this screen points them at building their own rhythm rather than handing
// them a pre-filled checklist.
export default function BeginnerHome({ onGraduate, onNavigate }) {
  const { day, week } = useMemo(getDayInfo, []);
  const [showDiscovery, setShowDiscovery] = useState(false);

  const discoveryText = localStorage.getItem("cs_discovery_result") || "";

  const Step = ({ emoji, title, desc, cta, onClick }) => (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 14,
      padding: "14px 16px", borderRadius: 16,
      background: C.mist, border: `2px solid ${C.border}`, marginBottom: 10,
    }}>
      <span style={{ fontSize: 22, marginTop: 1 }}>{emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 3 }}>
          {title}
        </div>
        <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>{desc}</div>
        {cta && (
          <button
            onClick={onClick}
            style={{
              background: "none", border: "none", color: C.sageDark, fontSize: 12.5,
              cursor: "pointer", padding: "8px 0 0", textAlign: "left",
              fontFamily: "Georgia,serif", fontWeight: 700,
            }}
          >
            {cta} →
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Journey header */}
      <div style={{
        background: `linear-gradient(135deg,${C.sageDark},${C.leaf})`,
        borderRadius: 20, padding: "20px 22px", color: "#fff",
      }}>
        <div style={{ fontSize: 11, letterSpacing: 0.6, opacity: 0.75, textTransform: "uppercase", marginBottom: 4 }}>
          Your wellness journey
        </div>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 26, lineHeight: 1.2, marginBottom: 6 }}>
          Week {week} · Day {day}
        </div>
        <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>
          {week === 1
            ? "Getting set up. Your own books are the source — this app keeps you on track."
            : `You've shown up for ${day} days. Keep going.`}
        </div>
      </div>

      {/* Getting started */}
      <div style={{ background: "#fff", borderRadius: 20, padding: "18px 18px" }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 17, color: C.charcoal, marginBottom: 4 }}>
          Getting started
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
          CelerySync is an independent companion for the routine <em>you</em> choose to follow.
          It never supplies the protocol itself — that stays between you and your books.
        </div>

        <Step
          emoji="📗"
          title="Start with your book"
          desc="Everything you follow comes from your own copy of Anthony William's books. If you don't have one yet, the Learn tab links to his official books, site, and free content."
          cta="Open Learn"
          onClick={() => onNavigate && onNavigate("learn")}
        />
        <Step
          emoji="🌅"
          title="Build your morning rhythm"
          desc="Open your book to the routine you want to follow, then enter each step — in your own words — as items in your Daily Rhythm. The app sequences them from your wake time and reminds you."
          cta="Switch to the full app to build it"
          onClick={onGraduate}
        />
        <Step
          emoji="✅"
          title="Track how it goes"
          desc="Tick items off as you do them, log how you feel, and watch your own consistency build week by week. Your logged history is yours — the app describes it, never interprets it."
        />
      </div>

      {/* Discovery summary */}
      {discoveryText && (
        <div style={{ background: "#fff", borderRadius: 20, padding: "18px 18px" }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16, color: C.charcoal, marginBottom: 10 }}>
            Your discovery
          </div>
          <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
            {showDiscovery ? discoveryText : discoveryText.slice(0, 280) + (discoveryText.length > 280 ? "…" : "")}
          </div>
          {discoveryText.length > 280 && (
            <button
              onClick={() => setShowDiscovery(v => !v)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: C.sageDark, fontFamily: "Georgia,serif", fontWeight: 700,
                fontSize: 13, padding: "8px 0 0", textDecoration: "underline",
              }}
            >
              {showDiscovery ? "Show less" : "Read full discovery"}
            </button>
          )}
        </div>
      )}

      {/* Graduate / full app link */}
      <div style={{
        background: "#fff", borderRadius: 20, padding: "18px 18px",
        border: `1.5px dashed ${C.border}`,
      }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 6 }}>
          Ready for the full app?
        </div>
        <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.65, marginBottom: 14 }}>
          The full experience adds your Daily Rhythm builder, multi-day program tracking,
          progress reports, and the voice companion — all built around the routine you enter
          from your own books.
        </div>
        <button
          onClick={onGraduate}
          style={{
            background: C.charcoal, color: "#fff", border: "none",
            borderRadius: 30, padding: "11px 22px",
            fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13.5,
            cursor: "pointer",
          }}
        >
          Switch to full app →
        </button>
      </div>

      <div style={{ fontSize: 11, color: C.muted, textAlign: "center", lineHeight: 1.6, paddingBottom: 4 }}>
        🌿 Independent app · Inspired by Anthony William's Medical Medium teachings<br />
        Not affiliated with or endorsed by Medical Medium LLC
      </div>
    </div>
  );
}
