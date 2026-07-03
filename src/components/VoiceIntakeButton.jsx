import { useEffect } from "react";
import C from "../lib/colors.js";
import { useVoiceOrchestrator } from "../context/VoiceContext.jsx";
import { useVoiceIntake, INTAKE_STATE } from "../hooks/useVoiceIntake.js";
import { srSupported } from "../hooks/useVoice.js";

/**
 * VoiceIntakeButton — single entry point for voice data entry on Today, Track,
 * and Companion tabs.
 *
 * Props:
 *   onWrite(fields)   async — called with parsed check-in fields after spoken
 *                     confirmation. Caller writes to Supabase.
 *   onQuestion(text)  optional — called when AI detects a conversational question.
 *                     Coach tab wires this to its chat pipeline.
 *   inline            boolean — render as an inline pill (default: floating button)
 */
export default function VoiceIntakeButton({ onWrite, onQuestion, inline = false }) {
  const { listening, speaking } = useVoiceOrchestrator();
  const { mode, displayItems, startIntake, cancelIntake } = useVoiceIntake({
    onWrite,
    onQuestion,
  });

  const isActive = mode !== INTAKE_STATE.IDLE && mode !== INTAKE_STATE.ERROR;

  // Stop intake if the component unmounts mid-flow (tab navigation)
  useEffect(() => {
    return () => cancelIntake();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!srSupported) return null;

  const handlePress = () => {
    if (isActive) {
      cancelIntake();
    } else {
      startIntake();
    }
  };

  // ── State-driven label + color ───────────────────────────────────────────────
  const stateConfig = {
    [INTAKE_STATE.IDLE]:       { icon: "🎙",  label: "Speak to log",   bg: C.sageDark,  pulse: false },
    [INTAKE_STATE.LISTENING]:  { icon: "👂",  label: "Listening…",     bg: C.sage,      pulse: true  },
    [INTAKE_STATE.PARSING]:    { icon: "🌿",  label: "Understanding…", bg: C.sageDark,  pulse: true  },
    [INTAKE_STATE.CONFIRMING]: { icon: "🔊",  label: "Confirming…",    bg: C.gold,      pulse: false },
    [INTAKE_STATE.WRITING]:    { icon: "✓",   label: "Saving…",        bg: C.leaf,      pulse: false },
    [INTAKE_STATE.ERROR]:      { icon: "🎙",  label: "Try again",      bg: C.sageDark,  pulse: false },
  };

  const cfg = stateConfig[mode] || stateConfig[INTAKE_STATE.IDLE];

  if (inline) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          onClick={handlePress}
          aria-label={isActive ? "Stop voice intake" : "Start voice intake"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            borderRadius: 30,
            border: `2px solid ${cfg.bg}`,
            background: isActive ? cfg.bg : "transparent",
            color: isActive ? C.white : cfg.bg,
            fontFamily: "Georgia,serif",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: cfg.pulse ? `0 0 0 4px ${cfg.bg}30` : "none",
            animation: cfg.pulse ? "voicePulse 1.4s ease-in-out infinite" : "none",
          }}
        >
          <span style={{ fontSize: 16 }}>{cfg.icon}</span>
          {cfg.label}
        </button>

        {/* Confirmation panel — shown while confirming */}
        {mode === INTAKE_STATE.CONFIRMING && displayItems.length > 0 && (
          <ConfirmationPanel items={displayItems} />
        )}

        <style>{PULSE_KEYFRAMES}</style>
      </div>
    );
  }

  // Floating variant
  return (
    <>
      <button
        onClick={handlePress}
        aria-label={isActive ? "Stop voice intake" : "Start voice intake"}
        style={{
          position: "fixed",
          bottom: "calc(88px + env(safe-area-inset-bottom, 0px))",
          left: 16,
          width: 48,
          height: 48,
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          background: cfg.bg,
          color: C.white,
          fontSize: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: cfg.pulse
            ? `0 0 0 6px ${cfg.bg}44, 0 4px 20px rgba(0,0,0,0.25)`
            : "0 4px 20px rgba(0,0,0,0.2)",
          transition: "background 0.2s, box-shadow 0.2s",
          animation: cfg.pulse ? "voicePulse 1.4s ease-in-out infinite" : "none",
          zIndex: 199,
        }}
      >
        {cfg.icon}
      </button>

      {/* Confirmation panel anchored above the button */}
      {mode === INTAKE_STATE.CONFIRMING && displayItems.length > 0 && (
        <div style={{
          position: "fixed",
          bottom: "calc(148px + env(safe-area-inset-bottom, 0px))",
          left: 16,
          width: "min(300px, calc(100vw - 32px))",
          zIndex: 199,
        }}>
          <ConfirmationPanel items={displayItems} />
        </div>
      )}

      <style>{PULSE_KEYFRAMES}</style>
    </>
  );
}

function ConfirmationPanel({ items }) {
  return (
    <div style={{
      background: C.white,
      border: `2px solid ${C.gold}60`,
      borderRadius: 14,
      padding: "12px 14px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
    }}>
      <div style={{
        fontFamily: "Georgia,serif",
        fontWeight: 700,
        fontSize: 11,
        color: C.gold,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        marginBottom: 8,
      }}>
        🔊 Confirming aloud — say yes or no
      </div>
      {items.map(({ label, value }) => (
        <div key={label} style={{
          display: "flex",
          gap: 8,
          fontSize: 12,
          color: C.charcoal,
          marginBottom: 4,
          lineHeight: 1.4,
        }}>
          <span style={{ color: C.muted, flexShrink: 0, width: 80 }}>{label}</span>
          <span style={{ fontWeight: 600 }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

const PULSE_KEYFRAMES = `
@keyframes voicePulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(107,158,114,0.4), 0 4px 20px rgba(0,0,0,0.2); }
  50%       { box-shadow: 0 0 0 8px rgba(107,158,114,0.0), 0 4px 20px rgba(0,0,0,0.2); }
}
`;
