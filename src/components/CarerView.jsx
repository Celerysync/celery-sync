import { useState, useEffect } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";

function getNowTask() {
  const h = new Date().getHours();
  if (h >= 5 && h < 7)  return { emoji: "🍋", label: "Lemon water time", detail: "16–32oz warm lemon water on an empty stomach" };
  if (h >= 7 && h < 9)  return { emoji: "🥬", label: "Celery juice time", detail: "16oz pure celery juice, nothing added — at least 30 min after lemon water" };
  if (h >= 9 && h < 11) return { emoji: "🫐", label: "Heavy Metal Detox Smoothie", detail: "Wild blueberries, banana, spirulina, barley grass, Atlantic dulse, cilantro, orange juice" };
  if (h >= 10 && h < 17) return { emoji: "🍎", label: "Adrenal snack time", detail: "Apple + celery, banana + dates, or coconut water + banana — every 2 hours" };
  if (h >= 17 && h < 20) return { emoji: "🌆", label: "Light dinner", detail: "Steamed vegetables, baked potato, or warm soup — finish by 7pm ideally" };
  return { emoji: "🌙", label: "Evening rest", detail: "Light fruit only if needed. The liver does its deepest healing work 1–3am" };
}

const CATEGORY_COLORS = {
  supplement: { bg: C.sageLight,       color: C.sageDark },
  symptom:    { bg: C.terracottaLight,  color: C.terracotta },
  pattern:    { bg: "#EEF2FF",          color: "#4B5EAA" },
  emotion:    { bg: C.plumLight,        color: C.plum },
  milestone:  { bg: C.goldLight,        color: C.gold },
  protocol:   { bg: "#E8F5E9",          color: "#2E7D32" },
  general:    { bg: C.mist,             color: C.mid },
};

function EnergyBar({ value, max = 10 }) {
  if (!value) return <span style={{ fontSize: 11, color: C.muted }}>No data</span>;
  const pct = (value / max) * 100;
  const color = value >= 7 ? C.sage : value >= 4 ? C.gold : C.terracotta;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.border }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: color }} />
      </div>
      <span style={{ fontSize: 12, color, fontWeight: 700 }}>{value}/10</span>
    </div>
  );
}

function PatientCard({ patient }) {
  const [expanded, setExpanded] = useState(false);
  const task = getNowTask();

  const checkins = patient.checkins || [];
  const milestones = patient.milestones || [];
  const celeryDays = checkins.filter(c => c.celery_oz > 0).length;
  const avgEnergy = checkins.length
    ? Math.round((checkins.reduce((s, c) => s + (c.energy || 0), 0) / checkins.filter(c => c.energy).length) * 10) / 10
    : null;
  const lastCheckin = checkins[0];
  const lastCheckinLabel = lastCheckin
    ? lastCheckin.check_date === new Date().toISOString().split("T")[0] ? "Today" : lastCheckin.check_date
    : "No check-ins yet";

  return (
    <div style={{
      background: "#fff", borderRadius: 18,
      border: `1.5px solid ${C.plum}25`,
      marginBottom: 14, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${C.plum}18, ${C.plumLight})`,
        padding: "16px 18px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <span style={{ fontSize: 32 }}>{patient.avatar_emoji || "🌿"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16, color: C.charcoal }}>
              {patient.name}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
              Last check-in: {lastCheckinLabel}
            </div>
          </div>
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 11,
              fontFamily: "Georgia,serif", fontWeight: 700,
              border: `1.5px solid ${C.plum}40`,
              background: expanded ? C.plum : "transparent",
              color: expanded ? "#fff" : C.plum,
              cursor: "pointer",
            }}
          >
            {expanded ? "Close" : "Details"}
          </button>
        </div>

        {/* Conditions */}
        {patient.symptoms?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {patient.symptoms.slice(0, 4).map(s => (
              <span key={s} style={{
                padding: "3px 10px", borderRadius: 20, fontSize: 10,
                background: `${C.plum}15`, color: C.plum,
                fontFamily: "Georgia,serif",
              }}>
                {s}
              </span>
            ))}
            {patient.symptoms.length > 4 && (
              <span style={{ fontSize: 10, color: C.muted, alignSelf: "center" }}>
                +{patient.symptoms.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        padding: "12px 18px", gap: 8,
        borderBottom: expanded ? `1px solid ${C.border}` : "none",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: celeryDays >= 5 ? C.sage : C.gold, fontFamily: "Georgia,serif" }}>
            {celeryDays}/7
          </div>
          <div style={{ fontSize: 10, color: C.muted }}>celery days</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: avgEnergy >= 7 ? C.sage : avgEnergy >= 4 ? C.gold : C.terracotta, fontFamily: "Georgia,serif" }}>
            {avgEnergy ?? "—"}
          </div>
          <div style={{ fontSize: 10, color: C.muted }}>avg energy</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.plum, fontFamily: "Georgia,serif" }}>
            {milestones.length}
          </div>
          <div style={{ fontSize: 10, color: C.muted }}>milestones</div>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: "14px 18px" }}>

          {/* What they should be doing right now */}
          <div style={{
            background: C.sageLight, borderRadius: 12,
            padding: "12px 14px", marginBottom: 14,
            border: `1px solid ${C.sage}30`,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.sageDark, fontFamily: "Georgia,serif", marginBottom: 4 }}>
              {task.emoji} Right now: {task.label}
            </div>
            <div style={{ fontSize: 12, color: C.mid, lineHeight: 1.6 }}>{task.detail}</div>
          </div>

          {/* This week's check-ins */}
          {checkins.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                This week
              </div>
              {checkins.map(c => (
                <div key={c.check_date} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "7px 0", borderBottom: `1px solid ${C.border}40`,
                }}>
                  <div style={{ fontSize: 12, color: C.charcoal, fontFamily: "Georgia,serif" }}>
                    {new Date(c.check_date + "T12:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {c.celery_oz > 0 && <span title="Celery juice" style={{ fontSize: 13 }}>🥬</span>}
                    {c.morning_protocol && <span title="Morning protocol" style={{ fontSize: 13 }}>✅</span>}
                    {c.energy && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px",
                        borderRadius: 20, background: C.sageLight, color: C.sageDark,
                      }}>
                        ⚡ {c.energy}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent milestones */}
          {milestones.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                Recent milestones
              </div>
              {milestones.map((m, i) => {
                const cat = CATEGORY_COLORS[m.category] || CATEGORY_COLORS.general;
                return (
                  <div key={i} style={{
                    display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start",
                  }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 20, fontSize: 9, fontWeight: 700,
                      background: cat.bg, color: cat.color, flexShrink: 0, marginTop: 1,
                      textTransform: "uppercase", letterSpacing: 0.3,
                    }}>
                      {m.category}
                    </span>
                    <span style={{ fontSize: 12, color: C.charcoal, lineHeight: 1.6 }}>{m.insight}</span>
                  </div>
                );
              })}
            </div>
          )}

          {checkins.length === 0 && milestones.length === 0 && (
            <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: "12px 0", fontStyle: "italic" }}>
              No data yet — they may still be getting started
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CarerView({ authUser }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser?.id) return;
    fetch(`/api/carers/my-patients?userId=${authUser.id}`)
      .then(r => r.json())
      .then(data => { setPatients(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [authUser?.id]);

  if (loading) return (
    <div style={{ textAlign: "center", padding: "48px 0", color: C.muted, fontFamily: "Georgia,serif" }}>
      🌿 Loading…
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg,${C.plum},#5c3f6b)`,
        borderRadius: 20, padding: "20px 20px 18px", color: "#fff", marginBottom: 12,
      }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 700 }}>
          💜 {patients.length > 0 ? `Caring for ${patients.length === 1 ? patients[0].name : `${patients.length} people`}` : "Your carer view"}
        </div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6, lineHeight: 1.6 }}>
          {patients.length > 0
            ? "You can see their healing progress, energy trends, and recent milestones."
            : "You haven't been invited as a carer for anyone yet."}
        </div>
      </div>

      {patients.length === 0 ? (
        <Card>
          <div style={{ fontSize: 32, textAlign: "center", marginBottom: 12 }}>💜</div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, textAlign: "center", marginBottom: 8 }}>
            How carer access works
          </div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.8, textAlign: "center" }}>
            Ask your friend to open CelerySync, go to their <strong>Account tab</strong>, scroll to <strong>Carers</strong>, and enter your email. You'll get a link to accept — then their healing progress will appear here.
          </div>
        </Card>
      ) : (
        patients.map(p => <PatientCard key={p.id} patient={p} />)
      )}
    </div>
  );
}
