import C from "../lib/colors.js";
import { Card, Btn } from "./ui.jsx";
import { useReminders } from "../hooks/useReminders.js";
import { useWebPush } from "../hooks/useWebPush.js";

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

export default function ReminderSettings({ authUser }) {
  const { settings, updateSetting } = useReminders();
  const { supported, permission, subscribed, loading, error, subscribe, unsubscribe } = useWebPush(authUser);

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

      {/* Push notifications */}
      <div style={{ paddingTop: 14, marginTop: 2 }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.charcoal, marginBottom: 4 }}>
          🔔 Background notifications
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
          Get healing reminders even when the app is closed — lemon water, celery juice, adrenal snacks, and evening wind-down. Works best when you add CelerySync to your home screen.
        </div>

        {!supported ? (
          <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>
            Push notifications aren't supported in this browser. Add to Home Screen on iPhone first (Share → Add to Home Screen).
          </div>
        ) : permission === "denied" ? (
          <div style={{ fontSize: 12, color: C.terracotta, lineHeight: 1.5 }}>
            Notifications are blocked. Open your browser settings and allow notifications for this site, then come back here.
          </div>
        ) : subscribed ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 12, color: C.sage, fontWeight: 700 }}>
              ✓ Background notifications active
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>
              You'll receive healing reminders at: 6am (lemon water), 7am (celery juice), 8am (HMDS), 10am / 12pm / 2pm / 4pm (snacks), 7pm (evening)
            </div>
            <button
              onClick={unsubscribe}
              disabled={loading}
              style={{
                background: "none", border: `1px solid ${C.border}`, borderRadius: 20,
                padding: "6px 14px", fontSize: 12, color: C.muted, cursor: "pointer",
                fontFamily: "Georgia,serif", width: "fit-content",
              }}
            >
              {loading ? "Turning off…" : "Turn off background notifications"}
            </button>
          </div>
        ) : (
          <Btn full onClick={subscribe} color={C.sage} disabled={loading}>
            {loading ? "Setting up…" : "🔔 Enable Background Notifications"}
          </Btn>
        )}

        {error && (
          <div style={{ marginTop: 8, fontSize: 12, color: C.terracotta }}>{error}</div>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
        In-app reminders appear as banners when the app is open. Background notifications work when the app is closed — best installed as a home screen app.
      </div>
    </Card>
  );
}
