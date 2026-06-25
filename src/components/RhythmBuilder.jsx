import { useState } from "react";
import C from "../lib/colors.js";
import { Card, Btn } from "./ui.jsx";
import { RHYTHM_PRESETS, ALL_PROGRAMS } from "../data/rhythmTemplates.js";

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
  awNote: "",
  isMedicine: false,
  programId: null,
  programDayRange: null,
  note: "",
  sortOrder: 999,
};

export default function RhythmBuilder({
  baseItems,
  anchorTime,
  activeProgram,
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
  const [level, setLevel] = useState("templates"); // templates | edit | add
  const [editingId, setEditingId] = useState(null);
  const [addForm, setAddForm] = useState(BLANK_ITEM);
  const [localAnchor, setLocalAnchor] = useState(anchorTime || "07:00");
  const [programStartDate, setProgramStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [confirmClearId, setConfirmClearId] = useState(null);

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
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {[
              { id: "templates", label: "Templates" },
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
                  fontSize: 12, fontFamily: "Georgia,serif", fontWeight: 700, cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: "0 18px 32px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* ── LEVEL: TEMPLATES ──────────────────────────────────────────────── */}
          {level === "templates" && (
            <>
              {/* Wake anchor */}
              <Card>
                <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 8 }}>
                  ⏰ Your wake anchor
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
                  Set your usual wake time — the app calculates your whole day's sequence from this one anchor.
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

              {/* Preset templates */}
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>
                Start from a template
              </div>
              <div style={{ fontSize: 12, color: C.muted }}>
                Choosing a template replaces your current rhythm items. You can edit every item after.
              </div>

              {RHYTHM_PRESETS.map((preset) => (
                <Card key={preset.id}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ fontSize: 26, flexShrink: 0 }}>{preset.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>
                        {preset.name}
                      </div>
                      <div style={{ fontSize: 12, color: C.mid, marginTop: 3, lineHeight: 1.5 }}>
                        {preset.description}
                      </div>
                      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {preset.items.map((item) => (
                          <span key={item.id} style={{
                            fontSize: 10, background: `${C.sage}15`, color: C.sageDark,
                            borderRadius: 20, padding: "2px 7px",
                          }}>
                            {item.emoji} {item.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm(`Apply "${preset.name}" template? This will replace your current rhythm items.`)) {
                        onApplyTemplate(preset.id);
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

              {/* Multi-day programs */}
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginTop: 4 }}>
                Multi-day programs
              </div>

              {ALL_PROGRAMS.map((prog) => {
                const isActive = activeProgram?.id === prog.id;
                return (
                  <Card key={prog.id} style={{ border: isActive ? `2px solid ${C.plum}` : undefined }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ fontSize: 26, flexShrink: 0 }}>{prog.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>
                          {prog.name}
                        </div>
                        <div style={{ fontSize: 12, color: C.mid, marginTop: 3, lineHeight: 1.5 }}>
                          {prog.description}
                        </div>
                        <div style={{ fontSize: 11, color: C.plum, marginTop: 4 }}>
                          📖 {prog.awSource}
                        </div>
                      </div>
                    </div>

                    {isActive ? (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 12, color: C.plum, fontWeight: 700, marginBottom: 8 }}>
                          ✨ Program active — started {activeProgram.startDate}
                        </div>
                        <button
                          onClick={onCancelProgram}
                          style={{
                            background: `${C.plum}15`, color: C.plum,
                            border: `1.5px solid ${C.plum}40`, borderRadius: 10,
                            padding: "8px 16px", fontSize: 12, cursor: "pointer",
                          }}
                        >
                          End program early
                        </button>
                      </div>
                    ) : (
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
                          <Btn small color={C.plum} onClick={() => onStartProgram(prog.id, programStartDate)}>
                            Start
                          </Btn>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </>
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
