import { useEffect, useState } from "react";
import C from "../lib/colors.js";
import { Card, Btn } from "./ui.jsx";
import { supabase } from "../lib/supabase.js";

const CATEGORIES = ["morning", "supplement", "food", "medicine", "other"];
const CATEGORY_EMOJIS = { morning: "🌅", supplement: "💊", food: "🍽", medicine: "⚕️", other: "✨" };
const FREQ_LABELS = { daily: "Every day", weekdays: "Weekdays only", "as-needed": "As needed" };
const DUR_LABELS = { ongoing: "Ongoing", days: "For N days", cleanse: "During cleanse only" };

const BLANK_ITEM = {
  name: "",
  emoji: "✨",
  category: "other",
  spacingMinutes: 30,
  frequency: "daily",
  durationType: "ongoing",
  durationDays: null,
  startDate: null,
  isMedicine: false,
  programId: null,
  programDayRange: null,
  note: "",
  sortOrder: 999,
};

const BLANK_PROGRAM_ITEM = {
  name: "",
  emoji: "✨",
  category: "other",
  spacingMinutes: 30,
  note: "",
  fromDay: 1,
  toDay: null, // defaults to the program's total days
};

// A saved_rhythms row is a multi-day program (vs. a day template) when its
// items carry per-day ranges. Program length is the furthest day any item runs.
const isProgramRow = (row) => (row.items || []).some((it) => it.programDayRange);
const rowTotalDays = (row) =>
  (row.items || []).reduce((mx, it) => Math.max(mx, it.programDayRange?.[1] || 1), 1);

// The app ships no protocol content (see LEGAL_CONSTRAINTS.md) — every
// template and program here is built by the user from their own sources.
function savedRowToProgram(row) {
  const id = `sr-${row.id}`;
  return {
    id,
    name: row.name,
    emoji: row.emoji || "✨",
    totalDays: rowTotalDays(row),
    items: (row.items || []).map((it, idx) => ({
      frequency: "daily",
      durationType: "cleanse",
      sortOrder: idx + 1,
      ...it,
      programId: id,
    })),
  };
}

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
}) {
  const [level, setLevel] = useState("templates"); // templates | programs | program-new | edit | add | save-template
  const [editingId, setEditingId] = useState(null);
  const [addForm, setAddForm] = useState(BLANK_ITEM);
  const [localAnchor, setLocalAnchor] = useState(anchorTime || "07:00");
  const [programStartDate, setProgramStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [confirmClearId, setConfirmClearId] = useState(null);
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

  useEffect(() => {
    if (!profileId) return;
    supabase
      .from("saved_rhythms")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setSavedRows(data || []));
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
  const [editForm, setEditForm] = useState({});

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ ...item });
    setLevel("edit");
  };

  const saveAnchor = () => {
    onSetAnchorTime(localAnchor);
  };

  const saveEditedItem = () => {
    onUpdateItem(editingId, editForm);
    setEditingId(null);
    setLevel("edit");
  };

  const saveNewItem = () => {
    if (!addForm.name.trim()) return;
    const today = new Date().toISOString().split("T")[0];
    onAddItem({
      ...addForm,
      startDate: addForm.durationType === "days" ? today : null,
    });
    setAddForm(BLANK_ITEM);
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
              My Daily Rhythm
            </div>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: C.muted, padding: 4 }}
            >
              ✕
            </button>
          </div>

          {/* Level tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
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
                  fontSize: 11, fontFamily: "Georgia,serif", fontWeight: 700, cursor: "pointer",
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
          {level === "templates" && (
            <>
              {/* Wake anchor */}
              <Card>
                <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 8 }}>
                  ⏰ Your wake anchor
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
                  Set your usual wake time — the app maps your whole day's sequence from this one anchor.
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
                  <div style={{ fontSize: 11, color: C.sage, marginTop: 6 }}>
                    ✓ Current anchor: {anchorTime}
                  </div>
                )}
              </Card>

              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>
                My day templates
              </div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
                Build your daily rhythm from your own copy of the books — add each item under
                <strong> + Add Item</strong>, then save the day as a template here so you can
                reload it any time.
              </div>

              {savedTemplates.length === 0 && (
                <Card>
                  <div style={{ textAlign: "center", padding: "10px 0", color: C.muted }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📖</div>
                    <div style={{ fontSize: 13, lineHeight: 1.65 }}>
                      No saved templates yet. Set up your rhythm in <strong>My Rhythm</strong>,
                      then tap “Save as my custom template” — it will appear here.
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
                            fontSize: 10, background: `${C.sage}15`, color: C.sageDark,
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
                    <div style={{ fontSize: 11, color: C.terracotta, marginTop: 6 }}>
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
                      border: `1.5px solid ${C.sage}40`, borderRadius: 12,
                      padding: "9px", fontSize: 12, fontFamily: "Georgia,serif",
                      fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    Use this template →
                  </button>
                </Card>
              ))}
            </>
          )}

          {/* ── LEVEL: MULTI-DAY PROGRAMS ─────────────────────────────────────── */}
          {level === "programs" && (
            <>
              {activeProgram && (
                <div style={{
                  background: `linear-gradient(135deg,${C.plum}22,${C.plumLight})`,
                  border: `2px solid ${C.plum}60`, borderRadius: 14, padding: "14px 16px",
                }}>
                  <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.plum }}>
                    ✨ Active: {activeProgram.name}
                  </div>
                  <div style={{ fontSize: 12, color: C.plum, opacity: 0.8, marginTop: 4 }}>
                    Started {activeProgram.startDate} · {activeProgram.totalDays} days
                  </div>
                  <button
                    onClick={onCancelProgram}
                    style={{
                      marginTop: 10, background: `${C.plum}15`, color: C.plum,
                      border: `1.5px solid ${C.plum}40`, borderRadius: 10,
                      padding: "7px 14px", fontSize: 12, cursor: "pointer",
                    }}
                  >
                    End program early
                  </button>
                </div>
              )}

              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
                Build a multi-day program from your own copy of the books — set which days each
                item runs, and the app tracks your progress day by day and tells your companion
                where you are. For what belongs in a cleanse and when, refer to your book.
              </div>

              <Btn full color={C.plum} onClick={() => {
                setProgForm({ name: "", emoji: "✨", totalDays: 9, items: [] });
                setProgItemForm(BLANK_PROGRAM_ITEM);
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
                          <span style={{ fontSize: 10, background: `${C.plum}15`, color: C.plum, borderRadius: 20, padding: "2px 7px" }}>
                            {prog.totalDays} days
                          </span>
                        </div>
                        {row.description && (
                          <div style={{ fontSize: 12, color: C.mid, marginTop: 3, lineHeight: 1.5 }}>
                            {row.description}
                          </div>
                        )}
                        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {prog.items.map((item, i) => (
                            <span key={i} style={{
                              fontSize: 10, background: `${C.plum}12`, color: C.plum,
                              borderRadius: 20, padding: "2px 7px",
                            }}>
                              {item.emoji} {item.name} · d{item.programDayRange?.[0]}–{item.programDayRange?.[1]}
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
                      <div style={{ fontSize: 11, color: C.terracotta, marginTop: 6 }}>
                        Tap ✕ again to delete this program
                      </div>
                    )}

                    {!isActive && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>Start date:</div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input
                            type="date"
                            value={programStartDate}
                            onChange={(e) => setProgramStartDate(e.target.value)}
                            style={{
                              border: `1.5px solid ${C.border}`, borderRadius: 8,
                              padding: "6px 10px", fontSize: 13, color: C.charcoal,
                              background: C.white, outline: "none",
                            }}
                          />
                          <Btn small color={C.plum} onClick={() => {
                            onStartProgram(prog, programStartDate);
                            setLevel("edit");
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
                  Build a program
                </div>
                <button onClick={() => setLevel("programs")} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>

              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
                Enter the program as it appears in your own book — name it, set how many days it
                runs, and add each item with the days it applies to.
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={progForm.emoji}
                  onChange={(e) => setProgForm((f) => ({ ...f, emoji: e.target.value }))}
                  maxLength={2}
                  style={{
                    width: 52, border: `2px solid ${C.border}`, borderRadius: 10,
                    padding: "10px 8px", fontSize: 22, textAlign: "center",
                    background: C.white, outline: "none",
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
                    background: C.white, outline: "none",
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
                    background: C.white, outline: "none",
                  }}
                />
                <span style={{ fontSize: 13, color: C.muted }}>days</span>
              </div>

              {progForm.items.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {progForm.items.map((item, idx) => (
                    <div key={idx} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      background: C.white, border: `1.5px solid ${C.border}`,
                      borderRadius: 12, padding: "10px 12px",
                    }}>
                      <span style={{ fontSize: 18 }}>{item.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.charcoal, fontFamily: "Georgia,serif" }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: 11, color: C.muted }}>
                          Days {item.programDayRange[0]}–{item.programDayRange[1]} · +{item.spacingMinutes}min
                        </div>
                      </div>
                      <button
                        onClick={() => setProgForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))}
                        style={{
                          background: "none", border: `1px solid ${C.terracotta}`,
                          borderRadius: 8, width: 26, height: 26, cursor: "pointer",
                          color: C.terracotta, fontSize: 12, flexShrink: 0,
                        }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add an item to the program */}
              <Card>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
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
                      background: C.white, outline: "none",
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
                      background: C.white, outline: "none",
                    }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: C.muted }}>Days</span>
                  <input
                    type="number" min={1} max={progForm.totalDays}
                    value={progItemForm.fromDay}
                    onChange={(e) => setProgItemForm((f) => ({ ...f, fromDay: parseInt(e.target.value) || 1 }))}
                    style={{ width: 52, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "5px 8px", fontSize: 13, textAlign: "center", background: C.white, outline: "none" }}
                  />
                  <span style={{ fontSize: 12, color: C.muted }}>to</span>
                  <input
                    type="number" min={1} max={progForm.totalDays}
                    value={progItemForm.toDay ?? progForm.totalDays}
                    onChange={(e) => setProgItemForm((f) => ({ ...f, toDay: parseInt(e.target.value) || progForm.totalDays }))}
                    style={{ width: 52, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "5px 8px", fontSize: 13, textAlign: "center", background: C.white, outline: "none" }}
                  />
                  <span style={{ fontSize: 12, color: C.muted, marginLeft: 6 }}>· wait</span>
                  <input
                    type="number" min={0} max={480}
                    value={progItemForm.spacingMinutes}
                    onChange={(e) => setProgItemForm((f) => ({ ...f, spacingMinutes: parseInt(e.target.value) || 0 }))}
                    style={{ width: 52, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "5px 8px", fontSize: 13, textAlign: "center", background: C.white, outline: "none" }}
                  />
                  <span style={{ fontSize: 12, color: C.muted }}>min</span>
                </div>
                <input
                  type="text"
                  value={progItemForm.note}
                  onChange={(e) => setProgItemForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Your note (optional, e.g. page reference)"
                  style={{
                    width: "100%", boxSizing: "border-box", border: `1.5px solid ${C.border}`,
                    borderRadius: 10, padding: "8px 12px", fontSize: 12, color: C.charcoal,
                    background: C.white, outline: "none", marginBottom: 10,
                  }}
                />
                <Btn
                  small
                  color={C.plum}
                  disabled={!progItemForm.name.trim()}
                  onClick={() => {
                    const from = Math.max(1, Math.min(progItemForm.fromDay, progForm.totalDays));
                    const to = Math.max(from, Math.min(progItemForm.toDay ?? progForm.totalDays, progForm.totalDays));
                    setProgForm((f) => ({
                      ...f,
                      items: [...f.items, {
                        id: crypto.randomUUID(),
                        name: progItemForm.name.trim(),
                        emoji: progItemForm.emoji || "✨",
                        category: "other",
                        spacingMinutes: progItemForm.spacingMinutes,
                        frequency: "daily",
                        durationType: "cleanse",
                        note: progItemForm.note,
                        programDayRange: [from, to],
                        sortOrder: f.items.length + 1,
                      }],
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
                  setSavingProgram(true);
                  const { data } = await supabase.from("saved_rhythms").insert({
                    profile_id: profileId,
                    name: progForm.name.trim(),
                    emoji: progForm.emoji || "✨",
                    description: `${progForm.totalDays}-day program`,
                    items: progForm.items,
                  }).select().single();
                  setSavingProgram(false);
                  if (data) setSavedRows((prev) => [data, ...prev]);
                  setLevel("programs");
                }}
              >
                {savingProgram ? "Saving…" : "Save program"}
              </Btn>
            </div>
          )}

          {/* ── LEVEL: MY RHYTHM (edit list) ──────────────────────────────────── */}
          {level === "edit" && !editingId && (
            <>
              {/* Wake anchor compact */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, color: C.muted }}>⏰ Wake anchor:</span>
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
                        background: C.white, border: `1.5px solid ${C.border}`,
                        borderRadius: 14, padding: "12px 14px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 20 }}>{item.emoji}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.charcoal }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                            +{item.spacingMinutes}min · {FREQ_LABELS[item.frequency] || item.frequency} · {DUR_LABELS[item.durationType] || item.durationType}
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
                              background: `${C.sage}15`, border: "none",
                              borderRadius: 8, padding: "4px 10px",
                              fontSize: 11, color: C.sageDark, cursor: "pointer",
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
                        <div style={{ fontSize: 11, color: C.terracotta, marginTop: 6 }}>
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
                    fontFamily: "Georgia,serif", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  💾 Save as my custom template
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
              onCancel={() => setEditingId(null)}
              title="Edit item"
            />
          )}

          {/* ── LEVEL: ADD ITEM ───────────────────────────────────────────────── */}
          {level === "add" && (
            <ItemForm
              form={addForm}
              setForm={setAddForm}
              onSave={saveNewItem}
              onCancel={() => setLevel("edit")}
              title="Add new item"
            />
          )}

          {/* ── LEVEL: SAVE CUSTOM TEMPLATE ───────────────────────────────────── */}
          {level === "save-template" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal }}>
                  Save as my template
                </div>
                <button onClick={() => setLevel("edit")} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>

              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
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
                    background: C.white, outline: "none",
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
                    background: C.white, outline: "none",
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
                  setTimeout(() => { setSavedTemplateMsg(""); setLevel("edit"); }, 1800);
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

function ItemForm({ form, setForm, onSave, onCancel, title }) {
  const TODAY = new Date().toISOString().split("T")[0];

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
            background: C.white, outline: "none",
          }}
        />
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="Item name"
          style={{
            flex: 1, border: `2px solid ${C.border}`, borderRadius: 10,
            padding: "10px 14px", fontSize: 14, color: C.charcoal,
            background: C.white, outline: "none",
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
                fontSize: 12, cursor: "pointer",
              }}
            >
              {CATEGORY_EMOJIS[cat]} {cat}
            </button>
          ))}
        </div>
        {form.isMedicine && (
          <div style={{
            marginTop: 8, fontSize: 11, color: C.plum, lineHeight: 1.6,
            background: `${C.plum}12`, borderRadius: 10, padding: "8px 12px",
          }}>
            ⚕️ This item will be marked as a prescribed medicine. The app will show a standing note to confirm timing with your doctor or pharmacist. The app and AI will never advise on prescribed medication timing or interactions.
          </div>
        )}
      </FieldGroup>

      {/* Spacing */}
      <FieldGroup label="Wait time after previous step">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="number"
            min={0}
            max={480}
            value={form.spacingMinutes}
            onChange={(e) => setForm((f) => ({ ...f, spacingMinutes: parseInt(e.target.value) || 0 }))}
            style={{
              width: 70, border: `2px solid ${C.border}`, borderRadius: 10,
              padding: "8px 12px", fontSize: 16, fontFamily: "Georgia,serif", fontWeight: 700,
              color: C.charcoal, background: C.white, outline: "none", textAlign: "center",
            }}
          />
          <span style={{ fontSize: 13, color: C.muted }}>minutes</span>
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
          How many minutes after the previous item completes (or after your wake anchor for the first item).
        </div>
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
                fontSize: 11, cursor: "pointer",
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
          {Object.entries(DUR_LABELS).map(([val, label]) => (
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
                fontSize: 11, cursor: "pointer",
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
                background: C.white, outline: "none",
              }}
            />
            <span style={{ fontSize: 13, color: C.muted }}>Starting:</span>
            <input
              type="date"
              value={form.startDate || TODAY}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              style={{
                border: `1.5px solid ${C.border}`, borderRadius: 8,
                padding: "6px 10px", fontSize: 12, color: C.charcoal,
                background: C.white, outline: "none",
              }}
            />
          </div>
        )}
      </FieldGroup>

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
            background: C.white, outline: "none", resize: "vertical",
          }}
        />
      </FieldGroup>

      <Btn full color={C.sageDark} onClick={onSave} disabled={!form.name.trim()}>
        {!form.name.trim() ? "Enter a name above" : "Save item"}
      </Btn>
    </div>
  );
}

function FieldGroup({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </div>
      {children}
    </div>
  );
}
