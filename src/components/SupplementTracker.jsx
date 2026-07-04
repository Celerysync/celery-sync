import { useState, useEffect } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { supabase } from "../lib/supabase.js";
import { useUserSupplements } from "../hooks/useUserSupplements.js";
import VoiceIntakeButton from "./VoiceIntakeButton.jsx";

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

const BLANK_CUSTOM = { name: "", dose: "", timing: "morning_food", unitsOnHand: "", unitsPerDose: "" };

function todayDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function formatRunOutDate(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function SupplementTracker({ userConditions = [], profileId }) {
  const [checked, setChecked] = useState({});
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(BLANK_CUSTOM);
  const [CONDITIONS, setCONDITIONS] = useState(null);
  const [editingStockFor, setEditingStockFor] = useState(null); // supplement name being edited
  const [stockForm, setStockForm] = useState({ unitsOnHand: "", unitsPerDose: "1", restockThresholdDays: "7" });

  const {
    supplements, addSupplement, removeSupplement,
    inventoryFor, setInventoryFor, adjustStockOnDoseChange, runOutInfoFor,
  } = useUserSupplements(profileId);

  const key = todayKey();
  const date = todayDate();

  // Load today's checked state — Supabase first if logged in, localStorage fallback
  useEffect(() => {
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
        if (supp.source === "custom") {
          adjustStockOnDoseChange(supp.name, next[dbKey]).catch(() => {});
        }
      }
      return next;
    });
  };

  const saveCustom = async () => {
    if (!form.name.trim()) return;
    const name = form.name.trim();
    const dose = form.dose.trim();

    if (profileId) {
      const saved = await addSupplement(name, dose, form.timing);
      if (saved && form.unitsOnHand.trim()) {
        await setInventoryFor(name, {
          unitsOnHand: Number(form.unitsOnHand),
          unitsPerDose: form.unitsPerDose.trim() ? Number(form.unitsPerDose) : 1,
        });
      }
    } else {
      // No account yet — fall back to localStorage-only, matching prior behaviour
      let local = [];
      try { local = JSON.parse(localStorage.getItem("cs_custom_supps") || "[]"); } catch { local = []; }
      local.push({ id: `local_${Date.now()}`, label: dose ? `${name} (${dose})` : name, timing: form.timing });
      localStorage.setItem("cs_custom_supps", JSON.stringify(local));
    }

    setForm(BLANK_CUSTOM);
    setAdding(false);
  };

  const removeCustom = (supp) => {
    if (profileId) {
      removeSupplement(supp.id);
    }
    setChecked((prev) => {
      const next2 = { ...prev };
      delete next2[`${supp.label}__${supp.timing}`];
      localStorage.setItem(key, JSON.stringify(next2));
      return next2;
    });
  };

  const handleVoiceWrite = async (fields) => {
    if (!profileId || !fields.restock?.name || !fields.restock?.unitsAdded) return;
    const name = fields.restock.name.trim();
    const existing = inventoryFor(name);
    const newTotal = (existing?.units_on_hand ?? 0) + fields.restock.unitsAdded;
    await setInventoryFor(name, {
      unitsOnHand: newTotal,
      unitsPerDose: existing?.units_per_dose ?? 1,
      restockThresholdDays: existing?.restock_threshold_days ?? 7,
    });
  };

  const openStockEditor = (name) => {
    const existing = inventoryFor(name);
    setStockForm({
      unitsOnHand: existing?.units_on_hand != null ? String(existing.units_on_hand) : "",
      unitsPerDose: existing ? String(existing.units_per_dose) : "1",
      restockThresholdDays: existing ? String(existing.restock_threshold_days) : "7",
    });
    setEditingStockFor(name);
  };

  const saveStock = async (name) => {
    await setInventoryFor(name, {
      unitsOnHand: stockForm.unitsOnHand.trim() ? Number(stockForm.unitsOnHand) : null,
      unitsPerDose: stockForm.unitsPerDose.trim() ? Number(stockForm.unitsPerDose) : 1,
      restockThresholdDays: stockForm.restockThresholdDays.trim() ? Number(stockForm.restockThresholdDays) : 7,
    });
    setEditingStockFor(null);
  };

  const conditionSupps = getSuppsForConditions(userConditions, CONDITIONS).map(s => ({ ...s, source: "condition" }));
  const customSuppItems = supplements.map((s) => ({
    id: s.id,
    label: s.dose_label ? `${s.name} (${s.dose_label})` : s.name,
    timing: s.timing,
    name: s.name,
    source: "custom",
  }));
  const allSupps = [...CORE_SUPPS.map(s => ({ ...s, source: "core" })), ...conditionSupps, ...customSuppItems];
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
          {profileId && (
            <div style={{ marginBottom: 10 }}>
              <VoiceIntakeButton inline onWrite={handleVoiceWrite} />
            </div>
          )}

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
                  <div key={s.id}>
                    <SuppRow
                      label={s.label}
                      checked={!!checked[suppKey(s)]}
                      onToggle={() => toggle(s)}
                      isCustom={s.source === "custom"}
                      onRemove={() => removeCustom(s)}
                      timingColor={t.color}
                    />
                    {s.source === "custom" && (
                      <StockLine
                        name={s.name}
                        runOutInfo={runOutInfoFor(s.name)}
                        editing={editingStockFor === s.name}
                        onOpen={() => openStockEditor(s.name)}
                        onCancel={() => setEditingStockFor(null)}
                        onSave={() => saveStock(s.name)}
                        stockForm={stockForm}
                        setStockForm={setStockForm}
                      />
                    )}
                  </div>
                ))}
              </div>
            );
          })}

          {conditionSupps.length === 0 && customSuppItems.length === 0 && (
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
                style={inputStyle}
              />
              <input
                placeholder="Dose (optional, e.g. 50mg)"
                value={form.dose}
                onChange={(e) => setForm((f) => ({ ...f, dose: e.target.value }))}
                style={inputStyle}
              />
              <select
                value={form.timing}
                onChange={(e) => setForm((f) => ({ ...f, timing: e.target.value }))}
                style={inputStyle}
              >
                {TIMINGS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>

              {profileId && (
                <>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                    Optional — track inventory so we can remind you before you run out
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      placeholder="Units on hand (e.g. 60)"
                      type="number"
                      value={form.unitsOnHand}
                      onChange={(e) => setForm((f) => ({ ...f, unitsOnHand: e.target.value }))}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <input
                      placeholder="Units per dose"
                      type="number"
                      value={form.unitsPerDose}
                      onChange={(e) => setForm((f) => ({ ...f, unitsPerDose: e.target.value }))}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                  </div>
                </>
              )}

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

const inputStyle = {
  border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px",
  fontSize: 13, color: C.charcoal, background: "#fff", width: "100%", boxSizing: "border-box",
};

function StockLine({ name, runOutInfo, editing, onOpen, onCancel, onSave, stockForm, setStockForm }) {
  if (editing) {
    return (
      <div style={{ marginLeft: 30, marginBottom: 8, padding: "8px 10px", background: `${C.sageLight}40`, borderRadius: 8, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            placeholder="Units on hand"
            type="number"
            value={stockForm.unitsOnHand}
            onChange={(e) => setStockForm((f) => ({ ...f, unitsOnHand: e.target.value }))}
            style={{ ...inputStyle, flex: 1, fontSize: 12, padding: "5px 8px" }}
          />
          <input
            placeholder="Per dose"
            type="number"
            value={stockForm.unitsPerDose}
            onChange={(e) => setStockForm((f) => ({ ...f, unitsPerDose: e.target.value }))}
            style={{ ...inputStyle, flex: 1, fontSize: 12, padding: "5px 8px" }}
          />
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <label style={{ fontSize: 11, color: C.muted, flex: 1 }}>
            Alert when
            <input
              type="number"
              value={stockForm.restockThresholdDays}
              onChange={(e) => setStockForm((f) => ({ ...f, restockThresholdDays: e.target.value }))}
              style={{ width: 40, margin: "0 4px", border: `1px solid ${C.border}`, borderRadius: 6, padding: "2px 4px", fontSize: 12 }}
            />
            days left
          </label>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onSave} style={{ flex: 1, background: C.sage, color: "#fff", border: "none", borderRadius: 16, padding: "6px", fontSize: 12, cursor: "pointer", fontFamily: "Georgia,serif" }}>Save</button>
          <button onClick={onCancel} style={{ flex: 1, background: "none", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 16, padding: "6px", fontSize: 12, cursor: "pointer", fontFamily: "Georgia,serif" }}>Cancel</button>
        </div>
      </div>
    );
  }

  if (!runOutInfo) {
    return (
      <button
        onClick={onOpen}
        style={{ marginLeft: 30, marginBottom: 8, background: "none", border: "none", color: C.muted, fontSize: 11, cursor: "pointer", padding: 0, textDecoration: "underline" }}
      >
        + track inventory for {name}
      </button>
    );
  }

  const low = runOutInfo.daysRemaining <= runOutInfo.restockThresholdDays;
  return (
    <button
      onClick={onOpen}
      style={{
        marginLeft: 30, marginBottom: 8, background: "none", border: "none",
        color: low ? C.terracotta : C.muted, fontSize: 11, cursor: "pointer", padding: 0,
      }}
    >
      {runOutInfo.unitsOnHand} left · runs out ~{formatRunOutDate(runOutInfo.runOutDate)}{low ? " · reorder soon" : ""}
    </button>
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
