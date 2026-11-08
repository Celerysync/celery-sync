import { useEffect, useMemo, useState } from "react";
import C, { alpha } from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { useKitchen, photoUrl } from "../hooks/useKitchen.js";
import { KITCHEN_KINDS, KIND_BY_ID, sortRecipeText } from "../lib/kitchen.js";
import { supabase } from "../lib/supabase.js";
import { RHYTHM_CHANGED_EVENT, rhythmItemToRow } from "../lib/rhythmSchedule.js";
import CookMode from "./CookMode.jsx";
import { useMealPlan } from "../hooks/useMealPlan.js";
import { PLAN_SLOTS, SLOT_LABEL, dayLabel, defaultSlot, planRecipe, unplan } from "../lib/mealPlan.js";
import { localDateStr } from "../lib/rhythmSchedule.js";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const nextDays = (n = 7) => Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return localDateStr(d); });

// "Plan it": which day and when. One recipe per day and slot.
function PlanForm({ recipe, profileId, onDone }) {
  const [date, setDate] = useState(nextDays()[0]);
  const [slot, setSlot] = useState(defaultSlot(recipe.kind) || "dinner");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const sel = { padding: "10px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.surface, fontSize: 15, color: C.charcoal, flex: 1 };
  return (
    <div style={{ background: C.mist, borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 14, color: C.charcoal }}>When are you having it?</div>
      <div style={{ display: "flex", gap: 8 }}>
        <select aria-label="Day" value={date} onChange={(e) => setDate(e.target.value)} style={sel}>
          {nextDays().map((d) => <option key={d} value={d}>{dayLabel(d)}</option>)}
        </select>
        <select aria-label="Time of day" value={slot} onChange={(e) => setSlot(e.target.value)} style={sel}>
          {PLAN_SLOTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>
      {error && <div role="alert" style={{ fontSize: 13, color: C.terracotta }}>{error}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button style={btn(true)} disabled={saving} onClick={async () => {
          setSaving(true); setError("");
          try { await planRecipe(profileId, { recipeId: recipe.id, date, slot }); onDone(`Planned for ${dayLabel(date).toLowerCase()}, ${SLOT_LABEL[slot].toLowerCase()}.`); }
          catch { setError("That didn't save. Please try again."); setSaving(false); }
        }}>{saving ? "Saving…" : "Plan it"}</button>
        <button style={btn(false)} onClick={() => onDone("")}>Cancel</button>
      </div>
    </div>
  );
}

// What's planned for the next week, so planning is never invisible.
function ComingUp({ profileId, recipes, onOpen }) {
  const days = nextDays();
  const { entries } = useMealPlan(profileId, days[0], days[days.length - 1]);
  if (!entries.length) return null;
  return (
    <Card style={{ padding: "12px 14px" }}>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 6 }}>📅 Coming up</div>
      {entries.map((e) => (
        <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 14, color: C.charcoal }}>
          <span style={{ color: C.muted, minWidth: 130 }}>{dayLabel(e.plan_date)} · {SLOT_LABEL[e.slot]}</span>
          <button onClick={() => recipes.some((r) => r.id === e.recipe_id) && onOpen(e.recipe_id)} style={{ flex: 1, textAlign: "left", background: "none", border: "none", padding: 0, fontSize: 14, color: C.sageDark, fontFamily: "Georgia,serif", cursor: "pointer" }}>
            {e.recipe.name}
          </button>
          <button onClick={() => unplan(e.id).catch(() => {})} aria-label={`Take ${e.recipe.name} off ${dayLabel(e.plan_date)}`} style={{ background: "none", border: "none", color: C.muted, fontSize: 16, cursor: "pointer" }}>✕</button>
        </div>
      ))}
    </Card>
  );
}

const pill = (on) => ({
  padding: "8px 14px", borderRadius: 30, border: `1.5px solid ${on ? C.sage : C.border}`,
  background: on ? C.sageLight : "transparent", color: on ? C.sageDark : C.mid,
  fontFamily: "Georgia,serif", fontSize: 14, fontWeight: on ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap",
});
const btn = (primary) => ({
  padding: "10px 16px", borderRadius: 30, border: primary ? "none" : `1.5px solid ${C.border}`,
  background: primary ? C.sageDark : "transparent", color: primary ? C.white : C.mid,
  fontFamily: "Georgia,serif", fontWeight: primary ? 700 : 400, fontSize: 14, cursor: "pointer",
});
const field = {
  width: "100%", boxSizing: "border-box", border: `1.5px solid ${C.border}`, borderRadius: 12,
  padding: "10px 12px", fontSize: 16, color: C.charcoal, background: C.surface, fontFamily: "Georgia,serif",
};

function Photo({ path, size = 56, radius = 12 }) {
  const [url, setUrl] = useState(null);
  useEffect(() => { let on = true; photoUrl(path).then((u) => on && setUrl(u)); return () => { on = false; }; }, [path]);
  if (!path) return null;
  return url
    ? <img src={url} alt="" style={{ width: size, height: size, objectFit: "cover", borderRadius: radius, flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: radius, background: C.mist, flexShrink: 0 }} />;
}

// One recipe, read-only, with its actions. Also used from Today's 📖.
export function RecipeView({ recipe, onCook, onEdit, onClose, onAddToRhythm, onFavourite, onDelete, onPhoto, profileId, compact = false }) {
  const [planning, setPlanning] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgIsError, setMsgIsError] = useState(false);
  const say = (text, isError = false) => { setMsg(text); setMsgIsError(isError); };
  const [uploading, setUploading] = useState(false);
  const kind = KIND_BY_ID[recipe.kind];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Photo path={recipe.photo_path} size={compact ? 64 : 84} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: C.muted, textTransform: "capitalize" }}>{kind?.emoji} {kind?.one}</div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 20, color: C.charcoal }}>{recipe.name}</div>
          {recipe.tags?.length > 0 && <div style={{ fontSize: 13, color: C.mid, marginTop: 2 }}>{recipe.tags.join(" · ")}</div>}
        </div>
        {onFavourite && (
          <button onClick={() => onFavourite(recipe)} aria-label={recipe.favourite ? "Remove from favourites" : "Add to favourites"}
            style={{ background: "none", border: "none", fontSize: 26, cursor: "pointer", padding: 4 }}>
            {recipe.favourite ? "⭐" : "☆"}
          </button>
        )}
      </div>

      <button onClick={() => onCook(recipe)} style={{ ...btn(true), padding: "14px 18px", fontSize: 17 }}>👩‍🍳 Cook mode</button>

      <div>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 6 }}>Ingredients</div>
        {recipe.ingredients?.length
          ? <ul style={{ margin: 0, paddingLeft: 20, fontSize: 16, lineHeight: 1.7, color: C.charcoal }}>{recipe.ingredients.map((i, n) => <li key={n}>{i.text}</li>)}</ul>
          : <div style={{ fontSize: 14, color: C.muted }}>None saved.</div>}
      </div>
      {recipe.steps?.length > 0 && (
        <div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 6 }}>Steps</div>
          <ol style={{ margin: 0, paddingLeft: 22, fontSize: 16, lineHeight: 1.7, color: C.charcoal }}>{recipe.steps.map((s, n) => <li key={n}>{s}</li>)}</ol>
        </div>
      )}
      {recipe.notes && <div style={{ fontSize: 14, color: C.mid, background: C.mist, borderRadius: 12, padding: "10px 12px" }}>📝 {recipe.notes}</div>}

      {!compact && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {profileId && <button style={btn(false)} onClick={() => setPlanning(true)}>📅 Plan it</button>}
          {onAddToRhythm && <button style={btn(false)} onClick={async () => { const r = await onAddToRhythm(recipe); say(r.message, !r.ok); }}>+ Add to my rhythm</button>}
          {onEdit && <button style={btn(false)} onClick={() => onEdit(recipe)}>Edit</button>}
          {onPhoto && (
            <label style={{ ...btn(false), display: "inline-flex", alignItems: "center" }}>
              📷 {uploading ? "Saving photo…" : recipe.photo_path ? "Change photo" : "Add a photo"}
              <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploading} onChange={async (e) => {
                const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
                setUploading(true);
                try { await onPhoto(recipe, f); say("Photo saved."); } catch (err) { say(err.message, true); }
                setUploading(false);
              }} />
            </label>
          )}
          {onDelete && (
            <button style={{ ...btn(false), color: C.terracotta, borderColor: confirmDelete ? C.terracotta : C.border }}
              onClick={async () => { if (!confirmDelete) { setConfirmDelete(true); return; } try { await onDelete(recipe.id); } catch (err) { say(err.message, true); } }}>
              {confirmDelete ? "Tap again to delete" : "Delete"}
            </button>
          )}
          {onClose && <button style={btn(false)} onClick={onClose}>Back</button>}
        </div>
      )}
      {planning && <PlanForm recipe={recipe} profileId={profileId} onDone={(m) => { setPlanning(false); if (m) say(m); }} />}
      {msg && <div role={msgIsError ? "alert" : "status"} style={{ fontSize: 14, color: msgIsError ? C.terracotta : C.sageDark }}>{msg}</div>}
    </div>
  );
}

function RecipeEditor({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({
    name: initial?.name || "", kind: initial?.kind || "smoothie",
    ingredients: (initial?.ingredients || []).map((i) => i.text).join("\n"),
    steps: (initial?.steps || []).join("\n"),
    notes: initial?.notes || "", tags: (initial?.tags || []).join(", "), favourite: !!initial?.favourite,
  }));
  const [paste, setPaste] = useState("");
  const [sorting, setSorting] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const sortIt = async () => {
    setSorting(true); setError("");
    try {
      const r = await sortRecipeText(paste);
      setForm((f) => ({
        ...f, name: f.name || r.name, kind: r.kind,
        ingredients: r.ingredients.map((i) => i.text).join("\n"),
        steps: r.steps.join("\n"), notes: r.notes || f.notes,
      }));
      setPaste("");
    } catch (err) { setError(err.message); }
    setSorting(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 18, color: C.charcoal }}>{initial?.id ? "Edit recipe" : "Add a recipe"}</div>

      {!initial?.id && (
        <Card style={{ background: C.mist }}>
          <div style={{ fontSize: 14, color: C.charcoal, marginBottom: 6 }}>
            Paste or type it all in one go, and I'll sort it into the right places for you to check.
          </div>
          <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={4} placeholder="e.g. My green smoothie: 2 bananas, a cup of wild blueberries, a handful of spinach. Blend the bananas first, then the rest."
            style={{ ...field, resize: "vertical" }} />
          <button style={{ ...btn(true), marginTop: 8 }} disabled={!paste.trim() || sorting} onClick={sortIt}>
            {sorting ? "Sorting…" : "Sort it for me"}
          </button>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Only what you write is used. Nothing is added or changed.</div>
        </Card>
      )}

      <label style={{ fontSize: 14, color: C.charcoal }}>Name
        <input value={form.name} onChange={set("name")} placeholder="e.g. Morning green smoothie" style={{ ...field, marginTop: 4 }} />
      </label>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
        {KITCHEN_KINDS.map((k) => (
          <button key={k.id} onClick={() => setForm((f) => ({ ...f, kind: k.id }))} style={pill(form.kind === k.id)}>{k.emoji} {k.one}</button>
        ))}
      </div>
      <label style={{ fontSize: 14, color: C.charcoal }}>Ingredients (one per line)
        <textarea value={form.ingredients} onChange={set("ingredients")} rows={5} style={{ ...field, marginTop: 4, resize: "vertical" }} />
      </label>
      <label style={{ fontSize: 14, color: C.charcoal }}>Steps (one per line)
        <textarea value={form.steps} onChange={set("steps")} rows={5} style={{ ...field, marginTop: 4, resize: "vertical" }} />
      </label>
      <label style={{ fontSize: 14, color: C.charcoal }}>Your notes (optional)
        <input value={form.notes} onChange={set("notes")} placeholder="e.g. page 112 in my book" style={{ ...field, marginTop: 4 }} />
      </label>
      <label style={{ fontSize: 14, color: C.charcoal }}>Tags (optional, commas between)
        <input value={form.tags} onChange={set("tags")} placeholder="e.g. morning, quick, cleanse" style={{ ...field, marginTop: 4 }} />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, color: C.charcoal }}>
        <input type="checkbox" checked={form.favourite} onChange={(e) => setForm((f) => ({ ...f, favourite: e.target.checked }))} style={{ width: 20, height: 20 }} />
        ⭐ A favourite
      </label>
      {error && <div role="alert" style={{ fontSize: 14, color: C.terracotta }}>{error}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button style={{ ...btn(true), flex: 1, padding: "14px" }} disabled={saving || !form.name.trim()} onClick={async () => {
          setSaving(true); setError("");
          try { await onSave(form); } catch (err) { setError(err.message); setSaving(false); }
        }}>
          {saving ? "Saving…" : "Save recipe"}
        </button>
        <button style={btn(false)} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function Kitchen({ profileId, section }) {
  const { recipes, loading, offline, save, remove, toggleFavourite, setPhoto } = useKitchen(profileId);
  const [kind, setKind] = useState(KIND_BY_ID[section] ? section : "all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState(null); // recipe id being viewed
  const [editing, setEditing] = useState(null); // null | "new" | recipe
  const [cooking, setCooking] = useState(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipes
      .filter((r) => kind === "all" || r.kind === kind)
      .filter((r) => !q || r.name.toLowerCase().includes(q) || (r.ingredients || []).some((i) => i.text.toLowerCase().includes(q)) || (r.tags || []).some((t) => t.includes(q)))
      .sort((a, b) => Number(b.favourite) - Number(a.favourite) || a.name.localeCompare(b.name));
  }, [recipes, kind, query]);

  const viewing = recipes.find((r) => r.id === view);

  const addToRhythm = async (recipe) => {
    const { data: rows } = await supabase.from("rhythm_items").select("sort_order").eq("profile_id", profileId).is("archived_at", null);
    const row = rhythmItemToRow({
      name: recipe.name, emoji: KIND_BY_ID[recipe.kind]?.emoji || "🌿", category: ["meal", "snack"].includes(recipe.kind) ? "food" : "morning",
      frequency: "daily", note: "", recipeId: recipe.id, sortOrder: Math.max(0, ...(rows || []).map((r) => r.sort_order || 0)) + 1,
    }, profileId);
    const { error } = await supabase.from("rhythm_items").insert(row);
    if (error) return { ok: false, message: "That didn't add. Please try again." };
    window.dispatchEvent(new Event(RHYTHM_CHANGED_EVENT));
    return { ok: true, message: `"${recipe.name}" is on your daily rhythm now. Set its time from Today → Edit.` };
  };

  if (cooking) return <CookMode recipe={cooking} onClose={() => setCooking(null)} />;

  if (editing) {
    return (
      <Card>
        <RecipeEditor
          initial={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSave={async (form) => {
            const saved = await save(form, { id: editing === "new" ? null : editing.id });
            setEditing(null);
            setView(saved.id);
          }}
        />
      </Card>
    );
  }

  if (viewing) {
    return (
      <Card>
        <RecipeView
          recipe={viewing}
          onCook={setCooking}
          onEdit={setEditing}
          onClose={() => setView(null)}
          onAddToRhythm={addToRhythm}
          onFavourite={toggleFavourite}
          onDelete={async (id) => { await remove(id); setView(null); }}
          onPhoto={setPhoto}
          profileId={profileId}
        />
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 22, color: C.charcoal }}>🥬 Kitchen</div>
          <div style={{ fontSize: 13, color: C.muted }}>Your own juices, smoothies, meals and more.</div>
        </div>
        <button style={btn(true)} onClick={() => setEditing("new")}>+ Add</button>
      </div>

      {offline && (
        <div style={{ fontSize: 13, color: C.mid, background: alpha(C.gold, "20"), borderRadius: 12, padding: "8px 12px" }}>
          You're offline, so this is the copy saved on your phone. Changes need a connection.
        </div>
      )}

      <ComingUp profileId={profileId} recipes={recipes} onOpen={setView} />

      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or ingredient…" aria-label="Search your recipes" style={field} />

      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
        <button style={pill(kind === "all")} onClick={() => setKind("all")}>All</button>
        {KITCHEN_KINDS.map((k) => <button key={k.id} style={pill(kind === k.id)} onClick={() => setKind(k.id)}>{k.emoji} {k.label}</button>)}
      </div>

      {!loading && recipes.length === 0 && (
        <Card style={{ textAlign: "center", padding: "26px 18px" }}>
          <div style={{ fontSize: 34 }}>🥬</div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16, color: C.charcoal, marginTop: 6 }}>Your Kitchen is empty</div>
          <div style={{ fontSize: 14, color: C.mid, marginTop: 6, lineHeight: 1.6 }}>
            Add your own juices, smoothies and meals: tap <strong>+ Add</strong>, paste one in, or tell your companion
            "save a new smoothie…" and read it out. Only your own recipes live here.
          </div>
        </Card>
      )}
      {recipes.length > 0 && shown.length === 0 && <div style={{ fontSize: 14, color: C.muted, textAlign: "center" }}>Nothing matches that.</div>}

      {shown.map((r) => (
        <button key={r.id} onClick={() => setView(r.id)} style={{
          display: "flex", gap: 12, alignItems: "center", textAlign: "left", width: "100%",
          background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 16, padding: "12px 14px", cursor: "pointer",
        }}>
          {r.photo_path ? <Photo path={r.photo_path} /> : <div style={{ fontSize: 30, width: 56, textAlign: "center" }}>{KIND_BY_ID[r.kind]?.emoji}</div>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16, color: C.charcoal }}>{r.favourite ? "⭐ " : ""}{r.name}</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
              <span style={{ textTransform: "capitalize" }}>{KIND_BY_ID[r.kind]?.one}</span> · {plural(r.ingredients?.length || 0, "ingredient")}{r.steps?.length ? ` · ${plural(r.steps.length, "step")}` : ""}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
