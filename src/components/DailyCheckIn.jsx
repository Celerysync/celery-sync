import { useState } from "react";
import C from "../lib/colors.js";
import { Card, Btn } from "./ui.jsx";
import { useAnalytics } from "../hooks/useAnalytics.js";

const ENERGY_OPTS = [
  { val: 2,  emoji: "😴", label: "Exhausted" },
  { val: 4,  emoji: "🥴", label: "Struggling" },
  { val: 6,  emoji: "😐", label: "Okay" },
  { val: 8,  emoji: "🙂", label: "Good" },
  { val: 10, emoji: "✨", label: "Great" },
];

const CLARITY_OPTS = [
  { val: 1, emoji: "🌫", label: "Severe fog" },
  { val: 2, emoji: "😵", label: "Foggy" },
  { val: 3, emoji: "😐", label: "Patchy" },
  { val: 4, emoji: "🙂", label: "Mostly clear" },
  { val: 5, emoji: "💡", label: "Clear" },
];

const CELERY_OPTS = [
  { val: 0,  label: "None" },
  { val: 8,  label: "8 oz" },
  { val: 16, label: "16 oz" },
  { val: 32, label: "32 oz+" },
];

const EMOTIONAL_STATES = [
  "Hopeful", "Grateful", "Calm", "Determined",
  "Anxious", "Overwhelmed", "Discouraged", "Tearful",
  "Frustrated", "Numb", "Lonely", "Irritable",
];

const WATER_OPTS = [
  { val: 16,  label: "500ml" },
  { val: 32,  label: "1 L" },
  { val: 48,  label: "1.5 L" },
  { val: 64,  label: "2 L+" },
];

const PAIN_OPTS = [
  { val: 1, label: "None" },
  { val: 2, label: "Mild" },
  { val: 3, label: "Moderate" },
  { val: 4, label: "Significant" },
  { val: 5, label: "Severe" },
];

const SLEEP_OPTS = [
  { val: 4, label: "4h" }, { val: 5, label: "5h" }, { val: 6, label: "6h" },
  { val: 7, label: "7h" }, { val: 8, label: "8h" }, { val: 9, label: "9h+" },
];

const SLEEP_QUALITY_OPTS = [
  { val: 1, emoji: "😩", label: "Terrible" },
  { val: 2, emoji: "😴", label: "Poor" },
  { val: 3, emoji: "😐", label: "OK" },
  { val: 4, emoji: "🙂", label: "Good" },
  { val: 5, emoji: "✨", label: "Great" },
];

const COMMON_SYMPTOMS = [
  "Fatigue", "Brain fog", "Headache", "Bloating", "Joint pain",
  "Anxiety", "Low mood", "Overwhelm", "Insomnia", "Nausea",
  "Skin issues", "Heart palpitations", "Panic attacks", "Irritability",
];

export default function DailyCheckIn({ todaysCheckin, userSymptoms = [], onSave, saving, authUser }) {
  const { track } = useAnalytics(authUser);

  // Core (always shown)
  const [energy, setEnergy] = useState(todaysCheckin?.energy ?? null);
  const [mentalClarity, setMentalClarity] = useState(todaysCheckin?.mental_clarity ?? null);
  const [celeryOz, setCeleryOz] = useState(todaysCheckin?.celery_oz ?? null);

  // Expanded (shown after energy selected, or when editing)
  const [showMore, setShowMore] = useState(!!todaysCheckin);
  const [emotionalState, setEmotionalState] = useState(todaysCheckin?.emotional_state ?? []);
  const [healingReaction, setHealingReaction] = useState(todaysCheckin?.healing_reaction ?? false);
  const [healingReactionNotes, setHealingReactionNotes] = useState(todaysCheckin?.healing_reaction_notes ?? "");
  const [winToday, setWinToday] = useState(todaysCheckin?.win_today ?? "");
  const [morningProtocol, setMorningProtocol] = useState(todaysCheckin?.morning_protocol ?? false);

  // Symptoms + vitals (optional section)
  const [symptoms, setSymptoms] = useState(todaysCheckin?.symptoms ?? []);
  const [notes, setNotes] = useState(todaysCheckin?.notes ?? "");
  const [sleepHours, setSleepHours] = useState(todaysCheckin?.sleep_hours ?? null);
  const [sleepQuality, setSleepQuality] = useState(todaysCheckin?.sleep_quality ?? null);
  const [hrv, setHrv] = useState(todaysCheckin?.hrv ?? "");
  const [waterOz, setWaterOz] = useState(todaysCheckin?.water_oz ?? null);
  const [painLevel, setPainLevel] = useState(todaysCheckin?.pain_level ?? null);
  const [bowelMovements, setBowelMovements] = useState(todaysCheckin?.bowel_movements ?? null);
  const [showVitals, setShowVitals] = useState(!!(todaysCheckin?.sleep_hours || todaysCheckin?.hrv || todaysCheckin?.water_oz));

  const [editing, setEditing] = useState(!todaysCheckin);

  const toggleEmotional = (s) =>
    setEmotionalState((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const toggleSymptom = (s) =>
    setSymptoms((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const handleEnergySelect = (val) => {
    setEnergy(val);
    if (!showMore) setShowMore(true);
  };

  const handleSave = async () => {
    track("checkin_saved", { energy, celery_oz: celeryOz ?? 0, has_clarity: !!mentalClarity });
    await onSave({
      energy,
      mental_clarity: mentalClarity ?? null,
      celery_oz: celeryOz ?? 0,
      morning_protocol: morningProtocol,
      emotional_state: emotionalState,
      healing_reaction: healingReaction,
      healing_reaction_notes: healingReactionNotes || null,
      win_today: winToday || null,
      symptoms,
      notes,
      sleep_hours: sleepHours ?? null,
      sleep_quality: sleepQuality ?? null,
      hrv: hrv ? parseInt(hrv) : null,
      water_oz: waterOz ?? null,
      pain_level: painLevel ?? null,
      bowel_movements: bowelMovements ?? null,
      wearable_source: (sleepHours || hrv) ? "manual" : null,
    });
    setEditing(false);
  };

  const allSymptoms = [...new Set([...(userSymptoms || []), ...COMMON_SYMPTOMS])].slice(0, 14);

  // Completed check-in summary card
  if (todaysCheckin && !editing) {
    const e = ENERGY_OPTS.find(o => o.val === todaysCheckin.energy);
    const c = CLARITY_OPTS.find(o => o.val === todaysCheckin.mental_clarity);
    return (
      <Card style={{ background: C.sageLight, border: `1.5px solid ${C.sage}40` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal }}>
            📋 Today's Check-in ✓
          </div>
          <button
            onClick={() => setEditing(true)}
            style={{ background: "none", border: "none", color: C.sage, fontSize: 12, cursor: "pointer", fontFamily: "Georgia,serif" }}
          >
            Edit
          </button>
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
          {e && (
            <div style={{ textAlign: "center", minWidth: 44 }}>
              <div style={{ fontSize: 26 }}>{e.emoji}</div>
              <div style={{ fontSize: 10, color: C.mid, fontFamily: "Georgia,serif" }}>{e.label}</div>
            </div>
          )}
          {c && (
            <div style={{ textAlign: "center", minWidth: 44 }}>
              <div style={{ fontSize: 26 }}>{c.emoji}</div>
              <div style={{ fontSize: 10, color: C.mid, fontFamily: "Georgia,serif" }}>
                {c.val <= 2 ? "Brain fog" : "Clarity"}
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 12, color: C.mid }}>
            {todaysCheckin.celery_oz > 0 && <div>🥬 {todaysCheckin.celery_oz}oz celery juice</div>}
            {todaysCheckin.morning_protocol && <div>🌅 Morning protocol done</div>}
            {todaysCheckin.healing_reaction && <div>🌀 Healing reaction noted</div>}
            {todaysCheckin.win_today && <div>✨ {todaysCheckin.win_today}</div>}
            {todaysCheckin.emotional_state?.length > 0 && (
              <div>💛 {todaysCheckin.emotional_state.slice(0, 3).join(", ")}</div>
            )}
            {todaysCheckin.symptoms?.length > 0 && (
              <div>⚡ {todaysCheckin.symptoms.slice(0, 3).join(", ")}{todaysCheckin.symptoms.length > 3 ? "…" : ""}</div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card style={{ border: `1.5px solid ${C.plum}30` }}>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 4 }}>
        📋 How are you today?
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
        Quick daily check-in — tracks your healing over time and helps your companion understand you
      </div>

      {/* ── CORE: Energy ── */}
      <Section label="Energy level">
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          {ENERGY_OPTS.map((o) => (
            <button key={o.val} onClick={() => handleEnergySelect(o.val)}
              style={{
                flex: 1, padding: "10px 4px", borderRadius: 12, border: "none", cursor: "pointer",
                background: energy === o.val ? C.plum : C.mist,
                color: energy === o.val ? C.white : C.charcoal, transition: "all 0.15s",
              }}>
              <div style={{ fontSize: 22 }}>{o.emoji}</div>
              <div style={{ fontSize: 9, marginTop: 2, fontFamily: "Georgia,serif" }}>{o.label}</div>
            </button>
          ))}
        </div>
      </Section>

      {/* ── CORE: Brain fog / mental clarity ── */}
      <Section label="Mental clarity">
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          {CLARITY_OPTS.map((o) => (
            <button key={o.val} onClick={() => setMentalClarity(o.val)}
              style={{
                flex: 1, padding: "10px 4px", borderRadius: 12, border: "none", cursor: "pointer",
                background: mentalClarity === o.val ? C.sageDark : C.mist,
                color: mentalClarity === o.val ? C.white : C.charcoal, transition: "all 0.15s",
              }}>
              <div style={{ fontSize: 22 }}>{o.emoji}</div>
              <div style={{ fontSize: 9, marginTop: 2, fontFamily: "Georgia,serif" }}>{o.label}</div>
            </button>
          ))}
        </div>
      </Section>

      {/* ── CORE: Celery juice ── */}
      <Section label="🥬 Celery juice today?">
        <div style={{ display: "flex", gap: 8 }}>
          {CELERY_OPTS.map((o) => (
            <button key={o.val} onClick={() => setCeleryOz(o.val)}
              style={{
                flex: 1, padding: "9px 4px", borderRadius: 10, border: "none", cursor: "pointer",
                fontFamily: "Georgia,serif", fontSize: 12, fontWeight: 700,
                background: celeryOz === o.val ? C.leaf : C.mist,
                color: celeryOz === o.val ? C.white : C.charcoal, transition: "all 0.15s",
              }}>
              {o.label}
            </button>
          ))}
        </div>
      </Section>

      {/* ── EXPANDED: shown after energy selected ── */}
      {showMore && (
        <>
          {/* Emotional state */}
          <Section label="How are you feeling emotionally? (tap all that apply)">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {EMOTIONAL_STATES.map((s) => (
                <button key={s} onClick={() => toggleEmotional(s)}
                  style={{
                    padding: "5px 11px", borderRadius: 20, border: "none", cursor: "pointer",
                    fontFamily: "Georgia,serif", fontSize: 11,
                    background: emotionalState.includes(s)
                      ? (["Hopeful","Grateful","Calm","Determined"].includes(s) ? C.sage : C.plum)
                      : C.mist,
                    color: emotionalState.includes(s) ? C.white : C.charcoal,
                    transition: "all 0.15s",
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </Section>

          {/* Today's win */}
          <Section label="✨ One win or moment of gratitude today (optional)">
            <input
              type="text"
              value={winToday}
              onChange={(e) => setWinToday(e.target.value)}
              placeholder="Even something tiny counts…"
              style={{
                width: "100%", boxSizing: "border-box", padding: "10px 12px",
                borderRadius: 10, border: `1.5px solid ${C.border}`,
                fontFamily: "Georgia,serif", fontSize: 13, color: C.charcoal,
                background: C.white, outline: "none",
              }}
            />
          </Section>

          {/* Healing reaction */}
          <div
            onClick={() => setHealingReaction((v) => !v)}
            style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "10px 0", borderTop: `1px solid ${C.border}`,
              cursor: "pointer", marginBottom: healingReaction ? 0 : 12,
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
              background: healingReaction ? C.gold : "transparent",
              border: `2px solid ${healingReaction ? C.gold : C.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: C.white, fontSize: 13, fontWeight: 700,
            }}>
              {healingReaction ? "✓" : ""}
            </div>
            <div>
              <div style={{ fontSize: 13, color: C.charcoal }}>
                🌀 I think I'm having a healing / die-off reaction today
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                Worsening symptoms can be a sign things are shifting — your companion tracks these for you
              </div>
            </div>
          </div>

          {healingReaction && (
            <textarea
              value={healingReactionNotes}
              onChange={(e) => setHealingReactionNotes(e.target.value)}
              placeholder="What are you noticing? (optional)"
              rows={2}
              style={{
                width: "100%", boxSizing: "border-box", padding: "10px 12px",
                borderRadius: 10, border: `1.5px solid ${C.gold}60`,
                fontFamily: "Georgia,serif", fontSize: 12, color: C.charcoal,
                background: "#fffbeb", resize: "none", outline: "none", marginBottom: 12,
              }}
            />
          )}

          {/* Morning protocol */}
          <div
            onClick={() => setMorningProtocol((v) => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 0", borderTop: `1px solid ${C.border}`,
              cursor: "pointer", marginBottom: 12,
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              background: morningProtocol ? C.sage : "transparent",
              border: `2px solid ${morningProtocol ? C.sage : C.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: C.white, fontSize: 13, fontWeight: 700,
            }}>
              {morningProtocol ? "✓" : ""}
            </div>
            <div style={{ fontSize: 13, color: C.charcoal }}>
              🌅 Completed morning protocol (lemon water + celery juice + HMD)
            </div>
          </div>

          {/* Symptoms */}
          <Section label="Any symptoms today? (tap all that apply)">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {allSymptoms.map((s) => (
                <button key={s} onClick={() => toggleSymptom(s)}
                  style={{
                    padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer",
                    fontFamily: "Georgia,serif", fontSize: 11,
                    background: symptoms.includes(s) ? C.terracotta : C.mist,
                    color: symptoms.includes(s) ? C.white : C.charcoal,
                    transition: "all 0.15s",
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </Section>

          {/* Optional vitals */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, marginBottom: 12 }}>
            <button
              onClick={() => setShowVitals((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 6, background: "none",
                border: "none", cursor: "pointer", width: "100%", padding: "2px 0",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: C.mid }}>
                {showVitals ? "▼" : "▶"} Sleep, water & vitals <span style={{ fontWeight: 400 }}>(optional)</span>
              </div>
              {!showVitals && (sleepHours || waterOz || hrv || painLevel) && (
                <div style={{ fontSize: 10, color: C.sage, marginLeft: 4 }}>✓ filled</div>
              )}
            </button>

            {showVitals && (
              <div style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Water */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 8 }}>💧 Water intake</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {WATER_OPTS.map((o) => (
                      <button key={o.val} onClick={() => setWaterOz(o.val)}
                        style={{
                          flex: 1, padding: "7px 2px", borderRadius: 10, border: "none", cursor: "pointer",
                          fontFamily: "Georgia,serif", fontSize: 11, fontWeight: 700,
                          background: waterOz === o.val ? C.sage : C.mist,
                          color: waterOz === o.val ? C.white : C.charcoal,
                        }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pain */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 8 }}>🩹 Overall pain level</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {PAIN_OPTS.map((o) => (
                      <button key={o.val} onClick={() => setPainLevel(o.val)}
                        style={{
                          flex: 1, padding: "7px 2px", borderRadius: 10, border: "none", cursor: "pointer",
                          fontFamily: "Georgia,serif", fontSize: 11,
                          background: painLevel === o.val ? C.terracotta : C.mist,
                          color: painLevel === o.val ? C.white : C.charcoal,
                        }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sleep */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 8 }}>🌙 Hours of sleep</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {SLEEP_OPTS.map((o) => (
                      <button key={o.val} onClick={() => setSleepHours(o.val)}
                        style={{
                          flex: 1, padding: "7px 2px", borderRadius: 10, border: "none", cursor: "pointer",
                          fontFamily: "Georgia,serif", fontSize: 11, fontWeight: 700,
                          background: sleepHours === o.val ? C.plum : C.mist,
                          color: sleepHours === o.val ? C.white : C.charcoal,
                        }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sleep quality */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 8 }}>💤 Sleep quality</div>
                  <div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
                    {SLEEP_QUALITY_OPTS.map((o) => (
                      <button key={o.val} onClick={() => setSleepQuality(o.val)}
                        style={{
                          flex: 1, padding: "8px 2px", borderRadius: 10, border: "none", cursor: "pointer",
                          background: sleepQuality === o.val ? C.plum : C.mist,
                          color: sleepQuality === o.val ? C.white : C.charcoal,
                        }}>
                        <div style={{ fontSize: 18 }}>{o.emoji}</div>
                        <div style={{ fontSize: 8.5, marginTop: 2, fontFamily: "Georgia,serif" }}>{o.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bowel movements */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 8 }}>
                    🌿 Bowel movements today <span style={{ fontWeight: 400 }}>(AW considers this a key healing indicator)</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {[0, 1, 2, 3, 4].map((n) => (
                      <button key={n} onClick={() => setBowelMovements(n)}
                        style={{
                          width: 40, height: 40, borderRadius: 10, border: "none", cursor: "pointer",
                          fontFamily: "Georgia,serif", fontSize: 14, fontWeight: 700,
                          background: bowelMovements === n ? C.sage : C.mist,
                          color: bowelMovements === n ? C.white : C.charcoal,
                        }}>
                        {n === 4 ? "4+" : n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* HRV */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 6 }}>
                    💓 Morning HRV <span style={{ fontWeight: 400 }}>(from Oura, Garmin, Apple Watch)</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="number" min={10} max={200} value={hrv}
                      onChange={(e) => setHrv(e.target.value)} placeholder="e.g. 48"
                      style={{
                        flex: 1, padding: "9px 12px", borderRadius: 10,
                        border: `1.5px solid ${C.border}`, fontFamily: "Georgia,serif",
                        fontSize: 14, color: C.charcoal, outline: "none",
                      }}
                    />
                    <div style={{ fontSize: 12, color: C.muted }}>ms</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else to note today… (optional)"
            rows={2}
            style={{
              width: "100%", boxSizing: "border-box", padding: "10px 12px",
              borderRadius: 10, border: `1.5px solid ${C.border}`,
              fontFamily: "Georgia,serif", fontSize: 13, color: C.charcoal,
              background: C.white, resize: "none", outline: "none", marginBottom: 12,
            }}
          />
        </>
      )}

      {!showMore && energy !== null && (
        <button
          onClick={() => setShowMore(true)}
          style={{
            background: "none", border: "none", color: C.sage,
            fontFamily: "Georgia,serif", fontSize: 12, cursor: "pointer",
            padding: "4px 0", marginBottom: 10,
          }}
        >
          ▼ Add more detail (emotional state, wins, symptoms…)
        </button>
      )}

      <Btn full onClick={handleSave} disabled={saving || energy === null} color={C.plum}>
        {saving ? "Saving…" : energy === null ? "Select your energy above to save" : "Save Today's Check-in"}
      </Btn>
    </Card>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}
