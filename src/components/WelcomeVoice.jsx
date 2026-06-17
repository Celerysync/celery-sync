import { useState, useRef } from "react";
import C from "../lib/colors.js";
import { ELEVENLABS_VOICES } from "../hooks/useVoice.js";

const WELCOME_TEXT =
  "Welcome to CelerySync — your personal Medical Medium healing companion. I'm so glad you're here. " +
  "Let me give you a quick tour. " +
  "Your Today tab is your daily home — morning protocol, symptoms, and reminders. " +
  "The AI Guide is where we talk. Press the microphone and speak to me — I'll respond and then automatically listen for your next question, so our conversation flows hands-free. " +
  "The Symptom Checker helps you understand what your body is communicating and how to heal it. " +
  "Recipes gives you healing meals, juices, and shots. " +
  "Cleanses walks you through Anthony William's full cleanse protocols step by step. " +
  "And My Books is your secret weapon — upload any Medical Medium book and I'll draw on it personally in every single answer. " +
  "You're in exactly the right place. Whenever you're ready, let's begin your healing journey together.";

const STEPS = [
  { emoji: "🏠", label: "Today",      desc: "Daily home — morning protocol, symptoms & reminders" },
  { emoji: "🎙", label: "AI Guide",   desc: "Talk hands-free — mic auto-listens after every reply" },
  { emoji: "🔍", label: "Symptoms",   desc: "Understand & heal what your body is communicating" },
  { emoji: "🍽", label: "Recipes",    desc: "Healing meals, juices & shots" },
  { emoji: "🌿", label: "Cleanses",   desc: "Full step-by-step Anthony William protocols" },
  { emoji: "📖", label: "My Books",   desc: "Upload your MM books — I'll reference them in every answer" },
];

const DEFAULT_VOICE_ID = "el:EXAVITQu4vr4xnSDxMaL"; // Sarah

export default function WelcomeVoice({ onDone }) {
  const saved = localStorage.getItem("cs_voiceName") || DEFAULT_VOICE_ID;
  const [selectedVoice, setSelectedVoice] = useState(saved);
  const [phase, setPhase] = useState("idle"); // idle | loading | playing
  const audioRef = useRef(null);

  const saveVoiceAndDismiss = () => {
    localStorage.setItem("cs_voiceName", selectedVoice);
    localStorage.setItem("cs_welcomed", "1");
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    onDone();
  };

  const handleVoiceChange = (e) => {
    const v = e.target.value;
    setSelectedVoice(v);
    localStorage.setItem("cs_voiceName", v);
  };

  const play = async () => {
    setPhase("loading");
    const voiceId = selectedVoice.startsWith("el:") ? selectedVoice.slice(3) : "EXAVITQu4vr4xnSDxMaL";
    try {
      const res = await fetch("/api/elevenlabs/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: WELCOME_TEXT, voiceId }),
      });
      if (!res.ok) throw new Error("audio error");
      const { url } = await res.json();
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = saveVoiceAndDismiss;
      audio.onerror = saveVoiceAndDismiss;
      setPhase("playing");
      audio.play().catch(saveVoiceAndDismiss);
    } catch {
      saveVoiceAndDismiss();
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
          padding: "16px 20px", marginBottom: 20, textAlign: "left",
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

        {/* Voice picker */}
        <div style={{
          background: "rgba(255,255,255,0.12)", borderRadius: 12,
          padding: "12px 16px", marginBottom: 20, textAlign: "left",
        }}>
          <div style={{
            fontSize: 12, color: "rgba(255,255,255,0.8)",
            fontFamily: "Georgia,serif", marginBottom: 8,
          }}>
            Choose your companion's voice
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
            🎙 Hear My Welcome
          </button>
        )}

        {phase === "loading" && (
          <div style={{
            color: "rgba(255,255,255,0.8)", fontSize: 14,
            fontFamily: "Georgia,serif", marginBottom: 14, padding: 16,
          }}>
            🌿 Preparing your welcome…
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
          onClick={saveVoiceAndDismiss}
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
