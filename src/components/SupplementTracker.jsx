import { useState, useEffect } from "react";
import { announceActivity } from "../lib/appActivity.js";
import C, { alpha } from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { supabase } from "../lib/supabase.js";
import { RHYTHM_CHANGED_EVENT } from "../lib/rhythmSchedule.js";
import { SUPPLEMENTS_CHANGED_EVENT, useUserSupplements } from "../hooks/useUserSupplements.js";
import { SUPPLEMENT_CATEGORY, supplementEventRow, supplementLabel } from "../lib/supplementEvents.js";

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

const BLANK_CUSTOM = { name: "", dose: "", timing: "morning_food", unitsOnHand: "", unitsPerDose: "" };

function todayDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function formatRunOutDate(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function SupplementTracker({ authUser, profileId }) {
  const [checked, setChecked] = useState({});
  const [saveError, setSaveError] = useState("");
  const [reloadTick, setReloadTick] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(BLANK_CUSTOM);
  const [editingStockFor, setEditingStockFor] = useState(null); // supplement name being edited
  const [stockForm, setStockForm] = useState({ unitsOnHand: "", unitsPerDose: "1", restockThresholdDays: "7" });

  const {
    supplements, addSupplement, removeSupplement,
    inventoryFor, setInventoryFor, adjustStockOnDoseChange, runOutInfoFor, setWithItem,
  } = useUserSupplements(profileId);

  // Steps a supplement can be taken with: their everyday rhythm, plus the
  // running program's steps.
  const [steps, setSteps] = useState([]);
  useEffect(() => {
    if (!profileId) return;
    const load = async () => {
      const { data } = await supabase.from("rhythm_items").select("id, name, emoji")
        .eq("profile_id", profileId).is("archived_at", null).order("sort_order");
      let programSteps = [];
      try { programSteps = (JSON.parse(localStorage.getItem("cs_active_program") || "null")?.items || []).map((i) => ({ id: i.id, name: i.name, emoji: i.emoji })); } catch { programSteps = []; }
      setSteps([...(data || []), ...programSteps]);
    };
    load();
    window.addEventListener(RHYTHM_CHANGED_EVENT, load);
    return () => window.removeEventListener(RHYTHM_CHANGED_EVENT, load);
  }, [profileId]);

  const key = todayKey();
  const date = todayDate();

  // Load today's checked state from the activity ledger — the same place every
  // other completion lives — with localStorage as the fallback.
  useEffect(() => {
    if (profileId) {
      supabase
        .from("v_daily_status")
        .select("item_name, occurrence_slot, status")
        .eq("profile_id", profileId)
        .eq("local_date", date)
        .eq("item_category", SUPPLEMENT_CATEGORY)
        .then(({ data }) => {
          if (data?.length) {
            const fromDb = {};
            for (const row of data) fromDb[`${row.item_name}__${row.occurrence_slot}`] = row.status === "completed";
            setChecked(fromDb);
            localStorage.setItem(key, JSON.stringify(fromDb));
          } else {
            try { setChecked(JSON.parse(localStorage.getItem(key) || "{}")); } catch { setChecked({}); }
          }
        });
    } else {
      try { setChecked(JSON.parse(localStorage.getItem(key) || "{}")); } catch { setChecked({}); }
    }
  }, [key, date, profileId, reloadTick]);

  // A tick made by voice arrives from outside this component.
  useEffect(() => {
    const reload = () => setReloadTick((n) => n + 1);
    window.addEventListener(SUPPLEMENTS_CHANGED_EVENT, reload);
    return () => window.removeEventListener(SUPPLEMENTS_CHANGED_EVENT, reload);
  }, []);

  const toggle = async (supp) => {
    const dbKey = `${supp.label}__${supp.timing}`;
    const nowTaken = !checked[dbKey];
    const show = (taken) => setChecked((prev) => {
      const next = { ...prev, [dbKey]: taken };
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });

    show(nowTaken);
    setSaveError("");
    if (profileId && authUser?.id) {
      const { error } = await supabase.from("activity_events").insert(supplementEventRow({
        userId: authUser.id, profileId, supplement: supp, taken: nowTaken, source: "tap", date,
      }));
      if (error) {
        show(!nowTaken);
        setSaveError(`That didn't save, so ${supp.label} is back as it was. Please try again.`);
        return;
      }
      if (supp.source === "custom") {
        adjustStockOnDoseChange(supp.name, nowTaken).catch(() => {});
      }
    }
    announceActivity(nowTaken ? `marked ${supp.label} as taken` : `marked ${supp.label} as not taken`);
  };

  const saveCustom = async () => {
    if (!form.name.trim()) return;
    const name = form.name.trim();
    const dose = form.dose.trim();

    if (profileId) {
      const saved = await addSupplement(name, dose, form.timing, form.withItemId || null);
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

  const customSuppItems = supplements.map((s) => ({
    id: s.id,
    withItemId: s.with_item_id || null,
    label: supplementLabel(s),
    dose_label: s.dose_label,
    timing: s.timing,
    name: s.name,
    source: "custom",
  }));
  const allSupps = customSuppItems;
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
    <Card style={{ border: `1.5px solid ${alpha(C.sage, "30")}` }}>
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
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            {allSupps.length ? `${doneCount}/${allSupps.length} taken · ${pct}% done` : "None listed yet. Tap to add yours."}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width={36} height={36} viewBox="0 0 36 36">
            <circle cx={18} cy={18} r={15} fill="none" style={{ stroke: C.border }} strokeWidth={3} />
            <circle
              cx={18} cy={18} r={15} fill="none"
              style={{ stroke: pct === 100 ? C.sage : C.leaf }}
              strokeWidth={3}
              strokeDasharray={`${(pct / 100) * 94.2} 94.2`}
              strokeLinecap="round"
              transform="rotate(-90 18 18)"
              style={{ transition: "stroke-dasharray 0.4s" }}
            />
            <text x={18} y={22} textAnchor="middle" fontSize={9} style={{ fill: C.mid }} fontFamily="Georgia,serif">
              {pct}%
            </text>
          </svg>
          <span style={{ fontSize: 16, color: C.muted }}>{expanded ? "▼" : "▶"}</span>
        </div>
      </button>

      {expanded && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 2 }}>
          {saveError && (
            <div role="alert" style={{ fontSize: 13, color: C.charcoal, background: C.goldLight, borderRadius: 10, padding: "8px 12px", marginBottom: 6 }}>
              {saveError}
            </div>
          )}
          {TIMINGS.map((t) => {
            const group = byTiming[t.id];
            if (!group.length) return null;
            return (
              <div key={t.id}>
                <div style={{
                  fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8,
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
                    {s.source === "custom" && steps.length > 0 && (
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.muted, padding: "2px 4px 6px 34px" }}>
                        Taken with
                        <select
                          aria-label={`What ${s.label} is taken with`}
                          value={s.withItemId || ""}
                          onChange={(e) => setWithItem(s.id, e.target.value)}
                          style={{ fontSize: 13, padding: "4px 8px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.charcoal }}
                        >
                          <option value="">nothing (on its own)</option>
                          {steps.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
                        </select>
                      </label>
                    )}
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

          {customSuppItems.length === 0 && (
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
            <div style={{ marginTop: 12, padding: "12px", background: `${alpha(C.sageLight, "60")}`, borderRadius: 12, display: "flex", flexDirection: "column", gap: 8 }}>
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
              {steps.length > 0 && (
                <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: C.charcoal }}>
                  Taken with a step? (optional)
                  <select
                    value={form.withItemId || ""}
                    onChange={(e) => setForm((f) => ({ ...f, withItemId: e.target.value }))}
                    style={{ padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.surface, fontSize: 14, color: C.charcoal }}
                  >
                    <option value="">No, on its own</option>
                    {steps.map((st) => <option key={st.id} value={st.id}>{st.emoji} {st.name}</option>)}
                  </select>
                </label>
              )}

              {profileId && (
                <>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
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
              ✨ Every supplement ticked off today — lovely consistency!
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

const inputStyle = {
  border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 10px",
  fontSize: 13, color: C.charcoal, background: C.surface, width: "100%", boxSizing: "border-box",
};

function StockLine({ name, runOutInfo, editing, onOpen, onCancel, onSave, stockForm, setStockForm }) {
  if (editing) {
    return (
      <div style={{ marginLeft: 30, marginBottom: 8, padding: "8px 10px", background: `${alpha(C.sageLight, "40")}`, borderRadius: 8, display: "flex", flexDirection: "column", gap: 6 }}>
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
          <label style={{ fontSize: 12, color: C.muted, flex: 1 }}>
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
        style={{ marginLeft: 30, marginBottom: 8, background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", padding: 0, textDecoration: "underline" }}
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
        color: low ? C.terracotta : C.muted, fontSize: 12, cursor: "pointer", padding: 0,
      }}
    >
      {runOutInfo.unitsOnHand} left · runs out ~{formatRunOutDate(runOutInfo.runOutDate)}{low ? " · reorder soon" : ""}
    </button>
  );
}

function SuppRow({ label, checked, onToggle, isCustom, onRemove, timingColor }) {
  return (
    <div style={{ display: "flex", alignItems: "center", borderBottom: `1px solid ${alpha(C.border, "40")}` }}>
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
