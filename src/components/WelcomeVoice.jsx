import { useState, useRef } from "react";
import C from "../lib/colors.js";
import { ELEVENLABS_VOICES } from "../hooks/useVoice.js";
import { callClaude } from "../lib/api.js";

const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "fr", label: "French", native: "Français" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "it", label: "Italian", native: "Italiano" },
  { code: "nl", label: "Dutch", native: "Nederlands" },
  { code: "pl", label: "Polish", native: "Polski" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "ar", label: "Arabic", native: "العربية" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "ru", label: "Russian", native: "Русский" },
  { code: "tr", label: "Turkish", native: "Türkçe" },
];

const WELCOME_TEXT_EN =
  "Welcome to CelerySync — your personal Medical Medium healing companion. I'm so glad you're here. " +
  "Let me give you a quick tour. " +
  "Your Today tab is your daily home — morning protocol, supplement tracker, and healing reminders. " +
  "The AI Guide is where we talk. Press the microphone and speak to me — I'll respond and then automatically listen for your next question, so our conversation flows hands-free. " +
  "The Symptom Checker helps you understand what your body is communicating and how to heal it, with exact supplement protocols for 100 conditions. " +
  "Recipes gives you 50 healing meals, juices, shots, and a full meal planner with a shopping list. " +
  "Cleanses walks you through Anthony William's full cleanse protocols step by step, including the 3-6-9. " +
  "The Body tab lets you explore each organ — liver, thyroid, brain, kidneys, skin and more — and understand what Anthony William teaches about healing each one. " +
  "Healing Circles connects you anonymously with others healing the same conditions — a real community on the same path. " +
  "And My Books is your secret weapon — upload any Medical Medium book and I'll draw on it personally in every single answer. " +
  "You're in exactly the right place. Whenever you're ready, let's begin your healing journey together.";

const STEPS = [
  { emoji: "🏠", label: "Today",      desc: "Daily home — morning protocol, supplement tracker & reminders" },
  { emoji: "🎙", label: "AI Guide",   desc: "Talk hands-free — mic auto-listens after every reply" },
  { emoji: "🔍", label: "Symptoms",   desc: "100 conditions with exact supplement protocols" },
  { emoji: "🍽", label: "Recipes",    desc: "50 healing meals, juices, shots & meal planner" },
  { emoji: "🌿", label: "Cleanses",   desc: "Full step-by-step Anthony William protocols" },
  { emoji: "🫁", label: "The Body",   desc: "Explore each organ — liver, thyroid, kidneys & more" },
  { emoji: "💚", label: "Circles",    desc: "Anonymous community — people healing the same conditions" },
  { emoji: "📖", label: "My Books",   desc: "Upload your MM books — I'll reference them in every answer" },
];

const DEFAULT_VOICE_ID = "el:EXAVITQu4vr4xnSDxMaL"; // Sarah

export default function WelcomeVoice({ onDone }) {
  const savedVoice = localStorage.getItem("cs_voiceName") || DEFAULT_VOICE_ID;
  const savedLang = localStorage.getItem("cs_lang") || "en";

  const [selectedVoice, setSelectedVoice] = useState(savedVoice);
  const [selectedLang, setSelectedLang] = useState(savedLang);
  const [phase, setPhase] = useState("idle"); // idle | loading | playing
  const audioRef = useRef(null);

  const saveAndDismiss = () => {
    localStorage.setItem("cs_voiceName", selectedVoice);
    localStorage.setItem("cs_lang", selectedLang);
    localStorage.setItem("cs_welcomed", "1");
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    onDone();
  };

  const handleVoiceChange = (e) => {
    const v = e.target.value;
    setSelectedVoice(v);
    localStorage.setItem("cs_voiceName", v);
  };

  const handleLangChange = (e) => {
    const l = e.target.value;
    setSelectedLang(l);
    localStorage.setItem("cs_lang", l);
  };

  const getWelcomeText = async () => {
    if (selectedLang === "en") return WELCOME_TEXT_EN;
    const langLabel = LANGUAGES.find(l => l.code === selectedLang)?.label || selectedLang;
    const result = await callClaude({
      system: `You are adapting a welcome message for a Medical Medium healing app into ${langLabel}. Write it as a warm, native ${langLabel} speaker would — not a direct translation. Keep it natural and flowing. Keep "Anthony William", "Medical Medium", "3-6-9", supplement names (spirulina, celery juice, etc.) in their original form. Keep the same structure and warmth.`,
      prompt: `Adapt this welcome message into natural ${langLabel}:\n\n${WELCOME_TEXT_EN}`,
      tier: "quick",
      maxTokens: 600,
    });
    return result || WELCOME_TEXT_EN;
  };

  const play = async () => {
    setPhase("loading");
    const voiceId = selectedVoice.startsWith("el:") ? selectedVoice.slice(3) : "EXAVITQu4vr4xnSDxMaL";
    try {
      const text = await getWelcomeText();
      const res = await fetch("/api/elevenlabs/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId }),
      });
      if (!res.ok) throw new Error("audio error");
      const { url } = await res.json();
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = saveAndDismiss;
      audio.onerror = saveAndDismiss;
      setPhase("playing");
      audio.play().catch(saveAndDismiss);
    } catch {
      saveAndDismiss();
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: `linear-gradient(160deg, ${C.sageDark} 0%, ${C.leaf} 60%, ${C.gold}33 100%)`,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 20px",
      overflowY: "auto",
    }}>
      <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
        {/* Logo */}
        <div style={{ fontSize: 56, marginBottom: 8 }}>🌿</div>
        <div style={{
          fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 26,
          color: C.white, marginBottom: 4,
        }}>
          Welcome to CelerySync
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 24 }}>
          Your Medical Medium healing companion
        </div>

        {/* Feature list */}
        <div style={{
          background: "rgba(255,255,255,0.12)", borderRadius: 16,
          padding: "16px 20px", marginBottom: 16, textAlign: "left",
        }}>
          {STEPS.map((s, i) => (
            <div key={s.label} style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              padding: "8px 0",
              borderBottom: i < STEPS.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none",
            }}>
              <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{s.emoji}</span>
              <div>
                <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.white }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.4 }}>
                  {s.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Language picker */}
        <div style={{
          background: "rgba(255,255,255,0.12)", borderRadius: 12,
          padding: "12px 16px", marginBottom: 12, textAlign: "left",
        }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontFamily: "Georgia,serif", marginBottom: 8 }}>
            🌏 Your language
          </div>
          <select
            value={selectedLang}
            onChange={handleLangChange}
            style={{
              width: "100%", fontFamily: "Georgia,serif", fontSize: 13,
              color: C.charcoal, background: C.white,
              border: "none", borderRadius: 8, padding: "8px 10px",
              outline: "none", cursor: "pointer",
            }}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.native} — {l.label}</option>
            ))}
          </select>
        </div>

        {/* Voice picker */}
        <div style={{
          background: "rgba(255,255,255,0.12)", borderRadius: 12,
          padding: "12px 16px", marginBottom: 20, textAlign: "left",
        }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontFamily: "Georgia,serif", marginBottom: 8 }}>
            🎙 Choose your companion's voice
          </div>
          <select
            value={selectedVoice}
            onChange={handleVoiceChange}
            style={{
              width: "100%", fontFamily: "Georgia,serif", fontSize: 13,
              color: C.charcoal, background: C.white,
              border: "none", borderRadius: 8, padding: "8px 10px",
              outline: "none", cursor: "pointer",
            }}
          >
            {ELEVENLABS_VOICES.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        {/* Action buttons */}
        {phase === "idle" && (
          <button
            onClick={play}
            style={{
              width: "100%", padding: "16px 24px", borderRadius: 50,
              border: "none", cursor: "pointer",
              background: C.white, color: C.sageDark,
              fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16,
              boxShadow: "0 4px 24px rgba(0,0,0,0.2)", marginBottom: 14,
            }}
          >
            🎙 Hear My Welcome{selectedLang !== "en" ? ` in ${LANGUAGES.find(l => l.code === selectedLang)?.native}` : ""}
          </button>
        )}

        {phase === "loading" && (
          <div style={{
            color: "rgba(255,255,255,0.8)", fontSize: 14,
            fontFamily: "Georgia,serif", marginBottom: 14, padding: 16,
          }}>
            🌿 {selectedLang !== "en" ? "Preparing your welcome in your language…" : "Preparing your welcome…"}
          </div>
        )}

        {phase === "playing" && (
          <div style={{
            color: C.white, fontSize: 14,
            fontFamily: "Georgia,serif", marginBottom: 14, padding: 16,
          }}>
            🎙 Speaking… your tour has begun
          </div>
        )}

        <button
          onClick={saveAndDismiss}
          style={{
            background: "transparent", border: "1px solid rgba(255,255,255,0.35)",
            color: "rgba(255,255,255,0.7)", borderRadius: 50,
            padding: "10px 28px", cursor: "pointer",
            fontFamily: "Georgia,serif", fontSize: 13, width: "100%",
          }}
        >
          {phase === "playing" ? "Skip & Enter App" : "Skip — Enter App"}
        </button>
      </div>
    </div>
  );
}
