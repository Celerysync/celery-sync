import { useMemo, useState, useEffect, lazy, Suspense } from "react";
import { realName } from "../hooks/useProfiles.js";
import { announceActivity } from "../lib/appActivity.js";
import C, { alpha } from "../lib/colors.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { useVoiceOrchestrator } from "../context/VoiceContext.jsx";
import { useDailyCheckins } from "../hooks/useDailyCheckins.js";
import { useRhythm } from "../hooks/useRhythm.js";
import { useWater } from "../hooks/useWater.js";
import GettingStarted from "./GettingStarted.jsx";
import DailyCheckIn from "./DailyCheckIn.jsx";
import SupplementTracker from "./SupplementTracker.jsx";
import { useUserSupplements } from "../hooks/useUserSupplements.js";
import { supplementsByStep, tickSupplements } from "../lib/supplementTicks.js";
import WeeklyReport from "./WeeklyReport.jsx";
import RhythmView from "./RhythmView.jsx";
import MorningCheckIn from "./MorningCheckIn.jsx";
import EveningReflection from "./EveningReflection.jsx";
import { useProtocolNudges } from "../hooks/useProtocolNudges.js";
import { localDateStr, parseOccurrenceId } from "../lib/rhythmSchedule.js";
import { useMealPlan } from "../hooks/useMealPlan.js";
import { useKitchen } from "../hooks/useKitchen.js";
import { planForSteps, SLOT_LABEL } from "../lib/mealPlan.js";

const RhythmBuilder = lazy(() => import("./RhythmBuilder.jsx"));
const RecipeSheet = lazy(() => import("./RecipeSheet.jsx"));
// Full supplements page (list management + shop) — opened from Today's
// supplements card now that it no longer has its own tab.
const Supplements = lazy(() => import("./Supplements.jsx"));


// Compliance (CLAUDE.md rails / LEGAL_CONSTRAINTS.md): paraphrase + attribute
// only, wellbeing language, no named conditions, no protocol specifics or
// recipes — the books/site are always the pointer for those.
// Only teachings about rest, consistency and kindness to yourself. Ones that
// named foods, drinks or organs were the app serving protocol content, which
// the rails don't allow; the person's own rhythm and books cover those.
const DAILY_TEACHINGS = [
  "Anthony William teaches that rest is never a luxury, and that protecting your sleep matters.",
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

function StreakMilestone({ streak }) {
  const milestone = [...STREAK_MILESTONES].reverse().find(
    (m) => streak >= m.days && streak % m.days < 3
  );
  const [shareCopied, setShareCopied] = useState(false);

  if (!milestone) return null;

  const shareText = `🌿 Day ${streak} of showing up for my daily rhythm!\n\nI keep my routine on track with CelerySync.\n\n#celerysync`;

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
      <div style={{ fontSize: 12, color: milestone.color, fontWeight: 700, textAlign: "center", marginTop: 8 }}>
        🌿 {streak}-day showed-up streak
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
      <div style={{ fontSize: 12, color: C.muted, textAlign: "center", marginTop: 6 }}>
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
function WelcomeBack({ name, daysAway, doneToday, onShowRhythm, onTalk, onDismiss }) {
  if (doneToday) {
    return (
      <div style={{ background: C.sageLight, border: `2px solid ${alpha(C.sage, "50")}`, borderRadius: 18, padding: "14px 18px" }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.sageDark }}>
          💚 That's it — you're back.
        </div>
        <div style={{ fontSize: 13, color: C.charcoal, marginTop: 4, lineHeight: 1.6 }}>
          One thing done is a full win today. Anything more is a bonus.
        </div>
      </div>
    );
  }
  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.sageLight}, #fff)`, border: `2px solid ${alpha(C.sage, "50")}`,
      borderRadius: 18, padding: "18px 18px 14px", position: "relative",
    }}>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{ position: "absolute", top: 8, right: 10, background: "none", border: "none", fontSize: 16, color: C.muted, cursor: "pointer" }}
      >✕</button>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 18, color: C.sageDark, marginBottom: 6 }}>
        🌿 Welcome back{name ? `, ${name}` : ""}
      </div>
      <div style={{ fontSize: 14, color: C.charcoal, lineHeight: 1.7 }}>
        {daysAway >= 14 ? "It's been a while" : `It's been ${daysAway} days`} — and that's okay. Life and health
        don't run in straight lines. There's nothing to catch up on: today is a fresh start.
      </div>
      <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.6, marginTop: 8 }}>
        Just <strong>one thing</strong> from your rhythm today is a full win.
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button onClick={onShowRhythm} style={{
          background: C.sageDark, color: C.white, border: "none", borderRadius: 30,
          padding: "9px 16px", fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, cursor: "pointer",
        }}>Pick one thing →</button>
        {onTalk && (
          <button onClick={onTalk} style={{
            background: "transparent", color: C.sageDark, border: `1.5px solid ${C.sage}`, borderRadius: 30,
            padding: "9px 16px", fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>🎙 Talk it through</button>
        )}
      </div>
    </div>
  );
}

export default function Home({ user, authUser, profileId, onNavigate, navSeq = 0, hasVoice = true }) {
  // Local calendar day, worked out each render (not UTC, not frozen at load).
  const TODAY = localDateStr();
  const h = new Date().getHours();
  const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";

  const [showRhythmBuilder, setShowRhythmBuilder] = useState(false); // false | true (old full editor) | { level, itemId }
  const [showSupplements, setShowSupplements] = useState(false);
  const [openRecipeId, setOpenRecipeId] = useState(null);
  // Being taken somewhere (by the companion or a link) closes panels that
  // would cover it — e.g. "go to my mood" while the rhythm editor is open.
  const [seenNavSeq, setSeenNavSeq] = useState(navSeq);
  if (seenNavSeq !== navSeq) {
    setSeenNavSeq(navSeq);
    setShowRhythmBuilder(false);
    setShowSupplements(false);
  }
  const [welcomeBackDismissed, setWelcomeBackDismissed] = useLocalStorage("cs_welcomeBackDismissed", null);

  // "You're not alone": an anonymous count of people who showed up for their
  // own rhythm today (server returns null below 5, so nothing shows until
  // there are enough people for it to mean something).
  const [othersToday, setOthersToday] = useState(null);
  useEffect(() => {
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    fetch(`/api/community/today?date=${date}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setOthersToday(typeof j?.count === "number" ? j.count : null))
      .catch(() => {});
  }, []);

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
    anotherRound,
    lastFinishedProgram,
    dismissLastFinished,
    syncError,
    programSyncError,
  } = useRhythm(authUser, profileId);

  // Supplements linked to a step ("B12 with my smoothie"), for Today's rows.
  const { supplements: userSupplements } = useUserSupplements(profileId);
  const takenWith = useMemo(() => supplementsByStep(userSupplements), [userSupplements]);

  // Water lives in the history now (lib/waterEvents.js), not just this phone.
  const { count: waterCount, add: addWater, remove: removeWater, error: waterError } = useWater(authUser, profileId);
  const [, setNow] = useState(Date.now()); // re-render each minute so 'Up next' and times stay current
  const [savingCheckin, setSavingCheckin] = useState(false);

  const {
    todaysCheckin, showedUpStreak,
    daysAway, totalShowedUpDays, activeToday,
    loadCheckins, saveCheckin,
  } = useDailyCheckins(authUser, profileId);

  useEffect(() => {
    loadCheckins();
  }, [authUser?.id, profileId]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Phase 4 (spec §3.1/§4): companion voice prefs drive the guided morning/
  // evening flows below and the spoken fixed-time nudges. One shared copy
  // lives in VoiceContext so a change in Settings is heard here immediately.
  const { speak, speaking, stopSpeaking, voicePrefs, voicePrefsLoaded } = useVoiceOrchestrator();
  useProtocolNudges(sequence, voicePrefs, voicePrefsLoaded);

  // Their own recipes on today's steps: a plan for today ("potato bake for
  // dinner") wins over the step's usual recipe.
  const { recipes: kitchenRecipes } = useKitchen(profileId);
  const { entries: planEntries } = useMealPlan(profileId, localDateStr());
  const todaysPlan = useMemo(() => {
    const steps = [];
    const seen = new Set();
    for (const s of sequence) {
      const { itemId } = parseOccurrenceId(s.id);
      if (!seen.has(itemId)) { seen.add(itemId); steps.push({ id: itemId, name: s.name, recipeId: s.recipeId ?? null }); }
    }
    return { steps, ...planForSteps(planEntries, steps) };
  }, [sequence, planEntries]);
  const recipeFor = (occId) => {
    const { itemId } = parseOccurrenceId(occId);
    const planned = todaysPlan.byItem[itemId];
    if (planned) return { ...planned, planned: true };
    const step = todaysPlan.steps.find((s) => s.id === itemId);
    if (!step?.recipeId) return null;
    const r = kitchenRecipes.find((x) => x.id === step.recipeId);
    return { recipeId: step.recipeId, recipeName: r?.name ?? null, planned: false };
  };

  // Rhythm completion comes from the same ledger-backed sequence the Rhythm
  // list renders (spec §1 single source of truth) — no private checklist copy.
  const rhythmDoneCount = sequence.filter((i) => i.completedAt).length;


  // Streak protection — evening, a streak worth keeping, nothing ticked yet today
  const streakAtRisk = h >= 19 && showedUpStreak > 2 && sequence.length > 0 && rhythmDoneCount === 0;

  // Spoken plan comes ONLY from the user's own item titles (compliance:
  // the app never supplies protocol steps or quantities of its own).
  const remainingNames = sequence.filter((i) => !i.completedAt).map((i) => i.name);
  const morningScript = remainingNames.length > 0
    ? `${greeting}${realName(user) ? ", " + realName(user) : ""}. Here's what's on your rhythm today: ${remainingNames.slice(0, 6).join(", ")}${remainingNames.length > 6 ? `, and ${remainingNames.length - 6} more` : ""}. One thing at a time — you're doing something good for yourself today.`
    : sequence.length > 0
    ? `${greeting}${realName(user) ? ", " + realName(user) : ""}. Everything on your rhythm is done — beautiful work today.`
    : `${greeting}${realName(user) ? ", " + realName(user) : ""}. Your rhythm is empty today. Add your own items whenever you're ready, and I'll read them back to you.`;

  const handleSaveCheckin = async (data) => {
    setSavingCheckin(true);
    await saveCheckin(data);
    setSavingCheckin(false);
    const said = [
      data?.energy ? `energy ${data.energy}/5` : null,
      data?.emotional_state ? `feeling ${data.emotional_state}` : null,
      data?.mental_clarity ? `clarity ${data.mental_clarity}/5` : null,
      data?.symptoms?.length ? `symptoms: ${data.symptoms.join(", ")}` : null,
    ].filter(Boolean).join(", ");
    announceActivity(`saved today's check-in${said ? ` (${said})` : ""}`);
  };

  // Voice intake callback — merges parsed fields into today's check-in

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Welcome back — after 3+ days away; stays (as a "you're back" note) once they tick one thing */}
      {daysAway != null && daysAway >= 3 && welcomeBackDismissed !== TODAY && (!activeToday || rhythmDoneCount > 0) && (
        <WelcomeBack
          name={realName(user)}
          daysAway={daysAway}
          doneToday={rhythmDoneCount > 0}
          onShowRhythm={() => document.getElementById("section-rhythm")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          onTalk={onNavigate ? () => onNavigate("companion:talk") : null}
          onDismiss={() => setWelcomeBackDismissed(TODAY)}
        />
      )}

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
          {greeting}{realName(user) ? ", " + realName(user) : ""} 🌿
        </div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>Your routine, one day at a time</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
          {showedUpStreak > 0 ? (
            <div style={{ fontSize: 12, opacity: 0.9, background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "3px 10px" }}>
              🌿 {showedUpStreak}-day streak
            </div>
          ) : totalShowedUpDays > 0 && (
            // A broken streak never shows as zero — the total never resets.
            <div style={{ fontSize: 12, opacity: 0.9, background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "3px 10px" }}>
              🌿 {totalShowedUpDays} {totalShowedUpDays === 1 ? "day" : "days"} shown up
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
            {speaking ? "⏹ Stop" : "🔊 Read Today's Plan"}
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

      {/* For someone new: one thing at a time */}
      <GettingStarted
        profileId={profileId}
        user={user}
        authUser={authUser}
        hasVoice={hasVoice}
        stepsCount={sequence.length}
        doneToday={rhythmDoneCount}
        hasCheckin={!!todaysCheckin}
        supplementsCount={userSupplements.length}
        recipesCount={kitchenRecipes.length}
        onAddStep={() => setShowRhythmBuilder({ level: "add" })}
        onShowCheckin={() => document.getElementById("section-checkin")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        onOpenSupplements={() => setShowSupplements(true)}
        onOpenKitchen={onNavigate ? () => onNavigate("kitchen") : null}
      />

      {/* Daily rhythm sequence */}
      {syncError && (
        <div style={{
          background: `${alpha(C.plum, "18")}`,
          border: `1.5px solid ${alpha(C.plum, "60")}`,
          borderRadius: 12,
          padding: "10px 14px",
          fontSize: 13,
          color: C.charcoal,
        }}>
          ⚠️ {syncError}
        </div>
      )}
      {programSyncError && (
        <div role="alert" style={{
          background: `${alpha(C.plum, "18")}`,
          border: `1.5px solid ${alpha(C.plum, "60")}`,
          borderRadius: 12,
          padding: "10px 14px",
          fontSize: 13,
          color: C.charcoal,
        }}>
          ⚠️ Your program couldn't be saved to your account just now, so it may not show on your other devices. Please try again in a moment.
        </div>
      )}
      {othersToday != null && (
        <div style={{ textAlign: "center", fontSize: 13, color: C.mid, fontFamily: "Georgia,serif", marginTop: -4 }}>
          🌿 {rhythmDoneCount > 0
            ? `You're one of ${othersToday.toLocaleString()} people who showed up for their rhythm today.`
            : `${othersToday.toLocaleString()} people have shown up for their rhythm today — you're not alone.`}
        </div>
      )}
      <div id="section-rhythm" style={{ scrollMarginTop: 80 }} />
      <RhythmView
        sequence={sequence}
        anchorTime={anchorTime}
        hasMedicine={hasMedicine}
        activeProgram={activeProgram}
        currentProgramDay={currentProgramDay}
        onComplete={(occId) => completeItem(occId, recipeFor(occId))}
        recipeFor={recipeFor}
        plannedLoose={todaysPlan.loose.map((e) => ({ id: e.id, recipeId: e.recipe_id, label: `${SLOT_LABEL[e.slot]}: ${e.recipe.name}` }))}
        onUncomplete={uncompleteItem}
        onEdit={() => setShowRhythmBuilder(true)}
        onOpen={(level, itemId) => setShowRhythmBuilder({ level, itemId })}
        lastFinishedProgram={lastFinishedProgram}
        onAnotherRound={anotherRound}
        onDismissFinished={dismissLastFinished}
        takenWith={takenWith}
        onTickTakenWith={(list) => tickSupplements({ userId: authUser?.id, profileId, supplements: list })}
        onOpenRecipe={setOpenRecipeId}
      />

      {openRecipeId && (
        <Suspense fallback={null}>
          <RecipeSheet
            profileId={profileId}
            recipeId={openRecipeId}
            onClose={() => setOpenRecipeId(null)}
            onOpenKitchen={onNavigate ? () => { setOpenRecipeId(null); onNavigate("kitchen"); } : null}
          />
        </Suspense>
      )}

      {/* Rhythm builder modal */}
      {showSupplements && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50, background: C.cream,
          overflowY: "auto", padding: "calc(14px + env(safe-area-inset-top, 0px)) 14px 40px",
        }}>
          <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 18, color: C.charcoal }}>💊 Supplements</div>
              <button
                onClick={() => setShowSupplements(false)}
                style={{
                  background: C.sageDark, color: C.white, border: "none", borderRadius: 30,
                  padding: "8px 16px", fontFamily: "Georgia,serif", fontWeight: 700, cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
            <Suspense fallback={<div style={{ textAlign: "center", padding: 32, color: C.muted }}>🌿</div>}>
              <Supplements authUser={authUser} user={user} profileId={profileId} />
            </Suspense>
          </div>
        </div>
      )}

      {showRhythmBuilder && (
        <Suspense fallback={null}>
          <RhythmBuilder
            baseItems={baseItems}
            anchorTime={anchorTime}
            activeProgram={activeProgram}
            profileId={profileId}
            authUser={authUser}
            onClose={() => setShowRhythmBuilder(false)}
            openAt={typeof showRhythmBuilder === "object" ? showRhythmBuilder : null}
            key={typeof showRhythmBuilder === "object" ? `${showRhythmBuilder.level}-${showRhythmBuilder.itemId || ""}` : "full"}
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

      {/* Streak protection warning */}
      {streakAtRisk && (
        <div style={{
          background: alpha("#F59E0B", "26"), border: "2px solid #F59E0B80",
          borderRadius: 16, padding: "14px 16px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ fontSize: 26, flexShrink: 0 }}>⚠️</div>
          <div>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: "#92400E" }}>
              Keep your {showedUpStreak}-day streak going
            </div>
            <div style={{ fontSize: 12, color: "#B45309", marginTop: 2, lineHeight: 1.4 }}>
              Tick off any one thing from your rhythm before midnight — one is enough.
            </div>
          </div>
        </div>
      )}

      {/* Supplement tracker */}
      {authUser && (
        <div id="section-supplements" style={{ scrollMarginTop: 80, display: "flex", flexDirection: "column", gap: 6 }}>
          <SupplementTracker authUser={authUser} profileId={profileId} />
          <button
            onClick={() => setShowSupplements(true)}
            style={{
              alignSelf: "flex-end", background: "transparent", border: "none",
              color: C.sageDark, fontFamily: "Georgia,serif", fontSize: 13, fontWeight: 700,
              cursor: "pointer", padding: "2px 6px",
            }}
          >
            Manage & restock supplements →
          </button>
        </div>
      )}

      {/* Daily check-in */}
      {authUser && (
        <div id="section-checkin" style={{ scrollMarginTop: 80 }} />
      )}
      {authUser && (
        <DailyCheckIn
          // The card copies today's check-in into its form once, when it
          // mounts — so one saved by voice (or on another device) stayed
          // invisible. Remount whenever the saved check-in changes.
          key={todaysCheckin ? `${todaysCheckin.id}:${todaysCheckin.energy}:${(todaysCheckin.emotional_state || []).join(",")}:${todaysCheckin.mental_clarity}:${(todaysCheckin.symptoms || []).length}:${(todaysCheckin.notes || "").length}` : "none"}
          profileId={profileId}
          cycleEnabled={!!user?.cycle_tracking_enabled}
          todaysCheckin={todaysCheckin}
          userSymptoms={user?.symptoms?.length ? user.symptoms : (user?.conditions || [])}
          onSave={handleSaveCheckin}
          saving={savingCheckin}
          authUser={authUser}
        />
      )}

      {/* Water tracker */}
      <div style={{
        background: alpha("#3b82f6", "14"), border: "2px solid #BFDBFE60",
        borderRadius: 16, padding: "14px 16px",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ fontSize: 26, flexShrink: 0 }}>💧</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>
            Water today — {waterCount} {waterCount === 1 ? "glass" : "glasses"}
          </div>
          <div style={{ fontSize: 12, color: C.mid, marginTop: 2 }}>
            {waterCount < 8 ? `${8 - waterCount} more to reach today's 8-glass goal` : "Beautifully hydrated today ✓"}
          </div>
          {waterError && <div role="alert" style={{ fontSize: 12, color: C.terracotta, marginTop: 2 }}>{waterError}</div>}
          <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} style={{
                width: 20, height: 20, borderRadius: "50%",
                background: i < waterCount ? "#3b82f6" : alpha("#3b82f6", "30"),
                transition: "background 0.2s",
              }} />
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          <button onClick={addWater} aria-label="Add a glass of water" style={{
            background: "#3b82f6", color: "#fff", border: "none",
            borderRadius: 20, padding: "10px 14px", fontSize: 15,
            cursor: "pointer", fontWeight: 700, lineHeight: 1, fontFamily: "Georgia,serif", whiteSpace: "nowrap",
          }}>+ 1 glass</button>
          {waterCount > 0 && (
            <button onClick={removeWater} aria-label="Take back one glass" style={{
              background: "transparent", color: "#93c5fd", border: "1px solid #93c5fd",
              borderRadius: 20, padding: "4px 14px", fontSize: 13,
              cursor: "pointer",
            }}>Undo</button>
          )}
        </div>
      </div>

      {/* Weekly healing report — shows Sundays */}
      <WeeklyReport authUser={authUser} profileId={profileId} user={user} />

      {/* Showed-up streak milestone */}
      <StreakMilestone streak={showedUpStreak} />

      {/* Daily teaching — rotates each day */}
      {(() => {
        const teaching = getTodaysTeaching();
        return (
          <div style={{
            background: C.goldLight,
            border: `1px solid ${alpha(C.gold, "50")}`,
            borderRadius: 16,
            padding: 14,
          }}>
            <div style={{ fontSize: 12, color: C.gold, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Today's learning
            </div>
            <div style={{ fontFamily: "Georgia,serif", fontSize: 14, color: C.charcoal, lineHeight: 1.8 }}>
              💛 {teaching}
            </div>
            <div style={{ fontSize: 12, color: C.gold, marginTop: 8 }}>
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
