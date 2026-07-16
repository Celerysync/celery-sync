import C from "../lib/colors.js";

export default function ReminderBanner({ reminder, onDismiss, onSnooze }) {
  if (!reminder) return null;

  if (reminder.type === "morning") {
    return (
      <div style={{
        position: "fixed", top: 70, left: 12, right: 12, zIndex: 50,
        background: `linear-gradient(135deg,${C.leaf},${C.sageDark})`,
        borderRadius: 18, padding: "16px 18px",
        boxShadow: "0 8px 32px #00000030",
        color: "#fff",
        animation: "slideDown 0.35s ease",
      }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, marginBottom: 10 }}>
          🌅 Good morning — time for your rhythm
        </div>
        {/* No protocol steps here (compliance) — the user's own rhythm list
            on the Today screen is the plan. */}
        <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.6, marginBottom: 14 }}>
          Your morning items are ready on your Today list — start whenever you're ready.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onDismiss}
            style={{
              flex: 1, padding: "9px", borderRadius: 12,
              background: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.4)",
              color: "#fff", fontFamily: "Georgia,serif", fontSize: 13, cursor: "pointer", fontWeight: 700,
            }}
          >
            Got it — starting now 🌿
          </button>
        </div>
        <style>{`@keyframes slideDown{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      </div>
    );
  }

  if (reminder.type === "snack") {
    return (
      <div style={{
        position: "fixed", top: 70, left: 12, right: 12, zIndex: 50,
        background: `linear-gradient(135deg,#f59e0b,#d97706)`,
        borderRadius: 18, padding: "16px 18px",
        boxShadow: "0 8px 32px #00000030",
        color: "#fff",
        animation: "slideDown 0.35s ease",
      }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
          🍎 Adrenal snack time!
        </div>
        <div style={{ fontSize: 13, opacity: 0.95, marginBottom: 4 }}>
          {reminder.snoozed ? "Snoozed reminder — " : "It's been 1.5 hours — "}time to eat:
        </div>
        <div style={{ fontSize: 16, fontFamily: "Georgia,serif", fontWeight: 700, marginBottom: 14 }}>
          {reminder.snack}
        </div>
        <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 14, lineHeight: 1.5 }}>
          A steady snack through the afternoon supports even energy for the rest of your day.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onDismiss}
            style={{
              flex: 2, padding: "9px", borderRadius: 12,
              background: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.4)",
              color: "#fff", fontFamily: "Georgia,serif", fontSize: 13, cursor: "pointer", fontWeight: 700,
            }}
          >
            Having it now ✓
          </button>
          <button
            onClick={onSnooze}
            style={{
              flex: 1, padding: "9px", borderRadius: 12,
              background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff", fontFamily: "Georgia,serif", fontSize: 12, cursor: "pointer",
            }}
          >
            20 min snooze
          </button>
        </div>
        <style>{`@keyframes slideDown{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      </div>
    );
  }

  return null;
}
