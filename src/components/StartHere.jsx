import { useState, useRef } from "react";
import C from "../lib/colors.js";
import { Card, Btn } from "./ui.jsx";
import { CONDITIONS } from "../data/conditions.js";
import { RHYTHM_PRESETS } from "../data/rhythmTemplates.js";
import { streamClaude } from "../lib/api.js";
import { useRhythm } from "../hooks/useRhythm.js";

const CONDITION_NAMES = Object.keys(CONDITIONS).sort();

const PRESET_DESCRIPTIONS = {
  "simplified-morning": "Lemon water → celery juice → HMD smoothie → adrenal snack. The essential morning sequence.",
  "full-healing-day": "Full MM daily protocol: morning sequence, supplements, adrenal snacks, lunch, and dinner.",
  "heavy-metal-detox": "Focused on the Big 5 HMD protocol for heavy metal detox support.",
  "gentle-day": "A gentle, forgiving routine for flare days or when you need to take it easy.",
};

const SYSTEM_PROMPT = `You are the CelerySync companion — a warm, calm, encouraging guide for adults following Medical Medium (Anthony William) protocols.

WHAT YOU DO:
- Help users create a clear, ordered starting plan based on their conditions.
- Paraphrase protocol facts and ATTRIBUTE them to Anthony William.
- For specifics, POINT the user to the relevant AW book or official source.
- Lead with "The first 3 things to do this week" — not the whole library.

WHAT YOU NEVER DO:
- NEVER reproduce Anthony William's copyrighted text.
- NEVER diagnose, or claim to treat, cure, or heal any condition.
- NEVER give exact supplement dosages — instead say "see [book] for amounts".
- NEVER advise on prescription medications.
- NEVER direct content at or about children. Adults only.

SAFETY: Not a medical professional. Encourage working with a licensed practitioner. Red-flag symptoms → seek prompt care.

TONE: kind, grounded, unhurried, never alarmist, never over-promising.`;

function formatTime(ms) {
  const d = new Date(ms);
  return d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

export default function StartHere({ user, onDone }) {
  const [step, setStep] = useState("conditions"); // conditions | plan | rhythm | done
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [plan, setPlan] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chosenPreset, setChosenPreset] = useState(null);
  const [anchorInput, setAnchorInput] = useState("07:00");
  const planRef = useRef(null);

  const { applyTemplate, setAnchorTime, hasRhythm } = useRhythm();

  const filtered = search.trim()
    ? CONDITION_NAMES.filter((n) => n.toLowerCase().includes(search.toLowerCase()))
    : CONDITION_NAMES;

  const toggleCondition = (name) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const generatePlan = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    setError(null);
    setPlan("");
    setStep("plan");

    const conditionList = selected.join(", ");
    const prompt = `This person is dealing with: ${conditionList}.

Please create their personalised start-here plan in this exact format:

**The likely root angle** (1–2 sentences: what Anthony William generally points to as the underlying cause for these conditions — paraphrased, attributed)

**The first 3 things to do this week**
1. [Most important action — specific and achievable]
2. [Second action]
3. [Third action]

**Key supplements to explore** (general guidance only — no dosages; point to the book)
- [supplement]: Anthony William generally suggests this for [reason] — see [book] for amounts and timing.
(3–5 items max)

**Foods to bring in**
- [food items, brief reason each]

**Foods to reduce**
- [food items, brief reason each]

**Where to start reading**
Anthony William's [book title] is the best first step for these conditions — [one sentence on why].

Keep it concise, warm, and practical. Never state dosages. Always attribute to Anthony William. Never say "heal", "cure", or "treat". Say "support" instead. This is not medical advice.`;

    try {
      await streamClaude({
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
        maxTokens: 700,
        tier: "standard",
        onDelta: (_, full) => {
          setPlan(full);
          if (planRef.current) {
            planRef.current.scrollTop = planRef.current.scrollHeight;
          }
        },
      });
    } catch (e) {
      setError("Couldn't generate your plan. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupRhythm = () => {
    if (chosenPreset) {
      applyTemplate(chosenPreset);
      setAnchorTime(anchorInput);
    }
    onDone();
  };

  const handleSkipRhythm = () => {
    onDone();
  };

  // ── Step: condition selection ────────────────────────────────────────────────
  if (step === "conditions") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: "80vh" }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg,${C.sageDark},${C.leaf})`,
          borderRadius: 20,
          padding: "24px 20px 20px",
          color: C.white,
        }}>
          <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
            Welcome to CelerySync
          </div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 22, lineHeight: 1.3 }}>
            Tell me what's going on
          </div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 8, lineHeight: 1.6 }}>
            Select the conditions or symptoms you're dealing with — I'll put together a clear, ordered starting plan based on Anthony William's teachings.
          </div>
          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 10, fontStyle: "italic" }}>
            Not medical advice — always work with your doctor or practitioner.
          </div>
        </div>

        {/* Search */}
        <div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conditions…"
            style={{
              width: "100%", boxSizing: "border-box",
              border: `2px solid ${C.border}`, borderRadius: 14,
              padding: "11px 16px", fontSize: 14,
              background: C.white, color: C.charcoal,
              outline: "none",
            }}
          />
        </div>

        {/* Selected chips */}
        {selected.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {selected.map((name) => (
              <button
                key={name}
                onClick={() => toggleCondition(name)}
                style={{
                  background: C.sageDark, color: C.white,
                  border: "none", borderRadius: 20,
                  padding: "5px 12px", fontSize: 12,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {name} ✕
              </button>
            ))}
          </div>
        )}

        {/* Condition grid */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {filtered.slice(0, 80).map((name) => {
            const isSelected = selected.includes(name);
            return (
              <button
                key={name}
                onClick={() => toggleCondition(name)}
                style={{
                  background: isSelected ? C.sageDark : C.white,
                  color: isSelected ? C.white : C.charcoal,
                  border: `1.5px solid ${isSelected ? C.sageDark : C.border}`,
                  borderRadius: 20,
                  padding: "6px 13px",
                  fontSize: 12,
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
              >
                {name}
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <div style={{ position: "sticky", bottom: 0, background: C.cream, paddingBottom: 12, paddingTop: 8 }}>
          <Btn
            full
            color={selected.length > 0 ? C.sageDark : C.muted}
            disabled={selected.length === 0}
            onClick={generatePlan}
          >
            {selected.length === 0
              ? "Select at least one condition"
              : `Build My Start-Here Plan (${selected.length} selected)`}
          </Btn>
          <div style={{ textAlign: "center", marginTop: 10 }}>
            <button
              onClick={onDone}
              style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer" }}
            >
              Skip — take me to the app
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: plan display ────────────────────────────────────────────────────────
  if (step === "plan") {
    const lines = plan.split("\n").filter(Boolean);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg,${C.sageDark},${C.leaf})`,
          borderRadius: 20,
          padding: "20px 20px 16px",
          color: C.white,
        }}>
          <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
            Your Start-Here Plan
          </div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 20 }}>
            {selected.slice(0, 2).join(" · ")}{selected.length > 2 ? ` + ${selected.length - 2} more` : ""}
          </div>
          <div style={{ fontSize: 11, opacity: 0.65, marginTop: 6, fontStyle: "italic" }}>
            Paraphrased from Anthony William's teachings · Not medical advice
          </div>
        </div>

        {/* Plan content */}
        <Card>
          {loading && plan === "" ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: C.muted, fontFamily: "Georgia,serif" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🌿</div>
              <div>Building your plan…</div>
            </div>
          ) : error ? (
            <div style={{ color: C.terracotta, fontSize: 13, lineHeight: 1.7 }}>{error}</div>
          ) : (
            <div ref={planRef} style={{ fontSize: 14, lineHeight: 1.85, color: C.charcoal }}>
              {lines.map((line, i) => {
                if (line.startsWith("**") && line.endsWith("**")) {
                  const txt = line.slice(2, -2);
                  return (
                    <div key={i} style={{
                      fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15,
                      color: C.sageDark, marginTop: i > 0 ? 18 : 0, marginBottom: 6,
                    }}>
                      {txt}
                    </div>
                  );
                }
                if (line.match(/^\d+\.\s/)) {
                  const num = line.match(/^(\d+)\.\s/)[1];
                  const rest = line.replace(/^\d+\.\s/, "");
                  const isFirst3 = parseInt(num) <= 3;
                  return (
                    <div key={i} style={{
                      display: "flex", gap: 10, marginBottom: 8,
                      background: isFirst3 ? `${C.sage}12` : "transparent",
                      borderRadius: isFirst3 ? 10 : 0,
                      padding: isFirst3 ? "8px 10px" : "0",
                      border: isFirst3 ? `1px solid ${C.sage}30` : "none",
                    }}>
                      <span style={{
                        background: isFirst3 ? C.sage : C.border,
                        color: C.white,
                        borderRadius: "50%",
                        width: 22, height: 22, display: "flex", alignItems: "center",
                        justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0,
                      }}>{num}</span>
                      <span>{rest}</span>
                    </div>
                  );
                }
                if (line.startsWith("- ")) {
                  return (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, paddingLeft: 4 }}>
                      <span style={{ color: C.sage, fontWeight: 700, flexShrink: 0 }}>•</span>
                      <span>{line.slice(2)}</span>
                    </div>
                  );
                }
                return (
                  <div key={i} style={{ marginBottom: 8, color: C.mid }}>{line}</div>
                );
              })}
              {loading && <span style={{ color: C.sage }}>▌</span>}
            </div>
          )}
        </Card>

        {!loading && !error && plan && (
          <div style={{
            background: C.goldLight, border: `1px solid ${C.gold}40`,
            borderRadius: 14, padding: "12px 16px",
            fontSize: 12, color: C.charcoal, lineHeight: 1.6,
          }}>
            💛 This plan is paraphrased from Anthony William's teachings and attributed to him. For complete protocols, supplement amounts, and personalised guidance, please refer to the relevant Anthony William book and work with a licensed practitioner.
          </div>
        )}

        {!loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Btn full color={C.sageDark} onClick={() => setStep("rhythm")}>
              Set up my daily rhythm →
            </Btn>
            <button
              onClick={onDone}
              style={{ background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer" }}
            >
              Skip rhythm setup — go to Today
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Step: rhythm setup ────────────────────────────────────────────────────────
  if (step === "rhythm") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{
          background: `linear-gradient(135deg,${C.sageDark},${C.leaf})`,
          borderRadius: 20, padding: "20px 20px 16px", color: C.white,
        }}>
          <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
            Step 2 of 2
          </div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 20 }}>
            Set up your daily rhythm
          </div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6, lineHeight: 1.6 }}>
            Choose a starting template — you can edit every item and timing later. The app uses your wake time to calculate the whole sequence for you.
          </div>
        </div>

        {/* Wake time anchor */}
        <Card>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 10 }}>
            ⏰ What time do you usually wake up?
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
            This is your one anchor — the app calculates your whole daily sequence from here.
          </div>
          <input
            type="time"
            value={anchorInput}
            onChange={(e) => setAnchorInput(e.target.value)}
            style={{
              border: `2px solid ${C.sage}`, borderRadius: 12,
              padding: "10px 16px", fontSize: 18, color: C.charcoal,
              fontFamily: "Georgia,serif", fontWeight: 700,
              background: C.sageLight, outline: "none", width: "auto",
            }}
          />
        </Card>

        {/* Template selection */}
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal }}>
          Choose a starting template
        </div>

        {RHYTHM_PRESETS.map((preset) => {
          const isChosen = chosenPreset === preset.id;
          return (
            <Card
              key={preset.id}
              onClick={() => setChosenPreset(preset.id)}
              style={{
                border: `2px solid ${isChosen ? C.sageDark : C.border}`,
                background: isChosen ? C.sageLight : C.white,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>{preset.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal }}>
                    {preset.name}
                  </div>
                  <div style={{ fontSize: 12, color: C.mid, marginTop: 4, lineHeight: 1.5 }}>
                    {PRESET_DESCRIPTIONS[preset.id] || preset.description}
                  </div>
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {preset.items.map((item) => (
                      <span key={item.id} style={{
                        fontSize: 11, background: `${C.sage}18`,
                        color: C.sageDark, borderRadius: 20, padding: "2px 8px",
                      }}>
                        {item.emoji} {item.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  border: `2px solid ${isChosen ? C.sageDark : C.border}`,
                  background: isChosen ? C.sageDark : "transparent",
                  flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  color: C.white, fontSize: 12, fontWeight: 700,
                }}>
                  {isChosen ? "✓" : ""}
                </div>
              </div>
            </Card>
          );
        })}

        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
          💡 You can also build a custom rhythm from scratch, edit any template item, or start the 3:6:9 Cleanse as a dated program — all from the Today tab after setup.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Btn
            full
            color={chosenPreset ? C.sageDark : C.muted}
            disabled={!chosenPreset}
            onClick={handleSetupRhythm}
          >
            {chosenPreset ? "Set up my rhythm & go to Today →" : "Choose a template above"}
          </Btn>
          <button
            onClick={handleSkipRhythm}
            style={{ background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer" }}
          >
            Skip — I'll set up my rhythm later
          </button>
        </div>
      </div>
    );
  }

  return null;
}
