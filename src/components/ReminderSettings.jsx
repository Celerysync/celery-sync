import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { useReminders } from "../hooks/useReminders.js";

function Toggle({ on, onChange, label, desc }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 13, color: C.charcoal, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
      </div>
      <button
        onClick={() => onChange(!on)}
        style={{
          width: 46, height: 26, borderRadius: 13, border: "none",
          background: on ? C.sage : "#d1d5db",
          cursor: "pointer", position: "relative", flexShrink: 0,
          transition: "background 0.2s",
        }}
      >
        <div style={{
          width: 20, height: 20, borderRadius: "50%", background: "#fff",
          position: "absolute", top: 3,
          left: on ? 23 : 3,
          transition: "left 0.2s",
          boxShadow: "0 1px 4px #00000030",
        }} />
      </button>
    </div>
  );
}

export default function ReminderSettings() {
  const { settings, updateSetting } = useReminders();

  return (
    <Card>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 14 }}>
        ⏰ Reminders
      </div>

      <Toggle
        on={settings.morningProtocol}
        onChange={(v) => updateSetting("morningProtocol", v)}
        label="Morning protocol reminder"
        desc="Reminds you at the right time each morning — lemon water, celery juice, HMDS in sequence"
      />
      <Toggle
        on={settings.adrenalSnack}
        onChange={(v) => updateSetting("adrenalSnack", v)}
        label="Adrenal snack reminder"
        desc="Every 1.5 hours during the day — keeps blood sugar stable and adrenals supported"
      />
      <Toggle
        on={settings.supplements}
        onChange={(v) => updateSetting("supplements", v)}
        label="Supplement reminders"
        desc="Coming soon — will remind you based on your specific condition protocols"
      />

      <div style={{ marginTop: 10, fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
        Reminders appear as banners within the app. For background notifications when the app is closed, install CelerySync to your home screen (tap Share → Add to Home Screen on iPhone).
      </div>
    </Card>
  );
}
