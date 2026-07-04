import { useState, useEffect, useCallback } from "react";
import C from "../lib/colors.js";
import { Btn, Card } from "./ui.jsx";
import { useDailyCheckins } from "../hooks/useDailyCheckins.js";
import { useCycleTracking } from "../hooks/useCycleTracking.js";
import { useRhythm } from "../hooks/useRhythm.js";
import { callClaude } from "../lib/api.js";
import VoiceIntakeButton from "./VoiceIntakeButton.jsx";

const MOODS = [
  { val: 1, emoji: "😫", label: "Rough" },
  { val: 2, emoji: "😔", label: "Low" },
  { val: 3, emoji: "😐", label: "Okay" },
  { val: 4, emoji: "🙂", label: "Good" },
  { val: 5, emoji: "✨", label: "Great" },
];

const metric = localStorage.getItem("cs_units") !== "imperial";
const CELERY = [
  { val: 0,  label: "Skipped",                     color: "#e5e7eb" },
  { val: 8,  label: metric ? "240ml" : "8 oz",     color: "#86efac" },
  { val: 16, label: metric ? "500ml" : "16 oz",    color: "#4ade80" },
  { val: 32, label: metric ? "1 litre+" : "32 oz+",color: "#16a34a" },
];

const SYMPTOMS = [
  "Fatigue", "Brain fog", "Anxiety", "Depression", "Joint pain",
  "Bloating", "Headache", "Nausea", "Insomnia", "Skin flare",
  "Heart palpitations", "Nerve pain", "Hot flashes", "Sinus issues",
  "Dizziness", "Swollen glands", "Muscle aches", "Constipation",
];

function Bars({ data, valueKey, color, label, max = 10 }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontFamily: "Georgia,serif" }}>
        {label}
      </div>
      <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 52 }}>
        {data.map((d, i) => {
          const val = d[valueKey] || 0;
          const pct = val / max;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{ fontSize: 9, color: val ? C.charcoal : C.border, fontWeight: 600, height: 12 }}>
                {val || ""}
              </div>
              <div
                style={{
                  width: "100%",
                  background: val ? color : "#f3f4f6",
                  borderRadius: "3px 3px 0 0",
                  height: val ? `${Math.max(pct * 36, 4)}px` : "4px",
                  transition: "height 0.4s ease",
                }}
              />
              <div style={{ fontSize: 9, color: C.muted }}>{d.day}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatPill({ value, label, sub, color }) {
  return (
    <div style={{
      flex: 1,
      background: C.mist,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      padding: "12px 10px",
      textAlign: "center",
    }}>
      <div style={{ fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 700, color: color || C.sageDark }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: C.charcoal, fontWeight: 600, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function Journal({ authUser, user, profileId }) {
  const {
    checkins, todaysCheckin, last7, celeryStreak, protocolDays, avgEnergy7,
    loading, loadCheckins, saveCheckin,
  } = useDailyCheckins(authUser, profileId);
  const { addItem: addRhythmItem } = useRhythm(authUser, profileId);
  const { loggedToday: periodLoggedToday, logPeriodStart, undoToday: undoPeriodToday } = useCycleTracking(profileId);

  // Form state
  const [energy, setEnergy] = useState(0);
  const [mood, setMood] = useState(0);
  const [symptoms, setSymptoms] = useState([]);
  const [celeryOz, setCeleryOz] = useState(0);
  const [morningProtocol, setMorningProtocol] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Die-off checker
  const [showDieOff, setShowDieOff] = useState(false);
  const [dieOffResult, setDieOffResult] = useState("");
  const [dieOffLoading, setDieOffLoading] = useState(false);

  // Weekly reflection
  const [reflection, setReflection] = useState("");
  const [reflectionLoading, setReflectionLoading] = useState(false);
  const [showReflection, setShowReflection] = useState(false);

  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (profileId) loadCheckins();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  useEffect(() => {
    if (todaysCheckin) {
      setEnergy(todaysCheckin.energy || 0);
      setMood(todaysCheckin.mood || 0);
      setSymptoms(todaysCheckin.symptoms || []);
      setCeleryOz(todaysCheckin.celery_oz || 0);
      setMorningProtocol(todaysCheckin.morning_protocol || false);
      setNote(todaysCheckin.notes || "");
      setSaved(true);
    }
  }, [todaysCheckin]);

  const toggleSymptom = (s) =>
    setSymptoms((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));

  const handleSave = async () => {
    if (!energy || !mood) return;
    setSaving(true);
    await saveCheckin({
      energy,
      mood,
      symptoms,
      celery_oz: celeryOz,
      morning_protocol: morningProtocol,
      notes: note,
    });
    setSaving(false);
    setSaved(true);

    // Prompt die-off checker if low energy or concerning symptoms
    const lowEnergy = energy <= 3;
    const hasHardSymptoms = symptoms.some((s) =>
      ["Fatigue", "Nausea", "Headache", "Dizziness", "Skin flare"].includes(s)
    );
    if (lowEnergy || (protocolDays >= 3 && hasHardSymptoms)) {
      setShowDieOff(true);
    }
  };

  const checkDieOff = async () => {
    setDieOffLoading(true);
    const recentSymptoms = checkins
      .slice(0, 7)
      .map((c) => `${c.check_date}: energy ${c.energy}/10, symptoms: ${(c.symptoms || []).join(", ") || "none"}`)
      .join("\n");

    const result = await callClaude({
      tier: 'quick',
      maxTokens: 600,
      messages: [{
        role: "user",
        content: `You are a compassionate Medical Medium healing companion helping someone understand what their body is going through today.

Person: ${user?.name || "friend"}
Their health conditions: ${(user?.symptoms || []).join(", ") || "not specified"}
Days on healing protocol: ${protocolDays}
Today's energy: ${energy}/10
Today's mood: ${mood}/5
Today's symptoms: ${symptoms.join(", ") || "none listed"}
Celery juice today: ${celeryOz}oz
Recent 7-day history:
${recentSymptoms || "Just starting — early days"}

Based on Anthony William's Medical Medium teachings, answer these four things clearly and warmly:

1. **Healing reaction or something else?** — Is this likely a die-off / detox reaction given their specific conditions and protocol stage? Give your honest read.
2. **What AW teaches about this** — Be specific to their conditions if possible. EBV die-off feels different from heavy metal detox feels different from adrenal reactions.
3. **Right now support** — 3–4 specific, actionable things they can do TODAY to support their body. Name exact foods, supplements, and rest suggestions.
4. **When to see a doctor** — Any red flags in what they've described? Be clear about what would change your advice.

Keep this warm, personal, and focused. Address ${user?.name || "them"} directly. This person is unwell and needs clarity and comfort.`,
      }],
    });
    setDieOffResult(result);
    setDieOffLoading(false);
  };

  const loadWeeklyReflection = async () => {
    if (reflection) { setShowReflection(true); return; }
    setReflectionLoading(true);
    setShowReflection(true);
    const recent = checkins.slice(0, 7);
    const avgE = recent.filter(c => c.energy).reduce((a, c) => a + c.energy, 0) / (recent.filter(c => c.energy).length || 1);
    const allSymptoms = [...new Set(recent.flatMap(c => c.symptoms || []))];
    const celeryDays = recent.filter(c => c.celery_oz > 0).length;

    const result = await callClaude({
      tier: 'standard',
      maxTokens: 550,
      messages: [{
        role: "user",
        content: `You are a warm Medical Medium healing companion writing a personalised weekly healing reflection for someone you care about deeply.

Person: ${user?.name || "friend"}
Their health conditions: ${(user?.symptoms || []).join(", ") || "not specified"}
Total protocol days: ${protocolDays}
This week — average energy: ${avgE.toFixed(1)}/10
Celery juice days this week: ${celeryDays}/7
Celery juice streak: ${celeryStreak} days
Symptoms experienced this week: ${allSymptoms.join(", ") || "none logged"}

Write a warm, personal weekly healing reflection (3 paragraphs, conversational tone, no headers):

Paragraph 1: Acknowledge specifically what they did this week — the actual numbers, what that means, how it feels at protocol day ${protocolDays}. Make them feel SEEN.

Paragraph 2: Connect their week to Anthony William's teachings about their specific conditions. What is happening in their body at this stage? What does AW say about patience, trust, and the invisible work happening inside?

Paragraph 3: One specific, practical focus for next week — something doable. Then end with genuine encouragement that feels personal to where they are, not generic. Healing takes courage and they're doing it.

Write as if you know this person and genuinely care about their healing.`,
      }],
    });
    setReflection(result);
    setReflectionLoading(false);
  };

  // Voice intake — merges parsed fields into form state + saves to Supabase
  const handleVoiceWrite = useCallback(async (fields) => {
    if (fields.energy    != null) setEnergy(fields.energy);
    if (fields.mood      != null) setMood(fields.mood);
    if (fields.celery_oz != null) setCeleryOz(fields.celery_oz);
    if (fields.morning_protocol != null) setMorningProtocol(fields.morning_protocol);
    if (fields.symptoms?.length) {
      setSymptoms((prev) => [...new Set([...prev, ...fields.symptoms])]);
    }
    if (fields.notes) {
      setNote((prev) => prev ? `${prev}\n${fields.notes}` : fields.notes);
    }
    setSaving(true);
    await saveCheckin({
      energy:           fields.energy      ?? energy,
      mood:             fields.mood        ?? mood,
      symptoms:         fields.symptoms?.length ? [...new Set([...symptoms, ...fields.symptoms])] : symptoms,
      celery_oz:        fields.celery_oz   ?? celeryOz,
      morning_protocol: fields.morning_protocol ?? morningProtocol,
      notes:            fields.notes ? (note ? `${note}\n${fields.notes}` : fields.notes) : note,
    });
    if (fields.scheduleItem?.name) {
      await addRhythmItem({
        name: fields.scheduleItem.name,
        category: fields.scheduleItem.category || "other",
        fixedTime: fields.scheduleItem.fixedTime || null,
        note: fields.scheduleItem.note || "",
        frequency: fields.scheduleItem.frequency || "daily",
      });
    }
    setSaving(false);
    setSaved(true);
  }, [saveCheckin, energy, mood, symptoms, celeryOz, morningProtocol, note, addRhythmItem]);

  const getHour = () => new Date().getHours();
  const greeting = getHour() < 12 ? "Good morning" : getHour() < 17 ? "Good afternoon" : "Good evening";

  if (loading) {
    return (
      <div style={{ textAlign: "center", color: C.muted, paddingTop: 60, fontSize: 14 }}>
        🌿 Loading your healing journal…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div>
        <h2 style={{ margin: 0, fontFamily: "Georgia,serif", fontSize: 20, color: C.charcoal }}>
          📊 Healing Journal
        </h2>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
          Track your journey · See your progress · Never wonder if it's working
        </div>
      </div>

      {/* Stats row */}
      {protocolDays > 0 && (
        <div style={{ display: "flex", gap: 8 }}>
          <StatPill
            value={protocolDays}
            label="Days tracked"
            sub="total check-ins"
            color={C.sageDark}
          />
          <StatPill
            value={celeryStreak > 0 ? `${celeryStreak}🥬` : "—"}
            label="Celery streak"
            sub={celeryStreak > 0 ? "days in a row" : "start today!"}
            color="#16a34a"
          />
          <StatPill
            value={avgEnergy7 ?? "—"}
            label="Avg energy"
            sub="last 7 days"
            color={C.gold}
          />
        </div>
      )}

      {/* Voice intake — speak your check-in */}
      <VoiceIntakeButton inline onWrite={handleVoiceWrite} />

      {/* Today's check-in */}
      <Card>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 14 }}>
          {saved ? "✅ Today's check-in" : `${greeting}${user?.name ? ", " + user.name : ""}! How are you today?`}
        </div>

        {/* Energy */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: C.mid, marginBottom: 8, fontFamily: "Georgia,serif" }}>
            Energy level {energy > 0 ? `— ${energy}/10` : ""}
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {[1,2,3,4,5,6,7,8,9,10].map((n) => (
              <button
                key={n}
                onClick={() => setEnergy(n)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: `2px solid ${energy === n ? C.sageDark : C.border}`,
                  background: energy >= n ? `${C.sage}30` : "transparent",
                  fontFamily: "Georgia,serif",
                  fontWeight: energy === n ? 700 : 400,
                  fontSize: 13,
                  color: energy === n ? C.sageDark : C.mid,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Mood */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: C.mid, marginBottom: 8, fontFamily: "Georgia,serif" }}>
            Mood {mood > 0 ? `— ${MOODS.find(m => m.val === mood)?.label}` : ""}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {MOODS.map((m) => (
              <button
                key={m.val}
                onClick={() => setMood(m.val)}
                style={{
                  flex: 1,
                  padding: "8px 4px",
                  borderRadius: 12,
                  border: `2px solid ${mood === m.val ? C.sageDark : C.border}`,
                  background: mood === m.val ? `${C.sage}20` : "transparent",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <span style={{ fontSize: 20 }}>{m.emoji}</span>
                <span style={{ fontSize: 9, color: mood === m.val ? C.sageDark : C.muted, fontFamily: "Georgia,serif" }}>
                  {m.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Celery juice */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: C.mid, marginBottom: 8, fontFamily: "Georgia,serif" }}>
            🥬 Celery juice today
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {CELERY.map((c) => (
              <button
                key={c.val}
                onClick={() => setCeleryOz(c.val)}
                style={{
                  flex: 1,
                  padding: "8px 4px",
                  borderRadius: 10,
                  border: `2px solid ${celeryOz === c.val ? "#16a34a" : C.border}`,
                  background: celeryOz === c.val ? "#dcfce7" : "transparent",
                  cursor: "pointer",
                  fontSize: 11,
                  fontFamily: "Georgia,serif",
                  color: celeryOz === c.val ? "#15803d" : C.mid,
                  fontWeight: celeryOz === c.val ? 700 : 400,
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Morning protocol */}
        <div style={{ marginBottom: 14 }}>
          <button
            onClick={() => setMorningProtocol((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: morningProtocol ? "#dcfce7" : C.mist,
              border: `1.5px solid ${morningProtocol ? "#16a34a" : C.border}`,
              borderRadius: 12,
              padding: "10px 14px",
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
            }}
          >
            <span style={{ fontSize: 18 }}>{morningProtocol ? "✅" : "⬜"}</span>
            <div>
              <div style={{ fontSize: 13, fontFamily: "Georgia,serif", color: C.charcoal }}>
                Morning protocol done
              </div>
              <div style={{ fontSize: 11, color: C.muted }}>
                Lemon water → celery juice → HMDS
              </div>
            </div>
          </button>
        </div>

        {/* Symptoms */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: C.mid, marginBottom: 8, fontFamily: "Georgia,serif" }}>
            Symptoms today (select all that apply)
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SYMPTOMS.map((s) => (
              <button
                key={s}
                onClick={() => toggleSymptom(s)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 20,
                  border: `1.5px solid ${symptoms.includes(s) ? C.plum : C.border}`,
                  background: symptoms.includes(s) ? C.plumLight : "transparent",
                  color: symptoms.includes(s) ? C.plum : C.mid,
                  fontSize: 12,
                  fontFamily: "Georgia,serif",
                  cursor: "pointer",
                  fontWeight: symptoms.includes(s) ? 700 : 400,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Cycle tracking — opt-in, only shown once enabled in profile settings */}
        {user?.cycle_tracking_enabled && (
          <div style={{ marginBottom: 14 }}>
            <button
              onClick={() => (periodLoggedToday ? undoPeriodToday() : logPeriodStart())}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 14px", borderRadius: 20,
                border: `1.5px solid ${periodLoggedToday ? C.plum : C.border}`,
                background: periodLoggedToday ? C.plumLight : "transparent",
                color: periodLoggedToday ? C.plum : C.mid,
                fontSize: 12, fontFamily: "Georgia,serif", fontWeight: periodLoggedToday ? 700 : 400,
                cursor: "pointer",
              }}
            >
              {periodLoggedToday ? "✓ Period start logged today — tap to undo" : "🩸 Log period start today"}
            </button>
          </div>
        )}

        {/* Note */}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Anything else to note? (optional)"
          rows={2}
          style={{
            width: "100%",
            borderRadius: 12,
            border: `1.5px solid ${C.border}`,
            padding: "10px 12px",
            fontFamily: "Georgia,serif",
            fontSize: 13,
            resize: "none",
            outline: "none",
            background: C.mist,
            boxSizing: "border-box",
            marginBottom: 12,
          }}
        />

        <Btn
          full
          color={C.sageDark}
          onClick={handleSave}
          disabled={saving || !energy || !mood}
        >
          {saving ? "Saving…" : saved ? "✅ Update today's check-in" : "Save today's check-in"}
        </Btn>
      </Card>

      {/* Die-off checker */}
      {showDieOff && (
        <Card style={{ background: "#fffbeb", border: `1px solid #fbbf24` }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: "#92400e", marginBottom: 8 }}>
            🌡 Is this a healing reaction?
          </div>
          <div style={{ fontSize: 12.5, color: "#78350f", lineHeight: 1.6, marginBottom: 12 }}>
            Your energy or symptoms suggest you might be in a detox reaction. Anthony William teaches that healing crises are common — but let's check what's happening for you specifically.
          </div>
          {!dieOffResult && (
            <Btn color="#d97706" full onClick={checkDieOff} disabled={dieOffLoading}>
              {dieOffLoading ? "🌿 Checking…" : "Check for die-off / healing reaction"}
            </Btn>
          )}
          {dieOffResult && (
            <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              {dieOffResult}
            </div>
          )}
        </Card>
      )}

      {/* 7-day trends */}
      {protocolDays >= 2 && (
        <Card>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 14 }}>
            📈 Your 7-day trend
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Bars data={last7} valueKey="energy" color={C.sage} label="Energy (out of 10)" max={10} />
            <Bars data={last7} valueKey="mood" color={C.plum} label="Mood (out of 5)" max={5} />
            <Bars
              data={last7.map(d => ({ ...d, celery: d.celery > 0 ? 1 : 0 }))}
              valueKey="celery"
              color="#16a34a"
              label="Celery juice days"
              max={1}
            />
          </div>
        </Card>
      )}

      {/* Weekly reflection */}
      {protocolDays >= 3 && (
        <Card>
          <div
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
            onClick={loadWeeklyReflection}
          >
            <div>
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>
                💛 Weekly healing reflection
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                Your personalised AI healing summary
              </div>
            </div>
            <div style={{ fontSize: 12, color: C.sage, fontWeight: 600 }}>
              {showReflection ? "hide ▲" : "open ▼"}
            </div>
          </div>
          {showReflection && (
            <div style={{ marginTop: 14 }}>
              {reflectionLoading ? (
                <div style={{ color: C.muted, fontSize: 13, fontStyle: "italic" }}>
                  🌿 Writing your reflection…
                </div>
              ) : (
                <div style={{ fontSize: 13.5, color: C.charcoal, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>
                  {reflection}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* History */}
      {checkins.length > 1 && (
        <Card>
          <div
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
            onClick={() => setShowHistory((v) => !v)}
          >
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>
              📋 Past check-ins
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>{showHistory ? "hide ▲" : "show ▼"}</div>
          </div>
          {showHistory && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {checkins.slice(0, 14).map((c) => {
                const moodEmoji = MOODS.find((m) => m.val === c.mood)?.emoji ?? "—";
                const celeryLabel = c.celery_oz > 0 ? `${c.celery_oz}oz 🥬` : "no celery";
                return (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      padding: "10px 0",
                      borderBottom: `1px solid ${C.border}`,
                      fontSize: 13,
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: "Georgia,serif", color: C.charcoal, fontWeight: 600 }}>
                        {new Date(c.check_date + "T12:00:00").toLocaleDateString("en-AU", {
                          weekday: "short", day: "numeric", month: "short",
                        })}
                      </div>
                      {c.symptoms?.length > 0 && (
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                          {c.symptoms.slice(0, 4).join(", ")}
                          {c.symptoms.length > 4 ? ` +${c.symptoms.length - 4} more` : ""}
                        </div>
                      )}
                      {c.notes && (
                        <div style={{ fontSize: 11, color: C.mid, marginTop: 3, fontStyle: "italic" }}>
                          "{c.notes.slice(0, 60)}{c.notes.length > 60 ? "…" : ""}"
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 18 }}>{moodEmoji}</div>
                      <div style={{ fontSize: 11, color: C.sageDark, fontWeight: 600 }}>
                        ⚡ {c.energy ?? "—"}/10
                      </div>
                      <div style={{ fontSize: 10, color: c.celery_oz > 0 ? "#16a34a" : C.muted }}>
                        {celeryLabel}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* First-time empty state */}
      {protocolDays === 0 && !saved && (
        <div style={{
          textAlign: "center",
          padding: "20px 16px",
          color: C.muted,
          fontSize: 13,
          lineHeight: 1.7,
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🌱</div>
          Complete your first check-in above and your healing journey begins.<br />
          After a few days, your trends and reflections will appear here.
        </div>
      )}
    </div>
  );
}
