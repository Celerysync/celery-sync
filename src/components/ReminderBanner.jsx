import C from "../lib/colors.js";

export default function ReminderBanner({ reminder, onDismiss }) {
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


  return null;
}
