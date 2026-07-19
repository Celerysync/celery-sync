import { useState, useEffect } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { useVoicePrefs } from "../context/VoiceContext.jsx";
import { useVoice } from "../hooks/useVoice.js";

const PREVIEW_LINE =
  "Hello — I'm your CelerySync companion. I'm here whenever you'd like a hand with your day.";

// Same visual toggle as ReminderSettings' — each settings card keeps its own
// copy by repo convention.
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

// Spec §2.5 + §3.4 — the user's companion voice, its optional name, and the
// morning/evening TTS nudge toggles. Voice options are the curated CelerySync
// set from /api/hume/voices (Octave) — the app is Hume-only since 2026-07-19.
export default function CompanionVoiceSettings({ authUser }) {
  const { voicePrefs: prefs, voicePrefsLoaded: loaded, saveVoicePrefs: savePrefs } = useVoicePrefs();
  const [topupBusy, setTopupBusy] = useState(false);
  const [topupMsg, setTopupMsg] = useState("");
  const [humeVoices, setHumeVoices] = useState([]);
  const [nameDraft, setNameDraft] = useState(null); // null = not editing, show saved value
  const { speak, speaking, stopSpeaking } = useVoice(prefs.voice_id || "");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/hume/voices")
      .then((r) => (r.ok ? r.json() : { voices: [] }))
      .then(({ voices }) => { if (!cancelled) setHumeVoices(voices || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!loaded) return null;

  const hasVoice = !!prefs.voice_id;

  return (
    <Card>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.sageDark, marginBottom: 4 }}>
        🎙 Companion voice
      </div>
      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 12 }}>
        Choose the voice for your morning greeting, gentle reminders, and evening wrap-up.
      </div>

      {/* Voice picker */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <select
          value={prefs.voice_id || ""}
          onChange={(e) => savePrefs({ voice_id: e.target.value || null })}
          style={{
            flex: 1, padding: "10px 12px", borderRadius: 12,
            border: `1.5px solid ${C.border}`, background: C.white,
            fontSize: 13, color: C.charcoal, fontFamily: "Georgia,serif",
          }}
        >
          <option value="">Default voice</option>
          {humeVoices.length > 0 && (
            <optgroup label="CelerySync voices">
              {humeVoices.map((v) => (
                <option key={v.id} value={`hume:${v.provider}:${v.id}`}>{v.name}</option>
              ))}
            </optgroup>
          )}
        </select>
        <button
          onClick={() => (speaking ? stopSpeaking() : speak(PREVIEW_LINE))}
          disabled={!hasVoice}
          style={{
            padding: "10px 14px", borderRadius: 12, border: "none",
            background: hasVoice ? C.sage : "#d1d5db", color: C.white,
            fontFamily: "Georgia,serif", fontSize: 12, fontWeight: 700,
            cursor: hasVoice ? "pointer" : "default", flexShrink: 0,
          }}
        >
          {speaking ? "⏹ Stop" : "▶ Preview"}
        </button>
      </div>

      {/* Companion name */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 13, color: C.charcoal, fontWeight: 600, marginBottom: 6 }}>
          Companion name <span style={{ fontWeight: 400, color: C.muted }}>(optional)</span>
        </div>
        <input
          value={nameDraft ?? prefs.companion_name ?? ""}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => {
            if (nameDraft !== null && nameDraft.trim() !== (prefs.companion_name || "")) {
              savePrefs({ companion_name: nameDraft.trim() || null });
            }
            setNameDraft(null);
          }}
          placeholder="e.g. Fern"
          maxLength={40}
          style={{
            width: "100%", boxSizing: "border-box", padding: "10px 12px",
            borderRadius: 12, border: `1.5px solid ${C.border}`,
            fontSize: 13, color: C.charcoal, fontFamily: "Georgia,serif",
          }}
        />
      </div>

      <Toggle
        on={prefs.morning_nudge}
        onChange={(v) => savePrefs({ morning_nudge: v })}
        label="Morning check-in & daytime reminders"
        desc="A spoken good-morning with today's rhythm, plus a gentle voice note when a scheduled item comes due."
      />
      <Toggle
        on={prefs.evening_nudge}
        onChange={(v) => savePrefs({ evening_nudge: v })}
        label="Evening reflection"
        desc="A short spoken wrap-up of your day and a moment to note how you're feeling."
      />

      {/* Voice minute top-up — Stripe one-off payment; minutes are credited
          by the webhook only after payment confirms, never by the client. */}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.charcoal, fontFamily: "Georgia,serif", marginBottom: 4 }}>
          Voice minutes
        </div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 10 }}>
          Your plan's voice minutes refresh each month. Running low? Add a one-off top-up —
          it's applied to your account as soon as payment completes.
        </div>
        <button
          onClick={async () => {
            setTopupBusy(true);
            try {
              const res = await fetch("/api/stripe/topup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: authUser?.id, email: authUser?.email }),
              });
              const { url, error } = await res.json();
              if (url) window.location.href = url;
              else setTopupMsg(error || "Top-up isn't available right now.");
            } catch {
              setTopupMsg("Couldn't reach the payment server — try again in a moment.");
            }
            setTopupBusy(false);
          }}
          disabled={topupBusy}
          style={{
            background: C.sageDark, color: "#fff", border: "none", borderRadius: 20,
            padding: "9px 18px", fontFamily: "Georgia,serif", fontWeight: 700,
            fontSize: 12.5, cursor: "pointer", opacity: topupBusy ? 0.6 : 1,
          }}
        >
          {topupBusy ? "Opening checkout…" : "＋ Top up voice minutes"}
        </button>
        {topupMsg && (
          <div style={{ fontSize: 12, color: C.terracotta, marginTop: 8 }}>{topupMsg}</div>
        )}
      </div>
    </Card>
  );
}
