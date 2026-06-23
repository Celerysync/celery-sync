import { useState } from "react";
import C from "../lib/colors.js";
import { useVoice } from "../hooks/useVoice.js";
import { CONDITIONS } from "../data/conditions.js";
import DiscoveryQuiz from "./DiscoveryQuiz.jsx";

function ForkScreen({ onSelect }) {
  return (
    <div style={{
      minHeight: "100dvh",
      background: `linear-gradient(160deg,${C.sageDark} 0%,${C.leaf} 100%)`,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌿</div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 26, color: "#fff", lineHeight: 1.25, marginBottom: 8 }}>
            Welcome to CelerySync
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.65 }}>
            Before we set up your profile, tell us where you're starting from
          </div>
        </div>

        {[
          {
            key: "experienced",
            emoji: "📚",
            title: "I know Anthony William's work",
            sub: "I've read the books, I know the protocols, I just need the tools to track and deepen my practice",
          },
          {
            key: "beginner",
            emoji: "🌱",
            title: "I'm new — or not sure what's wrong",
            sub: "I don't know much about Medical Medium yet, but I'm not feeling well and I want to understand why",
          },
        ].map(opt => (
          <div
            key={opt.key}
            onClick={() => onSelect(opt.key)}
            style={{
              background: "rgba(255,255,255,0.96)",
              borderRadius: 20, padding: "20px 22px",
              marginBottom: 14, cursor: "pointer",
              boxShadow: "0 8px 32px #00000020",
              border: "2px solid transparent",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.sageDark}
            onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <span style={{ fontSize: 32, flexShrink: 0 }}>{opt.emoji}</span>
              <div>
                <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16, color: C.charcoal, lineHeight: 1.3, marginBottom: 5 }}>
                  {opt.title}
                </div>
                <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.65 }}>{opt.sub}</div>
              </div>
              <div style={{ marginLeft: "auto", color: C.sageDark, fontSize: 18, flexShrink: 0 }}>→</div>
            </div>
          </div>
        ))}

        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", textAlign: "center", marginTop: 8 }}>
          🌿 Independent app · Inspired by Anthony William's teachings · Not affiliated with Medical Medium LLC
        </div>
      </div>
    </div>
  );
}

export default function Onboarding({ onDone }) {
  const [journeyType, setJourneyType] = useState(null);
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ name: "", symptoms: [], goal: "" });
  const [condSearch, setCondSearch] = useState("");
  const { speak } = useVoice();

  if (!journeyType) return <ForkScreen onSelect={setJourneyType} />;
  if (journeyType === "beginner") return <DiscoveryQuiz onDone={onDone} />;

  const steps = [
    {
      title: "Welcome to\nCelerySync 🌿",
      type: "intro",
      sub: "Your personal Medical Medium healing companion.\nSpeak to it. Listen to it. Heal with it.",
    },
    { title: "What's your name?", type: "text", placeholder: "Your first name" },
    { title: "Your main symptoms?", type: "multi", options: Object.keys(CONDITIONS) },
    {
      title: "Your healing goal?",
      type: "single",
      options: [
        "Heal a specific condition",
        "Heavy metal detox",
        "Liver healing",
        "Thyroid healing",
        "More energy & clarity",
        "Prevention & wellness",
      ],
    },
    {
      title: "Your secret weapon 📚",
      type: "byob",
      sub: "This makes CelerySync 10× more powerful for you personally.",
    },
  ];

  const cur = steps[step];
  const isLast = step === steps.length - 1;

  const next = () => {
    if (isLast) {
      onDone(data);
      setTimeout(
        () =>
          speak(
            `Welcome ${data.name || "beautiful soul"}. I am so glad you are here. Let's begin your healing journey together.`
          ),
        500
      );
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: `linear-gradient(160deg,${C.sageDark} 0%,${C.leaf} 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 28 }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 20 : 7,
                height: 7,
                borderRadius: 10,
                background: i <= step ? "#fff" : "#ffffff55",
                transition: "all 0.3s",
              }}
            />
          ))}
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.96)",
            borderRadius: 24,
            padding: 28,
            boxShadow: "0 20px 60px #00000030",
          }}
        >
          <div
            style={{
              fontFamily: "Georgia,serif",
              fontSize: 22,
              fontWeight: 700,
              color: C.charcoal,
              whiteSpace: "pre-line",
              marginBottom: 6,
              lineHeight: 1.3,
            }}
          >
            {cur.title}
          </div>

          {cur.sub && (
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 18, lineHeight: 1.5 }}>
              {cur.sub}
            </div>
          )}

          {cur.type === "intro" && (
            <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
              <div style={{ fontSize: 52 }}>🌿</div>
              <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.9, marginTop: 8 }}>
                🎙 Speak to it · 🔊 It speaks back<br />
                📖 Upload your MM books<br />
                ▶️ Save your MM videos<br />
                💊 Exact protocols from Cleanse to Heal<br />
                🌿 All cleanses day by day
              </div>
            </div>
          )}

          {cur.type === "text" && (
            <input
              value={data.name}
              onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
              placeholder={cur.placeholder}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 12,
                border: `1.5px solid ${C.border}`,
                fontFamily: "Georgia,serif",
                fontSize: 16,
                outline: "none",
                boxSizing: "border-box",
                background: C.mist,
              }}
            />
          )}

          {cur.type === "multi" && (
            <div>
              <input
                value={condSearch}
                onChange={(e) => setCondSearch(e.target.value)}
                placeholder={`Search ${Object.keys(CONDITIONS).length} conditions…`}
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "9px 14px", borderRadius: 30,
                  border: `1.5px solid ${C.border}`,
                  fontFamily: "Georgia,serif", fontSize: 13,
                  outline: "none", background: C.mist, marginBottom: 8,
                }}
              />
              {data.symptoms.length > 0 && (
                <div style={{ fontSize: 11, color: C.sageDark, marginBottom: 6, fontWeight: 600 }}>
                  ✓ {data.symptoms.length} selected
                </div>
              )}
              <div
                style={{
                  display: "flex", flexWrap: "wrap", gap: 7,
                  maxHeight: 180, overflowY: "auto",
                }}
              >
                {cur.options
                  .filter((o) => !condSearch || o.toLowerCase().includes(condSearch.toLowerCase()))
                  .map((o) => {
                    const on = data.symptoms.includes(o);
                    return (
                      <div
                        key={o}
                        onClick={() =>
                          setData((d) => ({
                            ...d,
                            symptoms: on
                              ? d.symptoms.filter((x) => x !== o)
                              : [...d.symptoms, o],
                          }))
                        }
                        style={{
                          padding: "6px 12px",
                          borderRadius: 30,
                          border: `2px solid ${on ? C.sage : C.border}`,
                          background: on ? C.sageLight : "transparent",
                          cursor: "pointer",
                          fontSize: 12,
                          fontFamily: "Georgia,serif",
                          color: on ? C.sageDark : C.mid,
                          fontWeight: on ? 700 : 400,
                        }}
                      >
                        {o}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {cur.type === "single" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {cur.options.map((o) => {
                const on = data.goal === o;
                return (
                  <div
                    key={o}
                    onClick={() => setData((d) => ({ ...d, goal: o }))}
                    style={{
                      padding: "11px 16px",
                      borderRadius: 12,
                      border: `2px solid ${on ? C.sage : C.border}`,
                      background: on ? C.sageLight : C.mist,
                      cursor: "pointer",
                      fontSize: 14,
                      fontFamily: "Georgia,serif",
                      color: on ? C.sageDark : C.mid,
                      fontWeight: on ? 700 : 400,
                    }}
                  >
                    {o}
                  </div>
                );
              })}
            </div>
          )}

          {cur.type === "byob" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{
                background: "#f0f7f0",
                borderRadius: 14,
                padding: "14px 16px",
                border: `1px solid ${C.sage}40`,
              }}>
                <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.sageDark, marginBottom: 8 }}>
                  Bring Your Own Books (BYOB)
                </div>
                <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.7 }}>
                  CelerySync is already trained on Anthony William's publicly shared teachings.<br /><br />
                  But your purchased MM books? Those go 10× deeper — full protocols, exact dosages, personalised healing plans specific to your conditions.
                </div>
              </div>

              {[
                { emoji: "📘", text: "Upload a PDF of any AW book you own", detail: "Text extracted instantly, PDF never stored" },
                { emoji: "▶️", text: "Paste any AW YouTube video link", detail: "Transcript indexed automatically" },
                { emoji: "📝", text: "Paste notes from books or podcasts", detail: "Plain text, whatever you've saved" },
              ].map(({ emoji, text, detail }) => (
                <div key={text} style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "10px 12px",
                  background: C.mist,
                  borderRadius: 12,
                  border: `1px solid ${C.border}`,
                }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{emoji}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.charcoal, lineHeight: 1.4 }}>{text}</div>
                    <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{detail}</div>
                  </div>
                </div>
              ))}

              <div style={{
                background: C.sage + "22",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 12,
                color: C.sageDark,
                lineHeight: 1.5,
              }}>
                💡 After setup, go to <strong>My Books</strong> tab to add your first book. Your AI Guide, Body organ pages, and Symptom checker all get smarter the moment you upload.
              </div>
            </div>
          )}

          <button
            onClick={next}
            style={{
              width: "100%",
              marginTop: 22,
              padding: "13px",
              background: C.sageDark,
              color: C.white,
              border: "none",
              borderRadius: 40,
              fontFamily: "Georgia,serif",
              fontWeight: 700,
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            {isLast ? "Begin My Healing Journey 🌿" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}
