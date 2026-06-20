import { useState, useEffect } from "react";
import C from "../lib/colors.js";
import { useVoice } from "../hooks/useVoice.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { useDailyCheckins } from "../hooks/useDailyCheckins.js";
import { Tag, Card } from "./ui.jsx";
import DailyCheckIn from "./DailyCheckIn.jsx";
import HealingTrends from "./HealingTrends.jsx";
import SupplementTracker from "./SupplementTracker.jsx";
import WeeklyReport from "./WeeklyReport.jsx";

const TODAY = new Date().toISOString().split("T")[0];
const EMPTY_CHECKS = { lemon: false, celery: false, hmd: false };

const AW_QUOTES = [
  { text: "Be proud of using your free will to make your own choice to work on your healing. Have compassion for yourself and know that your suffering is not your fault. I believe you can heal. More than believe — I know.", source: "Cleanse to Heal" },
  { text: "Celery juice is a medical discovery waiting to be made by science. Its sodium cluster salts are some of the most powerful natural antiseptics and antiviral compounds on earth.", source: "Celery Juice" },
  { text: "Your liver works incredibly hard to protect you every day. When you give it the support it needs, it will reward you with energy, clarity, and healing beyond what you imagined possible.", source: "Liver Rescue" },
  { text: "The brain is not aging. The brain is being burdened by toxic heavy metals and viral neurotoxins. Remove these and the brain heals. That is the truth of what is called brain ageing.", source: "Brain Saver" },
  { text: "The thyroid is not attacking itself. The immune system is not confused. The body is fighting a very real pathogen — Epstein-Barr virus. And when you know your enemy, you can win.", source: "Thyroid Healing" },
  { text: "Wild blueberries are the most powerful food on the planet for healing the brain. No other food can do what wild blueberries do for the brain tissue that has been damaged by heavy metals.", source: "Brain Saver" },
  { text: "Your fatigue is not laziness. Your brain fog is not weakness. Your pain is not in your head. You are fighting something real, and this information can help you win.", source: "Medical Medium" },
  { text: "The 3:6:9 Cleanse is the most advanced healing protocol I have ever received. It gives the liver the rest and support it needs to perform the deepest cleanse of your lifetime.", source: "Cleanse to Heal" },
  { text: "Anxiety is not a character flaw. It is a physical condition — adrenaline surges caused by blood sugar instability, viral neurotoxins, and heavy metals affecting the emotional centres of the brain.", source: "Brain Saver Protocols" },
  { text: "Your body wants to heal. Every cell in your body is on your side. The protocols and the foods and the supplements are simply giving your body what it needs to do the work it already knows how to do.", source: "Medical Medium" },
  { text: "Lemon water prepares the liver for its most important morning function — cleansing. The organic acids from the lemon directly support hepatic cell function. There is nothing else like it.", source: "Liver Rescue" },
  { text: "Heavy metals don't stay where they land. They migrate through the body over years and decades. That is why symptoms change. That is why the brain is affected. That is why the HMDS is so important.", source: "Cleanse to Heal" },
  { text: "Adrenal fatigue is real — more real than most medicine currently acknowledges. Your adrenals are like two small walnut-shaped glands carrying the weight of your entire survival system. Honour them.", source: "Medical Medium" },
  { text: "You are not broken. You are not weak. You are not to blame. Your body is fighting something very real that medicine has not yet discovered. Keep going. Keep healing. You are not alone.", source: "Medical Medium" },
  { text: "Zinc is the number one mineral deficiency on the planet. Without zinc, the immune system cannot fight viral and bacterial infections. It is the great protector — the shield your body needs.", source: "Brain Saver Protocols" },
  { text: "The liver is like a best friend who never stops working for you. When you understand what your liver does for you every day — without thanks — you will want to take care of it with everything you have.", source: "Liver Rescue" },
  { text: "EBV is behind more chronic illness than science currently knows. When science finally catches up with what I share, millions of people will have answers they have been waiting decades for.", source: "Thyroid Healing" },
  { text: "Sleep is not a luxury — it is the time when your liver does its most critical work, when neurotoxins are processed, when the brain heals. Prioritise your sleep as if your healing depends on it. Because it does.", source: "Brain Saver" },
  { text: "Spirulina is a gift from the earth. It is the most bioavailable source of protein on the planet and it binds to heavy metals in a way nothing else can, drawing them safely out of your body.", source: "Cleanse to Heal" },
  { text: "Depression is not caused by a serotonin deficiency. It is caused by neurotoxins from viral activity, heavy metals disrupting brain chemistry, and adrenaline exhausting the nervous system. It is a physical condition.", source: "Brain Saver" },
  { text: "The celery juice movement exists because people are healing conditions that have had no answers for decades. When something helps this many people, the world has a responsibility to pay attention.", source: "Celery Juice" },
];

const STREAK_MILESTONES = [
  { days: 7,  emoji: "🌟", title: "One week of healing!", msg: "Seven days of celery juice — your liver's sodium cluster salt reserves are rebuilding. Anthony William says the first week is when the gut lining begins to repair.", color: C.leaf },
  { days: 14, emoji: "✨", title: "Two weeks strong!", msg: "Fourteen days — the longest streak most people maintain. You are in rare company. Your immune system is receiving daily antiviral support and your adrenals are getting steadier.", color: C.sage },
  { days: 21, emoji: "💫", title: "Three weeks of commitment!", msg: "Anthony William teaches that 21 days is when deeper cellular changes begin. Viral loads start to meaningfully reduce at this stage. Your body is doing something profound.", color: C.plum },
  { days: 28, emoji: "🏆", title: "One full month!", msg: "A full lunar cycle of healing. Your liver has had a month of daily sodium cluster salts. This is the kind of sustained effort that produces lasting transformation.", color: C.gold },
];

function getTodaysQuote() {
  const dayNum = Math.floor(Date.now() / 86400000);
  return AW_QUOTES[dayNum % AW_QUOTES.length];
}

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
  const units = localStorage.getItem("cs_units") === "imperial" ? "imperial" : "metric";
  const voiceName = localStorage.getItem("cs_voiceName") || "";

  const [checklist, setChecklist] = useLocalStorage("cs_checklist", {
    date: TODAY,
    checks: EMPTY_CHECKS,
  });
  const [lastSnack, setLastSnack] = useLocalStorage("cs_lastSnack", null);
  const [snackCount, setSnackCount] = useLocalStorage("cs_snackCount_" + TODAY, 0);
  const [waterCount, setWaterCount] = useLocalStorage("cs_water_" + TODAY, 0);
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
  const { speak, speaking, stopSpeaking } = useVoice(voiceName, units);

  // Healing score (0–100): morning protocol 60pts + check-in 25pts + snacks 15pts
  const protocolScore = Object.values(checks).filter(Boolean).length * 20;
  const checkinScore = todaysCheckin ? 25 : 0;
  const snackScore = Math.min(snackCount, 2) * 7;
  const healingScore = protocolScore + checkinScore + snackScore;

  // Streak protection — warn if evening and check-in not done
  const streakAtRisk = h >= 19 && celeryStreak > 2 && !todaysCheckin?.celery_juice;

  const morningScript = units === "metric"
    ? `${greeting}${user?.name ? ", " + user.name : ""}. Start with your lemon water now — 500 millilitres to 1 litre. After 15 to 30 minutes, drink your fresh celery juice — 500 millilitres of pure celery only. After another 15 to 30 minutes, enjoy your Heavy Metal Detox Smoothie with all five Big 5 ingredients together. You are doing something powerful for your body today.`
    : `${greeting}${user?.name ? ", " + user.name : ""}. Start with your lemon water now — 16 to 32 ounces. After 15 to 30 minutes, drink your fresh celery juice — 16 ounces of pure celery only. After another 15 to 30 minutes, enjoy your Heavy Metal Detox Smoothie with all five Big 5 ingredients together. You are doing something powerful for your body today.`;

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
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
          {celeryStreak > 0 && (
            <div style={{ fontSize: 12, opacity: 0.9, background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "3px 10px" }}>
              🥬 {celeryStreak}-day streak
            </div>
          )}
          {healingScore > 0 && (
            <div style={{ fontSize: 12, opacity: 0.9, background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "3px 10px" }}>
              ✨ Today: {healingScore}/100
            </div>
          )}
        </div>
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

      {/* Weekly healing report — shows Sundays */}
      <WeeklyReport authUser={authUser} profileId={profileId} user={user} />

      {/* Celery streak milestone */}
      {(() => {
        const milestone = [...STREAK_MILESTONES].reverse().find((m) => celeryStreak >= m.days && celeryStreak % m.days < 3);
        if (!milestone) return null;
        const shareText = `🥬 Day ${celeryStreak} of my Medical Medium healing journey!\n\nI've been drinking fresh celery juice every single day and following Anthony William's protocols.\n\nIf you're dealing with chronic illness, fatigue, or mystery symptoms — his books changed my life.\n\n🌿 medicalmedium.com\n\n#celeryjuice #medicalmedium #healing #anthonywilliam #celerysync`;
        const [shareCopied, setShareCopied] = useState(false);
        const handleShare = () => {
          if (navigator.share) {
            navigator.share({ text: shareText }).catch(() => {});
          } else {
            navigator.clipboard?.writeText(shareText).catch(() => {});
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2000);
          }
        };
        return (
          <div style={{
            background: `linear-gradient(135deg,${milestone.color}22,${milestone.color}10)`,
            border: `2px solid ${milestone.color}60`,
            borderRadius: 18,
            padding: "16px 18px",
          }}>
            <div style={{ fontSize: 32, marginBottom: 6, textAlign: "center" }}>{milestone.emoji}</div>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16, color: milestone.color, textAlign: "center", marginBottom: 6 }}>
              {milestone.title}
            </div>
            <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.7, textAlign: "center" }}>
              {milestone.msg}
            </div>
            <div style={{ fontSize: 11, color: milestone.color, fontWeight: 700, textAlign: "center", marginTop: 8 }}>
              🥬 {celeryStreak}-day celery streak — Anthony William
            </div>
            <button
              onClick={handleShare}
              style={{
                display: "block", margin: "12px auto 0",
                background: milestone.color, color: C.white,
                border: "none", borderRadius: 30, padding: "8px 20px",
                fontSize: 12, fontFamily: "Georgia,serif", fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {shareCopied ? "✓ Copied — paste & share!" : "🌿 Share this milestone"}
            </button>
            <div style={{ fontSize: 10, color: C.muted, textAlign: "center", marginTop: 6 }}>
              Spreads AW's message to people who need it
            </div>
          </div>
        );
      })()}

      {/* 7-day habit grid */}
      {last7 && last7.length > 0 && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>
              🗓 Your healing week
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>last 7 days</div>
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              const dateStr = d.toISOString().split("T")[0];
              const isToday = dateStr === TODAY;
              const entry = last7.find(c => c.date === dateStr);
              const hasCelery = entry?.celery_juice;
              const hasProtocol = entry?.protocol_done || (isToday && done);
              const hasCheckin = !!entry;
              const score = (hasCelery ? 2 : 0) + (hasProtocol ? 2 : 0) + (hasCheckin ? 1 : 0);
              const color = score >= 4 ? C.sage : score >= 2 ? C.gold : score >= 1 ? C.muted : C.border;
              return (
                <div key={dateStr} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase" }}>
                    {d.toLocaleDateString("en-AU", { weekday: "short" }).slice(0, 2)}
                  </div>
                  <div style={{
                    width: "100%", aspectRatio: "1", borderRadius: 8,
                    background: color,
                    border: isToday ? `2px solid ${C.sageDark}` : "none",
                    opacity: isToday && !hasCheckin ? 0.5 : 1,
                  }} />
                  {isToday && <div style={{ fontSize: 7, color: C.sage, fontWeight: 700 }}>today</div>}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
            {[[C.sage, "Great day"], [C.gold, "Partial"], [C.border, "Rest day"]].map(([col, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: col }} />
                <span style={{ fontSize: 10, color: C.muted }}>{label}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Streak protection warning */}
      {streakAtRisk && (
        <div style={{
          background: "#FEF3C7", border: "2px solid #F59E0B80",
          borderRadius: 16, padding: "14px 16px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ fontSize: 26, flexShrink: 0 }}>⚠️</div>
          <div>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: "#92400E" }}>
              Don't break your {celeryStreak}-day streak!
            </div>
            <div style={{ fontSize: 12, color: "#B45309", marginTop: 2, lineHeight: 1.4 }}>
              Log your celery juice in the daily check-in before midnight to keep it going.
            </div>
          </div>
        </div>
      )}

      {/* Supplement tracker */}
      {authUser && (
        <SupplementTracker userConditions={user?.conditions || []} />
      )}

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

      {/* Water tracker */}
      <div style={{
        background: "#EFF6FF", border: "2px solid #BFDBFE60",
        borderRadius: 16, padding: "14px 16px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ fontSize: 26, flexShrink: 0 }}>💧</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: "#1e40af" }}>
            Water today — {waterCount} {waterCount === 1 ? "glass" : "glasses"}
          </div>
          <div style={{ fontSize: 12, color: "#3b82f6", marginTop: 2 }}>
            {waterCount < 8 ? `${8 - waterCount} more to reach Anthony William's recommended 8 glasses` : "Beautifully hydrated today ✓"}
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} style={{
                width: 20, height: 20, borderRadius: "50%",
                background: i < waterCount ? "#3b82f6" : "#BFDBFE",
                transition: "background 0.2s",
              }} />
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          <button onClick={() => setWaterCount(n => n + 1)} style={{
            background: "#3b82f6", color: "#fff", border: "none",
            borderRadius: 20, padding: "6px 14px", fontSize: 18,
            cursor: "pointer", fontWeight: 700, lineHeight: 1,
          }}>+</button>
          {waterCount > 0 && (
            <button onClick={() => setWaterCount(n => Math.max(0, n - 1))} style={{
              background: "transparent", color: "#93c5fd", border: "1px solid #93c5fd",
              borderRadius: 20, padding: "4px 14px", fontSize: 13,
              cursor: "pointer",
            }}>−</button>
          )}
        </div>
      </div>

      {/* Morning checklist */}
      <Card>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16, color: C.charcoal, marginBottom: 14 }}>
          🌅 Morning Healing Routine
        </div>
        {[
          { k: "lemon", label: units === "metric" ? "Lemon Water (500ml–1 litre)" : "Lemon Water (16–32oz)", sub: "First thing — empty stomach. Nothing before this." },
          { k: "celery", label: units === "metric" ? "Celery Juice (500ml pure fresh)" : "Celery Juice (16oz pure fresh)", sub: "Wait 15–30 min after lemon water. Pure celery only." },
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

      {/* AW daily quote — rotates each day */}
      {(() => {
        const q = getTodaysQuote();
        return (
          <div style={{
            background: C.goldLight,
            border: `1px solid ${C.gold}50`,
            borderRadius: 16,
            padding: 18,
          }}>
            <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Today's healing teaching
            </div>
            <div style={{ fontFamily: "Georgia,serif", fontStyle: "italic", fontSize: 14, color: C.charcoal, lineHeight: 1.8 }}>
              💛 "{q.text}"
            </div>
            <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, marginTop: 8 }}>
              — Anthony William, {q.source}
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
        );
      })()}
    </div>
  );
}
