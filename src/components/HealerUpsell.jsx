import { useState } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";

// What Rhythm-plan ($7.97 engine-only) subscribers see in place of the AI
// companion. Warm, not naggy: the trial already showed them what the
// companion is; this is the door back to it. Compliance: describes app
// features only — no wellness claims.
const COMPANION_POINTS = [
  ["🎙", "Talk instead of tapping", "Say \"just finished my juice\" and it's ticked off before you put the glass down."],
  ["💬", "A companion who knows your day", "Ask what's left, think out loud, save a reflection — by voice or text."],
  ["🌅", "Spoken mornings and evenings", "A gentle good-morning with your rhythm, and a wind-down reflection at night."],
];

export default function HealerUpsell({ onUpgrade }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const upgrade = async () => {
    setBusy(true);
    setError(null);
    try {
      await onUpgrade();
    } catch (err) {
      setError(err.message || "Something went wrong — try again in a moment.");
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{
        background: `linear-gradient(135deg,${C.sageDark},${C.leaf})`,
        borderRadius: 20, padding: "24px 20px", color: C.white, textAlign: "center",
      }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🎙</div>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 21, fontWeight: 700 }}>
          Your companion lives in the Healer plan
        </div>
        <div style={{ fontSize: 13, opacity: 0.88, marginTop: 6, lineHeight: 1.6 }}>
          The Rhythm plan keeps your whole routine humming. Healer adds the voice
          and chat companion you met in your trial.
        </div>
      </div>

      <Card>
        {COMPANION_POINTS.map(([emoji, label, desc]) => (
          <div key={label} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}`, alignItems: "flex-start" }}>
            <div style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{emoji}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.charcoal }}>{label}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
            </div>
          </div>
        ))}
      </Card>

      {error && (
        <div style={{ background: C.terracottaLight, border: `1px solid ${C.terracotta}50`, borderRadius: 12, padding: 12, fontSize: 13, color: C.terracotta }}>
          {error}
        </div>
      )}

      <button
        onClick={upgrade}
        disabled={busy}
        style={{
          width: "100%", padding: "15px", background: busy ? C.muted : C.sageDark,
          color: C.white, border: "none", borderRadius: 40,
          fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16,
          cursor: busy ? "default" : "pointer",
        }}
      >
        {busy ? "🌿 One moment…" : "Upgrade to Healer — $24.97/month →"}
      </button>
      <div style={{ textAlign: "center", fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
        Upgrades apply to your existing subscription straight away — no second
        subscription, just the difference for the rest of the month.
      </div>
    </div>
  );
}

// Floating stand-in for the VoiceOrb (same spot, same size) so the companion
// button doesn't silently vanish for Rhythm subscribers — tapping it opens
// the upgrade panel on the Companion tab.
export function UpsellOrb({ onTap }) {
  return (
    <button
      onClick={onTap}
      aria-label="Meet the voice companion (Healer plan)"
      style={{
        position: "fixed",
        bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
        right: 16,
        width: 52, height: 52, borderRadius: "50%", border: "none",
        cursor: "pointer", background: C.muted, color: C.white, fontSize: 20,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)", zIndex: 200, opacity: 0.85,
      }}
    >
      🎙
    </button>
  );
}
