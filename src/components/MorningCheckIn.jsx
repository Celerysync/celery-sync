import { useState } from "react";
import C from "../lib/colors.js";
import { TODAY } from "../lib/rhythmSchedule.js";
import { useVoice } from "../hooks/useVoice.js";
import { useHumeVoiceOrchestrator } from "../context/HumeVoiceContext.jsx";

// Spec §4 morning check-in (2–3 min): greeting → today's rhythm preview →
// one intention. Mostly TTS, with an optional EVI follow-up. The preview is
// built ONLY from the user's own item titles (compliance: the app never
// supplies protocol content of its own).

const INTENTION_CHIPS = [
  "A gentle pace",
  "Stay hydrated",
  "Rest when I need it",
  "One thing at a time",
];

function buildGreeting(userName, items) {
  const names = items.map((i) => i.name);
  const shown = names.slice(0, 5).join(", ");
  const preview = names.length === 0
    ? "You haven't added anything to today's rhythm yet — you can add your own items whenever you're ready."
    : names.length <= 5
    ? `Here's your rhythm for today: ${shown}.`
    : `Here's your rhythm for today: ${shown}, and ${names.length - 5} more.`;
  return `Good morning${userName ? ", " + userName : ""}. ${preview} Take it gently — one thing at a time. What's one intention you'd like to carry into today?`;
}

export default function MorningCheckIn({ user, sequence, todaysCheckin, saveCheckin, prefs }) {
  const today = TODAY();
  const markerKey = `cs_morning_flow_${today}`;
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(markerKey));
  const [step, setStep] = useState("invite"); // invite → intention → done
  const [intentionDraft, setIntentionDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const { speak, speaking, stopSpeaking } = useVoice(prefs.voice_id || "");
  const companion = useHumeVoiceOrchestrator();

  const h = new Date().getHours();
  if (dismissed || !prefs.morning_nudge || h < 5 || h >= 12) return null;

  const greeting = buildGreeting(user?.name, sequence);

  const finish = () => {
    localStorage.setItem(markerKey, "1");
    stopSpeaking();
  };

  const begin = () => {
    setStep("intention");
    speak(greeting);
  };

  const saveIntention = async (text) => {
    const line = `Intention: ${text}`;
    setSaving(true);
    const notes = todaysCheckin?.notes ? `${todaysCheckin.notes}\n${line}` : line;
    await saveCheckin({ ...todaysCheckin, notes });
    setSaving(false);
    setStep("done");
  };

  const talkItThrough = async () => {
    finish();
    setDismissed(true);
    companion.openSheet();
    try {
      await companion.connect(
        "The user just finished their morning check-in and set an intention for the day. Greet them briefly and ask how they'd like to start."
      );
    } catch {
      // Companion unavailable (cap reached / not configured) — the sheet shows why.
    }
  };

  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.gold}22, ${C.cream})`,
      border: `1.5px solid ${C.gold}55`,
      borderRadius: 20, padding: "16px 18px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.sageDark }}>
          🌅 Morning check-in
        </div>
        <button
          onClick={() => { finish(); setDismissed(true); }}
          aria-label="Dismiss morning check-in"
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, color: C.muted, padding: "0 2px" }}
        >
          ✕
        </button>
      </div>

      {step === "invite" && (
        <>
          <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.5, margin: "8px 0 12px" }}>
            A minute to hear today's rhythm and set one intention.
          </div>
          <button
            onClick={begin}
            style={{
              padding: "9px 18px", borderRadius: 50, border: "none", cursor: "pointer",
              background: C.sage, color: C.white,
              fontFamily: "Georgia,serif", fontSize: 13, fontWeight: 700,
            }}
          >
            🔊 Begin
          </button>
        </>
      )}

      {step === "intention" && (
        <>
          <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.6, margin: "8px 0 4px" }}>
            {greeting}
          </div>
          {speaking && (
            <button
              onClick={stopSpeaking}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: C.muted, padding: 0, marginBottom: 4 }}
            >
              ⏹ Stop audio
            </button>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0" }}>
            {INTENTION_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => saveIntention(chip)}
                disabled={saving}
                style={{
                  padding: "6px 12px", borderRadius: 50, cursor: "pointer",
                  border: `1.5px solid ${C.sage}66`, background: C.white,
                  fontFamily: "Georgia,serif", fontSize: 12, color: C.sageDark,
                }}
              >
                {chip}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={intentionDraft}
              onChange={(e) => setIntentionDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && intentionDraft.trim()) saveIntention(intentionDraft.trim()); }}
              placeholder="…or your own words"
              maxLength={120}
              style={{
                flex: 1, padding: "9px 12px", borderRadius: 12,
                border: `1.5px solid ${C.border}`, fontSize: 13,
                color: C.charcoal, fontFamily: "Georgia,serif",
              }}
            />
            <button
              onClick={() => intentionDraft.trim() && saveIntention(intentionDraft.trim())}
              disabled={saving || !intentionDraft.trim()}
              style={{
                padding: "9px 16px", borderRadius: 12, border: "none",
                background: intentionDraft.trim() ? C.sage : "#d1d5db", color: C.white,
                fontFamily: "Georgia,serif", fontSize: 12, fontWeight: 700,
                cursor: intentionDraft.trim() ? "pointer" : "default",
              }}
            >
              {saving ? "…" : "Set"}
            </button>
          </div>
        </>
      )}

      {step === "done" && (
        <>
          <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.6, margin: "8px 0 12px" }}>
            Lovely — intention set. Have a gentle day. 🌿
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {companion.enabled && (
              <button
                onClick={talkItThrough}
                style={{
                  padding: "9px 16px", borderRadius: 50, border: "none", cursor: "pointer",
                  background: C.sage, color: C.white,
                  fontFamily: "Georgia,serif", fontSize: 12, fontWeight: 700,
                }}
              >
                🎙 Talk it through
              </button>
            )}
            <button
              onClick={() => { finish(); setDismissed(true); }}
              style={{
                padding: "9px 16px", borderRadius: 50, cursor: "pointer",
                border: `1.5px solid ${C.border}`, background: C.white,
                fontFamily: "Georgia,serif", fontSize: 12, color: C.charcoal,
              }}
            >
              Done
            </button>
          </div>
        </>
      )}
    </div>
  );
}
