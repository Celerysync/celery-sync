import { useState, useRef } from "react";
import C from "../lib/colors.js";
import { streamClaude } from "../lib/api.js";

const SYMPTOM_CATEGORIES = [
  { id: "fatigue",   emoji: "😴", label: "Always tired",           sub: "No matter how much you sleep, you never feel rested", awContext: "persistent exhaustion and fatigue that doesn't improve with rest" },
  { id: "brainfog",  emoji: "🧠", label: "Brain fog",              sub: "Hard to think clearly, poor memory, mental cloudiness", awContext: "brain fog, poor concentration, memory issues, mental cloudiness" },
  { id: "anxiety",   emoji: "😰", label: "Anxiety or worry",       sub: "Racing thoughts, can't switch off, feeling on edge", awContext: "anxiety, racing thoughts, nervous system symptoms, feeling wired or on edge" },
  { id: "mood",      emoji: "😔", label: "Low mood",               sub: "Feeling flat, sad, or empty without a clear reason", awContext: "depression, low mood, emotional flatness" },
  { id: "pain",      emoji: "🔥", label: "Joint or muscle pain",   sub: "Aching, stiffness, or pain anywhere in the body", awContext: "joint pain, muscle aches, fibromyalgia-like pain, body stiffness" },
  { id: "digestive", emoji: "🤢", label: "Digestive problems",     sub: "Bloating, reflux, IBS, constipation, or nausea", awContext: "bloating, acid reflux, IBS, constipation, digestive discomfort" },
  { id: "hormonal",  emoji: "🌊", label: "Hormonal issues",        sub: "Thyroid, irregular cycles, PCOS, or menopause symptoms", awContext: "thyroid dysfunction, hormonal imbalances, irregular cycles, PCOS" },
  { id: "skin",      emoji: "✨", label: "Skin problems",           sub: "Acne, eczema, psoriasis, rosacea, or unexplained rashes", awContext: "skin conditions including acne, eczema, psoriasis, or chronic rashes" },
  { id: "headaches", emoji: "💆", label: "Headaches or migraines", sub: "Frequent head pain that keeps coming back", awContext: "chronic headaches and migraines" },
  { id: "sleep",     emoji: "🌙", label: "Sleep problems",         sub: "Can't fall asleep, waking at night, never feeling rested", awContext: "insomnia, waking between 1–3am, unrefreshing sleep" },
  { id: "weight",    emoji: "⚖️", label: "Weight struggles",       sub: "Weight that won't shift, or unexpected weight changes", awContext: "unexplained weight gain or difficulty losing weight despite effort" },
  { id: "immune",    emoji: "🛡️", label: "Lowered immunity",       sub: "Get sick often, slow to recover, constant infections", awContext: "weakened immune system, frequent illness, slow recovery" },
  { id: "neuro",     emoji: "⚡", label: "Nerve pain or tingling", sub: "Pins and needles, numbness, nerve pain, or twitching", awContext: "neurological symptoms including tingling, numbness, nerve pain" },
  { id: "mystery",   emoji: "❓", label: "Mystery symptoms",       sub: "Tests show nothing — but you feel terrible", awContext: "unexplained symptoms that don't show on standard medical tests" },
];

const DURATIONS = [
  { id: "weeks",    label: "Just started (weeks)" },
  { id: "months",   label: "A few months" },
  { id: "years13",  label: "1–3 years" },
  { id: "years3",   label: "More than 3 years" },
  { id: "forever",  label: "My whole life, honestly" },
];

const SYMPTOM_MAP = {
  fatigue:   ["Chronic Fatigue Syndrome", "Adrenal Fatigue"],
  brainfog:  ["Brain Fog"],
  anxiety:   ["Anxiety"],
  mood:      ["Depression"],
  pain:      ["Fibromyalgia", "Rheumatoid Arthritis"],
  digestive: ["Acid Reflux / GERD", "IBS"],
  hormonal:  ["Thyroid Disease", "PCOS"],
  skin:      ["Acne", "Eczema"],
  headaches: ["Migraines"],
  sleep:     ["Insomnia"],
  weight:    ["Adrenal Fatigue"],
  immune:    ["Allergies"],
  neuro:     ["Neuropathy"],
  mystery:   ["Chronic Fatigue Syndrome"],
};

function Pill({ on, onClick, children }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "8px 14px", borderRadius: 30, fontSize: 13,
        fontFamily: "Georgia,serif", cursor: "pointer",
        border: `2px solid ${on ? C.sageDark : C.border}`,
        background: on ? C.sageLight : "transparent",
        color: on ? C.sageDark : C.mid,
        fontWeight: on ? 700 : 400,
        transition: "all 0.15s ease",
      }}
    >
      {children}
    </div>
  );
}

export default function DiscoveryQuiz({ onDone }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState([]);
  const [duration, setDuration] = useState("");
  const [discovery, setDiscovery] = useState("");
  const [streaming, setStreaming] = useState(false);
  const discoveryRef = useRef("");

  const totalSteps = 5;

  const toggleSymptom = (id) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const generateDiscovery = async () => {
    setStep(3);
    setStreaming(true);
    discoveryRef.current = "";

    const symptomLabels = selected
      .map(id => {
        const cat = SYMPTOM_CATEGORIES.find(c => c.id === id);
        return cat?.awContext || cat?.label || id;
      })
      .join("; ");

    const durationLabel = DURATIONS.find(d => d.id === duration)?.label || duration;

    const prompt = `You are gently introducing someone to Anthony William's Medical Medium framework for the very first time. They have NO prior knowledge of Anthony William, his books, Epstein-Barr virus, heavy metals, or any healing protocols. Speak directly to them like a warm, knowledgeable friend.

Their name: ${name || "friend"}
How they have been feeling: ${symptomLabels}
How long they have felt this way: ${durationLabel}

Write a personal, warm discovery message in 5–6 short paragraphs. Keep every paragraph to 3–4 sentences. Plain English. No medical jargon. No bullet points. No headers.

Paragraph 1: Open by speaking directly to ${name || "them"} and acknowledging exactly how they feel. Validate that this is real — they are not imagining it, not being dramatic, not weak.

Paragraph 2: Introduce patterns that Anthony William generally associates with symptoms like these, in completely plain language — without implying this is a diagnosis. If Epstein-Barr virus is relevant, introduce it as "a very common virus called Epstein-Barr — one that most people carry without ever knowing — which can quietly become active and begin causing symptoms exactly like these." Explain heavy metals simply: "tiny particles from our food, water, and environment that accumulate in the body over years, affecting how the brain and organs function." Never abbreviate. Make it feel like a revelation, not a medical lecture.

Paragraph 3: Explain gently why standard testing may not always identify these patterns — why tests can come back normal, why they may have been told they're fine, why standard medicine hasn't had answers. Validate the frustration without criticising doctors harshly.

Paragraph 4: Give them ONE simple thing to start with this week. Just one. Celery juice on an empty stomach each morning — 500ml (about 16 ounces) of pure celery, nothing added. Explain in one or two sentences what it does and why it matters for exactly what they're experiencing.

Paragraph 5: Name the one Anthony William book that speaks most directly to their situation. Explain in one sentence what they'll find in it that speaks to exactly what they've shared.

Paragraph 6: Close with genuine, heartfelt encouragement. Something like: there is a real cause, there is a real path forward, and they are not broken. End with warmth.

Do not use the words "protocol", "EBV", "HCl", "neurotoxin", or any abbreviation without first explaining it in full. Write as if talking to someone who has been suffering alone for years and is hearing for the first time that there might actually be an answer.`;

    try {
      const fullText = await streamClaude({
        tier: "standard",
        maxTokens: 900,
        messages: [{ role: "user", content: prompt }],
        onDelta: (_, full) => {
          discoveryRef.current = full;
          setDiscovery(full);
        },
      });
      localStorage.setItem("cs_discovery_result", fullText || discoveryRef.current);
    } catch (err) {
      setDiscovery("We couldn't load your discovery right now — but your journey has already begun. Start with lemon water first thing tomorrow morning, then 500ml of fresh celery juice 30 minutes later. That's it. That's where Anthony William says every healing journey begins.");
    }
    setStreaming(false);
  };

  const finish = () => {
    const mappedSymptoms = [...new Set(
      selected.flatMap(id => SYMPTOM_MAP[id] || [])
    )];
    localStorage.setItem("cs_journey_type", "beginner");
    localStorage.setItem("cs_journey_start", new Date().toISOString());
    onDone({
      name: name.trim() || "Healer",
      symptoms: mappedSymptoms,
      goal: "just starting — new to Medical Medium",
    });
  };

  const card = (content) => (
    <div style={{
      background: "rgba(255,255,255,0.96)",
      borderRadius: 24, padding: 28,
      boxShadow: "0 20px 60px #00000030",
    }}>
      {content}
    </div>
  );

  const nextBtn = (label, onClick, disabled = false) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="cs-btn"
      style={{
        width: "100%", marginTop: 22, padding: "13px",
        background: disabled ? C.muted : C.sageDark,
        color: "#fff", border: "none", borderRadius: 40,
        fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      minHeight: "100dvh",
      background: `linear-gradient(160deg,${C.sageDark} 0%,${C.leaf} 100%)`,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>

        {/* Progress dots */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 28 }}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} style={{
              width: i === step ? 20 : 7, height: 7, borderRadius: 10,
              background: i <= step ? "#fff" : "#ffffff55",
              transition: "all 0.3s",
            }} />
          ))}
        </div>

        {/* Step 0 — Name */}
        {step === 0 && card(<>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>🌱</div>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 22, color: C.charcoal, lineHeight: 1.3, marginBottom: 8 }}>
              Let's find out what's going on
            </div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.65 }}>
              I'm going to ask you a few simple questions, then show you what Anthony William says might actually be happening in your body — in plain language, no medical jargon.
            </div>
          </div>
          <div style={{ marginTop: 6, marginBottom: 4, fontSize: 13, color: C.mid, fontFamily: "Georgia,serif" }}>What's your first name?</div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your first name"
            autoFocus
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 12,
              border: `1.5px solid ${C.border}`,
              fontFamily: "Georgia,serif", fontSize: 16,
              outline: "none", boxSizing: "border-box", background: C.mist,
            }}
          />
          {nextBtn("Continue →", () => setStep(1), !name.trim())}
        </>)}

        {/* Step 1 — Symptoms */}
        {step === 1 && card(<>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 20, color: C.charcoal, marginBottom: 6, lineHeight: 1.3 }}>
            How are you feeling, {name}?
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>
            Tap everything that sounds like you — even if it's been going on for years.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 320, overflowY: "auto" }}>
            {SYMPTOM_CATEGORIES.map(cat => {
              const on = selected.includes(cat.id);
              return (
                <div
                  key={cat.id}
                  onClick={() => toggleSymptom(cat.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "11px 14px", borderRadius: 14, cursor: "pointer",
                    border: `2px solid ${on ? C.sageDark : C.border}`,
                    background: on ? C.sageLight : C.mist,
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{cat.emoji}</span>
                  <div>
                    <div style={{ fontFamily: "Georgia,serif", fontWeight: on ? 700 : 500, fontSize: 13.5, color: on ? C.sageDark : C.charcoal }}>
                      {cat.label}
                    </div>
                    <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>{cat.sub}</div>
                  </div>
                  {on && <div style={{ marginLeft: "auto", color: C.sageDark, fontWeight: 700, fontSize: 16, flexShrink: 0 }}>✓</div>}
                </div>
              );
            })}
          </div>
          {selected.length > 0 && (
            <div style={{ fontSize: 12, color: C.sageDark, fontWeight: 700, marginTop: 10, textAlign: "center" }}>
              {selected.length} selected
            </div>
          )}
          {nextBtn("This is me →", () => setStep(2), selected.length === 0)}
        </>)}

        {/* Step 2 — Duration */}
        {step === 2 && card(<>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 20, color: C.charcoal, marginBottom: 6 }}>
            How long has this been going on?
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 18, lineHeight: 1.5 }}>
            Be honest — there's no wrong answer.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {DURATIONS.map(d => {
              const on = duration === d.id;
              return (
                <div
                  key={d.id}
                  onClick={() => setDuration(d.id)}
                  style={{
                    padding: "13px 16px", borderRadius: 14, cursor: "pointer",
                    border: `2px solid ${on ? C.sageDark : C.border}`,
                    background: on ? C.sageLight : C.mist,
                    fontFamily: "Georgia,serif", fontSize: 14,
                    color: on ? C.sageDark : C.mid, fontWeight: on ? 700 : 400,
                    transition: "all 0.15s ease",
                  }}
                >
                  {d.label}
                </div>
              );
            })}
          </div>
          {nextBtn("Show me what's going on →", generateDiscovery, !duration)}
        </>)}

        {/* Step 3 — Discovery Result (streaming) */}
        {step === 3 && (
          <div style={{
            background: "rgba(255,255,255,0.96)",
            borderRadius: 24, padding: 24,
            boxShadow: "0 20px 60px #00000030",
            maxHeight: "75dvh", overflowY: "auto",
          }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 36 }}>🌿</div>
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 18, color: C.charcoal, marginTop: 8 }}>
                {streaming ? "Searching Anthony William's teachings…" : `Here's what may be happening, ${name}`}
              </div>
            </div>

            {streaming && !discovery && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[100, 85, 90, 70, 80].map((w, i) => (
                  <div key={i} className="cs-skeleton" style={{ height: 12, width: `${w}%`, borderRadius: 6 }} />
                ))}
              </div>
            )}

            {discovery && (
              <div style={{ fontSize: 13.5, color: C.charcoal, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>
                {discovery}
                {streaming && <span className="cs-cursor">▋</span>}
              </div>
            )}

            {!streaming && discovery && nextBtn("My First Week →", () => setStep(4))}
          </div>
        )}

        {/* Step 4 — First Week */}
        {step === 4 && card(<>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🌱</div>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 20, color: C.charcoal, lineHeight: 1.3, marginBottom: 8 }}>
              Your first week, {name}
            </div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.65 }}>
              Just two things. Nothing more. Anthony William suggests these as a foundation for your own protocol.
            </div>
          </div>

          {[
            {
              emoji: "🍋", step: "First thing when you wake",
              title: "Lemon water",
              desc: "Half a lemon squeezed into 500ml of water. Drink before anything else — before coffee, before food, before brushing your teeth. This wakes up your liver.",
            },
            {
              emoji: "🥬", step: "30 minutes later",
              title: "Fresh celery juice",
              desc: "500ml of pure celery juice — nothing added, nothing mixed in. Juice it fresh. This is the thing that begins to shift everything. Anthony William says nothing else does what this does.",
            },
          ].map((item, i) => (
            <div key={i} style={{
              background: C.sageLight, borderRadius: 16, padding: "16px 18px",
              border: `1px solid ${C.sage}40`, marginBottom: 12,
            }}>
              <div style={{ fontSize: 11, color: C.sageDark, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>
                {item.step}
              </div>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{item.emoji}</div>
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 4 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 12.5, color: C.mid, lineHeight: 1.65 }}>{item.desc}</div>
            </div>
          ))}

          <div style={{
            background: "#fffbeb", border: "1px solid #fde68a",
            borderRadius: 12, padding: "12px 14px", marginTop: 4,
            fontSize: 12, color: "#92400e", lineHeight: 1.65,
          }}>
            💛 That's your whole protocol for Week 1. Next week we'll add one more thing. One step at a time — that's the Anthony William way.
          </div>

          {nextBtn("Begin My Healing Journey 🌿", finish)}
        </>)}

      </div>
    </div>
  );
}
