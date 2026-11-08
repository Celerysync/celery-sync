import { useState } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { useMealPlan } from "../hooks/useMealPlan.js";
import { PLAN_SLOTS, SLOT_LABEL, dayLabel, defaultSlot, planRecipe, unplan } from "../lib/mealPlan.js";
import { localDateStr } from "../lib/rhythmSchedule.js";
import { KIND_BY_ID } from "../lib/kitchen.js";
import { addLines, linesFromRecipes } from "../lib/shopping.js";

const days = () => Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return localDateStr(d); });
const sel = { padding: "9px 10px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.surface, fontSize: 15, color: C.charcoal };

function AddToDay({ date, recipes, profileId, onDone }) {
  const [recipeId, setRecipeId] = useState("");
  const recipe = recipes.find((r) => r.id === recipeId);
  const [slot, setSlot] = useState("");
  const chosenSlot = slot || (recipe && defaultSlot(recipe.kind)) || "dinner";
  const [error, setError] = useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
      <select aria-label={`Recipe for ${dayLabel(date)}`} value={recipeId} onChange={(e) => setRecipeId(e.target.value)} style={sel}>
        <option value="">Choose one of your recipes…</option>
        {recipes.map((r) => <option key={r.id} value={r.id}>{KIND_BY_ID[r.kind]?.emoji} {r.name}</option>)}
      </select>
      <div style={{ display: "flex", gap: 6 }}>
        <select aria-label="When" value={chosenSlot} onChange={(e) => setSlot(e.target.value)} style={{ ...sel, flex: 1 }}>
          {PLAN_SLOTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <button disabled={!recipeId} onClick={async () => {
          try { await planRecipe(profileId, { recipeId, date, slot: chosenSlot }); onDone(); } catch { setError("That didn't save."); }
        }} style={{ padding: "9px 14px", borderRadius: 30, border: "none", background: C.sageDark, color: C.white, fontFamily: "Georgia,serif", fontWeight: 700, cursor: "pointer" }}>
          Add
        </button>
        <button onClick={onDone} style={{ padding: "9px 12px", borderRadius: 30, border: `1.5px solid ${C.border}`, background: "transparent", color: C.mid, cursor: "pointer" }}>Cancel</button>
      </div>
      {error && <div role="alert" style={{ fontSize: 13, color: C.terracotta }}>{error}</div>}
    </div>
  );
}

// The next 7 days: their own recipes placed on days and times of day.
export default function KitchenWeek({ profileId, recipes, onOpen, onShopping }) {
  const week = days();
  const { entries } = useMealPlan(profileId, week[0], week[6]);
  const [addingTo, setAddingTo] = useState(null);
  const [msg, setMsg] = useState("");

  if (!recipes.length) {
    return <Card><div style={{ fontSize: 14, color: C.mid, lineHeight: 1.6 }}>Add some recipes first, then you can place them on days here.</div></Card>;
  }

  const plannedRecipes = recipes.filter((r) => entries.some((e) => e.recipe_id === r.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {week.map((date) => {
        const today = entries.filter((e) => e.plan_date === date);
        return (
          <Card key={date} style={{ padding: "10px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal }}>{dayLabel(date)}</div>
              {addingTo !== date && (
                <button onClick={() => setAddingTo(date)} aria-label={`Add a recipe to ${dayLabel(date)}`} style={{ background: "none", border: `1.5px solid ${C.border}`, borderRadius: 30, padding: "5px 12px", color: C.sageDark, fontSize: 14, cursor: "pointer" }}>
                  + Add
                </button>
              )}
            </div>
            {today.map((e) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 15 }}>
                <span style={{ color: C.muted, minWidth: 82, fontSize: 13 }}>{SLOT_LABEL[e.slot]}</span>
                <button onClick={() => onOpen(e.recipe_id)} style={{ flex: 1, textAlign: "left", background: "none", border: "none", padding: 0, color: C.charcoal, fontFamily: "Georgia,serif", fontSize: 15, cursor: "pointer" }}>
                  {KIND_BY_ID[e.recipe.kind]?.emoji} {e.recipe.name}
                </button>
                <button onClick={() => unplan(e.id).catch(() => {})} aria-label={`Take ${e.recipe.name} off ${dayLabel(date)}`} style={{ background: "none", border: "none", color: C.muted, fontSize: 16, cursor: "pointer" }}>✕</button>
              </div>
            ))}
            {!today.length && addingTo !== date && <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Nothing planned</div>}
            {addingTo === date && <AddToDay date={date} recipes={recipes} profileId={profileId} onDone={() => setAddingTo(null)} />}
          </Card>
        );
      })}
      {plannedRecipes.length > 0 && (
        <button onClick={async () => {
          try {
            const n = await addLines(profileId, linesFromRecipes(entries.map((e) => ({ id: e.recipe_id, ingredients: e.recipe.ingredients }))));
            setMsg(`Added ${n} item${n === 1 ? "" : "s"} to your shopping list.`);
          } catch { setMsg("That didn't add. Please try again."); }
        }} style={{ padding: "12px 16px", borderRadius: 30, border: "none", background: C.sageDark, color: C.white, fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
          🛒 Add this week's ingredients to my list
        </button>
      )}
      {msg && (
        <div role="status" style={{ fontSize: 14, color: C.sageDark, textAlign: "center" }}>
          {msg} <button onClick={onShopping} style={{ background: "none", border: "none", color: C.sageDark, textDecoration: "underline", cursor: "pointer", fontSize: 14 }}>Open the list</button>
        </div>
      )}
    </div>
  );
}
