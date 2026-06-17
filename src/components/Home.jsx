import { useState, useEffect } from "react";
import C from "../lib/colors.js";
import { useVoice } from "../hooks/useVoice.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { useDailyCheckins } from "../hooks/useDailyCheckins.js";
import { Tag, Card } from "./ui.jsx";
import DailyCheckIn from "./DailyCheckIn.jsx";
import HealingTrends from "./HealingTrends.jsx";

const TODAY = new Date().toISOString().split("T")[0];
const EMPTY_CHECKS = { lemon: false, celery: false, hmd: false };

function getNowFood() {
  const h = new Date().getHours();
  if (h >= 5 && h < 9) return {
    emoji: "🌅", label: "Morning routine window",
    items: ["Lemon water (16–32oz) — first thing, empty stomach", "Celery juice (16oz pure) — 15–30 min after lemon water", "Heavy Metal Detox Smoothie — 15–30 min after celery juice"],
    note: "Anthony William: this exact sequence is the most important part of your healing day.",
    color: C.leaf,
  };
  if (h >= 9 && h < 12) return {
    emoji: "☀️", label: "Mid-morning",
    items: ["Mono fruit: apple, pear, mango, papaya, or banana", "Or banana + Medjool dates", "Or fresh orange/grapefruit juice"],
    note: "Keep it to fruit only — your liver is still in its cleansing window until noon.",
    color: C.sage,
  };
  if (h >= 12 && h < 14) return {
    emoji: "🥗", label: "Lunch window",
    items: ["Large leafy green salad with lemon dressing", "Steamed potato or sweet potato", "Cucumber, celery, tomato, avocado", "Or continue with mono fruit if not hungry"],
    note: "Per Anthony William: fat-free at lunch if doing deeper healing — avocado is the exception.",
    color: C.sage,
  };
  if (h >= 14 && h < 17) return {
    emoji: "🍎", label: "Adrenal snack window",
    items: ["Apple + celery sticks (the classic AW combination)", "Banana + Medjool dates (3–4)", "Coconut water + banana", "Dates + apple slices"],
    note: "Anthony William teaches: sodium + potassium + natural sugar together stabilises blood sugar and rebuilds adrenal reserves.",
    color: C.gold,
  };
  if (h >= 17 && h < 20) return {
    emoji: "🌆", label: "Dinner window",
    items: ["Steamed vegetables: broccoli, Brussels sprouts, asparagus, zucchini", "Baked potato, sweet potato, or wild rice", "Large salad with lemon-olive oil dressing", "Or a warming vegetable soup"],
    note: "Anthony William: dinner should be lighter than you think — the liver does its deepest work from 1–3am and needs you to have eaten early.",
    color: C.sageDark,
  };
  if (h >= 20 && h < 23) return {
    emoji: "🌙", label: "Evening",
    items: ["Cucumber slices", "Watermelon or apple", "Banana", "Herbal tea (lemon balm, peppermint, or ginger)"],
    note: "Anthony William: if you need something, fruit or nothing is ideal at this hour — it supports your liver's overnight cleanse.",
    color: C.plum,
  };
  return {
    emoji: "🌛", label: "Rest time",
    items: [],
    note: "Anthony William: your liver works hardest from 1–3am. Rest is healing — let your body do its work.",
    color: C.charcoal,
  };
}

export default function Home({ user, authUser, profileId }) {
  const h = new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";

  const [checklist, setChecklist] = useLocalStorage("cs_checklist", {
    date: TODAY,
    checks: EMPTY_CHECKS,
  });
  const [lastSnack, setLastSnack] = useLocalStorage("cs_lastSnack", null);
  const [snackCount, setSnackCount] = useLocalStorage("cs_snackCount_" + TODAY, 0);
  const [now, setNow] = useState(Date.now());
  const [savingCheckin, setSavingCheckin] = useState(false);

  const {
    todaysCheckin, last7, celeryStreak, protocolDays, avgEnergy7,
    loadCheckins, saveCheckin,
  } = useDailyCheckins(authUser, profileId);

  useEffect(() => {
    loadCheckins();
  }, [authUser?.id, profileId]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const checks = checklist.date === TODAY ? checklist.checks : EMPTY_CHECKS;
  const setChecks = (updater) => {
    const next = typeof updater === "function" ? updater(checks) : updater;
    setChecklist({ date: TODAY, checks: next });
  };

  const done = Object.values(checks).every(Boolean);
  const { speak, speaking, stopSpeaking } = useVoice();

  const morningScript = `${greeting}${user?.name ? ", " + user.name : ""}. Start with your lemon water now — 16 to 32 ounces. After 15 to 30 minutes, drink your fresh celery juice — 16 ounces of pure celery only. After another 15 to 30 minutes, enjoy your Heavy Metal Detox Smoothie with all five Big 5 ingredients together. You are doing something powerful for your body today.`;

  const nowFood = getNowFood();

  const minutesSinceSnack = lastSnack ? (now - new Date(lastSnack).getTime()) / 60_000 : null;
  const isAwakeHours = h >= 7 && h <= 20;
  const snackOverdue = isAwakeHours && (minutesSinceSnack === null || minutesSinceSnack >= 120);
  const snackSoonDue = isAwakeHours && minutesSinceSnack !== null && minutesSinceSnack >= 90 && minutesSinceSnack < 120;

  const markSnack = () => {
    setLastSnack(new Date().toISOString());
    setSnackCount((n) => n + 1);
  };

  const formatSnackAgo = () => {
    if (minutesSinceSnack === null) return null;
    if (minutesSinceSnack < 60) return `${Math.round(minutesSinceSnack)} min ago`;
    return `${(minutesSinceSnack / 60).toFixed(1).replace(".0", "")} hr ago`;
  };

  const handleSaveCheckin = async (data) => {
    setSavingCheckin(true);
    await saveCheckin(data);
    setSavingCheckin(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Header banner */}
      <div style={{
        background: `linear-gradient(135deg,${C.sageDark},${C.leaf})`,
        borderRadius: 20,
        padding: "20px 20px 16px",
        color: C.white,
      }}>
        <div style={{ fontSize: 12, opacity: 0.8, letterSpacing: 1, textTransform: "uppercase" }}>
          {new Date().toLocaleDateString("en-AU", { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 24, fontWeight: 700, marginTop: 4 }}>
          {greeting}{user?.name ? ", " + user.name : ""} 🌿
        </div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>Your healing journey continues</div>
        {celeryStreak > 0 && (
          <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>
            🥬 {celeryStreak}-day celery streak · {protocolDays} days checked in
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => (speaking ? stopSpeaking() : speak(morningScript))}
            style={{
              background: "rgba(255,255,255,0.2)",
              color: C.white,
              border: "1px solid rgba(255,255,255,0.4)",
              borderRadius: 30,
              padding: "7px 14px",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "Georgia,serif",
              fontWeight: 700,
            }}
          >
            {speaking ? "⏹ Stop" : "🔊 Read My Morning Plan"}
          </button>
        </div>
      </div>

      {/* Daily check-in */}
      {authUser && (
        <DailyCheckIn
          todaysCheckin={todaysCheckin}
          userSymptoms={user?.conditions || []}
          onSave={handleSaveCheckin}
          saving={savingCheckin}
          authUser={authUser}
        />
      )}

      {/* Adrenal snack reminder */}
      {isAwakeHours && (
        <div style={{
          background: snackOverdue ? (minutesSinceSnack === null ? C.goldLight : "#FEF3C7") : C.sageLight,
          border: `2px solid ${snackOverdue ? C.gold : C.sage}60`,
          borderRadius: 16,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <div style={{ fontSize: 26, flexShrink: 0 }}>
            {snackOverdue ? "⏰" : "✅"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>
              {snackOverdue
                ? minutesSinceSnack === null
                  ? "Adrenal snack reminder"
                  : "Time for an adrenal snack!"
                : snackSoonDue
                ? "Adrenal snack coming up soon"
                : "Adrenals supported ✓"}
            </div>
            <div style={{ fontSize: 12, color: C.mid, marginTop: 2 }}>
              {minutesSinceSnack === null
                ? "Tap when you've had your first adrenal snack today"
                : snackOverdue
                ? `Last snack ${formatSnackAgo()} — Anthony William recommends every 2 hours`
                : `Last snack ${formatSnackAgo()} · ${snackCount} today`}
            </div>
          </div>
          <button
            onClick={markSnack}
            style={{
              background: snackOverdue ? C.gold : C.sage,
              color: C.white,
              border: "none",
              borderRadius: 20,
              padding: "7px 12px",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "Georgia,serif",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            Had it ✓
          </button>
        </div>
      )}

      {/* Morning checklist */}
      <Card>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16, color: C.charcoal, marginBottom: 14 }}>
          🌅 Morning Healing Routine
        </div>
        {[
          { k: "lemon", label: "Lemon Water (16–32oz)", sub: "First thing — empty stomach. Nothing before this." },
          { k: "celery", label: "Celery Juice (16oz pure fresh)", sub: "Wait 15–30 min after lemon water. Pure celery only." },
          { k: "hmd", label: "Heavy Metal Detox Smoothie", sub: "Wait 15–30 min after celery juice. All Big 5 together." },
        ].map(({ k, label, sub }) => (
          <div
            key={k}
            onClick={() => setChecks((c) => ({ ...c, [k]: !c[k] }))}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 0",
              borderBottom: `1px solid ${C.border}`,
              cursor: "pointer",
              opacity: checks[k] ? 0.45 : 1,
            }}
          >
            <div style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: checks[k] ? C.sage : "transparent",
              border: `2px solid ${checks[k] ? C.sage : C.border}`,
              color: C.white,
              fontWeight: 700,
            }}>
              {checks[k] ? "✓" : ""}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.charcoal, textDecoration: checks[k] ? "line-through" : "none" }}>
                {label}
              </div>
              <div style={{ fontSize: 12, color: C.muted }}>{sub}</div>
            </div>
          </div>
        ))}
        {done && (
          <div style={{ textAlign: "center", marginTop: 12, color: C.sage, fontFamily: "Georgia,serif", fontWeight: 700 }}>
            ✨ Morning routine complete! Beautiful work.
          </div>
        )}
      </Card>

      {/* What to eat right now */}
      <Card style={{ border: `2px solid ${nowFood.color}30` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal }}>
              {nowFood.emoji} {nowFood.label}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>What to eat right now</div>
          </div>
          <div style={{
            background: `${nowFood.color}20`,
            borderRadius: 20,
            padding: "3px 10px",
            fontSize: 10,
            color: nowFood.color,
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {new Date().toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}
          </div>
        </div>
        {nowFood.items.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {nowFood.items.map((item) => (
              <div key={item} style={{ display: "flex", gap: 8, fontSize: 13, color: C.charcoal }}>
                <span style={{ color: nowFood.color, fontWeight: 700, flexShrink: 0 }}>•</span>
                {item}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: C.muted, fontStyle: "italic" }}>Rest — no eating now</div>
        )}
        {nowFood.note && (
          <div style={{ marginTop: 10, fontSize: 11, color: C.muted, lineHeight: 1.6, fontStyle: "italic" }}>
            {nowFood.note}
          </div>
        )}
      </Card>

      {/* Healing trends — shown once tracking has started */}
      {authUser && (
        <HealingTrends
          last7={last7}
          celeryStreak={celeryStreak}
          protocolDays={protocolDays}
          avgEnergy7={avgEnergy7}
        />
      )}

      {/* Include today */}
      <Card>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 10 }}>
          🍃 Include Today
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {["Wild blueberries", "Leafy greens", "Cucumber", "Apples", "Papaya", "Lemons", "Bananas", "Asparagus"].map((f) => (
            <Tag key={f} color={C.leaf}>{f}</Tag>
          ))}
        </div>
      </Card>

      {/* Avoid today */}
      <Card>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 10 }}>
          🚫 Avoid Today
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {["Eggs", "Dairy", "Gluten", "Corn", "Soy", "Pork", "Canola oil", "Vinegar", "MSG", "Caffeine"].map((f) => (
            <Tag key={f} color={C.terracotta}>{f}</Tag>
          ))}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>
          These feed viruses and burden the liver — per Anthony William, Cleanse to Heal.
        </div>
      </Card>

      {/* AW quote */}
      <div style={{
        background: C.goldLight,
        border: `1px solid ${C.gold}50`,
        borderRadius: 16,
        padding: 18,
      }}>
        <div style={{ fontFamily: "Georgia,serif", fontStyle: "italic", fontSize: 14, color: C.charcoal, lineHeight: 1.8 }}>
          💛 "Be proud of using your free will to make your own choice to work on your healing.
          Have compassion for yourself and know that your suffering is not your fault. I believe
          you can heal. More than believe — I know."
        </div>
        <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, marginTop: 8 }}>
          — Anthony William, Cleanse to Heal
        </div>
        <a
          href="https://medicalmedium.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "inline-block", marginTop: 10, color: C.gold, fontSize: 12, fontWeight: 700 }}
        >
          Visit medicalmedium.com →
        </a>
      </div>
    </div>
  );
}
