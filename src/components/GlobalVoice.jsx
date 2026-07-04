import { useState, useEffect, useRef } from "react";
import C from "../lib/colors.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { callClaude } from "../lib/api.js";
import { useVoiceOrchestrator } from "../context/VoiceContext.jsx";

const TAB_CONTEXT = {
  home:        "The user is on the Today/Home tab — daily protocol, morning routine, supplement checklist, healing streak.",
  companion:   "The user is on the Companion tab — their AI healing companion for conversation, protocol guidance, and questions.",
  track:       "The user is on the Track tab — logging daily check-in (energy, mood, celery juice, symptoms) or exploring how they feel with support from Anthony William's teachings.",
  progress:    "The user is on the Progress tab — reviewing their healing progress, energy trends, celery juice streaks, and supplement history.",
  supplements: "The user is on the Supplements tab — tracking today's supplements or shopping for Anthony William's recommended Vimergy supplements via iHerb.",
  learn:       "The user is on the Learn tab — reading plain-English explanations of Medical Medium protocols, condition explainers, recipes, juices, and resources from Anthony William's public teachings.",
  settings:    "The user is on the Settings tab — subscription, reminders, profiles, carer management, and account details.",
};

// Short, speakable ambient guidance — a different tone/length than
// TAB_CONTEXT above, which is a system-prompt description for the Q&A
// assistant, not meant to be read aloud verbatim. Only covers the tabs
// GlobalVoice actually renders on (home/track/companion have their own
// dedicated voice UI already).
const AMBIENT_GUIDANCE = {
  progress:    "This is Progress — your energy, symptoms, and adherence over time, plus a shareable PDF for your GP.",
  supplements: "This is Supplements — track today's doses, and set up restock reminders so you never run out.",
  learn:       "This is Learn — plain-English explanations in our own words, with links to the official teachings.",
  settings:    "This is Settings — reminders, your subscription, and profile details all live here.",
};

export default function GlobalVoice({ currentTab, user }) {
  const [enabled] = useLocalStorage("cs_globalVoice", true);
  const [lang] = useLocalStorage("cs_lang", "en");
  const [units] = useLocalStorage("cs_units", "metric");
  const { listening, speaking, speak, stopSpeaking, startListening, stopListening, audioUnlocked } = useVoiceOrchestrator();

  const [open, setOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [srError, setSrError] = useState(false);

  // Speaks each tab's ambient guidance once per session — not every single
  // visit, which would get old fast.
  const spokenTabsRef = useRef(new Set());
  useEffect(() => {
    if (!enabled || !audioUnlocked || lang !== "en") return;
    const line = AMBIENT_GUIDANCE[currentTab];
    if (!line || spokenTabsRef.current.has(currentTab)) return;
    spokenTabsRef.current.add(currentTab);
    speak(line);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab, enabled, audioUnlocked]);

  // Intake tabs (home, track, companion) have their own VoiceIntakeButton —
  // GlobalVoice is the Q&A assistant for the remaining tabs only.
  if (!enabled || currentTab === "home" || currentTab === "track" || currentTab === "companion") return null;

  const close = () => {
    stopSpeaking();
    stopListening();
    setOpen(false);
    setTranscript("");
    setReply("");
    setLoading(false);
    setSrError(false);
  };

  const handleMicTap = () => {
    if (speaking) { stopSpeaking(); return; }
    if (listening) { stopListening(); return; }

    setTranscript("");
    setReply("");
    setSrError(false);
    setOpen(true);

    startListening(async (text) => {
      setTranscript(text);
      setLoading(true);
      const tabCtx = TAB_CONTEXT[currentTab] || "";
      const langRule = lang && lang !== "en"
        ? `Respond ENTIRELY in language code "${lang}" as a fluent native speaker. Do not translate from English — think directly in the language.`
        : "";
      const unitRule = units === "metric"
        ? `Use metric measurements: 500ml not 16oz, 1 litre not 32oz.`
        : `Use imperial measurements as Anthony William publishes them.`;

      const system = `You are a warm, calm CelerySync companion — a guide for adults following Medical Medium (Anthony William) protocols.
${tabCtx}
Answer the user's voice question concisely (2-4 sentences max) — this will be spoken aloud.
Start with a very short opener of 2-4 words so the voice starts immediately.
${unitRule}
${langRule}
Paraphrase Anthony William's publicly shared teachings and always attribute them to him. For specific amounts or full protocols, point to his books or medicalmedium.com — never state yourself as the dosing authority. Never diagnose or claim to treat, cure, or heal any condition. This is not medical advice.`;

      try {
        const result = await callClaude({ system, messages: [{ role: "user", content: text }], tier: "quick", maxTokens: 300 });
        const clean = (result || "").replace(/\*\*/g, "").replace(/[*_`#•]/g, "").trim();
        setReply(clean);
        setLoading(false);
        speak(clean);
      } catch {
        setLoading(false);
        setReply("Sorry, something went wrong. Please try again.");
      }
    }, () => setSrError(true));
  };

  const isActive = listening || speaking || loading;

  return (
    <>
      {/* Floating mic button */}
      <button
        onClick={open ? (isActive ? handleMicTap : close) : handleMicTap}
        aria-label="Voice assistant"
        style={{
          position: "fixed",
          bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
          right: 16,
          width: 48,
          height: 48,
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          background: speaking ? C.gold : listening ? C.sage : C.sageDark,
          color: C.white,
          fontSize: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isActive
            ? `0 0 0 6px ${C.sage}44, 0 4px 20px rgba(0,0,0,0.25)`
            : "0 4px 20px rgba(0,0,0,0.2)",
          transition: "background 0.2s, box-shadow 0.2s",
          zIndex: 200,
        }}
      >
        {speaking ? "🔊" : listening ? "👂" : loading ? "⏳" : "🎙"}
      </button>

      {/* Overlay panel */}
      {open && (
        <div style={{
          position: "fixed",
          bottom: "calc(140px + env(safe-area-inset-bottom, 0px))",
          right: 16,
          width: "min(320px, calc(100vw - 32px))",
          background: C.white,
          borderRadius: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          padding: "16px 18px",
          zIndex: 200,
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.sageDark }}>
              🌿 AI Guide — {TAB_NAMES[currentTab] || currentTab}
            </div>
            <button onClick={close} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.muted, padding: "0 2px" }}>✕</button>
          </div>

          {/* Status */}
          {srError && (
            <div style={{ fontSize: 13, color: C.terracotta, lineHeight: 1.6, padding: "4px 0 8px" }}>
              Voice input isn't available in Safari. For mic access, install CelerySync to your Home Screen (Share → Add to Home Screen), or use the AI Guide tab to type your question.
            </div>
          )}
          {!srError && listening && !transcript && (
            <div style={{ color: C.sage, fontSize: 13, fontFamily: "Georgia,serif", textAlign: "center", padding: "8px 0" }}>
              <span style={{ display: "inline-block", animation: "pulse 1.2s infinite" }}>👂</span> Listening…
            </div>
          )}
          {transcript && (
            <div style={{ background: C.cream, borderRadius: 10, padding: "8px 12px", marginBottom: 8, fontSize: 13, color: C.charcoal }}>
              <span style={{ fontSize: 10, color: C.muted, display: "block", marginBottom: 2 }}>You said</span>
              {transcript}
            </div>
          )}
          {loading && (
            <div style={{ color: C.sageDark, fontSize: 13, fontFamily: "Georgia,serif", textAlign: "center", padding: "8px 0" }}>
              🌿 Thinking…
            </div>
          )}
          {reply && (
            <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.5, marginBottom: 10 }}>
              {reply}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            {!listening && !loading && (
              <button
                onClick={handleMicTap}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 50, border: "none", cursor: "pointer",
                  background: C.sage, color: C.white,
                  fontFamily: "Georgia,serif", fontSize: 12, fontWeight: 700,
                }}
              >
                {reply ? "🎙 Ask again" : "🎙 Tap to speak"}
              </button>
            )}
            {speaking && (
              <button
                onClick={stopSpeaking}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 50, border: "none", cursor: "pointer",
                  background: C.gold, color: C.white,
                  fontFamily: "Georgia,serif", fontSize: 12, fontWeight: 700,
                }}
              >
                ⏹ Stop speaking
              </button>
            )}
            {listening && (
              <button
                onClick={stopListening}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 50, border: "none", cursor: "pointer",
                  background: "#e57373", color: C.white,
                  fontFamily: "Georgia,serif", fontSize: 12, fontWeight: 700,
                }}
              >
                ⏹ Stop listening
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const TAB_NAMES = {
  home: "Today", journal: "Journal", recipes: "Recipes",
  juices: "Juices", cleanses: "Cleanses", symptoms: "Symptoms",
  reports: "Reports", learn: "Learn", knowledge: "Resources",
  body: "The Body", community: "Circles", carers: "Carers",
  practice: "Practice", aw: "Support AW", account: "Account",
};
