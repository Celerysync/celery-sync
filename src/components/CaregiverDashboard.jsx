import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { useVoice } from "../hooks/useVoice.js";
import { useVoicePrefs } from "../context/VoiceContext.jsx";

// Compliance (CLAUDE.md rails / LEGAL_CONSTRAINTS.md): the app never supplies
// protocol content of its own — no recipes, quantities, or food lists. Each
// window points the carer to the patient's OWN Daily Rhythm (single source of
// truth) and to their own copy of the books for preparation specifics.
function getNowCareTask() {
  const h = new Date().getHours();
  if (h >= 5 && h < 9) return {
    emoji: "🌅", label: "Morning routine time",
    prep: ["Open their Daily Rhythm and see what they've chosen to start the day with", "Prepare their morning items with them, or have them ready when they wake", "Keep the start of the day calm and unhurried"],
    offer: "Offer their morning items in the order they've set in their rhythm — tick each one off as it's done.",
    tip: "Tip: For exactly how to prepare any drink or recipe, go to their copy of the Medical Medium books — the app leaves the specifics to the source they own.",
  };
  if (h >= 9 && h < 12) return {
    emoji: "☀️", label: "Mid-morning care",
    prep: ["Check their rhythm for any mid-morning items", "Keep water within easy reach — steady sips through the morning", "Have something simple from their own food plan ready in case they're hungry"],
    offer: "Follow their rhythm; if nothing's scheduled, this is a good window for hydration and rest.",
    tip: "Tip: Anthony William encourages steady hydration through the morning — his books explain his reasoning and his suggestions.",
  };
  if (h >= 12 && h < 14) return {
    emoji: "🥗", label: "Lunch time",
    prep: ["See what they've planned for lunch in their rhythm", "Prepare it early so eating isn't rushed", "Sit with them if you can — company makes meals easier"],
    offer: "Keep it simple and follow what they've chosen from their own books.",
    tip: "Tip: If they're building their meals from a Medical Medium book, keep it open in the kitchen — the book is the recipe source, and it saves second-guessing.",
  };
  if (h >= 14 && h < 17) return {
    emoji: "🍎", label: "Afternoon snack window",
    prep: ["Check their rhythm for afternoon items or snacks", "Have their chosen snacks prepared ahead so they're effortless", "This is also a natural rest window — quiet helps"],
    offer: "Offer a snack from their own plan now, and note it in the app so their record stays complete.",
    tip: "Tip: Anthony William encourages small, regular snacks through the day — the combinations he suggests are in his books.",
  };
  if (h >= 17 && h < 20) return {
    emoji: "🌆", label: "Dinner time",
    prep: ["See what they've planned for dinner in their rhythm", "Earlier and lighter tends to make evenings easier", "Start winding the household down as dinner finishes"],
    offer: "Follow their plan, and keep the evening gentle afterwards.",
    tip: "Tip: Anthony William writes about the value of an earlier, lighter evening meal — his books explain his approach if they'd like to follow it.",
  };
  return {
    emoji: "🌙", label: "Evening care",
    prep: ["Check their rhythm for any evening items", "A warm herbal tea from their own plan can be a nice wind-down", "Make sure tomorrow morning's items are easy to reach"],
    offer: "The goal now is rest — keep lights low and the evening quiet.",
    tip: "Tip: Good sleep is one of the kindest things you can protect for them. Anything they take before bed should come from their own plan and their own books.",
  };
}

export default function CaregiverDashboard({ patient }) {
  const { voiceName } = useVoicePrefs();
  const { speak, speaking, stopSpeaking } = useVoice(voiceName);
  const task = getNowCareTask();

  const readScript = () => {
    const s = `You are caring for ${patient?.name || "your loved one"}. Right now: ${task.label}. To prepare: ${task.prep.join(". ")}. ${task.offer} ${task.tip}`;
    speak(s);
  };

  const h = new Date().getHours();
  const isSnackHour = h >= 10 && h <= 17;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Carer header */}
      <div style={{
        background: `linear-gradient(135deg,${C.plum},#5c3f6b)`,
        borderRadius: 20, padding: "20px 20px 16px", color: C.white,
      }}>
        <div style={{ fontSize: 12, opacity: 0.8, letterSpacing: 1, textTransform: "uppercase" }}>
          {new Date().toLocaleDateString("en-AU", { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 700, marginTop: 4 }}>
          💜 Caring for {patient?.name || "your loved one"}
        </div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
          Your support is part of their healing
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            onClick={() => speaking ? stopSpeaking() : readScript()}
            style={{
              background: "rgba(255,255,255,0.2)", color: C.white,
              border: "1px solid rgba(255,255,255,0.4)", borderRadius: 30,
              padding: "7px 14px", fontSize: 12, cursor: "pointer",
              fontFamily: "Georgia,serif", fontWeight: 700,
            }}
          >
            {speaking ? "⏹ Stop" : "🔊 Read My Care Plan"}
          </button>
        </div>
      </div>

      {/* What to do right now */}
      <Card style={{ border: `2px solid ${C.plum}25` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal }}>
              {task.emoji} {task.label}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>What to prepare right now</div>
          </div>
          <div style={{
            background: `${C.plum}18`, borderRadius: 20, padding: "3px 10px",
            fontSize: 10, color: C.plum, fontWeight: 700, flexShrink: 0,
          }}>
            {new Date().toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {task.prep.map((item) => (
            <div key={item} style={{ display: "flex", gap: 8, fontSize: 13, color: C.charcoal }}>
              <span style={{ color: C.plum, fontWeight: 700, flexShrink: 0 }}>•</span>
              {item}
            </div>
          ))}
        </div>
        <div style={{
          background: `${C.plum}10`, border: `1px solid ${C.plum}25`,
          borderRadius: 10, padding: "10px 12px", marginBottom: 10,
        }}>
          <div style={{ fontSize: 12, color: C.plum, fontWeight: 700, marginBottom: 2 }}>When to offer it</div>
          <div style={{ fontSize: 12, color: C.charcoal, lineHeight: 1.6 }}>{task.offer}</div>
        </div>
        <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6, fontStyle: "italic" }}>
          {task.tip}
        </div>
      </Card>

      {/* Their conditions + protocol snapshot */}
      {patient?.symptoms?.length > 0 && (
        <Card>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 10 }}>
            🔍 {patient.name}'s conditions
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {patient.symptoms.map((s) => (
              <div key={s} style={{
                padding: "5px 12px", borderRadius: 20, fontSize: 12,
                background: C.plumLight, color: C.plum,
                border: `1px solid ${C.plum}30`, fontFamily: "Georgia,serif",
              }}>
                {s}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
            These are the areas {patient?.name ? `${patient.name} has` : "they've"} chosen to focus on. For what Anthony
            William says about them, go to their copy of his books — the companion can help you
            with their rhythm, reminders, and keeping their log up to date.
          </div>
        </Card>
      )}

      {/* Adrenal snack reminder for carer */}
      {isSnackHour && (
        <div style={{
          background: C.goldLight, border: `1.5px solid ${C.gold}50`,
          borderRadius: 16, padding: "14px 16px",
        }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 4 }}>
            ⏰ Snack window
          </div>
          <div style={{ fontSize: 12, color: C.mid, lineHeight: 1.6 }}>
            Anthony William encourages small, regular snacks through the day — a gentle reminder to
            have something from their own plan ready. The combinations he suggests are in his books.
          </div>
        </div>
      )}

      {/* Carer well-being */}
      <Card style={{ background: C.sageLight, border: `1px solid ${C.sage}40` }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.sageDark, marginBottom: 6 }}>
          💚 You matter too
        </div>
        <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.7 }}>
          Caregiving is exhausting, and your wellbeing directly affects your loved one's healing environment. Drink water, eat your own adrenal snacks, and rest when they rest. You are doing sacred work.
        </div>
      </Card>

      {/* What to watch for */}
      <Card>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 10 }}>
          👁 What to watch for
        </div>
        {/* Descriptive only (TGA rail): the app never interprets symptoms —
            it encourages noting changes and leaves judgement to the doctor. */}
        <div style={{ fontSize: 12, color: C.charcoal, lineHeight: 1.7, marginBottom: 10 }}>
          You know {patient?.name || "your loved one"} best. Note any changes you observe — energy,
          appetite, mood, sleep — in their daily check-in, so their own record builds over time and
          they can share it with their doctor.
        </div>
        <div style={{
          background: `${C.terracotta}10`, border: `1px solid ${C.terracotta}30`,
          borderRadius: 10, padding: "10px 12px", marginBottom: 10,
        }}>
          <div style={{ fontSize: 12, color: C.terracotta, fontWeight: 700, marginBottom: 2 }}>
            If something feels seriously wrong
          </div>
          <div style={{ fontSize: 12, color: C.charcoal, lineHeight: 1.6 }}>
            High fever, severe pain, trouble breathing, can't keep fluids down, or anything that
            frightens you — don't wait. Contact their doctor or emergency services straight away.
          </div>
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.6 }}>
          Anthony William writes about what he calls healing reactions — his books explain what he
          means by that. For anything that concerns you, always check with their doctor first.
        </div>
      </Card>

      {/* Encouragement for carers — our own words, unattributed (no invented
          or "inspired by" quotes credited to Anthony William). */}
      <div style={{
        background: C.goldLight, border: `1px solid ${C.gold}50`, borderRadius: 16, padding: 18,
      }}>
        <div style={{ fontFamily: "Georgia,serif", fontStyle: "italic", fontSize: 14, color: C.charcoal, lineHeight: 1.8 }}>
          💛 Caring for someone on this path takes patience, consistency, and love. Showing up the
          way you do gives your loved one something nothing else can — steady support, and hope.
        </div>
      </div>
    </div>
  );
}
