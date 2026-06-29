import { useState, useEffect } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { supabase } from "../lib/supabase.js";

const CORE_SUPPS = [
  { id: "lemon", label: "🍋 Lemon water (16–32oz on empty stomach)", timing: "morning_empty" },
  { id: "celery", label: "🥬 Celery juice (16oz minimum)", timing: "morning_empty" },
  { id: "hmds", label: "🫐 Heavy Metal Detox Smoothie", timing: "morning_food" },
];

const TIMINGS = [
  { id: "morning_empty", label: "Morning · empty stomach", color: C.leaf },
  { id: "morning_food", label: "Morning · with food", color: C.sage },
  { id: "midday", label: "Midday", color: C.gold },
  { id: "evening", label: "Evening", color: C.plum },
];

const TIMING_COLORS = Object.fromEntries(TIMINGS.map(t => [t.id, t.color]));
const TIMING_LABELS = Object.fromEntries(TIMINGS.map(t => [t.id, t.label]));

function todayKey() {
  const d = new Date();
  return `cs_supps_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function getSuppsForConditions(conditions = [], CONDITIONS) {
  if (!CONDITIONS) return [];
  const seen = new Set();
  const result = [];
  for (const cond of conditions) {
    const data = CONDITIONS[cond];
    if (!data) continue;
    for (const s of (data.supps || [])) {
      if (s.toLowerCase().includes("celery juice")) continue;
      const name = s.split(" ").slice(0, 3).join(" ");
      if (!seen.has(name)) {
        seen.add(name);
        result.push({ id: `cond_${name}`, label: s, timing: "morning_food" });
      }
    }
  }
  return result.slice(0, 12);
}

const BLANK_CUSTOM = { name: "", dose: "", timing: "morning_food" };

function todayDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function SupplementTracker({ userConditions = [], profileId }) {
  const [checked, setChecked] = useState({});
  const [expanded, setExpanded] = useState(false);
  const [customSupps, setCustomSupps] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(BLANK_CUSTOM);
  const [CONDITIONS, setCONDITIONS] = useState(null);

  const key = todayKey();
  const date = todayDate();

  // Load today's state — Supabase first if logged in, localStorage fallback
  useEffect(() => {
    try {
      setCustomSupps(JSON.parse(localStorage.getItem("cs_custom_supps") || "[]"));
    } catch { setCustomSupps([]); }

    if (profileId) {
      supabase
        .from("supplement_logs")
        .select("supplement_name, timing, taken")
        .eq("profile_id", profileId)
        .eq("date", date)
        .then(({ data }) => {
          if (data?.length) {
            const fromDb = {};
            for (const row of data) fromDb[`${row.supplement_name}__${row.timing}`] = row.taken;
            setChecked(fromDb);
            localStorage.setItem(key, JSON.stringify(fromDb));
          } else {
            try { setChecked(JSON.parse(localStorage.getItem(key) || "{}")); } catch { setChecked({}); }
          }
        });
    } else {
      try { setChecked(JSON.parse(localStorage.getItem(key) || "{}")); } catch { setChecked({}); }
    }
  }, [key, date, profileId]);

  useEffect(() => {
    import("../data/conditions.js").then(m => setCONDITIONS(m.CONDITIONS));
  }, []);

  const toggle = (supp) => {
    const dbKey = `${supp.label}__${supp.timing}`;
    setChecked((prev) => {
      const next = { ...prev, [dbKey]: !prev[dbKey] };
      localStorage.setItem(key, JSON.stringify(next));
      if (profileId) {
        supabase.from("supplement_logs").upsert({
          profile_id: profileId,
          date,
          supplement_name: supp.label,
          timing: supp.timing,
          taken: next[dbKey],
          taken_at: next[dbKey] ? new Date().toISOString() : null,
        }, { onConflict: "profile_id,date,supplement_name,timing" }).catch(() => {});
      }
      return next;
    });
  };

  const saveCustom = () => {
    if (!form.name.trim()) return;
    const newSupp = {
      id: `custom_${Date.now()}`,
      label: form.dose ? `${form.name.trim()} (${form.dose.trim()})` : form.name.trim(),
      timing: form.timing,
    };
    const next = [...customSupps, newSupp];
    setCustomSupps(next);
    localStorage.setItem("cs_custom_supps", JSON.stringify(next));
    setForm(BLANK_CUSTOM);
    setAdding(false);
  };

  const removeCustom = (id) => {
    const next = customSupps.filter(s => s.id !== id);
    setCustomSupps(next);
    localStorage.setItem("cs_custom_supps", JSON.stringify(next));
    setChecked((prev) => {
      const next2 = { ...prev };
      delete next2[id];
      localStorage.setItem(key, JSON.stringify(next2));
      return next2;
    });
  };

  const conditionSupps = getSuppsForConditions(userConditions, CONDITIONS);
  const allSupps = [...CORE_SUPPS, ...conditionSupps, ...customSupps];
  const suppKey = (s) => `${s.label}__${s.timing}`;
  const doneCount = allSupps.filter((s) => checked[suppKey(s)]).length;
  const pct = allSupps.length ? Math.round((doneCount / allSupps.length) * 100) : 0;

  // Group by timing for ordered display
  const byTiming = {};
  for (const t of TIMINGS) byTiming[t.id] = [];
  for (const s of allSupps) {
    if (byTiming[s.timing]) byTiming[s.timing].push(s);
    else byTiming["morning_food"].push(s);
  }

  return (
    <Card style={{ border: `1.5px solid ${C.sage}30` }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: 0, textAlign: "left",
        }}
      >
        <div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal }}>
            💊 Today's Supplements
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
            {doneCount}/{allSupps.length} taken · {pct}% done
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width={36} height={36} viewBox="0 0 36 36">
            <circle cx={18} cy={18} r={15} fill="none" stroke={C.border} strokeWidth={3} />
            <circle
              cx={18} cy={18} r={15} fill="none"
              stroke={pct === 100 ? C.sage : C.leaf}
              strokeWidth={3}
              strokeDasharray={`${(pct / 100) * 94.2} 94.2`}
              strokeLinecap="round"
              transform="rotate(-90 18 18)"
              style={{ transition: "stroke-dasharray 0.4s" }}
            />
            <text x={18} y={22} textAnchor="middle" fontSize={9} fill={C.mid} fontFamily="Georgia,serif">
              {pct}%
            </text>
          </svg>
          <span style={{ fontSize: 16, color: C.muted }}>{expanded ? "▼" : "▶"}</span>
        </div>
      </button>

      {expanded && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 2 }}>
          {TIMINGS.map((t) => {
            const group = byTiming[t.id];
            if (!group.length) return null;
            return (
              <div key={t.id}>
                <div style={{
                  fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8,
                  marginBottom: 6, marginTop: 10, color: t.color,
                }}>
                  {t.label}
                </div>
                {group.map((s) => (
                  <SuppRow
                    key={s.id}
                    label={s.label}
                    checked={!!checked[suppKey(s)]}
                    onToggle={() => toggle(s)}
                    isCustom={s.id.startsWith("custom_")}
                    onRemove={() => removeCustom(s.id)}
                    timingColor={t.color}
                  />
                ))}
              </div>
            );
          })}

          {conditionSupps.length === 0 && customSupps.length === 0 && (
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
              Add your own supplements below — enter exactly what you're following, including dose and timing.
            </div>
          )}

          {/* Add custom supplement */}
          {!adding ? (
            <button
              onClick={() => setAdding(true)}
              style={{
                marginTop: 12, background: "none", border: `1.5px dashed ${C.border}`,
                borderRadius: 10, padding: "8px 12px", fontSize: 12, color: C.muted,
                cursor: "pointer", width: "100%", fontFamily: "Georgia,serif",
              }}
            >
              + Add your own supplement
            </button>
          ) : (
            <div style={{ marginTop: 12, padding: "12px", background: `${C.sageLight}60`, borderRadius: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.charcoal, fontFamily: "Georgia,serif" }}>Add supplement</div>
              <input
                placeholder="Supplement name (e.g. Zinc)"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                style={{
                  border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px",
                  fontSize: 13, color: C.charcoal, background: "#fff", width: "100%", boxSizing: "border-box",
                }}
              />
              <input
                placeholder="Dose (optional, e.g. 50mg)"
                value={form.dose}
                onChange={(e) => setForm((f) => ({ ...f, dose: e.target.value }))}
                style={{
                  border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px",
                  fontSize: 13, color: C.charcoal, background: "#fff", width: "100%", boxSizing: "border-box",
                }}
              />
              <select
                value={form.timing}
                onChange={(e) => setForm((f) => ({ ...f, timing: e.target.value }))}
                style={{
                  border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px",
                  fontSize: 13, color: C.charcoal, background: "#fff", width: "100%",
                }}
              >
                {TIMINGS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={saveCustom}
                  style={{
                    flex: 1, background: C.sage, color: "#fff", border: "none",
                    borderRadius: 20, padding: "8px", fontSize: 13, cursor: "pointer",
                    fontFamily: "Georgia,serif", fontWeight: 700,
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => { setAdding(false); setForm(BLANK_CUSTOM); }}
                  style={{
                    flex: 1, background: "none", color: C.muted, border: `1px solid ${C.border}`,
                    borderRadius: 20, padding: "8px", fontSize: 13, cursor: "pointer",
                    fontFamily: "Georgia,serif",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {pct === 100 && (
            <div style={{
              marginTop: 12, padding: "10px 14px",
              background: C.sageLight, borderRadius: 10,
              fontSize: 13, color: C.sageDark,
              fontFamily: "Georgia,serif", fontWeight: 700,
              textAlign: "center",
            }}>
              ✨ Full protocol complete today — incredible healing work!
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function SuppRow({ label, checked, onToggle, isCustom, onRemove, timingColor }) {
  return (
    <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${C.border}40` }}>
      <button
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "9px 4px", background: "none", border: "none",
          cursor: "pointer", flex: 1, textAlign: "left",
        }}
      >
        <div style={{
          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
          background: checked ? C.sage : "transparent",
          border: `2px solid ${checked ? C.sage : C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: C.white, fontSize: 12, fontWeight: 700,
          transition: "all 0.15s",
        }}>
          {checked ? "✓" : ""}
        </div>
        <div style={{
          fontSize: 12, color: checked ? C.muted : C.charcoal,
          textDecoration: checked ? "line-through" : "none",
          lineHeight: 1.4, transition: "all 0.15s",
        }}>
          {label}
        </div>
      </button>
      {isCustom && (
        <button
          onClick={onRemove}
          style={{
            background: "none", border: "none", color: C.muted, cursor: "pointer",
            fontSize: 14, padding: "4px 8px", flexShrink: 0,
          }}
          title="Remove"
        >
          ✕
        </button>
      )}
    </div>
  );
}
