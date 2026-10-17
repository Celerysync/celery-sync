import { useState } from "react";
import C from "../lib/colors.js";
import { Card, Btn } from "./ui.jsx";
import { useReminders } from "../hooks/useReminders.js";
import { useWebPush } from "../hooks/useWebPush.js";
import { useEncouragementPrefs } from "../hooks/useEncouragementPrefs.js";

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
          width: 46, height: 44, borderRadius: 13, border: "none",
          background: "transparent",
          cursor: "pointer", position: "relative", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 0,
        }}
      >
        <div style={{
          width: 46, height: 26, borderRadius: 13,
          background: on ? C.sage : "#d1d5db",
          position: "relative", transition: "background 0.2s",
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: "50%", background: "#fff",
            position: "absolute", top: 3,
            left: on ? 23 : 3,
            transition: "left 0.2s",
            boxShadow: "0 1px 4px #00000030",
          }} />
        </div>
      </button>
    </div>
  );
}

// Kept to sensible daytime/evening ranges — no scheduling into quiet hours
const AFTERNOON_HOURS = [
  { value: 13, label: "1:00 pm" },
  { value: 14, label: "2:00 pm" },
  { value: 15, label: "3:00 pm (default)" },
  { value: 16, label: "4:00 pm" },
  { value: 17, label: "5:00 pm" },
];
const EVENING_HOURS = [
  { value: 18, label: "6:00 pm" },
  { value: 19, label: "7:00 pm" },
  { value: 20, label: "8:00 pm (default)" },
  { value: 21, label: "9:00 pm" },
  { value: 22, label: "10:00 pm" },
];

function EncouragementWindowRow({ label, desc, window, hourOptions, prefs, updateWindow }) {
  const win = prefs[window] || { enabled: true, hour: hourOptions[0].value };
  return (
    <div style={{ marginBottom: 14 }}>
      <Toggle
        on={win.enabled}
        onChange={(v) => updateWindow(window, { enabled: v })}
        label={label}
        desc={desc}
      />
      {win.enabled && (
        <select
          value={win.hour}
          onChange={(e) => updateWindow(window, { hour: Number(e.target.value) })}
          style={{
            border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 12px",
            fontSize: 13, color: C.charcoal, background: "#fff",
            fontFamily: "Georgia,serif", cursor: "pointer", width: "100%", marginTop: 8,
          }}
        >
          {hourOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}

export default function ReminderSettings({ authUser }) {
  const { settings, updateSetting } = useReminders(authUser);
  const { supported, permission, subscribed, loading, error, subscribe, unsubscribe, sendTest } = useWebPush(authUser);
  const { prefs: encouragementPrefs, updateWindow: updateEncouragementWindow } = useEncouragementPrefs(authUser, subscribed);
  const [testSending, setTestSending] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const handleSendTest = async () => {
    setTestSending(true);
    setTestSent(false);
    await sendTest();
    setTestSending(false);
    setTestSent(true);
    setTimeout(() => setTestSent(false), 4000);
  };

  const handleSubscribe = () => subscribe();

  return (
    <Card>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 14 }}>
        ⏰ Reminders
      </div>

      <Toggle
        on={settings.morningProtocol}
        onChange={(v) => updateSetting("morningProtocol", v)}
        label="Morning check-in banner"
        desc="A gentle nudge in the app each morning to start your rhythm"
      />
      <Toggle
        on={settings.adrenalSnack}
        onChange={(v) => updateSetting("adrenalSnack", v)}
        label="Snack break banner"
        desc="An in-app prompt every 1.5 hours through the day, with a simple pairing idea"
      />

      {/* Push notifications */}
      <div style={{ paddingTop: 14, marginTop: 2 }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.charcoal, marginBottom: 4 }}>
          🔔 Background notifications
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
          Get reminders even when the app is closed. Each reminder comes from your own
          Daily Rhythm — set a time on any item and you'll be nudged then. Works best
          when you add CelerySync to your home screen.
        </div>

        <div style={{
          fontSize: 11, color: C.mid, lineHeight: 1.6, marginBottom: 14,
          background: C.mist, borderRadius: 10, padding: "10px 12px",
        }}>
          💡 To add or change a reminder time, open <strong>My Rhythm</strong>, edit an
          item, and choose <strong>“At a set time”</strong>.
        </div>

        {!supported ? (
          <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>
            Push notifications aren't supported in this browser. On iPhone, add CelerySync
            to your Home Screen first (Share → Add to Home Screen), then come back. On
            Android, try Chrome or your browser's latest version.
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
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleSendTest}
                disabled={testSending}
                style={{
                  background: "none", border: `1px solid ${C.sage}`, borderRadius: 20,
                  padding: "6px 14px", fontSize: 12, color: C.sageDark, cursor: "pointer",
                  fontFamily: "Georgia,serif", width: "fit-content",
                }}
              >
                {testSending ? "Sending…" : testSent ? "✓ Sent — check your notifications" : "Send test notification"}
              </button>
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
          </div>
        ) : (
          <Btn full onClick={handleSubscribe} color={C.sage} disabled={loading}>
            {loading ? "Setting up…" : "🔔 Enable Background Notifications"}
          </Btn>
        )}

        {error && (
          <div style={{ marginTop: 8, fontSize: 12, color: C.terracotta }}>{error}</div>
        )}
      </div>

      {subscribed && (
        <div style={{ paddingTop: 14, marginTop: 14, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.charcoal, marginBottom: 4 }}>
            💬 Gentle check-ins
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
            A short, personal check-in twice a day based on how things are actually going for you — never a task list, always optional.
          </div>
          <EncouragementWindowRow
            label="Afternoon check-in"
            desc="A gentle mid-afternoon nudge"
            window="afternoon"
            hourOptions={AFTERNOON_HOURS}
            prefs={encouragementPrefs}
            updateWindow={updateEncouragementWindow}
          />
          <EncouragementWindowRow
            label="Evening check-in"
            desc="A calm, no-pressure wind-down check-in"
            window="evening"
            hourOptions={EVENING_HOURS}
            prefs={encouragementPrefs}
            updateWindow={updateEncouragementWindow}
          />
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
        In-app reminders appear as banners when the app is open. Background notifications work when the app is closed — best installed as a home screen app.
      </div>
    </Card>
  );
}
