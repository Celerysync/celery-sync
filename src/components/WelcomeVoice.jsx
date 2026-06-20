import { useState, useEffect, useRef, useCallback } from "react";
import C from "../lib/colors.js";
import { ELEVENLABS_VOICES } from "../hooks/useVoice.js";
import { callClaude } from "../lib/api.js";

const LANGUAGES = [
  { code: "en", label: "English",    native: "English"    },
  { code: "es", label: "Spanish",    native: "Español"    },
  { code: "pt", label: "Portuguese", native: "Português"  },
  { code: "fr", label: "French",     native: "Français"   },
  { code: "de", label: "German",     native: "Deutsch"    },
  { code: "it", label: "Italian",    native: "Italiano"   },
  { code: "nl", label: "Dutch",      native: "Nederlands" },
  { code: "pl", label: "Polish",     native: "Polski"     },
  { code: "zh", label: "Chinese",    native: "中文"        },
  { code: "ja", label: "Japanese",   native: "日本語"      },
  { code: "ko", label: "Korean",     native: "한국어"      },
  { code: "ar", label: "Arabic",     native: "العربية"    },
  { code: "hi", label: "Hindi",      native: "हिन्दी"      },
  { code: "ru", label: "Russian",    native: "Русский"    },
  { code: "tr", label: "Turkish",    native: "Türkçe"     },
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
  "You're in exactly the right place. I'm here for you. Feel free to ask me anything — I'm listening.";

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

const DEFAULT_VOICE_ID = "el:EXAVITQu4vr4xnSDxMaL";

// Inject keyframe animations once
const STYLE = `
  @keyframes cs-mic-glow {
    0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.5); }
    50%      { box-shadow: 0 0 0 18px rgba(255,255,255,0); }
  }
  @keyframes cs-pulse {
    0%,100% { opacity: 0.7; transform: scale(1); }
    50%      { opacity: 1;   transform: scale(1.03); }
  }
  @keyframes cs-spin {
    to { transform: rotate(360deg); }
  }
`;

export default function WelcomeVoice({ userId, onDone }) {
  const savedVoice = localStorage.getItem("cs_voiceName") || DEFAULT_VOICE_ID;
  const savedLang  = localStorage.getItem("cs_lang")      || "en";

  const [selectedVoice, setSelectedVoice] = useState(savedVoice);
  const [selectedLang,  setSelectedLang]  = useState(savedLang);
  const [phase,     setPhase]     = useState("loading");
  const [userText,  setUserText]  = useState("");
  const [aiText,    setAiText]    = useState("");

  const audioRef       = useRef(null);
  const preloadUrlRef  = useRef(null);
  const recogRef       = useRef(null);
  const interimRef     = useRef("");
  const idleTimerRef   = useRef(null);
  const loadGenRef     = useRef(0);

  // Stable refs so callbacks don't go stale
  const voiceRef = useRef(selectedVoice);
  const langRef  = useRef(selectedLang);
  useEffect(() => { voiceRef.current = selectedVoice; }, [selectedVoice]);
  useEffect(() => { langRef.current  = selectedLang;  }, [selectedLang]);

  // ── Dismiss ──────────────────────────────────────────────────────────────
  const dismiss = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    localStorage.setItem("cs_voiceName", voiceRef.current);
    localStorage.setItem("cs_lang",      langRef.current);
    if (userId) localStorage.setItem(`cs_welcomed_${userId}`, "1");
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    window.speechSynthesis?.cancel();
    recogRef.current?.stop();
    onDone();
  }, [userId, onDone]);

  const startIdleTimer = useCallback((ms) => {
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(dismiss, ms);
  }, [dismiss]);

  // ── Play a URL ────────────────────────────────────────────────────────────
  const playUrl = useCallback((url, onEnded) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const audio = new Audio(url);
    audioRef.current = audio;
    const handleEnd = () => { audioRef.current = null; onEnded?.(); };
    audio.onended = handleEnd;
    audio.onerror = handleEnd; // still call onEnded so the flow continues
    const p = audio.play();
    if (p) {
      p.then(() => setPhase("playing")).catch(() => {
        // Autoplay blocked — store URL and wait for user gesture
        audioRef.current = null;
        preloadUrlRef.current = url;
        setPhase("waiting");
      });
    } else {
      setPhase("playing");
    }
  }, []);

  // ── Browser TTS fallback (when ElevenLabs credits exhausted) ────────────
  const browserSpeak = useCallback((text, onDone) => {
    window.speechSynthesis?.cancel();
    const chunks = text.match(/.{1,200}(?:[.!?,\s]|$)/g) ?? [text];
    setPhase("playing");
    let i = 0;
    const next = () => {
      if (i >= chunks.length) { onDone?.(); return; }
      const u = new SpeechSynthesisUtterance(chunks[i++]);
      u.rate = 0.88;
      u.pitch = 1.08;
      const voices = window.speechSynthesis.getVoices();
      u.voice = voices.find(v =>
        v.name.includes("Samantha") || v.name.includes("Karen") || v.name.includes("Moira")
      ) ?? null;
      u.onend  = next;
      u.onerror = next;
      window.speechSynthesis.speak(u);
    };
    setTimeout(next, 100);
  }, []);

  // ── After welcome plays ───────────────────────────────────────────────────
  const afterWelcome = useCallback(() => {
    setPhase("mic");
    startIdleTimer(12000);
  }, [startIdleTimer]);

  // ── Load + auto-play welcome on mount / when voice or language changes ────
  useEffect(() => {
    const gen = ++loadGenRef.current;
    setPhase("loading");
    preloadUrlRef.current = null;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }

    const load = async () => {
      let text = WELCOME_TEXT_EN;
      try {
        if (selectedLang !== "en") {
          const langLabel = LANGUAGES.find(l => l.code === selectedLang)?.label || selectedLang;
          text = await callClaude({
            system: `Adapt this welcome message for a Medical Medium healing app into natural ${langLabel}. Keep names like "Anthony William", "Medical Medium", supplement names (spirulina, celery juice, etc.) in their original form. Match the warmth and flow of the original.`,
            messages: [{ role: "user", content: `Adapt into ${langLabel}:\n\n${WELCOME_TEXT_EN}` }],
            tier: "quick",
            maxTokens: 600,
          }) || WELCOME_TEXT_EN;
        }
        if (gen !== loadGenRef.current) return;

        const voiceId = selectedVoice.startsWith("el:")
          ? selectedVoice.slice(3)
          : DEFAULT_VOICE_ID.slice(3);

        const res = await fetch("/api/elevenlabs/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voiceId }),
        });
        if (gen !== loadGenRef.current) return;
        if (!res.ok) throw new Error("elevenlabs unavailable");
        const { url } = await res.json();
        if (gen !== loadGenRef.current) return;

        playUrl(url, afterWelcome);
      } catch {
        if (gen !== loadGenRef.current) return;
        // ElevenLabs failed (out of credits or network) — fall back to browser TTS
        if (window.speechSynthesis) {
          browserSpeak(text, afterWelcome);
        } else {
          setPhase("error");
        }
      }
    };

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVoice, selectedLang]);

  // ── When autoplay is blocked, play on first user gesture ─────────────────
  useEffect(() => {
    if (phase !== "waiting") return;
    const url = preloadUrlRef.current;
    if (!url) return;
    const handle = () => playUrl(url, afterWelcome);
    document.addEventListener("touchstart", handle, { once: true, passive: true });
    document.addEventListener("click",      handle, { once: true });
    return () => {
      document.removeEventListener("touchstart", handle);
      document.removeEventListener("click",      handle);
    };
  }, [phase, playUrl, afterWelcome]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => () => {
    clearTimeout(idleTimerRef.current);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    window.speechSynthesis?.cancel();
    recogRef.current?.stop();
  }, []);

  // ── Speech recognition ────────────────────────────────────────────────────
  const startListening = () => {
    clearTimeout(idleTimerRef.current);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { dismiss(); return; }

    setPhase("listening");
    setUserText("");
    interimRef.current = "";

    const r = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.lang = selectedLang === "en" ? "en-US" : selectedLang;

    r.onresult = (e) => {
      const t = Array.from(e.results).map(x => x[0].transcript).join("");
      interimRef.current = t;
      setUserText(t);
    };
    r.onend = () => {
      const text = interimRef.current.trim();
      if (text) sendToAI(text);
      else setPhase("mic");
    };
    r.onerror = () => setPhase("mic");
    recogRef.current = r;
    r.start();
  };

  // ── AI reply ──────────────────────────────────────────────────────────────
  const sendToAI = async (text) => {
    setPhase("thinking");
    setAiText("");
    let reply = "";
    try {
      reply = await callClaude({
        system: "You are the CelerySync healing guide. The user just heard your welcome introduction and is asking their first question before entering the app. Answer warmly in 2-3 sentences using Anthony William / Medical Medium principles. Be specific and encouraging. End by inviting them to explore the app.",
        messages: [{ role: "user", content: text }],
        tier: "quick",
        maxTokens: 180,
      });
      if (!reply) { setPhase("mic"); return; }
      setAiText(reply);
      setPhase("replying");

      const voiceId = voiceRef.current.startsWith("el:")
        ? voiceRef.current.slice(3)
        : DEFAULT_VOICE_ID.slice(3);

      const res = await fetch("/api/elevenlabs/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: reply, voiceId }),
      });
      if (!res.ok) throw new Error("speak failed");
      const { url } = await res.json();

      playUrl(url, () => {
        setPhase("mic");
        startIdleTimer(15000);
      });
    } catch {
      // ElevenLabs failed — fall back to browser TTS if we have a reply
      if (reply && window.speechSynthesis) {
        setAiText(reply);
        setPhase("replying");
        browserSpeak(reply, () => {
          setPhase("mic");
          startIdleTimer(15000);
        });
      } else {
        setPhase("mic");
        startIdleTimer(12000);
      }
    }
  };

  // ── Derived flags ─────────────────────────────────────────────────────────
  const inChat = ["mic", "listening", "thinking", "replying"].includes(phase);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: `linear-gradient(160deg, ${C.sageDark} 0%, ${C.leaf} 60%, ${C.gold}33 100%)`,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px 20px",
      overflowY: "auto",
    }}>
      <style>{STYLE}</style>

      <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>

        {/* Logo */}
        <div style={{ fontSize: 56, marginBottom: 8 }}>🌿</div>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 26, color: C.white, marginBottom: 4 }}>
          Welcome to CelerySync
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 24 }}>
          Your Medical Medium healing companion
        </div>

        {/* ── Pre-chat: feature list + settings ─────────────────────────────── */}
        {!inChat && (
          <>
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

            {/* Language + voice pickers (side by side) */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <select
                value={selectedLang}
                onChange={e => setSelectedLang(e.target.value)}
                style={{
                  flex: 1, fontFamily: "Georgia,serif", fontSize: 12,
                  color: C.charcoal, background: C.white,
                  border: "none", borderRadius: 8, padding: "8px 10px",
                  cursor: "pointer",
                }}
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.native}</option>
                ))}
              </select>
              <select
                value={selectedVoice}
                onChange={e => setSelectedVoice(e.target.value)}
                style={{
                  flex: 1, fontFamily: "Georgia,serif", fontSize: 12,
                  color: C.charcoal, background: C.white,
                  border: "none", borderRadius: 8, padding: "8px 10px",
                  cursor: "pointer",
                }}
              >
                {ELEVENLABS_VOICES.map(v => (
                  <option key={v.id} value={v.id}>{v.name.split(" —")[0]}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            {phase === "loading" && (
              <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, fontFamily: "Georgia,serif", marginBottom: 16, padding: 12 }}>
                <span style={{
                  display: "inline-block", width: 16, height: 16,
                  border: "2px solid rgba(255,255,255,0.4)",
                  borderTopColor: C.white,
                  borderRadius: "50%",
                  animation: "cs-spin 0.8s linear infinite",
                  marginRight: 8, verticalAlign: "middle",
                }} />
                Preparing your welcome…
              </div>
            )}

            {phase === "waiting" && (
              <div style={{
                color: C.white, fontSize: 15, fontFamily: "Georgia,serif",
                marginBottom: 16, padding: 14,
                animation: "cs-pulse 2s ease-in-out infinite",
              }}>
                🎙 Tap anywhere to hear your welcome
              </div>
            )}

            {phase === "playing" && (
              <div style={{ color: C.white, fontSize: 14, fontFamily: "Georgia,serif", marginBottom: 16, padding: 12 }}>
                🎙 Your welcome is playing…
              </div>
            )}

            {phase === "error" && (
              <div style={{
                background: "rgba(255,255,255,0.15)", borderRadius: 12,
                padding: "12px 16px", marginBottom: 16,
                color: "rgba(255,255,255,0.9)", fontSize: 13, fontFamily: "Georgia,serif",
              }}>
                Voice unavailable — tap below to enter the app
              </div>
            )}
          </>
        )}

        {/* ── Chat phase ────────────────────────────────────────────────────── */}
        {inChat && (
          <div style={{ marginBottom: 24 }}>

            {/* User's spoken words */}
            {userText && (
              <div style={{
                background: "rgba(255,255,255,0.15)", borderRadius: 12,
                padding: "12px 16px", marginBottom: 10,
                color: C.white, fontSize: 13, fontFamily: "Georgia,serif",
                textAlign: "left", lineHeight: 1.5,
              }}>
                <span style={{ opacity: 0.6, fontSize: 11 }}>You said:</span><br />
                {userText}
              </div>
            )}

            {/* AI reply text */}
            {aiText && (
              <div style={{
                background: "rgba(255,255,255,0.22)", borderRadius: 12,
                padding: "14px 16px", marginBottom: 20,
                color: C.white, fontSize: 13, fontFamily: "Georgia,serif",
                textAlign: "left", lineHeight: 1.65,
              }}>
                {aiText}
              </div>
            )}

            {/* Pulsing mic */}
            {phase === "mic" && (
              <>
                <button
                  onClick={startListening}
                  style={{
                    width: 84, height: 84, borderRadius: "50%",
                    background: C.white, border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 10px",
                    fontSize: 34,
                    animation: "cs-mic-glow 2s ease-in-out infinite",
                  }}
                >
                  🎙
                </button>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontFamily: "Georgia,serif", marginBottom: 20 }}>
                  Ask me anything about healing
                </div>
              </>
            )}

            {/* Active listening */}
            {phase === "listening" && (
              <>
                <div style={{
                  width: 84, height: 84, borderRadius: "50%",
                  background: "rgba(220,60,60,0.85)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 10px", fontSize: 34,
                  animation: "cs-mic-glow 0.8s ease-in-out infinite",
                }}>
                  🎙
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontFamily: "Georgia,serif", marginBottom: 4 }}>
                  Listening…
                </div>
                {userText && (
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", fontStyle: "italic", marginBottom: 20 }}>
                    "{userText}"
                  </div>
                )}
              </>
            )}

            {/* Thinking */}
            {phase === "thinking" && (
              <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, fontFamily: "Georgia,serif", marginBottom: 20, padding: 16 }}>
                🌿 Thinking…
              </div>
            )}

            {/* AI speaking */}
            {phase === "replying" && (
              <div style={{ color: C.white, fontSize: 14, fontFamily: "Georgia,serif", marginBottom: 20, padding: 16 }}>
                🎙 Speaking…
              </div>
            )}
          </div>
        )}

        {/* ── Always-visible dismiss ────────────────────────────────────────── */}
        <button
          onClick={dismiss}
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.35)",
            color: "rgba(255,255,255,0.75)",
            borderRadius: 50,
            padding: "11px 28px",
            cursor: "pointer",
            fontFamily: "Georgia,serif",
            fontSize: 13,
            width: "100%",
          }}
        >
          {inChat ? "Enter App →" : phase === "playing" ? "Skip & Enter App" : "Skip — Enter App"}
        </button>
      </div>
    </div>
  );
}
