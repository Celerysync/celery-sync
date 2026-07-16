import { useState } from "react";
import C from "../lib/colors.js";
import { TODAY } from "../lib/rhythmSchedule.js";
import { useVoice } from "../hooks/useVoice.js";
import { useHumeVoiceOrchestrator } from "../context/HumeVoiceContext.jsx";

// Spec §4 evening reflection (3–5 min): what got done (from the ledger, via
// the same sequence the Rhythm screen renders) → how the body felt → one
// line saved to the journal. Descriptive only — it reports the user's own
// logged day back to them and never interprets it.

const FEEL_LEVELS = [1, 2, 3, 4, 5];

function buildWrapUp(userName, items) {
  const doneItems = items.filter((i) => i.completedAt);
  const total = items.length;
  const name = userName ? `, ${userName}` : "";
  if (total === 0) {
    return `Good evening${name}. Nothing was on your rhythm today. This is a lovely moment to pause anyway — how did your body feel today?`;
  }
  if (doneItems.length === 0) {
    return `Good evening${name}. Today didn't go to plan, and that's okay — tomorrow is a fresh start. How did your body feel today?`;
  }
  const shown = doneItems.slice(0, 5).map((i) => i.name).join(", ");
  const listing = doneItems.length > 5 ? `${shown}, and ${doneItems.length - 5} more` : shown;
  return `Good evening${name}. You completed ${doneItems.length} of ${total} today: ${listing}. However today went, you showed up. How did your body feel?`;
}

export default function EveningReflection({ user, sequence, todaysCheckin, saveCheckin, prefs }) {
  const today = TODAY();
  const markerKey = `cs_evening_flow_${today}`;
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(markerKey));
  const [step, setStep] = useState("invite"); // invite → feel → done
  const [energy, setEnergy] = useState(todaysCheckin?.energy ?? null);
  const [reflectionDraft, setReflectionDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const { speak, speaking, stopSpeaking } = useVoice(prefs.voice_id || "");
  const companion = useHumeVoiceOrchestrator();

  const h = new Date().getHours();
  if (dismissed || !prefs.evening_nudge || h < 19) return null;

  const wrapUp = buildWrapUp(user?.name, sequence);

  const finish = () => {
    localStorage.setItem(markerKey, "1");
    stopSpeaking();
  };

  const begin = () => {
    setStep("feel");
    speak(wrapUp);
  };

  const saveReflection = async () => {
    setSaving(true);
    const line = reflectionDraft.trim();
    const notes = line
      ? (todaysCheckin?.notes ? `${todaysCheckin.notes}\n${line}` : line)
      : todaysCheckin?.notes;
    await saveCheckin({
      ...todaysCheckin,
      ...(energy != null ? { energy } : {}),
      ...(notes != null ? { notes } : {}),
    });
    setSaving(false);
    setStep("done");
  };

  const talkItThrough = async () => {
    finish();
    setDismissed(true);
    companion.openSheet();
    try {
      await companion.connect(
        "The user just finished their evening reflection. Keep it short and calm — it's the end of their day. Ask if there's anything they'd like to talk through before winding down."
      );
    } catch {
      // Companion unavailable (cap reached / not configured) — the sheet shows why.
    }
  };

  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.plum}18, ${C.cream})`,
      border: `1.5px solid ${C.plum}44`,
      borderRadius: 20, padding: "16px 18px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.sageDark }}>
          🌙 Evening reflection
        </div>
        <button
          onClick={() => { finish(); setDismissed(true); }}
          aria-label="Dismiss evening reflection"
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, color: C.muted, padding: "0 2px" }}
        >
          ✕
        </button>
      </div>

      {step === "invite" && (
        <>
          <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.5, margin: "8px 0 12px" }}>
            A quiet minute to close the day — hear how it went and note how you're feeling.
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

      {step === "feel" && (
        <>
          <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.6, margin: "8px 0 4px" }}>
            {wrapUp}
          </div>
          {speaking && (
            <button
              onClick={stopSpeaking}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: C.muted, padding: 0, marginBottom: 4 }}
            >
              ⏹ Stop audio
            </button>
          )}
          <div style={{ fontSize: 12, color: C.muted, margin: "10px 0 6px" }}>Energy today</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {FEEL_LEVELS.map((lvl) => (
              <button
                key={lvl}
                onClick={() => setEnergy(lvl)}
                aria-label={`Energy ${lvl} of 5`}
                style={{
                  width: 40, height: 40, borderRadius: 12, cursor: "pointer",
                  border: `1.5px solid ${energy === lvl ? C.sage : C.border}`,
                  background: energy === lvl ? C.sageLight : C.white,
                  fontSize: 14, fontWeight: energy === lvl ? 700 : 400, color: C.charcoal,
                }}
              >
                {lvl}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>One line about today (saved to your journal)</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={reflectionDraft}
              onChange={(e) => setReflectionDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveReflection(); }}
              placeholder="How did today feel?"
              maxLength={200}
              style={{
                flex: 1, padding: "9px 12px", borderRadius: 12,
                border: `1.5px solid ${C.border}`, fontSize: 13,
                color: C.charcoal, fontFamily: "Georgia,serif",
              }}
            />
            <button
              onClick={saveReflection}
              disabled={saving}
              style={{
                padding: "9px 16px", borderRadius: 12, border: "none",
                background: C.sage, color: C.white,
                fontFamily: "Georgia,serif", fontSize: 12, fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {saving ? "…" : "Save"}
            </button>
          </div>
        </>
      )}

      {step === "done" && (
        <>
          <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.6, margin: "8px 0 12px" }}>
            Saved. Rest well tonight{user?.name ? `, ${user.name}` : ""}. 🌙
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
