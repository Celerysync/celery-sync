import { useState, useEffect, lazy, Suspense } from "react";
import C from "../lib/colors.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { useVoiceOrchestrator } from "../context/VoiceContext.jsx";
import { useDailyCheckins } from "../hooks/useDailyCheckins.js";
import { useRhythm } from "../hooks/useRhythm.js";
import { Card } from "./ui.jsx";
import DailyCheckIn from "./DailyCheckIn.jsx";
import HealingTrends from "./HealingTrends.jsx";
import SupplementTracker from "./SupplementTracker.jsx";
import WeeklyReport from "./WeeklyReport.jsx";
import RhythmView from "./RhythmView.jsx";
import MorningCheckIn from "./MorningCheckIn.jsx";
import EveningReflection from "./EveningReflection.jsx";
import { useVoicePrefs } from "../hooks/useVoicePrefs.js";
import { useProtocolNudges } from "../hooks/useProtocolNudges.js";

const RhythmBuilder = lazy(() => import("./RhythmBuilder.jsx"));

const TODAY = new Date().toISOString().split("T")[0];

// Compliance (CLAUDE.md rails / LEGAL_CONSTRAINTS.md): paraphrase + attribute
// only, wellbeing language, no named conditions, no protocol specifics or
// recipes — the books/site are always the pointer for those.
const DAILY_TEACHINGS = [
  "Anthony William teaches that the body is always working on your behalf, quietly doing its repair work every day. Consistent, gentle routines are a way of supporting it.",
  "Anthony William has long shared his view that fresh celery juice, taken on its own, is deeply supportive for general wellbeing — his books explain exactly how he suggests preparing and enjoying it.",
  "Anthony William often speaks of the liver as a hardworking, protective organ, and encourages simple morning habits as a way of gently supporting it.",
  "Anthony William encourages starting the day with hydration — he associates lemon water first thing with gently supporting the body's natural morning rhythm.",
  "Anthony William teaches that rest is never a luxury. Sleep is when the body does some of its most important quiet work, and protecting it matters.",
  "Anthony William speaks warmly of wild blueberries, counting them among the foods he considers most supportive — his books share how he recommends enjoying them.",
  "Anthony William encourages eating steadily through the day, with regular gentle snacks, as a way of supporting even energy.",
  "Anthony William reminds his readers that consistency matters more than perfection — showing up for your routine, even imperfectly, is what builds momentum.",
  "Anthony William encourages self-compassion on the hard days. Your effort counts, and tomorrow is always a fresh start.",
  "Anthony William's books, podcast, and medicalmedium.com are the home of his teachings — for the specifics of any protocol, go straight to the source.",
];

// Celebration copy is about consistency only — reports describe the user's
// own logged behaviour, never physiological effects (TGA rail).
const STREAK_MILESTONES = [
  { days: 7,  emoji: "🌟", title: "One week!", msg: "Seven days in a row. A whole week of showing up for yourself — this is how a routine becomes a rhythm.", color: C.leaf },
  { days: 14, emoji: "✨", title: "Two weeks strong!", msg: "Fourteen days of daily consistency. You're building something that lasts.", color: C.sage },
  { days: 21, emoji: "💫", title: "Three weeks of commitment!", msg: "They say it takes 21 days to build a habit — you've just done it, one day at a time.", color: C.plum },
  { days: 28, emoji: "🏆", title: "One full month!", msg: "Day after day for a whole month, you kept your rhythm. That kind of consistency is something to be genuinely proud of.", color: C.gold },
];

function StreakMilestone({ celeryStreak }) {
  const milestone = [...STREAK_MILESTONES].reverse().find(
    (m) => celeryStreak >= m.days && celeryStreak % m.days < 3
  );
  const [shareCopied, setShareCopied] = useState(false);

  if (!milestone) return null;

  const shareText = `🥬 Day ${celeryStreak} of my daily celery juice rhythm!\n\nI follow the Medical Medium lifestyle and keep my rhythm on track with CelerySync.\n\n🌿 medicalmedium.com\n\n#celeryjuice #medicalmedium #celerysync`;

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
        🥬 {celeryStreak}-day celery streak
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
        Share it with someone who'd cheer you on
      </div>
    </div>
  );
}

function getTodaysTeaching() {
  const dayNum = Math.floor(Date.now() / 86400000);
  return DAILY_TEACHINGS[dayNum % DAILY_TEACHINGS.length];
}

// Time-of-day companion card. Deliberately carries NO food lists or protocol
// steps (compliance: the app never ships protocol content) — the user's own
// rhythm above is the plan; the books are the pointer for meal specifics.
function getNowWindow() {
  const h = new Date().getHours();
  if (h >= 5 && h < 9) return {
    emoji: "🌅", label: "Morning window",
    note: "A gentle start. Your morning rhythm items are on your list above — begin when you're ready.",
    color: C.leaf,
  };
  if (h >= 9 && h < 12) return {
    emoji: "☀️", label: "Mid-morning",
    note: "Keep your pace easy and tick things off as they happen.",
    color: C.sage,
  };
  if (h >= 12 && h < 14) return {
    emoji: "🥗", label: "Midday",
    note: "A natural pause point — a good moment to see how your day is tracking.",
    color: C.sage,
  };
  if (h >= 14 && h < 17) return {
    emoji: "🍎", label: "Afternoon",
    note: "A steady afternoon snack can help keep your energy feeling even.",
    color: C.gold,
  };
  if (h >= 17 && h < 20) return {
    emoji: "🌆", label: "Evening wind-down",
    note: "The day is winding down — anything still on your rhythm can happen at your own pace.",
    color: C.sageDark,
  };
  if (h >= 20 && h < 23) return {
    emoji: "🌙", label: "Evening",
    note: "Time to slow down. Your evening reflection is a lovely way to close the day.",
    color: C.plum,
  };
  return {
    emoji: "🌛", label: "Rest time",
    note: "Rest matters. Let the day go — tomorrow starts fresh.",
    color: C.charcoal,
  };
}

export default function Home({ user, authUser, profileId }) {
  const h = new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";

  const [showRhythmBuilder, setShowRhythmBuilder] = useState(false);

  const {
    sequence,
    baseItems,
    anchorTime,
    setAnchorTime,
    activeProgram,
    currentProgramDay,
    hasMedicine,
    completeItem,
    uncompleteItem,
    addItem,
    updateItem,
    removeItem,
    reorderItems,
    applyTemplate,
    startProgram,
    cancelProgram,
    syncError,
  } = useRhythm(authUser, profileId);

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

  const { speak, speaking, stopSpeaking } = useVoiceOrchestrator();

  // Phase 4 (spec §3.1/§4): companion voice prefs drive the guided morning/
  // evening flows below and the spoken fixed-time nudges.
  const { prefs: voicePrefs, loaded: voicePrefsLoaded } = useVoicePrefs(authUser);
  useProtocolNudges(sequence, voicePrefs, voicePrefsLoaded);

  // Rhythm completion comes from the same ledger-backed sequence the Rhythm
  // list renders (spec §1 single source of truth) — no private checklist copy.
  const rhythmDoneCount = sequence.filter((i) => i.completedAt).length;

  // Healing score (0–100): rhythm 60pts + check-in 25pts + snacks 15pts
  const protocolScore = sequence.length ? Math.round((rhythmDoneCount / sequence.length) * 60) : 0;
  const checkinScore = todaysCheckin ? 25 : 0;
  const snackScore = Math.min(snackCount, 2) * 7;
  const healingScore = protocolScore + checkinScore + snackScore;

  // Streak protection — warn if evening and check-in not done
  const streakAtRisk = h >= 19 && celeryStreak > 2 && (todaysCheckin?.celery_oz ?? 0) === 0;

  // Spoken plan comes ONLY from the user's own item titles (compliance:
  // the app never supplies protocol steps or quantities of its own).
  const remainingNames = sequence.filter((i) => !i.completedAt).map((i) => i.name);
  const morningScript = remainingNames.length > 0
    ? `${greeting}${user?.name ? ", " + user.name : ""}. Here's what's on your rhythm today: ${remainingNames.slice(0, 6).join(", ")}${remainingNames.length > 6 ? `, and ${remainingNames.length - 6} more` : ""}. One thing at a time — you're doing something good for yourself today.`
    : sequence.length > 0
    ? `${greeting}${user?.name ? ", " + user.name : ""}. Everything on your rhythm is done — beautiful work today.`
    : `${greeting}${user?.name ? ", " + user.name : ""}. Your rhythm is empty today. Add your own items whenever you're ready, and I'll read them back to you.`;

  const nowWindow = getNowWindow();

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

  // Voice intake callback — merges parsed fields into today's check-in

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
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
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

      {/* Guided session shapes (spec §4) — each self-gates by hour, its
          user_voice_prefs toggle, and a once-per-day marker */}
      {voicePrefsLoaded && (
        <>
          <MorningCheckIn
            user={user}
            sequence={sequence}
            todaysCheckin={todaysCheckin}
            saveCheckin={saveCheckin}
            prefs={voicePrefs}
          />
          <EveningReflection
            user={user}
            sequence={sequence}
            todaysCheckin={todaysCheckin}
            saveCheckin={saveCheckin}
            prefs={voicePrefs}
          />
        </>
      )}

      {/* Daily rhythm sequence */}
      {syncError && (
        <div style={{
          background: `${C.plum}18`,
          border: `1.5px solid ${C.plum}60`,
          borderRadius: 12,
          padding: "10px 14px",
          fontSize: 13,
          color: C.charcoal,
        }}>
          ⚠️ {syncError}
        </div>
      )}
      <RhythmView
        sequence={sequence}
        anchorTime={anchorTime}
        hasMedicine={hasMedicine}
        activeProgram={activeProgram}
        currentProgramDay={currentProgramDay}
        onComplete={completeItem}
        onUncomplete={uncompleteItem}
        onEdit={() => setShowRhythmBuilder(true)}
      />

      {/* Rhythm builder modal */}
      {showRhythmBuilder && (
        <Suspense fallback={null}>
          <RhythmBuilder
            baseItems={baseItems}
            anchorTime={anchorTime}
            activeProgram={activeProgram}
            profileId={profileId}
            authUser={authUser}
            onClose={() => setShowRhythmBuilder(false)}
            onApplyTemplate={applyTemplate}
            onAddItem={addItem}
            onUpdateItem={updateItem}
            onRemoveItem={removeItem}
            onReorder={reorderItems}
            onSetAnchorTime={setAnchorTime}
            onStartProgram={startProgram}
            onCancelProgram={cancelProgram}
          />
        </Suspense>
      )}

      {/* Weekly healing report — shows Sundays */}
      <WeeklyReport authUser={authUser} profileId={profileId} user={user} />

      {/* Celery streak milestone */}
      <StreakMilestone celeryStreak={celeryStreak} />

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
              const hasProtocol = entry?.protocol_done || (isToday && sequence.length > 0 && rhythmDoneCount === sequence.length);
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
        <SupplementTracker profileId={profileId} />
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
            {waterCount < 8 ? `${8 - waterCount} more to reach today's 8-glass goal` : "Beautifully hydrated today ✓"}
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

      {/* Where you are in the day */}
      <Card style={{ border: `2px solid ${nowWindow.color}30` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal }}>
            {nowWindow.emoji} {nowWindow.label}
          </div>
          <div style={{
            background: `${nowWindow.color}20`,
            borderRadius: 20,
            padding: "3px 10px",
            fontSize: 10,
            color: nowWindow.color,
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {new Date().toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}
          </div>
        </div>
        <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.6 }}>
          {nowWindow.note}
        </div>
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

      {/* Daily teaching — rotates each day */}
      {(() => {
        const teaching = getTodaysTeaching();
        return (
          <div style={{
            background: C.goldLight,
            border: `1px solid ${C.gold}50`,
            borderRadius: 16,
            padding: 18,
          }}>
            <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Today's learning
            </div>
            <div style={{ fontFamily: "Georgia,serif", fontSize: 14, color: C.charcoal, lineHeight: 1.8 }}>
              💛 {teaching}
            </div>
            <div style={{ fontSize: 11, color: C.gold, marginTop: 8 }}>
              Paraphrased from Anthony William's publicly shared teachings
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
