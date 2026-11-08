import { useEffect, useState } from "react";
import C, { alpha } from "../lib/colors.js";
import { Card, Btn } from "./ui.jsx";
import { supabase } from "../lib/supabase.js";
import { isProgramRow, programDescription, buildProgramItem, savedRowToProgram, rowTotalDays } from "../lib/savedRhythms.js";
import { isRelative, localDateStr, scheduleTimes, RHYTHM_CHANGED_EVENT } from "../lib/rhythmSchedule.js";
import { useKitchen } from "../hooks/useKitchen.js";
import { KIND_BY_ID } from "../lib/kitchen.js";

// Link a step to one of their own recipes, so Today shows 📖 to open it.
function RecipePicker({ recipes, value, onChange, small = false }) {
  if (!recipes.length) return null;
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: small ? 12 : 13, color: C.charcoal }}>
      📖 Recipe from your Kitchen (optional)
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value || null)}
        style={{ padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.surface, fontSize: 14, color: C.charcoal }}
      >
        <option value="">None</option>
        {recipes.map((r) => <option key={r.id} value={r.id}>{KIND_BY_ID[r.kind]?.emoji} {r.name}</option>)}
      </select>
    </label>
  );
}

const CATEGORIES = ["morning", "supplement", "food", "medicine", "other"];
const CATEGORY_EMOJIS = { morning: "🌅", supplement: "💊", food: "🍽", medicine: "⚕️", other: "✨" };
const FREQ_LABELS = { daily: "Every day", weekdays: "Weekdays only", "as-needed": "As needed" };
const DUR_LABELS = { ongoing: "Ongoing", days: "For N days", cleanse: "During cleanse only" };

const formatFixedTime = (t) =>
  t ? new Date(`2000-01-01T${t}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : null;

const BLANK_ITEM = {
  name: "",
  emoji: "✨",
  category: "other",
  spacingMinutes: 30,
  fixedTime: null,
  schedule: null,
  frequency: "daily",
  durationType: "ongoing",
  durationDays: null,
  startDate: null,
  isMedicine: false,
  note: "",
  sortOrder: 999,
};

const BLANK_PROGRAM_ITEM = {
  fixedTime: "",
  name: "",
  emoji: "✨",
  category: "other",
  spacingMinutes: 30,
  note: "",
  fromDay: 1,
  toDay: null, // defaults to the program's total days
};

export default function RhythmBuilder({
  baseItems,
  anchorTime,
  activeProgram,
  profileId,
  authUser,
  onClose,
  onApplyTemplate,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onReorder,
  onSetAnchorTime,
  onStartProgram,
  onCancelProgram,
  // Opened from one clear button on Today (focused): one job, plain title,
  // no tab bar. { level: "add" | "step" | "order" | "saved" | "wake" | "programs", itemId }
  openAt = null,
}) {
  const focused = !!openAt;
  const { recipes } = useKitchen(profileId);
  // Open on the items themselves when there are any — "Edit" opening on an
  // empty Day Templates page made it look as if nothing had been added.
  const [level, setLevel] = useState(() => {
    if (openAt) return { add: "add", step: "edit", order: "edit", saved: "templates", wake: "wake", programs: "programs" }[openAt.level] || "edit";
    return baseItems.length ? "edit" : "templates";
  }); // templates | programs | program-new | edit | add | save-template | wake
  const [editingId, setEditingId] = useState(() => (openAt?.level === "step" ? openAt.itemId : null));
  const [addForm, setAddForm] = useState(BLANK_ITEM);
  const [localAnchor, setLocalAnchor] = useState(anchorTime || "07:00");
  const [programStartDate, setProgramStartDate] = useState(
    localDateStr()
  );
  const [confirmClearId, setConfirmClearId] = useState(null);
  const [pausedIds, setPausedIds] = useState([]); // everyday items to pause during a program
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [saveTemplateEmoji, setSaveTemplateEmoji] = useState("✨");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savedTemplateMsg, setSavedTemplateMsg] = useState("");

  // The user's own saved day templates and programs (saved_rhythms)
  const [savedRows, setSavedRows] = useState([]);
  const [confirmDeleteSavedId, setConfirmDeleteSavedId] = useState(null);

  // New-program builder
  const [progForm, setProgForm] = useState({ name: "", emoji: "✨", totalDays: 9, items: [] });
  const [progItemForm, setProgItemForm] = useState(BLANK_PROGRAM_ITEM);
  const [savingProgram, setSavingProgram] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState(null); // null = building a new one
  const [programError, setProgramError] = useState("");

  // A copy of a saved program, to change without touching the original.
  const copyProgram = async (row) => {
    const taken = new Set(savedRows.map((r) => r.name));
    let name = `${row.name} (copy)`;
    for (let n = 2; taken.has(name); n++) name = `${row.name} (copy ${n})`;
    const { data } = await supabase.from("saved_rhythms").insert({
      profile_id: profileId, name, emoji: row.emoji, description: row.description, items: row.items,
    }).select().single();
    if (data) setSavedRows((prev) => [data, ...prev]);
  };

  // Steps they already have, added in one go: from their everyday rhythm or
  // another saved program. Each runs every day of this program to start with.
  const addStepsFrom = (source) => {
    const days = progForm.totalDays;
    const from = source === "everyday"
      ? baseItems.map((i) => ({ name: i.name, emoji: i.emoji, category: i.category, spacingMinutes: i.spacingMinutes, note: i.note, recipeId: i.recipeId, fromDay: 1, toDay: days }))
      : (savedRows.find((r) => r.id === source)?.items || []).map((i) => ({
          name: i.name, emoji: i.emoji, category: i.category, spacingMinutes: i.spacingMinutes, note: i.note, recipeId: i.recipeId,
          fromDay: i.programDayRange?.[0] ?? 1, toDay: i.programDayRange?.[1] ?? days,
        }));
    setProgForm((f) => ({
      ...f,
      items: [...f.items, ...from.map((raw, i) => buildProgramItem(raw, f.totalDays, f.items.length + i + 1))],
    }));
  };

  useEffect(() => {
    if (!profileId) return;
    const load = () => supabase
      .from("saved_rhythms")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setSavedRows(data || []));
    load();
    // Templates/programs saved by the voice companion show up straight away
    window.addEventListener(RHYTHM_CHANGED_EVENT, load);
    return () => window.removeEventListener(RHYTHM_CHANGED_EVENT, load);
  }, [profileId]);

  const savedTemplates = savedRows.filter((r) => !isProgramRow(r));
  const savedPrograms = savedRows.filter(isProgramRow);

  const deleteSavedRow = async (id) => {
    if (confirmDeleteSavedId !== id) { setConfirmDeleteSavedId(id); return; }
    setConfirmDeleteSavedId(null);
    await supabase.from("saved_rhythms").delete().eq("id", id);
    setSavedRows((prev) => prev.filter((r) => r.id !== id));
  };

  const editingItem = editingId ? baseItems.find((i) => i.id === editingId) : null;
  const [editForm, setEditForm] = useState(() => {
    const it = openAt?.level === "step" ? baseItems.find((i) => i.id === openAt.itemId) : null;
    return it ? { ...it } : {};
  });

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ ...item });
    setLevel("edit");
  };

  const saveAnchor = () => {
    onSetAnchorTime(localAnchor);
    if (focused && level === "wake") onClose();
  };

  const saveEditedItem = () => {
    onUpdateItem(editingId, editForm);
    setEditingId(null);
    if (openAt?.level === "step") { onClose(); return; }
    setLevel("edit");
  };

  const saveNewItem = () => {
    if (!addForm.name.trim()) return;
    const today = localDateStr();
    onAddItem({
      ...addForm,
      startDate: addForm.durationType === "days" ? today : null,
    });
    setAddForm(BLANK_ITEM);
    if (focused) { onClose(); return; }
    setLevel("edit");
  };

  const removeItem = (id) => {
    if (confirmClearId === id) {
      onRemoveItem(id);
      setConfirmClearId(null);
    } else {
      setConfirmClearId(id);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      zIndex: 100, display: "flex", alignItems: "flex-end",
    }}>
      <div style={{
        background: C.cream, borderRadius: "24px 24px 0 0",
        width: "100%", maxHeight: "92dvh",
        display: "flex", flexDirection: "column",
        overflowY: "auto",
      }}>
        {/* Handle + header */}
        <div style={{
          position: "sticky", top: 0, background: C.cream,
          padding: "16px 18px 0", zIndex: 1,
        }}>
          <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2, margin: "0 auto 14px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 18, color: C.charcoal }}>
              {focused ? ({
                add: "Add a step", step: "Change this step", order: "Your steps", saved: "My saved days",
                wake: "Your usual wake time", programs: "Programs",
              }[openAt.level] || "My Daily Rhythm") : "My Daily Rhythm"}
            </div>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.muted, padding: 4 }}
            >
              ✕
            </button>
          </div>

          {/* Level tabs (only when opened the old way) */}
          <div style={{ display: focused ? "none" : "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
            {[
              { id: "templates", label: "Day Templates" },
              { id: "programs", label: "Programs" },
              { id: "edit", label: "My Rhythm" },
              { id: "add", label: "+ Add Item" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => { setLevel(t.id); setEditingId(null); }}
                style={{
                  flex: 1, padding: "8px 4px", border: "none", borderRadius: 20,
                  background: level === t.id ? C.sageDark : C.mist,
                  color: level === t.id ? C.white : C.mid,
                  fontSize: 13.5, fontFamily: "Georgia,serif", fontWeight: 700, cursor: "pointer",
                  minWidth: "fit-content",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: "0 18px 32px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* ── LEVEL: DAY TEMPLATES ─────────────────────────────────────────── */}
          {(level === "templates" || level === "wake") && (
            <>
              {/* Wake anchor */}
              {(!focused || level === "wake") && <Card>
                <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 8 }}>
                  ⏰ Your usual wake time
                </div>
                <div style={{ fontSize: 13.5, color: C.muted, marginBottom: 10 }}>
                  Optional. Steps with no set time follow on from this.
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="time"
                    value={localAnchor}
                    onChange={(e) => setLocalAnchor(e.target.value)}
                    style={{
                      border: `2px solid ${C.sage}`, borderRadius: 10,
                      padding: "8px 14px", fontSize: 16, color: C.charcoal,
                      fontFamily: "Georgia,serif", fontWeight: 700,
                      background: C.sageLight, outline: "none",
                    }}
                  />
                  <Btn small color={C.sage} onClick={saveAnchor}>Save</Btn>
                </div>
                {anchorTime && (
                  <div style={{ fontSize: 13.5, color: C.sage, marginTop: 6 }}>
                    ✓ Currently: {anchorTime}
                  </div>
                )}
              </Card>}
              {level === "templates" && <>

              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>
                {focused ? "Days you've saved" : "My day templates"}
              </div>
              <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.6 }}>
                {focused
                  ? "Save your whole set of steps as a day, and load it again any time (for example a work day and a weekend day)."
                  : <>Build your daily rhythm from your own copy of the books — add each item under
                    <strong> + Add Item</strong>, then save the day as a template here so you can
                    reload it any time.</>}
              </div>

              {focused && baseItems.length > 0 && (
                <Btn full color={C.sageDark} onClick={() => { setSaveTemplateName(""); setSaveTemplateEmoji("✨"); setLevel("save-template"); }}>
                  💾 Save my steps as a day
                </Btn>
              )}

              {savedTemplates.length === 0 && (
                <Card>
                  <div style={{ textAlign: "center", padding: "10px 0", color: C.muted }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📖</div>
                    <div style={{ fontSize: 13, lineHeight: 1.65 }}>
                      {focused
                        ? <>No saved days yet. Tap the button below to save your steps as they are now.</>
                        : <>No saved templates yet. Set up your rhythm in <strong>My Rhythm</strong>,
                      then tap “Save as my custom template” — it will appear here.</>}
                    </div>
                  </div>
                </Card>
              )}

              {savedTemplates.map((row) => (
                <Card key={row.id}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ fontSize: 26, flexShrink: 0 }}>{row.emoji || "✨"}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>
                        {row.name}
                      </div>
                      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {(row.items || []).map((item, i) => (
                          <span key={i} style={{
                            fontSize: 13.5, background: `${alpha(C.sage, "15")}`, color: C.sageDark,
                            borderRadius: 20, padding: "2px 7px",
                          }}>
                            {item.emoji} {item.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteSavedRow(row.id)}
                      style={{
                        background: confirmDeleteSavedId === row.id ? C.terracotta : "transparent",
                        border: `1px solid ${C.terracotta}`, borderRadius: 8,
                        width: 28, height: 28, cursor: "pointer", flexShrink: 0,
                        color: confirmDeleteSavedId === row.id ? C.white : C.terracotta, fontSize: 13,
                      }}
                    >✕</button>
                  </div>
                  {confirmDeleteSavedId === row.id && (
                    <div style={{ fontSize: 13.5, color: C.terracotta, marginTop: 6 }}>
                      Tap ✕ again to delete this template
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (window.confirm(`Apply "${row.name}"? This will replace your current rhythm items.`)) {
                        onApplyTemplate(row.items || []);
                        setLevel("edit");
                      }
                    }}
                    style={{
                      marginTop: 12, width: "100%",
                      background: C.sageLight, color: C.sageDark,
                      border: `1.5px solid ${alpha(C.sage, "40")}`, borderRadius: 12,
                      padding: "9px", fontSize: 13.5, fontFamily: "Georgia,serif",
                      fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    Use this template →
                  </button>
                </Card>
              ))}
            </>}
            </>
          )}

          {/* ── LEVEL: MULTI-DAY PROGRAMS ─────────────────────────────────────── */}
          {level === "programs" && (
            <>
              {activeProgram && (
                <div style={{
                  background: `linear-gradient(135deg,${alpha(C.plum, "22")},${C.plumLight})`,
                  border: `2px solid ${alpha(C.plum, "60")}`, borderRadius: 14, padding: "14px 16px",
                }}>
                  <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.plum }}>
                    ✨ Active: {activeProgram.name}
                  </div>
                  <div style={{ fontSize: 13.5, color: C.plum, opacity: 0.8, marginTop: 4 }}>
                    Started {activeProgram.startDate} · {activeProgram.totalDays} days
                  </div>
                  {Array.isArray(activeProgram.keepEveryday) && (
                    <div style={{ fontSize: 13.5, color: C.plum, marginTop: 4 }}>
                      Paused until it ends: {baseItems.filter((i) => !activeProgram.keepEveryday.includes(i.id)).map((i) => i.name).join(", ") || "nothing"}
                    </div>
                  )}
                  <button
                    onClick={onCancelProgram}
                    style={{
                      marginTop: 10, background: `${alpha(C.plum, "15")}`, color: C.plum,
                      border: `1.5px solid ${alpha(C.plum, "40")}`, borderRadius: 10,
                      padding: "7px 14px", fontSize: 13.5, cursor: "pointer",
                    }}
                  >
                    End program early
                  </button>
                </div>
              )}

              <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.6 }}>
                Build a multi-day program from your own copy of the books — set which days each
                item runs, and the app tracks your progress day by day and tells your companion
                where you are. For what belongs in a cleanse and when, refer to your book.
              </div>

              <Btn full color={C.plum} onClick={() => {
                setProgForm({ name: "", emoji: "✨", totalDays: 9, items: [] });
                setProgItemForm(BLANK_PROGRAM_ITEM);
                setEditingProgramId(null);
                setProgramError("");
                setLevel("program-new");
              }}>
                + Build a program from my book
              </Btn>

              {savedPrograms.length === 0 && (
                <Card>
                  <div style={{ textAlign: "center", padding: "10px 0", color: C.muted }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🗓</div>
                    <div style={{ fontSize: 13, lineHeight: 1.65 }}>
                      No programs yet. Build one above using your own book as the source —
                      it saves here so you can run it again any time.
                    </div>
                  </div>
                </Card>
              )}

              {savedPrograms.map((row) => {
                const prog = savedRowToProgram(row);
                const isActive = activeProgram?.id === prog.id;
                return (
                  <Card key={row.id} style={{ border: isActive ? `2px solid ${C.plum}` : undefined, marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ fontSize: 26, flexShrink: 0 }}>{prog.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>
                            {prog.name}
                          </div>
                          <span style={{ fontSize: 13.5, background: `${alpha(C.plum, "15")}`, color: C.plum, borderRadius: 20, padding: "2px 7px" }}>
                            {prog.totalDays} days
                          </span>
                        </div>
                        {row.description && (
                          <div style={{ fontSize: 13.5, color: C.mid, marginTop: 3, lineHeight: 1.5 }}>
                            {row.description}
                          </div>
                        )}
                        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {prog.items.map((item, i) => (
                            <span key={i} style={{
                              fontSize: 13.5, background: `${alpha(C.plum, "12")}`, color: C.plum,
                              borderRadius: 20, padding: "2px 7px",
                            }}>
                              {item.emoji} {item.name} · d{item.programDayRange?.[0]}–{item.programDayRange?.[1]}{item.fixedTime ? ` · ${formatFixedTime(item.fixedTime)}` : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => deleteSavedRow(row.id)}
                        style={{
                          background: confirmDeleteSavedId === row.id ? C.terracotta : "transparent",
                          border: `1px solid ${C.terracotta}`, borderRadius: 8,
                          width: 28, height: 28, cursor: "pointer", flexShrink: 0,
                          color: confirmDeleteSavedId === row.id ? C.white : C.terracotta, fontSize: 13,
                        }}
                      >✕</button>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button
                          onClick={() => {
                            setProgForm({ name: row.name, emoji: row.emoji || "✨", totalDays: rowTotalDays(row), items: row.items || [] });
                            setProgItemForm(BLANK_PROGRAM_ITEM);
                            setEditingProgramId(row.id);
                            setProgramError("");
                            setLevel("program-new");
                          }}
                          style={{ background: "transparent", border: `1px solid ${C.plum}`, borderRadius: 8, padding: "8px 16px", cursor: "pointer", color: C.plum, fontSize: 14 }}
                        >Edit</button>
                        <button
                          onClick={() => copyProgram(row)}
                          style={{ background: "transparent", border: `1px solid ${C.plum}`, borderRadius: 8, padding: "8px 16px", cursor: "pointer", color: C.plum, fontSize: 14 }}
                        >Copy</button>
                    </div>
                    {confirmDeleteSavedId === row.id && (
                      <div style={{ fontSize: 13.5, color: C.terracotta, marginTop: 6 }}>
                        Tap ✕ again to delete this program
                      </div>
                    )}

                    {!isActive && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 13.5, color: C.muted, marginBottom: 6 }}>Start date:</div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input
                            type="date"
                            value={programStartDate}
                            onChange={(e) => setProgramStartDate(e.target.value)}
                            style={{
                              border: `1.5px solid ${C.border}`, borderRadius: 8,
                              padding: "6px 10px", fontSize: 13, color: C.charcoal,
                              background: C.surface, outline: "none",
                            }}
                          />
                        </div>
                        {baseItems.length > 0 && (
                          <div style={{ marginTop: 12 }}>
                            <div style={{ fontSize: 13, color: C.charcoal, fontWeight: 700, marginBottom: 2 }}>
                              During this program, keep:
                            </div>
                            <div style={{ fontSize: 13.5, color: C.muted, marginBottom: 6 }}>
                              Untick anything to pause it. It comes back by itself when the program ends.
                            </div>
                            {baseItems.map((item) => {
                              const kept = !pausedIds.includes(item.id);
                              return (
                                <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", fontSize: 14, color: C.charcoal, cursor: "pointer" }}>
                                  <input
                                    type="checkbox"
                                    checked={kept}
                                    onChange={() => setPausedIds((p) => (kept ? [...p, item.id] : p.filter((x) => x !== item.id)))}
                                    style={{ width: 20, height: 20, accentColor: C.plum }}
                                  />
                                  {item.emoji} {item.name}
                                </label>
                              );
                            })}
                          </div>
                        )}
                        <div style={{ marginTop: 10 }}>
                          <Btn small color={C.plum} onClick={async () => {
                            // null = keep everything (the default); otherwise the kept ids.
                            const keep = pausedIds.length ? baseItems.map((i) => i.id).filter((id) => !pausedIds.includes(id)) : null;
                            // Only move on once it's saved to the account.
                            if (await onStartProgram(prog, programStartDate, keep)) { setPausedIds([]); setLevel("edit"); }
                          }}>
                            Start →
                          </Btn>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </>
          )}

          {/* ── LEVEL: BUILD A PROGRAM ────────────────────────────────────────── */}
          {level === "program-new" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal }}>
                  {editingProgramId ? "Edit program" : "Build a program"}
                </div>
                <button onClick={() => setLevel("programs")} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>

              <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.6 }}>
                Enter the program as it appears in your own book — name it, set how many days it
                runs, and add each item with the days it applies to.
              </div>
              {editingProgramId && activeProgram?.savedRhythmId === editingProgramId && (
                <div style={{ fontSize: 13, color: C.plum }}>
                  This program is running now. Changes apply the next time you start it.
                </div>
              )}

              {(baseItems.length > 0 || savedRows.some((r) => isProgramRow(r) && r.id !== editingProgramId)) && (
                <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: C.charcoal }}>
                  Add steps you already have
                  <select
                    value=""
                    onChange={(e) => { if (e.target.value) addStepsFrom(e.target.value); }}
                    style={{ padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.surface, fontSize: 14, color: C.charcoal }}
                  >
                    <option value="">Choose where from…</option>
                    {baseItems.length > 0 && <option value="everyday">My everyday rhythm ({baseItems.length} steps)</option>}
                    {savedRows.filter((r) => isProgramRow(r) && r.id !== editingProgramId).map((r) => (
                      <option key={r.id} value={r.id}>{r.name} ({(r.items || []).length} steps)</option>
                    ))}
                  </select>
                </label>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={progForm.emoji}
                  onChange={(e) => setProgForm((f) => ({ ...f, emoji: e.target.value }))}
                  maxLength={2}
                  style={{
                    width: 52, border: `2px solid ${C.border}`, borderRadius: 10,
                    padding: "10px 8px", fontSize: 22, textAlign: "center",
                    background: C.surface, outline: "none",
                  }}
                />
                <input
                  type="text"
                  value={progForm.name}
                  onChange={(e) => setProgForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Program name (e.g. My 9-day cleanse)"
                  style={{
                    flex: 1, border: `2px solid ${C.border}`, borderRadius: 10,
                    padding: "10px 14px", fontSize: 14, color: C.charcoal,
                    background: C.surface, outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: C.muted }}>Program length:</span>
                <input
                  type="number"
                  min={2}
                  max={90}
                  value={progForm.totalDays}
                  onChange={(e) => setProgForm((f) => ({ ...f, totalDays: parseInt(e.target.value) || 9 }))}
                  style={{
                    width: 65, border: `2px solid ${C.border}`, borderRadius: 8,
                    padding: "6px 10px", fontSize: 14, textAlign: "center",
                    background: C.surface, outline: "none",
                  }}
                />
                <span style={{ fontSize: 13, color: C.muted }}>days</span>
              </div>

              {progForm.items.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {progForm.items.map((item, idx) => (
                    <div key={idx} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      background: C.surface, border: `1.5px solid ${C.border}`,
                      borderRadius: 12, padding: "10px 12px",
                    }}>
                      <span style={{ fontSize: 18 }}>{item.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.charcoal, fontFamily: "Georgia,serif" }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: 13.5, color: C.muted }}>
                          Days {item.programDayRange[0]}–{item.programDayRange[1]} · +{item.spacingMinutes}min
                        </div>
                      </div>
                      <button
                        onClick={() => setProgForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}
                        style={{
                          background: "none", border: `1px solid ${C.terracotta}`,
                          borderRadius: 8, width: 26, height: 26, cursor: "pointer",
                          color: C.terracotta, fontSize: 13.5, flexShrink: 0,
                        }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add an item to the program */}
              <Card>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.mid, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Add program item
                </div>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <input
                    type="text"
                    value={progItemForm.emoji}
                    onChange={(e) => setProgItemForm((f) => ({ ...f, emoji: e.target.value }))}
                    maxLength={2}
                    style={{
                      width: 46, border: `1.5px solid ${C.border}`, borderRadius: 10,
                      padding: "8px 6px", fontSize: 18, textAlign: "center",
                      background: C.surface, outline: "none",
                    }}
                  />
                  <input
                    type="text"
                    value={progItemForm.name}
                    onChange={(e) => setProgItemForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Item name (from your book)"
                    style={{
                      flex: 1, border: `1.5px solid ${C.border}`, borderRadius: 10,
                      padding: "8px 12px", fontSize: 13, color: C.charcoal,
                      background: C.surface, outline: "none",
                    }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13.5, color: C.muted }}>Days</span>
                  <input
                    type="number" min={1} max={progForm.totalDays}
                    value={progItemForm.fromDay}
                    onChange={(e) => setProgItemForm((f) => ({ ...f, fromDay: parseInt(e.target.value) || 1 }))}
                    style={{ width: 52, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "5px 8px", fontSize: 13, textAlign: "center", background: C.surface, outline: "none" }}
                  />
                  <span style={{ fontSize: 13.5, color: C.muted }}>to</span>
                  <input
                    type="number" min={1} max={progForm.totalDays}
                    value={progItemForm.toDay ?? progForm.totalDays}
                    onChange={(e) => setProgItemForm((f) => ({ ...f, toDay: parseInt(e.target.value) || progForm.totalDays }))}
                    style={{ width: 52, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "5px 8px", fontSize: 13, textAlign: "center", background: C.surface, outline: "none" }}
                  />
                  <span style={{ fontSize: 13.5, color: C.muted, marginLeft: 6 }}>· wait</span>
                  <input
                    type="number" min={0} max={480}
                    value={progItemForm.spacingMinutes}
                    onChange={(e) => setProgItemForm((f) => ({ ...f, spacingMinutes: parseInt(e.target.value) || 0 }))}
                    style={{ width: 52, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "5px 8px", fontSize: 13, textAlign: "center", background: C.surface, outline: "none" }}
                  />
                  <span style={{ fontSize: 13.5, color: C.muted }}>min</span>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.charcoal, marginBottom: 10 }}>
                  🔔 At a set time (optional)
                  <input
                    type="time"
                    value={progItemForm.fixedTime || ""}
                    onChange={(e) => setProgItemForm((f) => ({ ...f, fixedTime: e.target.value }))}
                    style={{ border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 14, background: C.surface, outline: "none" }}
                  />
                </label>
                <input
                  type="text"
                  value={progItemForm.note}
                  onChange={(e) => setProgItemForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Your note (optional, e.g. page reference)"
                  style={{
                    width: "100%", boxSizing: "border-box", border: `1.5px solid ${C.border}`,
                    borderRadius: 10, padding: "8px 12px", fontSize: 13.5, color: C.charcoal,
                    background: C.surface, outline: "none", marginBottom: 10,
                  }}
                />
                <div style={{ marginBottom: 10 }}>
                  <RecipePicker small recipes={recipes} value={progItemForm.recipeId} onChange={(recipeId) => setProgItemForm((f) => ({ ...f, recipeId }))} />
                </div>
                <Btn
                  small
                  color={C.plum}
                  disabled={!progItemForm.name.trim()}
                  onClick={() => {
                    setProgForm((f) => ({
                      ...f,
                      items: [...f.items, buildProgramItem(progItemForm, f.totalDays, f.items.length + 1)],
                    }));
                    setProgItemForm(BLANK_PROGRAM_ITEM);
                  }}
                >
                  + Add to program
                </Btn>
              </Card>

              <Btn
                full
                color={C.plum}
                disabled={!progForm.name.trim() || progForm.items.length === 0 || savingProgram}
                onClick={async () => {
                  if (!profileId) return;
                  const name = progForm.name.trim();
                  // One name per program, so Fern can always tell them apart.
                  if (savedRows.some((r) => r.name === name && r.id !== editingProgramId)) {
                    setProgramError(`You already have a program called "${name}". Choose another name, or edit that one.`);
                    return;
                  }
                  setSavingProgram(true);
                  const row = {
                    profile_id: profileId,
                    name,
                    emoji: progForm.emoji || "✨",
                    description: programDescription(progForm.totalDays),
                    items: progForm.items.map((it) => ({
                      ...it,
                      programDayRange: [
                        Math.min(it.programDayRange?.[0] ?? 1, progForm.totalDays),
                        Math.min(it.programDayRange?.[1] ?? progForm.totalDays, progForm.totalDays),
                      ],
                    })),
                  };
                  const { data, error } = editingProgramId
                    ? await supabase.from("saved_rhythms").update({ ...row, updated_at: new Date().toISOString() }).eq("id", editingProgramId).select().single()
                    : await supabase.from("saved_rhythms").insert(row).select().single();
                  setSavingProgram(false);
                  if (error || !data) { setProgramError("That didn't save. Please try again."); return; }
                  setSavedRows((prev) => [data, ...prev.filter((r) => r.id !== data.id)]);
                  setEditingProgramId(null);
                  setProgramError("");
                  setLevel("programs");
                }}
              >
                {savingProgram ? "Saving…" : editingProgramId ? "Save changes" : "Save program"}
              </Btn>
              {programError && <div role="alert" style={{ fontSize: 13, color: C.terracotta }}>{programError}</div>}
            </div>
          )}

          {/* ── LEVEL: MY RHYTHM (edit list) ──────────────────────────────────── */}
          {level === "edit" && !editingId && (
            <>
              {/* Wake anchor compact */}
              <div style={{ display: focused ? "none" : "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, color: C.muted }}>⏰ Usual wake time:</span>
                <input
                  type="time"
                  value={localAnchor}
                  onChange={(e) => setLocalAnchor(e.target.value)}
                  onBlur={saveAnchor}
                  style={{
                    border: `1.5px solid ${C.sage}`, borderRadius: 8,
                    padding: "5px 10px", fontSize: 14, color: C.charcoal,
                    fontFamily: "Georgia,serif", fontWeight: 700,
                    background: C.sageLight, outline: "none",
                  }}
                />
              </div>

              {baseItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: C.muted }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>🌿</div>
                  <div style={{ fontSize: 13 }}>No items yet. Start from a template or add an item.</div>
                </div>
              ) : (
                baseItems
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        background: C.surface, border: `1.5px solid ${C.border}`,
                        borderRadius: 14, padding: "12px 14px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 20 }}>{item.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.charcoal }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: 13.5, color: C.muted, marginTop: 2 }}>
                            {isRelative(item)
                              ? <>⏱ {relativeLabel(item, baseItems)}</>
                              : scheduleTimes(item).length
                              ? <span style={{ color: C.sageDark, fontWeight: 700 }}>
                                  🔔 {scheduleTimes(item).map(formatFixedTime).join(" · ")}
                                </span>
                              : <button
                                  onClick={() => startEdit(item)}
                                  style={{
                                    background: "none", border: "none", padding: 0, cursor: "pointer",
                                    fontSize: 13.5, color: C.sage, fontWeight: 700, fontFamily: "inherit",
                                    textDecoration: "underline",
                                  }}
                                >
                                  🔔 Add a reminder
                                </button>}
                            {" · "}{FREQ_LABELS[item.frequency] || item.frequency} · {DUR_LABELS[item.durationType] || item.durationType}
                            {item.isMedicine && " · Rx"}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          {/* Move up/down */}
                          <button
                            onClick={() => idx > 0 && onReorder(idx, idx - 1)}
                            disabled={idx === 0}
                            style={{
                              background: "none", border: `1px solid ${C.border}`,
                              borderRadius: 8, width: 28, height: 28,
                              cursor: idx === 0 ? "default" : "pointer",
                              opacity: idx === 0 ? 0.3 : 1, fontSize: 13,
                            }}
                          >▲</button>
                          <button
                            onClick={() => idx < baseItems.length - 1 && onReorder(idx, idx + 1)}
                            disabled={idx === baseItems.length - 1}
                            style={{
                              background: "none", border: `1px solid ${C.border}`,
                              borderRadius: 8, width: 28, height: 28,
                              cursor: idx === baseItems.length - 1 ? "default" : "pointer",
                              opacity: idx === baseItems.length - 1 ? 0.3 : 1, fontSize: 13,
                            }}
                          >▼</button>
                          <button
                            onClick={() => startEdit(item)}
                            style={{
                              background: `${alpha(C.sage, "15")}`, border: "none",
                              borderRadius: 8, padding: "4px 10px",
                              fontSize: 13.5, color: C.sageDark, cursor: "pointer",
                            }}
                          >Edit</button>
                          <button
                            onClick={() => removeItem(item.id)}
                            style={{
                              background: confirmClearId === item.id ? C.terracotta : "transparent",
                              border: `1px solid ${C.terracotta}`,
                              borderRadius: 8, width: 28, height: 28,
                              cursor: "pointer",
                              color: confirmClearId === item.id ? C.white : C.terracotta,
                              fontSize: 13,
                            }}
                          >✕</button>
                        </div>
                      </div>
                      {confirmClearId === item.id && (
                        <div style={{ fontSize: 13.5, color: C.terracotta, marginTop: 6 }}>
                          Tap ✕ again to confirm removal
                        </div>
                      )}
                    </div>
                  ))
              )}

              <Btn full color={C.sageDark} onClick={() => setLevel("add")}>+ Add an item</Btn>

              {baseItems.length > 0 && (
                <button
                  onClick={() => { setSaveTemplateName(""); setSaveTemplateEmoji("✨"); setLevel("save-template"); }}
                  style={{
                    background: "none", border: `1.5px solid ${C.sage}`, color: C.sageDark,
                    borderRadius: 20, padding: "9px", width: "100%",
                    fontFamily: "Georgia,serif", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  💾 Save my steps as a day
                </button>
              )}
            </>
          )}

          {/* ── INLINE EDIT ITEM ──────────────────────────────────────────────── */}
          {level === "edit" && editingId && editingItem && (
            <ItemForm
              form={editForm}
              setForm={setEditForm}
              onSave={saveEditedItem}
              onCancel={() => (openAt?.level === "step" ? onClose() : setEditingId(null))}
              onRemove={openAt?.level === "step" ? () => { onRemoveItem(editingId); onClose(); } : null}
              title={focused ? "" : "Edit item"}
              otherItems={baseItems}
              recipes={recipes}
            />
          )}

          {/* ── LEVEL: ADD ITEM ───────────────────────────────────────────────── */}
          {level === "add" && (
            <ItemForm
              form={addForm}
              setForm={setAddForm}
              onSave={saveNewItem}
              onCancel={() => (focused ? onClose() : setLevel("edit"))}
              title={focused ? "" : "Add new item"}
              otherItems={baseItems}
              recipes={recipes}
            />
          )}

          {/* ── LEVEL: SAVE CUSTOM TEMPLATE ───────────────────────────────────── */}
          {level === "save-template" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal }}>
                  Save as my template
                </div>
                <button onClick={() => setLevel(focused ? "templates" : "edit")} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>

              <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.6 }}>
                Save your current rhythm as a reusable template — so you can reload it any time, or use it as your starting point after a cleanse.
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={saveTemplateEmoji}
                  onChange={(e) => setSaveTemplateEmoji(e.target.value)}
                  maxLength={2}
                  style={{
                    width: 52, border: `2px solid ${C.border}`, borderRadius: 10,
                    padding: "10px 8px", fontSize: 22, textAlign: "center",
                    background: C.surface, outline: "none",
                  }}
                />
                <input
                  type="text"
                  value={saveTemplateName}
                  onChange={(e) => setSaveTemplateName(e.target.value)}
                  placeholder="e.g. My Thyroid Protocol"
                  style={{
                    flex: 1, border: `2px solid ${C.border}`, borderRadius: 10,
                    padding: "10px 14px", fontSize: 14, color: C.charcoal,
                    background: C.surface, outline: "none",
                  }}
                />
              </div>

              {savedTemplateMsg && (
                <div style={{ fontSize: 13, color: C.sage, fontFamily: "Georgia,serif" }}>
                  {savedTemplateMsg}
                </div>
              )}

              <Btn
                full
                color={C.sageDark}
                disabled={!saveTemplateName.trim() || savingTemplate}
                onClick={async () => {
                  if (!saveTemplateName.trim() || !profileId) return;
                  setSavingTemplate(true);
                  const { data } = await supabase.from("saved_rhythms").insert({
                    profile_id: profileId,
                    name: saveTemplateName.trim(),
                    emoji: saveTemplateEmoji || "✨",
                    items: baseItems,
                  }).select().single();
                  if (data) setSavedRows((prev) => [data, ...prev]);
                  setSavingTemplate(false);
                  setSavedTemplateMsg(`✓ "${saveTemplateName}" saved! Find it in My Rhythm.`);
                  setTimeout(() => { setSavedTemplateMsg(""); setLevel(focused ? "templates" : "edit"); }, 1800);
                }}
              >
                {savingTemplate ? "Saving…" : "Save template"}
              </Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const TIME_PRESETS = [
  { label: "Once a day", times: ["08:00"] },
  { label: "Morning + night", times: ["08:00", "20:00"] },
  { label: "Three times", times: ["08:00", "13:00", "20:00"] },
];

const sameTimes = (a, b) => a.length === b.length && a.every((t, i) => t === b[i]);

// "30 min after Lemon water" / "every 90 min after Celery juice, until 6pm".
function relativeLabel(item, items) {
  const s = item?.schedule;
  const anchor = items.find((i) => i.id === s?.after)?.name || "another step";
  if (s?.type === "after") return `${s.minutes} min after ${anchor}`;
  if (s?.type === "every_after") return `every ${s.everyMinutes} min after ${anchor}${s.until ? `, until ${formatFixedTime(s.until)}` : ""}`;
  return "";
}

function ItemForm({ form, setForm, onSave, onCancel, onRemove = null, title, otherItems = [], recipes = [] }) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const TODAY = localDateStr();

  // The schedule is the source of truth; fixedTime is kept in step with the
  // first time purely so the legacy column stays valid as a rollback path.
  const times =
    form.schedule?.type === "times" && Array.isArray(form.schedule.times)
      ? form.schedule.times
      : form.fixedTime
        ? [form.fixedTime]
        : [];
  const relative = isRelative(form);
  const timed = !relative && times.length > 0;
  const anchors = otherItems.filter((i) => i.id !== form.id);
  const setRelative = (patch) => setForm((f) => {
    const prev = isRelative(f) ? f.schedule : { type: "after", after: anchors[0]?.id ?? null, minutes: 30 };
    const next = { ...prev, ...patch };
    const schedule = next.type === "every_after"
      ? { type: "every_after", after: next.after, everyMinutes: Number(next.everyMinutes) || 90, until: next.until || "18:00" }
      : { type: "after", after: next.after, minutes: Number(next.minutes) || 0 };
    return { ...f, schedule, fixedTime: null };
  });

  const setTimes = (next) => {
    const clean = [...new Set(next.filter(Boolean))].sort();
    setForm((f) => ({
      ...f,
      schedule: clean.length ? { type: "times", times: clean } : null,
      fixedTime: clean[0] ?? null,
    }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal }}>{title}</div>
        <button onClick={onCancel} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}>
          Cancel
        </button>
      </div>

      {/* Emoji + name row */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={form.emoji}
          onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))}
          placeholder="Emoji"
          maxLength={2}
          style={{
            width: 52, border: `2px solid ${C.border}`, borderRadius: 10,
            padding: "10px 8px", fontSize: 22, textAlign: "center",
            background: C.surface, outline: "none",
          }}
        />
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="What is it? e.g. Celery juice"
          style={{
            flex: 1, border: `2px solid ${C.border}`, borderRadius: 10,
            padding: "10px 14px", fontSize: 14, color: C.charcoal,
            background: C.surface, outline: "none",
          }}
        />
      </div>

      {/* Category */}
      <FieldGroup label="Category">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setForm((f) => ({ ...f, category: cat, isMedicine: cat === "medicine" }))}
              style={{
                background: form.category === cat ? C.sageDark : C.mist,
                color: form.category === cat ? C.white : C.mid,
                border: "none", borderRadius: 20, padding: "6px 12px",
                fontSize: 13.5, cursor: "pointer",
              }}
            >
              {CATEGORY_EMOJIS[cat]} {cat}
            </button>
          ))}
        </div>
        {form.isMedicine && (
          <div style={{
            marginTop: 8, fontSize: 13.5, color: C.plum, lineHeight: 1.6,
            background: `${alpha(C.plum, "12")}`, borderRadius: 10, padding: "8px 12px",
          }}>
            ⚕️ This item will be marked as a prescribed medicine. The app will show a standing note to confirm timing with your doctor or pharmacist. The app and AI will never advise on prescribed medication timing or interactions.
          </div>
        )}
      </FieldGroup>

      {/* When — set times and the anchor cascade are mutually exclusive in
          calculateSequence(): a timed item is placed at its own clock time and
          ignores the wake anchor and the previous item entirely, so showing
          both as independent fields would misrepresent the engine. Set times
          are also what let the server send reminders (server/routes/rhythm.js).

          Presets first, free-form second: the people who most need reminders
          are the least able to spend executive function assembling a schedule. */}
      <FieldGroup label="When & reminder">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            onClick={() => setTimes([])}
            style={{
              flex: 1,
              background: !timed && !relative ? C.sage : C.mist,
              color: !timed && !relative ? C.white : C.mid,
              border: "none", borderRadius: 10, padding: "8px 4px",
              fontSize: 13.5, cursor: "pointer",
            }}
          >
            No set time
          </button>
          <button
            onClick={() => setTimes(times.length ? times : ["08:00"])}
            style={{
              flex: 1,
              background: timed ? C.sage : C.mist,
              color: timed ? C.white : C.mid,
              border: "none", borderRadius: 10, padding: "8px 4px",
              fontSize: 13.5, cursor: "pointer",
            }}
          >
            🔔 Remind me at…
          </button>
          {anchors.length > 0 && (
            <button
              onClick={() => setRelative({})}
              style={{
                flex: 1,
                background: relative ? C.sage : C.mist,
                color: relative ? C.white : C.mid,
                border: "none", borderRadius: 10, padding: "8px 4px",
                fontSize: 13.5, cursor: "pointer",
              }}
            >
              ⏱ After a step…
            </button>
          )}
        </div>

        {relative && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: C.charcoal }}>
              Timed from
              <select
                value={form.schedule.after || ""}
                onChange={(e) => setRelative({ after: e.target.value })}
                style={{ padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.surface, fontSize: 14, color: C.charcoal }}
              >
                {anchors.map((i) => <option key={i.id} value={i.id}>{i.emoji} {i.name}</option>)}
              </select>
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              {[["after", "Once"], ["every_after", "Again and again"]].map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => setRelative({ type })}
                  style={{
                    flex: 1, background: form.schedule.type === type ? C.sageDark : C.mist,
                    color: form.schedule.type === type ? C.white : C.mid,
                    border: "none", borderRadius: 20, padding: "8px 10px", fontSize: 13, cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {form.schedule.type === "after" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: C.charcoal }}>
                <input
                  type="number" min={0} max={720}
                  value={form.schedule.minutes}
                  onChange={(e) => setRelative({ minutes: parseInt(e.target.value) || 0 })}
                  style={{ width: 70, border: `2px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", fontSize: 16, textAlign: "center", background: C.surface }}
                />
                minutes after it's ticked
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 14, color: C.charcoal }}>
                Every
                <input
                  type="number" min={15} max={720}
                  value={form.schedule.everyMinutes}
                  onChange={(e) => setRelative({ everyMinutes: parseInt(e.target.value) || 90 })}
                  style={{ width: 70, border: `2px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", fontSize: 16, textAlign: "center", background: C.surface }}
                />
                minutes, until
                <input
                  type="time"
                  value={form.schedule.until}
                  onChange={(e) => setRelative({ until: e.target.value })}
                  style={{ border: `2px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", fontSize: 16, background: C.surface }}
                />
              </div>
            )}
            <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.6 }}>
              🔔 The clock starts when you tick that step, by tap or by voice. You'll get a reminder
              {form.schedule.type === "every_after" ? " each time" : ""}, if background notifications are on in Settings.
              If that step isn't ticked, nothing follows on that day.
            </div>
          </div>
        )}

        {relative ? null : timed ? (
          <>
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              {TIME_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setTimes(p.times)}
                  style={{
                    background: sameTimes(times, p.times) ? C.sageDark : C.mist,
                    color: sameTimes(times, p.times) ? C.white : C.mid,
                    border: "none", borderRadius: 20, padding: "6px 12px",
                    fontSize: 13.5, cursor: "pointer",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
              {times.map((t, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="time"
                    value={t}
                    onChange={(e) => {
                      const next = [...times];
                      next[idx] = e.target.value;
                      setTimes(next);
                    }}
                    style={{
                      border: `2px solid ${C.sage}`, borderRadius: 10,
                      padding: "8px 14px", fontSize: 16, fontFamily: "Georgia,serif", fontWeight: 700,
                      color: C.charcoal, background: C.sageLight, outline: "none",
                    }}
                  />
                  {times.length > 1 && (
                    <button
                      onClick={() => setTimes(times.filter((_, i) => i !== idx))}
                      aria-label="Remove this time"
                      style={{
                        background: "transparent", border: `1px solid ${C.terracotta}`,
                        borderRadius: 8, width: 28, height: 28,
                        color: C.terracotta, cursor: "pointer", fontSize: 13,
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={() => setTimes([...times, "20:00"])}
                style={{
                  background: "none", border: `1.5px dashed ${C.border}`,
                  borderRadius: 10, padding: "8px 12px", fontSize: 13.5,
                  color: C.muted, cursor: "pointer", width: "fit-content",
                  fontFamily: "Georgia,serif",
                }}
              >
                + Add another time
              </button>
            </div>

            <div style={{ fontSize: 13.5, color: C.muted, marginTop: 8, lineHeight: 1.6 }}>
              🔔 {times.length === 1
                ? "You'll get one reminder a day at this time"
                : `You'll get ${times.length} reminders a day, and this item appears ${times.length} times on your rhythm so you can tick each one off`}
              , if background notifications are on in Settings. Timed items sit at
              their own time and aren't affected by your wake time.
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
              <input
                type="number"
                min={0}
                max={480}
                value={form.spacingMinutes}
                onChange={(e) => setForm((f) => ({ ...f, spacingMinutes: parseInt(e.target.value) || 0 }))}
                style={{
                  width: 70, border: `2px solid ${C.border}`, borderRadius: 10,
                  padding: "8px 12px", fontSize: 16, fontFamily: "Georgia,serif", fontWeight: 700,
                  color: C.charcoal, background: C.surface, outline: "none", textAlign: "center",
                }}
              />
              <span style={{ fontSize: 13, color: C.muted }}>minutes after the previous step</span>
            </div>
            <div style={{ fontSize: 13.5, color: C.muted, marginTop: 4 }}>
              How many minutes after the previous item completes (or after your wake time
              for the first item). Tap “🔔 Remind me at…” to get a reminder for this item.
            </div>
          </>
        )}
      </FieldGroup>

      {/* Frequency */}
      <FieldGroup label="Frequency">
        <div style={{ display: "flex", gap: 6 }}>
          {Object.entries(FREQ_LABELS).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setForm((f) => ({ ...f, frequency: val }))}
              style={{
                flex: 1,
                background: form.frequency === val ? C.sage : C.mist,
                color: form.frequency === val ? C.white : C.mid,
                border: "none", borderRadius: 10, padding: "8px 4px",
                fontSize: 13.5, cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </FieldGroup>

      {/* Duration */}
      <FieldGroup label="Duration">
        <div style={{ display: "flex", gap: 6 }}>
          {/* "During cleanse only" items only ever appear through a program, so
              picking this for an everyday item made it vanish with no explanation. */}
          {Object.entries(DUR_LABELS).filter(([val]) => val !== "cleanse" || form.durationType === "cleanse").map(([val, label]) => (
            <button
              key={val}
              onClick={() => setForm((f) => ({
                ...f,
                durationType: val,
                durationDays: val === "days" ? (f.durationDays || 14) : null,
                startDate: val === "days" ? (f.startDate || TODAY) : null,
              }))}
              style={{
                flex: 1,
                background: form.durationType === val ? C.sage : C.mist,
                color: form.durationType === val ? C.white : C.mid,
                border: "none", borderRadius: 10, padding: "8px 4px",
                fontSize: 13.5, cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {form.durationType === "days" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
            <span style={{ fontSize: 13, color: C.muted }}>Days:</span>
            <input
              type="number"
              min={1}
              max={365}
              value={form.durationDays || 14}
              onChange={(e) => setForm((f) => ({ ...f, durationDays: parseInt(e.target.value) || 14 }))}
              style={{
                width: 65, border: `2px solid ${C.border}`, borderRadius: 8,
                padding: "6px 10px", fontSize: 14, textAlign: "center",
                background: C.surface, outline: "none",
              }}
            />
            <span style={{ fontSize: 13, color: C.muted }}>Starting:</span>
            <input
              type="date"
              value={form.startDate || TODAY}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              style={{
                border: `1.5px solid ${C.border}`, borderRadius: 8,
                padding: "6px 10px", fontSize: 13.5, color: C.charcoal,
                background: C.surface, outline: "none",
              }}
            />
          </div>
        )}
      </FieldGroup>

      <RecipePicker recipes={recipes} value={form.recipeId} onChange={(recipeId) => setForm((f) => ({ ...f, recipeId }))} />

      {/* Note */}
      <FieldGroup label="Your note (optional)">
        <textarea
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          placeholder="Reminder for yourself…"
          rows={2}
          style={{
            width: "100%", boxSizing: "border-box",
            border: `2px solid ${C.border}`, borderRadius: 10,
            padding: "10px 12px", fontSize: 13, color: C.charcoal,
            background: C.surface, outline: "none", resize: "vertical",
          }}
        />
      </FieldGroup>

      <Btn full color={C.sageDark} onClick={onSave} disabled={!form.name.trim()}>
        {!form.name.trim() ? "Enter a name above" : "Save"}
      </Btn>
      {onRemove && (
        <button
          onClick={() => (confirmRemove ? onRemove() : setConfirmRemove(true))}
          style={{
            background: "none", border: `1.5px solid ${confirmRemove ? C.terracotta : C.border}`, color: C.terracotta,
            borderRadius: 30, padding: "12px", fontFamily: "Georgia,serif", fontSize: 15, cursor: "pointer",
          }}
        >
          {confirmRemove ? "Tap again to remove it" : "Remove this step"}
        </button>
      )}
    </div>
  );
}

function FieldGroup({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.mid, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </div>
      {children}
    </div>
  );
}
