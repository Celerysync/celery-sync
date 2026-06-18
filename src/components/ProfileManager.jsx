import { useState } from "react";
import C from "../lib/colors.js";
import { Btn, Card } from "./ui.jsx";
import { AVATAR_OPTIONS } from "../hooks/useProfiles.js";
import { CONDITIONS } from "../data/conditions.js";

const GOALS = [
  "Heal a specific condition",
  "Heavy metal detox",
  "Liver healing",
  "Thyroid healing",
  "More energy & clarity",
  "Prevention & wellness",
  "Supporting a family member",
  "Children's health",
];

function ProfileForm({ initial = {}, onSave, onCancel, saving }) {
  const [name, setName] = useState(initial.name || "");
  const [symptoms, setSymptoms] = useState(initial.symptoms || []);
  const [goal, setGoal] = useState(initial.goal || "");
  const [avatar, setAvatar] = useState(initial.avatar_emoji || "🌿");
  const [condSearch, setCondSearch] = useState("");

  const toggleSymptom = (s) =>
    setSymptoms((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Avatar picker */}
      <div>
        <div style={{ fontSize: 12, color: C.mid, marginBottom: 8, fontFamily: "Georgia,serif" }}>Choose an avatar</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {AVATAR_OPTIONS.map((e) => (
            <button
              key={e}
              onClick={() => setAvatar(e)}
              style={{
                width: 42, height: 42,
                borderRadius: 12,
                border: `2px solid ${avatar === e ? C.sageDark : C.border}`,
                background: avatar === e ? C.sageLight : "transparent",
                fontSize: 20, cursor: "pointer",
              }}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <div style={{ fontSize: 12, color: C.mid, marginBottom: 6, fontFamily: "Georgia,serif" }}>Name</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mum, Jake, Lily…"
          style={{
            width: "100%", padding: "11px 14px",
            borderRadius: 12, border: `1.5px solid ${C.border}`,
            fontFamily: "Georgia,serif", fontSize: 15, outline: "none",
            background: C.mist, boxSizing: "border-box",
          }}
        />
      </div>

      {/* Goal */}
      <div>
        <div style={{ fontSize: 12, color: C.mid, marginBottom: 8, fontFamily: "Georgia,serif" }}>Healing goal</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {GOALS.map((g) => (
            <button
              key={g}
              onClick={() => setGoal(g)}
              style={{
                padding: "9px 14px", borderRadius: 10, textAlign: "left",
                border: `1.5px solid ${goal === g ? C.sage : C.border}`,
                background: goal === g ? C.sageLight : C.mist,
                color: goal === g ? C.sageDark : C.mid,
                fontFamily: "Georgia,serif", fontSize: 13,
                cursor: "pointer", fontWeight: goal === g ? 700 : 400,
              }}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Symptoms */}
      <div>
        <div style={{ fontSize: 12, color: C.mid, marginBottom: 8, fontFamily: "Georgia,serif" }}>
          Main symptoms (select all that apply) {symptoms.length > 0 && `· ${symptoms.length} selected`}
        </div>
        <input
          value={condSearch}
          onChange={(e) => setCondSearch(e.target.value)}
          placeholder="Search 80 conditions…"
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "8px 14px", borderRadius: 30,
            border: `1.5px solid ${C.border}`,
            fontFamily: "Georgia,serif", fontSize: 12,
            outline: "none", background: C.mist, marginBottom: 8,
          }}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 180, overflowY: "auto" }}>
          {Object.keys(CONDITIONS)
            .filter((s) => !condSearch || s.toLowerCase().includes(condSearch.toLowerCase()))
            .map((s) => (
              <button
                key={s}
                onClick={() => toggleSymptom(s)}
                style={{
                  padding: "5px 12px", borderRadius: 20,
                  border: `1.5px solid ${symptoms.includes(s) ? C.sage : C.border}`,
                  background: symptoms.includes(s) ? C.sageLight : "transparent",
                  color: symptoms.includes(s) ? C.sageDark : C.mid,
                  fontSize: 12, fontFamily: "Georgia,serif",
                  cursor: "pointer", fontWeight: symptoms.includes(s) ? 700 : 400,
                }}
              >
                {s}
              </button>
            ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        <Btn full color={C.sageDark} onClick={() => onSave({ name, symptoms, goal, avatar_emoji: avatar })} disabled={saving || !name.trim()}>
          {saving ? "Saving…" : "Save Profile"}
        </Btn>
        <button
          onClick={onCancel}
          style={{ padding: "0 18px", borderRadius: 12, border: `1px solid ${C.border}`, background: "none", cursor: "pointer", fontSize: 13, color: C.muted }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function ProfileManager({ profiles, activeProfileId, onSwitch, onCreate, onUpdate, onDelete }) {
  const [mode, setMode] = useState(null); // null | "add" | {editing: profile}
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleCreate = async (data) => {
    setSaving(true);
    const created = await onCreate(data);
    if (created) onSwitch(created.id);
    setSaving(false);
    setMode(null);
  };

  const handleUpdate = async (data) => {
    setSaving(true);
    await onUpdate(mode.editing.id, data);
    setSaving(false);
    setMode(null);
  };

  const handleDelete = async (id) => {
    await onDelete(id);
    setConfirmDelete(null);
  };

  if (mode === "add") {
    return (
      <Card>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 14 }}>
          Add Family Member
        </div>
        <ProfileForm onSave={handleCreate} onCancel={() => setMode(null)} saving={saving} />
      </Card>
    );
  }

  if (mode?.editing) {
    return (
      <Card>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 14 }}>
          Edit Profile — {mode.editing.name}
        </div>
        <ProfileForm initial={mode.editing} onSave={handleUpdate} onCancel={() => setMode(null)} saving={saving} />
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 14 }}>
        👨‍👩‍👧‍👦 Family Profiles
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
        {profiles.map((p) => {
          const isActive = p.id === activeProfileId;
          return (
            <div
              key={p.id}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", borderRadius: 14,
                border: `2px solid ${isActive ? C.sage : C.border}`,
                background: isActive ? C.sageLight : C.mist,
                cursor: "pointer",
              }}
              onClick={() => onSwitch(p.id)}
            >
              <span style={{ fontSize: 26 }}>{p.avatar_emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "Georgia,serif", fontWeight: isActive ? 700 : 400, fontSize: 14, color: C.charcoal }}>
                  {p.name}
                  {isActive && <span style={{ fontSize: 11, color: C.sage, marginLeft: 8 }}>● active</span>}
                </div>
                {p.goal && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.goal}
                  </div>
                )}
                {p.symptoms?.length > 0 && (
                  <div style={{ fontSize: 11, color: C.mid, marginTop: 2 }}>
                    {p.symptoms.slice(0, 3).join(", ")}{p.symptoms.length > 3 ? ` +${p.symptoms.length - 3} more` : ""}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setMode({ editing: p }); }}
                  style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 8px", fontSize: 11, color: C.mid, cursor: "pointer" }}
                >
                  Edit
                </button>
                {profiles.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(p); }}
                    style={{ background: "none", border: `1px solid #fca5a5`, borderRadius: 8, padding: "4px 8px", fontSize: 11, color: "#ef4444", cursor: "pointer" }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Btn full color={C.sage} onClick={() => setMode("add")}>
        + Add Family Member
      </Btn>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div style={{
          marginTop: 14, padding: "14px 16px",
          background: "#fef2f2", border: "1px solid #fca5a5",
          borderRadius: 12,
        }}>
          <div style={{ fontFamily: "Georgia,serif", fontSize: 13, color: "#dc2626", marginBottom: 10 }}>
            Remove {confirmDelete.name}'s profile? This deletes their healing history and journal entries permanently.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => handleDelete(confirmDelete.id)}
              style={{ flex: 1, padding: "8px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "Georgia,serif", fontSize: 13 }}
            >
              Yes, remove
            </button>
            <button
              onClick={() => setConfirmDelete(null)}
              style={{ flex: 1, padding: "8px", background: "none", border: `1px solid ${C.border}`, borderRadius: 10, cursor: "pointer", fontSize: 13, color: C.muted }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
