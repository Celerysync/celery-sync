import { useState, useEffect } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { CONDITIONS } from "../data/conditions.js";

// Core MM daily supplements that everyone on the protocol takes
const CORE_SUPPS = [
  "🍋 Lemon water (16–32oz on empty stomach)",
  "🥬 Celery juice (16oz minimum)",
  "🫐 Heavy Metal Detox Smoothie",
];

function todayKey() {
  const d = new Date();
  return `cs_supps_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function getSuppsForConditions(conditions = []) {
  const seen = new Set();
  const result = [];
  for (const cond of conditions) {
    const data = CONDITIONS[cond];
    if (!data) continue;
    for (const s of (data.supps || [])) {
      // Skip celery juice — already in core
      if (s.toLowerCase().includes("celery juice")) continue;
      // Normalise — strip dosage to get the supplement name
      const name = s.split(" ").slice(0, 3).join(" ");
      if (!seen.has(name)) {
        seen.add(name);
        result.push(s);
      }
    }
  }
  return result.slice(0, 12); // cap at 12 so it's not overwhelming
}

export default function SupplementTracker({ userConditions = [] }) {
  const [checked, setChecked] = useState({});
  const [expanded, setExpanded] = useState(false);

  const key = todayKey();

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "{}");
      setChecked(saved);
    } catch {
      setChecked({});
    }
  }, [key]);

  const toggle = (supp) => {
    setChecked((prev) => {
      const next = { ...prev, [supp]: !prev[supp] };
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  };

  const conditionSupps = getSuppsForConditions(userConditions);
  const allSupps = [...CORE_SUPPS, ...conditionSupps];
  const doneCount = allSupps.filter((s) => checked[s]).length;
  const pct = Math.round((doneCount / allSupps.length) * 100);

  return (
    <Card style={{ border: `1.5px solid ${C.sage}30` }}>
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: 0, textAlign: "left",
        }}
      >
        <div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal }}>
            💊 Today's Supplements
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
            {doneCount}/{allSupps.length} taken · {pct}% done
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Progress ring */}
          <svg width={36} height={36} viewBox="0 0 36 36">
            <circle cx={18} cy={18} r={15} fill="none" stroke={C.border} strokeWidth={3} />
            <circle
              cx={18} cy={18} r={15} fill="none"
              stroke={pct === 100 ? C.sage : C.leaf}
              strokeWidth={3}
              strokeDasharray={`${(pct / 100) * 94.2} 94.2`}
              strokeLinecap="round"
              transform="rotate(-90 18 18)"
              style={{ transition: "stroke-dasharray 0.4s" }}
            />
            <text x={18} y={22} textAnchor="middle" fontSize={9} fill={C.mid} fontFamily="Georgia,serif">
              {pct}%
            </text>
          </svg>
          <span style={{ fontSize: 16, color: C.muted }}>{expanded ? "▼" : "▶"}</span>
        </div>
      </button>

      {/* Checklist */}
      {expanded && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Core protocol */}
          <div style={{ fontSize: 10, fontWeight: 700, color: C.sage, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
            Morning Protocol
          </div>
          {CORE_SUPPS.map((s) => (
            <SuppRow key={s} label={s} checked={!!checked[s]} onToggle={() => toggle(s)} />
          ))}

          {conditionSupps.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.plum, textTransform: "uppercase", letterSpacing: 0.8, margin: "10px 0 6px" }}>
                Your Protocol Supplements
              </div>
              {conditionSupps.map((s) => (
                <SuppRow key={s} label={s} checked={!!checked[s]} onToggle={() => toggle(s)} />
              ))}
            </>
          )}

          {conditionSupps.length === 0 && (
            <div style={{ fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
              Add your health conditions in your profile to see personalised supplement reminders here.
            </div>
          )}

          {pct === 100 && (
            <div style={{
              marginTop: 12, padding: "10px 14px",
              background: C.sageLight, borderRadius: 10,
              fontSize: 13, color: C.sageDark,
              fontFamily: "Georgia,serif", fontWeight: 700,
              textAlign: "center",
            }}>
              ✨ Full protocol complete today — incredible healing work!
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function SuppRow({ label, checked, onToggle }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 4px", background: "none", border: "none",
        cursor: "pointer", width: "100%", textAlign: "left",
        borderBottom: `1px solid ${C.border}40`,
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: 6, flexShrink: 0,
        background: checked ? C.sage : "transparent",
        border: `2px solid ${checked ? C.sage : C.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: C.white, fontSize: 12, fontWeight: 700,
        transition: "all 0.15s",
      }}>
        {checked ? "✓" : ""}
      </div>
      <div style={{
        fontSize: 12, color: checked ? C.muted : C.charcoal,
        textDecoration: checked ? "line-through" : "none",
        lineHeight: 1.4, transition: "all 0.15s",
      }}>
        {label}
      </div>
    </button>
  );
}
