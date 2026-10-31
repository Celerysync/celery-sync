import { useState, useEffect } from "react";
import C from "../lib/colors.js";
import { Btn, Card } from "./ui.jsx";
import { useDailyCheckins } from "../hooks/useDailyCheckins.js";
import { useCycleTracking } from "../hooks/useCycleTracking.js";
import { callClaude } from "../lib/api.js";

const MOODS = [
  { val: 1, emoji: "😫", label: "Rough" },
  { val: 2, emoji: "😔", label: "Low" },
  { val: 3, emoji: "😐", label: "Okay" },
  { val: 4, emoji: "🙂", label: "Good" },
  { val: 5, emoji: "✨", label: "Great" },
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
    checkins, todaysCheckin, last7, showedUpStreak, protocolDays, avgEnergy7,
    loading, loadCheckins, saveCheckin,
  } = useDailyCheckins(authUser, profileId);
  const { loggedToday: periodLoggedToday, logPeriodStart, undoToday: undoPeriodToday } = useCycleTracking(profileId);

  // Form state
  const [energy, setEnergy] = useState(0);
  const [mood, setMood] = useState(0);
  const [symptoms, setSymptoms] = useState([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
      notes: note,
    });
    setSaving(false);
    setSaved(true);

  };

  const loadWeeklyReflection = async () => {
    if (reflection) { setShowReflection(true); return; }
    setReflectionLoading(true);
    setShowReflection(true);
    const recent = checkins.slice(0, 7);
    const avgE = recent.filter(c => c.energy).reduce((a, c) => a + c.energy, 0) / (recent.filter(c => c.energy).length || 1);
    const allSymptoms = [...new Set(recent.flatMap(c => c.symptoms || []))];
    const rhythmDays = recent.filter(c => (c.rhythm_completed || 0) > 0).length;

    const result = await callClaude({
      tier: 'standard',
      maxTokens: 550,
      messages: [{
        role: "user",
        content: `You are a warm companion writing a short weekly reflection on someone's own self-logged week.

Person: ${user?.name || "friend"}
Total days tracked: ${protocolDays}
This week — average energy: ${avgE.toFixed(1)}/10
Days they ticked off at least one item of their own rhythm: ${rhythmDays}/7
Current showed-up streak: ${showedUpStreak} days
Symptoms they logged this week: ${allSymptoms.join(", ") || "none logged"}

Write a warm, personal reflection (2 short paragraphs, conversational, no headers):

Paragraph 1: Acknowledge what they actually did this week, using the numbers above. Make them feel seen for showing up, however much or little that was.

Paragraph 2: One gentle, practical focus for next week about keeping their OWN routine going (for example, making one item easier to remember). End with genuine encouragement.

Rules: describe only what was logged. Do not interpret symptoms, explain what is happening in their body, name or discuss any health condition, or suggest foods, supplements, treatments or medications. Do not attribute anything to Anthony William or any other source. If symptoms were logged, simply acknowledge that it sounds like a hard week and that their doctor is the right person for any concerns.`,
      }],
    });
    setReflection(result);
    setReflectionLoading(false);
  };

  // Voice intake — merges parsed fields into form state + saves to Supabase

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
            value={showedUpStreak > 0 ? `${showedUpStreak}🌿` : "—"}
            label="Showed-up streak"
            sub={showedUpStreak > 0 ? "days in a row" : "tick one thing today"}
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
              data={last7.map(d => ({ ...d, rhythm: d.rhythm_total ? Math.round((d.rhythm_completed / d.rhythm_total) * 100) : 0 }))}
              valueKey="rhythm"
              color="#16a34a"
              label="Own rhythm done (%)"
              max={100}
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
                const rhythmLabel = c.rhythm_total ? `🌿 ${c.rhythm_completed || 0}/${c.rhythm_total}` : "";
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
                      {rhythmLabel && (
                        <div style={{ fontSize: 10, color: c.rhythm_completed > 0 ? "#16a34a" : C.muted }}>
                          {rhythmLabel}
                        </div>
                      )}
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
