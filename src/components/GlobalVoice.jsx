import { useState, useRef } from "react";
import C from "../lib/colors.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { useVoice, srSupported } from "../hooks/useVoice.js";
import { callClaude } from "../lib/api.js";
import { cleanForSpeech } from "../lib/ttsClean.js";
import { useVoicePrefs } from "../context/VoiceContext.jsx";

const TAB_CONTEXT = {
  home:      "The user is on the Today/Home tab — daily protocol, morning routine, supplement checklist, healing streak.",
  journal:   "The user is on the Journal tab — they may want to reflect, log symptoms, or get journaling prompts.",
  recipes:   "The user is on the Recipes tab — healing foods, juices, smoothies, meal planner, shopping list.",
  juices:    "The user is on the Juices tab — fresh juices, celery juice, liver rescue shots, and healing drink protocols from Anthony William.",
  cleanses:  "The user is on the Cleanses tab — 3:6:9, Heavy Metal Detox, and other Anthony William cleanse protocols.",
  symptoms:  "The user is on the Symptom Checker tab — looking up symptoms, conditions, and protocol guidance.",
  reports:   "The user is on the Reports tab — reviewing their healing progress, energy trends, celery juice streaks, and supplement history.",
  learn:     "The user is on the Learn tab — reading plain-English explanations of Medical Medium protocols, condition explainers, and shareable cards from Anthony William's public teachings.",
  knowledge: "The user is on the Resources tab — links to Anthony William's official books, YouTube, and podcast.",
  body:      "The user is on the Body tab — exploring organs like liver, thyroid, brain, kidneys, and what Anthony William teaches about each.",
  community: "The user is on the Healing Circles tab — connecting with others following the same protocols.",
  carers:    "The user is on the Carers tab — supporting someone else's healing journey with Medical Medium protocols.",
  practice:  "The user is on the Practice tab — practitioner tools for supporting clients following Medical Medium protocols.",
  aw:        "The user is on the Support AW tab — Anthony William official content and support.",
  account:   "The user is on the Account tab — subscription, settings, profile.",
};

export default function GlobalVoice({ currentTab, user }) {
  const [enabled] = useLocalStorage("cs_globalVoice", true);
  const [lang] = useLocalStorage("cs_lang", "en");
  const [units] = useLocalStorage("cs_units", "metric");
  const { voiceName } = useVoicePrefs();
  const { listening, speaking, speak, stopSpeaking, startListening, stopListening } = useVoice(voiceName, units === "imperial" ? "imperial" : "metric");

  const [open, setOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [srError, setSrError] = useState(false);

  // Don't show on coach tab — it already has full voice
  if (!enabled || currentTab === "coach") return null;

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
