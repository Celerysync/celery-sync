import C from "../lib/colors.js";
import { Card, Btn } from "./ui.jsx";
import { useVoice } from "../hooks/useVoice.js";

function getNowCareTask() {
  const h = new Date().getHours();
  if (h >= 5 && h < 9) return {
    emoji: "🌅", label: "Morning protocol time",
    prep: ["Juice 16oz fresh celery — pure, nothing added", "Squeeze 1–2 lemons into 16–32oz water", "Prepare HMDS: blended wild blueberries, banana, spirulina, barley grass, Atlantic dulse, cilantro, orange juice"],
    offer: "Offer lemon water first. Wait 15–30 min before celery juice. Then HMDS.",
    tip: "Tip: Cold-press juicing retains the most healing properties. If they're too tired to drink, warm the lemon water slightly — it's easier to get down.",
  };
  if (h >= 9 && h < 12) return {
    emoji: "☀️", label: "Mid-morning care",
    prep: ["Prepare a fruit plate: apple slices, banana, papaya, mango", "Or fresh orange juice", "Ensure they're hydrated — sip water throughout"],
    offer: "Offer mono fruit — one type at a time is easiest on their system.",
    tip: "Tip: If they have brain fog or fatigue, banana + dates is the fastest energy source. Don't worry if they want to eat slowly.",
  };
  if (h >= 12 && h < 14) return {
    emoji: "🥗", label: "Lunch preparation",
    prep: ["Wash and prepare leafy greens: spinach, romaine, cucumber", "Steam or bake potato/sweet potato", "Make simple lemon dressing: lemon juice + olive oil + herbs"],
    offer: "A large salad with steamed potato is ideal. Keep it simple.",
    tip: "Tip: Heavy dressings, cheese, and oils burden the liver. Lemon + quality olive oil is the AW-approved choice.",
  };
  if (h >= 14 && h < 17) return {
    emoji: "🍎", label: "Adrenal snack time",
    prep: ["Apple + celery sticks (the most powerful AW combo)", "Banana + 3–4 Medjool dates", "Coconut water + banana", "Keep snacks ready every 2 hours"],
    offer: "Offer a snack now and set a 2-hour reminder for the next one.",
    tip: "Tip: This window is critical — Anthony William teaches that adrenals restore between 3–4pm. Even small snacks matter enormously for very unwell people.",
  };
  if (h >= 17 && h < 20) return {
    emoji: "🌆", label: "Dinner time",
    prep: ["Steam vegetables: broccoli, zucchini, asparagus, Brussels sprouts", "Bake potato or sweet potato (filling, gentle)", "Option: warm vegetable soup or mashed potato"],
    offer: "Dinner light and early. Their liver needs to rest from 1–3am, so finishing by 7pm is ideal.",
    tip: "Tip: If they're very fatigued, a warming mashed potato with lemon and a few herbs is both nourishing and easy to eat lying down.",
  };
  return {
    emoji: "🌙", label: "Evening care",
    prep: ["Cucumber slices or watermelon", "Herbal tea: lemon balm, peppermint, or ginger", "Ensure they've had water throughout the day"],
    offer: "If they need something, light fruit only. The goal now is rest.",
    tip: "Tip: Lemon balm tea is especially powerful for the nervous system — Anthony William calls it one of the most healing herbs. Good before bed.",
  };
}

export default function CaregiverDashboard({ patient }) {
  const { speak, speaking, stopSpeaking } = useVoice();
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
            Ask the AI Guide (below) for specific care guidance for these conditions — what to prepare, what to avoid, what healing reactions to expect.
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
            ⏰ Adrenal snack reminder
          </div>
          <div style={{ fontSize: 12, color: C.mid, lineHeight: 1.6 }}>
            Anthony William teaches adrenal snacks every 2 hours between 10am–6pm are critical for very unwell patients. Don't skip this — even small amounts help. Apple + celery, banana + dates, or coconut water + banana.
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
        {[
          { label: "Healing reactions (normal)", items: ["Increased fatigue (the body is working)", "Temporary skin breakouts", "Loose stools or digestive changes", "Heightened emotions or mood shifts", "Temporary increase in symptoms before improvement"], color: C.sage },
          { label: "When to pause and consult a doctor", items: ["Fever above 38.5°C", "Severe pain or inability to keep anything down", "Signs of dehydration", "Any chest pain or breathing difficulty"], color: C.terracotta },
        ].map(({ label, items, color }) => (
          <div key={label} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 6 }}>{label}</div>
            {items.map((item) => (
              <div key={item} style={{ display: "flex", gap: 8, fontSize: 12, color: C.charcoal, marginBottom: 3 }}>
                <span style={{ color, flexShrink: 0 }}>•</span>
                {item}
              </div>
            ))}
          </div>
        ))}
        <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.6 }}>
          Anthony William teaches that healing reactions are a sign the protocol is working. Always trust your instincts and consult your doctor for anything serious.
        </div>
      </Card>

      {/* AW quote for carers */}
      <div style={{
        background: C.goldLight, border: `1px solid ${C.gold}50`, borderRadius: 16, padding: 18,
      }}>
        <div style={{ fontFamily: "Georgia,serif", fontStyle: "italic", fontSize: 14, color: C.charcoal, lineHeight: 1.8 }}>
          💛 "The people who love and care for those with chronic illness are angels on earth. Your consistency, your patience, and your willingness to learn gives your loved one the most powerful medicine there is — hope."
        </div>
        <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, marginTop: 8 }}>
          — Inspired by Anthony William, Medical Medium
        </div>
      </div>
    </div>
  );
}
