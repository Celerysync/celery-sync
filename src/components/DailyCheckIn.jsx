import { useState } from "react";
import C from "../lib/colors.js";
import { Card, Btn } from "./ui.jsx";

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

const ENERGY_OPTS = [
  { val: 2,  emoji: "😴", label: "Exhausted" },
  { val: 4,  emoji: "🥴", label: "Struggling" },
  { val: 6,  emoji: "😐", label: "Okay" },
  { val: 8,  emoji: "🙂", label: "Good" },
  { val: 10, emoji: "✨", label: "Great" },
];

const CELERY_OPTS = [
  { val: 0,  label: "None" },
  { val: 8,  label: "8 oz" },
  { val: 16, label: "16 oz" },
  { val: 32, label: "32 oz+" },
];

const COMMON_SYMPTOMS = [
  "Fatigue", "Brain fog", "Headache", "Bloating", "Joint pain",
  "Anxiety", "Low mood", "Overwhelm", "Insomnia", "Nausea",
  "Skin issues", "Heart palpitations", "Panic attacks", "Irritability",
];

export default function DailyCheckIn({ todaysCheckin, userSymptoms = [], onSave, saving }) {
  const [energy, setEnergy] = useState(todaysCheckin?.energy ?? null);
  const [celeryOz, setCeleryOz] = useState(todaysCheckin?.celery_oz ?? null);
  const [morningProtocol, setMorningProtocol] = useState(todaysCheckin?.morning_protocol ?? false);
  const [symptoms, setSymptoms] = useState(todaysCheckin?.symptoms ?? []);
  const [notes, setNotes] = useState(todaysCheckin?.notes ?? "");
  const [editing, setEditing] = useState(!todaysCheckin);
  const [sleepHours, setSleepHours] = useState(todaysCheckin?.sleep_hours ?? null);
  const [sleepQuality, setSleepQuality] = useState(todaysCheckin?.sleep_quality ?? null);
  const [hrv, setHrv] = useState(todaysCheckin?.hrv ?? "");
  const [showVitals, setShowVitals] = useState(!!(todaysCheckin?.sleep_hours || todaysCheckin?.hrv));

  const toggleSymptom = (s) =>
    setSymptoms((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const handleSave = async () => {
    await onSave({
      energy, celery_oz: celeryOz ?? 0, morning_protocol: morningProtocol, symptoms, notes,
      sleep_hours: sleepHours ?? null,
      sleep_quality: sleepQuality ?? null,
      hrv: hrv ? parseInt(hrv) : null,
      wearable_source: (sleepHours || hrv) ? "manual" : null,
    });
    setEditing(false);
  };

  const allSymptoms = [...new Set([...(userSymptoms || []), ...COMMON_SYMPTOMS])].slice(0, 12);

  // Already checked in — show summary
  if (todaysCheckin && !editing) {
    const e = ENERGY_OPTS.find(o => o.val === todaysCheckin.energy);
    return (
      <Card style={{ background: C.sageLight, border: `1.5px solid ${C.sage}40` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
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
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {e && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28 }}>{e.emoji}</div>
              <div style={{ fontSize: 11, color: C.mid }}>{e.label}</div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: C.mid }}>
            {todaysCheckin.celery_oz > 0 && <div>🥬 {todaysCheckin.celery_oz}oz celery juice</div>}
            {todaysCheckin.morning_protocol && <div>🌅 Morning protocol done</div>}
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
        A quick daily check-in tracks your healing progress over time
      </div>

      {/* Energy */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 8 }}>Energy level</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          {ENERGY_OPTS.map((o) => (
            <button
              key={o.val}
              onClick={() => setEnergy(o.val)}
              style={{
                flex: 1, padding: "10px 4px", borderRadius: 12, border: "none", cursor: "pointer",
                background: energy === o.val ? C.plum : C.mist,
                color: energy === o.val ? C.white : C.charcoal,
                transition: "all 0.15s",
              }}
            >
              <div style={{ fontSize: 22 }}>{o.emoji}</div>
              <div style={{ fontSize: 9, marginTop: 2, fontFamily: "Georgia,serif" }}>{o.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Celery juice */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 8 }}>🥬 Celery juice today?</div>
        <div style={{ display: "flex", gap: 8 }}>
          {CELERY_OPTS.map((o) => (
            <button
              key={o.val}
              onClick={() => setCeleryOz(o.val)}
              style={{
                flex: 1, padding: "9px 4px", borderRadius: 10, border: "none", cursor: "pointer",
                fontFamily: "Georgia,serif", fontSize: 12, fontWeight: 700,
                background: celeryOz === o.val ? C.leaf : C.mist,
                color: celeryOz === o.val ? C.white : C.charcoal,
                transition: "all 0.15s",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Morning protocol */}
      <div
        onClick={() => setMorningProtocol((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
          borderTop: `1px solid ${C.border}`, cursor: "pointer", marginBottom: 12,
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
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 8 }}>
          Any symptoms today? <span style={{ fontWeight: 400 }}>(tap all that apply)</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {allSymptoms.map((s) => (
            <button
              key={s}
              onClick={() => toggleSymptom(s)}
              style={{
                padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer",
                fontFamily: "Georgia,serif", fontSize: 11,
                background: symptoms.includes(s) ? C.terracotta : C.mist,
                color: symptoms.includes(s) ? C.white : C.charcoal,
                transition: "all 0.15s",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Sleep + HRV vitals — collapsible */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, marginBottom: 12 }}>
        <button
          onClick={() => setShowVitals((v) => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 6, background: "none",
            border: "none", cursor: "pointer", width: "100%", padding: "2px 0",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: C.mid }}>
            {showVitals ? "▼" : "▶"} Sleep & vitals <span style={{ fontWeight: 400 }}>(optional)</span>
          </div>
          {!showVitals && (sleepHours || sleepQuality || hrv) && (
            <div style={{ fontSize: 10, color: C.sage, marginLeft: 4 }}>✓ filled</div>
          )}
        </button>

        {showVitals && (
          <div style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Sleep hours */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 8 }}>🌙 Hours of sleep</div>
              <div style={{ display: "flex", gap: 6 }}>
                {SLEEP_OPTS.map((o) => (
                  <button
                    key={o.val}
                    onClick={() => setSleepHours(o.val)}
                    style={{
                      flex: 1, padding: "7px 2px", borderRadius: 10, border: "none", cursor: "pointer",
                      fontFamily: "Georgia,serif", fontSize: 11, fontWeight: 700,
                      background: sleepHours === o.val ? C.plum : C.mist,
                      color: sleepHours === o.val ? C.white : C.charcoal,
                    }}
                  >
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
                  <button
                    key={o.val}
                    onClick={() => setSleepQuality(o.val)}
                    style={{
                      flex: 1, padding: "8px 2px", borderRadius: 10, border: "none", cursor: "pointer",
                      background: sleepQuality === o.val ? C.plum : C.mist,
                      color: sleepQuality === o.val ? C.white : C.charcoal,
                    }}
                  >
                    <div style={{ fontSize: 18 }}>{o.emoji}</div>
                    <div style={{ fontSize: 8.5, marginTop: 2, fontFamily: "Georgia,serif" }}>{o.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* HRV */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 6 }}>
                💓 Morning HRV <span style={{ fontWeight: 400 }}>(from Oura, Garmin, or app)</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="number"
                  min={10} max={200}
                  value={hrv}
                  onChange={(e) => setHrv(e.target.value)}
                  placeholder="e.g. 48"
                  style={{
                    flex: 1, padding: "9px 12px", borderRadius: 10,
                    border: `1.5px solid ${C.border}`, fontFamily: "Georgia,serif",
                    fontSize: 14, color: C.charcoal, outline: "none",
                  }}
                />
                <div style={{ fontSize: 12, color: C.muted }}>ms</div>
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                HRV reflects adrenal health and nervous system resilience — Anthony William
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

      <Btn full onClick={handleSave} disabled={saving || energy === null} color={C.plum}>
        {saving ? "Saving…" : "Save Today's Check-in"}
      </Btn>
    </Card>
  );
}
