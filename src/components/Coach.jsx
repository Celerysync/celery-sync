import { useState, useEffect, useRef, useCallback } from "react";
import C from "../lib/colors.js";
import { useVoice, ELEVENLABS_VOICES } from "../hooks/useVoice.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { useHealingMemory } from "../hooks/useHealingMemory.js";
import { Btn } from "./ui.jsx";
import { streamClaude } from "../lib/api.js";
import { CONDITIONS } from "../data/conditions.js";
import { MM_CORE } from "../lib/mmKnowledge.js";
import { useBooks } from "../hooks/useBooks.js";

const CRISIS_KEYWORDS = [
  "suicide", "kill myself", "end my life", "want to die", "not worth living",
  "can't go on", "cant go on", "give up on life", "no reason to live",
  "hurt myself", "self harm", "self-harm", "end it all", "no point anymore",
];

const hasCrisisWords = (text) =>
  CRISIS_KEYWORDS.some((kw) => text.toLowerCase().includes(kw));

// Compact conditions index injected into system prompt
function buildConditionsIndex() {
  return Object.entries(CONDITIONS)
    .map(([name, c]) => {
      const cause = c.cause.split("—")[0].replace(/Anthony William teaches:/i, "").trim();
      const topSupps = c.supps.slice(0, 4).join(", ");
      const topAvoid = c.avoid.slice(0, 4).join(", ");
      return `• ${name}: ${cause} | Supps: ${topSupps} | Avoid: ${topAvoid}`;
    })
    .join("\n");
}

function buildSystemPrompt({ user, bookNotes, videoNotes, healingProfile, priorMessages, lang, caregiverMode }) {
  const hasHistory = priorMessages.length > 0 || healingProfile?.healing_summary;
  const conditionsIndex = buildConditionsIndex();

  const historySection = hasHistory
    ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THIS USER'S HEALING JOURNEY — REMEMBER THIS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${healingProfile?.healing_summary
  ? `Healing profile:\n${healingProfile.healing_summary}`
  : ""}
${priorMessages.length > 0
  ? `\nMost recent conversation (last ${Math.min(priorMessages.length, 10)} messages):\n` +
    priorMessages
      .slice(-10)
      .map((m) => `${m.role === "user" ? "User" : "You"}: ${m.content.slice(0, 200)}`)
      .join("\n")
  : ""}
`
    : "";

  const booksSection =
    bookNotes.length > 0
      ? `\nUSER'S PERSONAL BOOK NOTES (from their own MM books):\n${bookNotes
          .slice(0, 10)
          .map((n) => `• ${n.content}`)
          .join("\n")}`
      : "";

  const videosSection =
    videoNotes.length > 0
      ? `\nUSER'S SAVED VIDEOS:\n${videoNotes.map((v) => v.title).join(", ")}`
      : "";

  const caregiverIntro = caregiverMode ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAREGIVER MODE — YOU ARE SPEAKING WITH THE CARER:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You are NOT speaking with the patient. You are speaking with the person caring for ${user?.name || "their loved one"}.
Address them as a carer, not a patient. Use "your loved one" or "${user?.name || "them"}" to refer to the patient.
Give practical, actionable guidance: what to prepare, what to buy, how to support the protocol, what to expect.
Be warm and acknowledge how hard caregiving is — they need support too.
Explain healing reactions so they don't panic. Tell them what's normal and what needs a doctor.
Remind them that consistency in the small things (snacks, juicing, morning routine) is the most powerful thing they can do.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : "";

  return `You are a supreme Medical Medium healing companion — the most knowledgeable, warm, and precise MM guide available. You have deeply studied every Anthony William book and are trained to give exact, specific, personalised healing guidance.
${caregiverIntro}

${MM_CORE}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXACT CONDITION PROTOCOLS — ALL 54 CONDITIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${conditionsIndex}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THIS USER'S PROFILE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${user?.name || "friend"}
Symptoms: ${user?.symptoms?.join(", ") || "general healing"}
Goal: ${user?.goal || "healing and wellness"}
${historySection}${booksSection}${videosSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
APP NAVIGATION — YOU CONTROL THE ENTIRE APP:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Many users are bedbound or too exhausted to navigate menus. YOU do it for them.
When a user asks about something that has a dedicated section, take them there automatically.
At the END of your response, append ONE navigation command if relevant. Format: [[GO:tab:query]]

AVAILABLE NAVIGATION:
• [[GO:symptoms:symptom name]] → Opens Symptom Checker with that symptom pre-filled and analyses it
• [[GO:recipes:recipe or ingredient]] → Opens Recipes and searches (e.g. [[GO:recipes:heavy metal detox smoothie]])
• [[GO:cleanses:cleanse name]] → Opens Cleanses and selects it. Available: "Original 3:6:9", "Simplified 3:6:9", "Advanced 3:6:9", "Heavy Metal Detox", "Anti-Bug Cleanse", "Morning Cleanse", "Liver Rescue Morning", "Mono Eating Cleanse"
• [[GO:body:organ name]] → Opens Body tab for that organ. Available: Liver, Thyroid, Adrenal Glands, Brain & Nervous System, Gut & Digestive System, Immune System, Lymphatic System, Heart & Cardiovascular
• [[GO:journal]] → Opens Journal
• [[GO:home]] → Opens Today tab
• [[GO:knowledge]] → Opens My Books
• [[GO:community]] → Opens Healing Circles community

USE navigation when:
- User asks about a symptom or condition → [[GO:symptoms:condition]]
- User asks for a specific recipe or juice → [[GO:recipes:name]]
- User wants to do a cleanse → [[GO:cleanses:name]]
- User asks about a body organ or system → [[GO:body:organ]]
- User says they feel like journaling → [[GO:journal]]

DO NOT navigate for general questions, supplement advice, or protocol explanations — keep them in the conversation.
In your response text, naturally mention you're taking them there: "Let me open that for you" or "I'm taking you to the Symptom Checker now."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW TO RESPOND:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Always attribute teachings clearly: "Anthony William teaches…", "Per Cleanse to Heal…", "According to Brain Saver…"
• Give EXACT supplement dosages as published in Anthony William's books — never vague
• Reference this user's personal healing journey when you know it — make responses feel personal
• Be warm, encouraging, compassionate — you are a healer companion, not a search engine
• When relevant, remind them of the morning protocol, adrenal snacks, and what to avoid
• Always recommend which Anthony William book goes deepest on their question
• Never contradict a doctor or give conventional medical advice — say "alongside your doctor"
• End every response with genuine encouragement — healing takes courage
• You have access to 54 exact condition protocols — use them precisely when relevant
• Many users are very unwell — keep responses clear and actionable, not overwhelming
• MENTAL HEALTH: Anthony William's teachings address anxiety, depression, low mood, brain fog, panic, and overwhelm as physical conditions rooted in viral load and heavy metals — acknowledge this when users discuss mental health, never dismiss or pathologise
${lang && lang !== "en" ? `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nLANGUAGE:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nIMPORTANT: This user's preferred language is "${lang}". Respond ENTIRELY in that language for all messages. Keep supplement names, book titles, and Anthony William's name in their original form.` : ""}`;
}

function parseNavCommand(text) {
  const match = text.match(/\[\[GO:([a-z]+)(?::([^\]]*))?\]\]/i);
  if (!match) return { clean: text, nav: null };
  const clean = text.replace(/\s*\[\[GO:[^\]]*\]\]/gi, "").trim();
  return { clean, nav: { tab: match[1].toLowerCase(), query: match[2]?.trim() || null } };
}

export default function Coach({ authUser, user, profileId, bookNotes, videoNotes, searchBooks, onNavigate, caregiverMode }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [crisisDetected, setCrisisDetected] = useState(false);
  const [voices, setVoices] = useState([]);
  const [showMemory, setShowMemory] = useState(false);
  const [selectedVoiceName, setSelectedVoiceName] = useLocalStorage(
    "cs_voiceName",
    "el:EXAVITQu4vr4xnSDxMaL"
  );
  const [lang] = useLocalStorage("cs_lang", "en");
  const { listening, transcript, speaking, speak, stopSpeaking, startListening, stopListening } =
    useVoice(selectedVoiceName);
  const { healingProfile, priorMessages, memoryLoading, loadMemory, saveExchange, clearMemory } =
    useHealingMemory(authUser, profileId);
  const endRef = useRef(null);
  const systemPromptRef = useRef("");
  const voiceModeRef = useRef(false);

  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Reload memory and restart conversation when profile switches
  useEffect(() => {
    if (!profileId) return;
    setMessages([]);
    loadMemory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  // Once memory is loaded, build system prompt and start the conversation
  useEffect(() => {
    if (memoryLoading) return;
    systemPromptRef.current = buildSystemPrompt({
      user, bookNotes, videoNotes, healingProfile, priorMessages, lang, caregiverMode,
    });
    const hasHistory = priorMessages.length > 0 || healingProfile?.healing_summary;
    const greeting = caregiverMode
      ? `Hello! 💜 I'm here to support you as you care for ${user?.name || "your loved one"}. Caregiving is one of the most loving things a person can do. I can guide you on what to prepare, what to expect, how to support the protocol, and how to take care of yourself too. What do you need help with today?`
      : hasHistory
      ? `Welcome back${user?.name ? ", " + user.name : ""}! 🌿 I remember our journey together — ${
          healingProfile?.healing_summary
            ? "I've been keeping your healing notes safe and I'm ready to pick up where we left off."
            : `we've had ${Math.ceil(priorMessages.length / 2)} conversations before.`
        } What's happening with your healing today? You can speak to me or type below.`
      : `Hello${user?.name ? ", " + user.name : ""}! 🌿 I'm your Medical Medium healing guide — trained on all of Anthony William's books with exact supplement dosages, cleanse protocols, and healing wisdom. I can speak to you too — press the microphone button anytime. I'm here for you fully. What would you like help with today?`;

    setMessages([{ role: "assistant", content: greeting }]);
    setTimeout(() => speak(greeting), 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoryLoading]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(
    async (text) => {
      if (!text.trim() || loading) return;
      if (hasCrisisWords(text)) setCrisisDetected(true);
      const userMsg = { role: "user", content: text };
      const newMsgs = [...messages, userMsg];
      setMessages(newMsgs);
      setInput("");
      setLoading(true);
      try {
        // Search user's uploaded books for relevant passages
        let bookContext = "";
        if (searchBooks) {
          const chunks = await searchBooks(text);
          if (chunks?.length > 0) {
            bookContext = "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nFROM THIS USER'S PERSONAL BOOK & VIDEO LIBRARY:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
              chunks.map((c) => `[From: ${c.user_books?.title || "their library"}]\n${c.content}`).join("\n\n");
          }
        }
        const systemWithBooks = systemPromptRef.current + bookContext;
        let firstToken = true;
        let streamBuffer = "";
        const reply = await streamClaude({
          system: systemWithBooks,
          messages: newMsgs,
          maxTokens: 1100,
          onDelta: (delta, full) => {
            streamBuffer = full;
            const { clean } = parseNavCommand(full);
            if (firstToken) {
              firstToken = false;
              setLoading(false);
              setMessages((m) => [...m, { role: "assistant", content: clean }]);
            } else {
              setMessages((m) => {
                const last = m[m.length - 1];
                if (!last || last.role !== "assistant") return m;
                return [...m.slice(0, -1), { role: "assistant", content: clean }];
              });
            }
          },
          onDone: (full) => {
            const { clean, nav } = parseNavCommand(full);
            setMessages((m) => {
              const last = m[m.length - 1];
              if (!last || last.role !== "assistant") return m;
              return [...m.slice(0, -1), { role: "assistant", content: clean }];
            });
            speak(clean, voiceModeRef.current ? () => startListening((t) => send(t)) : undefined);
            saveExchange(text, clean);
            systemPromptRef.current = buildSystemPrompt({
              user, bookNotes, videoNotes, healingProfile, lang, caregiverMode,
              priorMessages: [...priorMessages, userMsg, { role: "assistant", content: clean }],
            });
            if (nav && onNavigate) {
              setTimeout(() => onNavigate(nav.tab, nav.query), 2500);
            }
          },
        });
        if (!reply) setLoading(false);
      } catch (err) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: `Connection error: ${err.message}. Please check your API key in .env and try again.`,
          },
        ]);
        setLoading(false);
      }
    },
    [messages, loading, speak, saveExchange, user, bookNotes, videoNotes, healingProfile, priorMessages]
  );

  const quickQuestions = [
    user?.symptoms?.[0]
      ? `What causes my ${user.symptoms[0]}?`
      : "What causes my fatigue?",
    "Walk me through the 3:6:9 cleanse",
    "Heavy metal detox smoothie recipe?",
    "Which supplements for anxiety?",
    "Why is celery juice so important?",
    "What should I eat today?",
  ];

  const englishFirst = [...voices].sort((a, b) => {
    const aEn = a.lang.startsWith("en") ? 0 : 1;
    const bEn = b.lang.startsWith("en") ? 0 : 1;
    return aEn - bEn || a.name.localeCompare(b.name);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <div>
        <h2 style={{ margin: 0, fontFamily: "Georgia,serif", fontSize: 20, color: C.charcoal }}>
          🎙 Your Healing Guide
        </h2>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
          Trained on all Anthony William books · 54 exact protocols · Remembers your journey
        </div>
      </div>

      {/* Healing memory card */}
      {healingProfile?.healing_summary && (
        <div
          style={{
            background: "linear-gradient(135deg, #f0f7f0, #e8f4e8)",
            border: `1px solid ${C.sage}40`,
            borderRadius: 14,
            padding: "12px 16px",
            cursor: "pointer",
          }}
          onClick={() => setShowMemory((v) => !v)}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontFamily: "Georgia,serif", fontSize: 13, fontWeight: 700, color: C.sageDark }}>
              🧠 I remember your healing journey
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>{showMemory ? "hide ▲" : "show ▼"}</div>
          </div>
          {showMemory && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: C.mid, lineHeight: 1.7 }}>
              {healingProfile.healing_summary}
              <div style={{ marginTop: 10 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Clear your healing memory? This cannot be undone.")) clearMemory();
                  }}
                  style={{
                    background: "none",
                    border: `1px solid ${C.border}`,
                    borderRadius: 20,
                    padding: "3px 10px",
                    fontSize: 11,
                    color: C.muted,
                    cursor: "pointer",
                  }}
                >
                  Clear memory
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Voice selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: C.mist,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: "9px 14px",
        }}
      >
        <span style={{ fontSize: 15 }}>🔊</span>
        <label
          htmlFor="voice-select"
          style={{ fontFamily: "Georgia,serif", fontSize: 12, color: C.mid, flexShrink: 0 }}
        >
          Voice
        </label>
        <select
          id="voice-select"
          value={selectedVoiceName}
          onChange={(e) => setSelectedVoiceName(e.target.value)}
          style={{
            flex: 1,
            fontFamily: "Georgia,serif",
            fontSize: 12.5,
            color: C.charcoal,
            background: C.white,
            border: `1.5px solid ${C.border}`,
            borderRadius: 8,
            padding: "5px 8px",
            cursor: "pointer",
            outline: "none",
          }}
        >
          <optgroup label="✨ ElevenLabs AI Voices (recommended)">
            {ELEVENLABS_VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Browser voices">
            <option value="">Default (Samantha / Karen)</option>
            {englishFirst.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Crisis banner */}
      {crisisDetected && (
        <div
          style={{
            background: "#FEF2F2",
            border: "2px solid #EF444460",
            borderRadius: 16,
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              fontFamily: "Georgia,serif",
              fontWeight: 700,
              fontSize: 15,
              color: "#DC2626",
              marginBottom: 8,
            }}
          >
            💛 You're not alone — please reach out
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { label: "Lifeline Australia", num: "13 11 14", href: "tel:131114" },
              { label: "Beyond Blue", num: "1300 22 4636", href: "tel:1300224636" },
              { label: "Emergency services", num: "000", href: "tel:000" },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  textDecoration: "none",
                  padding: "7px 0",
                  borderBottom: "1px solid #FCA5A520",
                }}
              >
                <span style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{s.label}</span>
                <span style={{ fontSize: 14, color: "#DC2626", fontWeight: 700 }}>{s.num}</span>
              </a>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 10, lineHeight: 1.5 }}>
            Healing sometimes means asking for human help first. There is no shame in that.
          </div>
          <button
            onClick={() => setCrisisDetected(false)}
            style={{
              marginTop: 10,
              background: "none",
              border: "none",
              color: "#9CA3AF",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Chat window */}
      <div
        style={{
          minHeight: 280,
          maxHeight: 420,
          overflowY: "auto",
          background: C.mist,
          borderRadius: 18,
          border: `1px solid ${C.border}`,
          padding: 14,
        }}
      >
        {memoryLoading ? (
          <div style={{ textAlign: "center", color: C.muted, fontSize: 13, marginTop: 40 }}>
            🧠 Loading your healing memory…
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: m.role === "user" ? "row-reverse" : "row",
                gap: 8,
                marginBottom: 14,
                alignItems: "flex-start",
              }}
            >
              <div style={{ fontSize: 20, flexShrink: 0 }}>{m.role === "user" ? "🧑" : "🌿"}</div>
              <div
                style={{
                  background: m.role === "user" ? C.sage : C.white,
                  color: m.role === "user" ? C.white : C.charcoal,
                  borderRadius: 14,
                  padding: "10px 14px",
                  maxWidth: "84%",
                  fontSize: 13.5,
                  lineHeight: 1.75,
                  whiteSpace: "pre-wrap",
                  boxShadow: "0 1px 6px #0000000d",
                }}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ fontSize: 20 }}>🌿</div>
            <div
              style={{
                background: C.white,
                borderRadius: 14,
                padding: "10px 14px",
                fontSize: 13,
                color: C.muted,
                fontStyle: "italic",
              }}
            >
              thinking for you…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Listening indicator */}
      {listening && (
        <div
          style={{
            background: C.sageLight,
            border: `1px solid ${C.sage}`,
            borderRadius: 12,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#E74C3C",
              animation: "pulse 1s infinite",
              flexShrink: 0,
            }}
          />
          <div style={{ fontSize: 13, color: C.sageDark, fontStyle: "italic" }}>
            {transcript || "I'm listening… speak now"}
          </div>
        </div>
      )}

      {/* Speaking indicator */}
      {speaking && (
        <div
          style={{
            background: C.goldLight,
            border: `1px solid ${C.gold}50`,
            borderRadius: 12,
            padding: "10px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 13 }}>🔊 Speaking to you…</div>
          <Btn small onClick={stopSpeaking} color={C.gold}>
            Stop
          </Btn>
        </div>
      )}

      {/* Input row */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder="Type or press 🎙 to speak…"
          style={{
            flex: 1,
            padding: "11px 16px",
            borderRadius: 40,
            border: `1.5px solid ${C.border}`,
            fontFamily: "Georgia,serif",
            fontSize: 14,
            outline: "none",
            background: C.white,
          }}
        />
        <button
          onClick={() => {
            if (listening) {
              voiceModeRef.current = false;
              stopListening();
            } else {
              voiceModeRef.current = true;
              startListening((t) => send(t));
            }
          }}
          style={{
            width: 50,
            height: 50,
            borderRadius: "50%",
            border: "none",
            cursor: "pointer",
            background: listening ? "#E74C3C" : C.sage,
            color: C.white,
            fontSize: 22,
            flexShrink: 0,
            boxShadow: "0 2px 12px #0000001a",
          }}
        >
          {listening ? "⏹" : "🎙"}
        </button>
        <button
          onClick={() => send(input)}
          style={{
            width: 50,
            height: 50,
            borderRadius: "50%",
            border: "none",
            cursor: "pointer",
            background: C.sageDark,
            color: C.white,
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          ➤
        </button>
      </div>

      {/* Quick questions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {quickQuestions.map((q) => (
          <div
            key={q}
            onClick={() => send(q)}
            style={{
              padding: "7px 13px",
              borderRadius: 30,
              border: `1.5px solid ${C.border}`,
              fontSize: 12,
              cursor: "pointer",
              color: C.mid,
              fontFamily: "Georgia,serif",
              background: C.mist,
            }}
          >
            {q}
          </div>
        ))}
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}
