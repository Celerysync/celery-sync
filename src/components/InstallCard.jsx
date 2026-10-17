import C from "../lib/colors.js";
import { useInstallPrompt } from "../hooks/useInstallPrompt.js";

// Shown wherever installing matters. On Chrome this is a one-tap native
// install; on iOS the browser gives us no prompt to trigger, so the manual
// steps are the only option — and there they are not optional, since web
// push on iOS only works from an installed app.
export default function InstallCard({ onDismiss, compact = false }) {
  const { installed, canPrompt, isIOS, promptInstall } = useInstallPrompt();

  if (installed || (!canPrompt && !isIOS)) return null;

  return (
    <div style={{
      background: C.sageLight,
      border: `1.5px solid ${C.sage}40`,
      borderRadius: 16,
      padding: compact ? "12px 14px" : "16px 18px",
      position: "relative",
    }}>
      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            position: "absolute", top: 8, right: 10,
            background: "none", border: "none", cursor: "pointer",
            color: C.muted, fontSize: 16, lineHeight: 1, padding: 4,
          }}
        >
          ✕
        </button>
      )}

      <div style={{
        fontFamily: "Georgia,serif", fontWeight: 700,
        fontSize: compact ? 14 : 15, color: C.charcoal, marginBottom: 6,
        paddingRight: onDismiss ? 20 : 0,
      }}>
        📲 Add CelerySync to your home screen
      </div>

      <div style={{ fontSize: 12.5, color: C.mid, lineHeight: 1.6, marginBottom: 12 }}>
        {isIOS
          ? "On iPhone, reminders can only reach you once CelerySync is on your home screen. It takes about ten seconds:"
          : "It opens full screen like a normal app, works offline, and makes your reminders far more reliable."}
      </div>

      {isIOS ? (
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: C.charcoal, lineHeight: 1.9 }}>
          <li>Tap the <strong>Share</strong> button at the bottom of Safari</li>
          <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
          <li>Tap <strong>Add</strong>, then open CelerySync from your home screen</li>
        </ol>
      ) : (
        <button
          onClick={promptInstall}
          style={{
            background: C.sageDark, color: C.white, border: "none",
            borderRadius: 30, padding: "10px 22px",
            fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13.5,
            cursor: "pointer",
          }}
        >
          Install CelerySync
        </button>
      )}
    </div>
  );
}
