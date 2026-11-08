import { useMemo, useState } from "react";
import C, { alpha } from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { useShoppingList } from "../hooks/useShoppingList.js";
import { useMealPlan } from "../hooks/useMealPlan.js";
import { addLines, clearTicked, groupList, linesFromRecipes, removeLines } from "../lib/shopping.js";
import { localDateStr } from "../lib/rhythmSchedule.js";
import { KIND_BY_ID } from "../lib/kitchen.js";

const btn = (primary) => ({
  padding: "10px 16px", borderRadius: 30, border: primary ? "none" : `1.5px solid ${C.border}`,
  background: primary ? C.sageDark : "transparent", color: primary ? C.white : C.mid,
  fontFamily: "Georgia,serif", fontWeight: primary ? 700 : 400, fontSize: 14, cursor: "pointer",
});
const weekEnd = () => { const d = new Date(); d.setDate(d.getDate() + 6); return localDateStr(d); };

// Pick recipes (this week's plan ticked by default) and add their ingredients.
function FromRecipes({ profileId, recipes, onDone }) {
  const { entries } = useMealPlan(profileId, localDateStr(), weekEnd());
  const planned = [...new Set(entries.map((e) => e.recipe_id))];
  const [picked, setPicked] = useState(null); // null = this week's plan
  const chosen = picked ?? new Set(planned);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const flip = (id) => { const n = new Set(chosen); if (n.has(id)) n.delete(id); else n.add(id); setPicked(n); };
  return (
    <Card style={{ background: C.mist }}>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 4 }}>Add ingredients from recipes</div>
      <div style={{ fontSize: 13, color: C.mid, marginBottom: 8 }}>
        {planned.length ? "This week's plan is ticked. Change it if you like." : "Tick the recipes you're making."}
      </div>
      <div style={{ maxHeight: 280, overflowY: "auto" }}>
        {recipes.map((r) => (
          <label key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", fontSize: 15, color: C.charcoal }}>
            <input type="checkbox" checked={chosen.has(r.id)} onChange={() => flip(r.id)} style={{ width: 20, height: 20 }} />
            {KIND_BY_ID[r.kind]?.emoji} {r.name}
            <span style={{ fontSize: 12, color: C.muted }}>({(r.ingredients || []).length})</span>
          </label>
        ))}
      </div>
      {error && <div role="alert" style={{ fontSize: 13, color: C.terracotta }}>{error}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button style={btn(true)} disabled={!chosen.size || saving} onClick={async () => {
          setSaving(true); setError("");
          try {
            const n = await addLines(profileId, linesFromRecipes(recipes.filter((r) => chosen.has(r.id))));
            onDone(`Added ${n} item${n === 1 ? "" : "s"}.`);
          } catch { setError("That didn't add. Please try again."); setSaving(false); }
        }}>{saving ? "Adding…" : `Add ${chosen.size || ""} recipe${chosen.size === 1 ? "" : "s"}`}</button>
        <button style={btn(false)} onClick={() => onDone("")}>Cancel</button>
      </div>
    </Card>
  );
}

export default function ShoppingList({ profileId, recipes }) {
  const { rows, offline, pending, toggle } = useShoppingList(profileId);
  const groups = useMemo(() => groupList(rows), [rows]);
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [picking, setPicking] = useState(false);
  const [msg, setMsg] = useState("");
  const ticked = rows.filter((r) => r.checked).length;

  const addTyped = async () => {
    const lines = text.split("\n").map((t) => ({ text: t }));
    setAdding(true); setMsg("");
    try { await addLines(profileId, lines); setText(""); } catch { setMsg("That didn't add. Please try again."); }
    setAdding(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {offline && (
        <div style={{ fontSize: 13, color: C.mid, background: alpha(C.gold, "20"), borderRadius: 12, padding: "8px 12px" }}>
          No signal: this is the copy on your phone. Ticks are saved on your phone{pending ? ` (${pending} waiting)` : ""} and sent when you're back online.
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) addTyped(); }}
          placeholder="Add an item, e.g. lemons" aria-label="Add to shopping list" disabled={offline}
          style={{ flex: 1, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "10px 12px", fontSize: 16, color: C.charcoal, background: C.surface, fontFamily: "Georgia,serif" }} />
        <button style={btn(true)} disabled={!text.trim() || adding || offline} onClick={addTyped}>{adding ? "…" : "Add"}</button>
      </div>
      {!picking && recipes.length > 0 && !offline && (
        <button style={btn(false)} onClick={() => setPicking(true)}>📖 Add ingredients from recipes</button>
      )}
      {picking && <FromRecipes profileId={profileId} recipes={recipes} onDone={(m) => { setPicking(false); setMsg(m); }} />}
      {msg && <div role="status" style={{ fontSize: 14, color: C.sageDark }}>{msg}</div>}

      {rows.length === 0 && (
        <Card style={{ textAlign: "center", padding: "24px 18px" }}>
          <div style={{ fontSize: 32 }}>🛒</div>
          <div style={{ fontSize: 14, color: C.mid, marginTop: 6, lineHeight: 1.6 }}>
            Your list is empty. Add things above, add a recipe's ingredients, or tell your companion "add lemons to my list".
          </div>
        </Card>
      )}

      {groups.map((g) => (
        <Card key={g.aisle} style={{ padding: "10px 14px" }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.mid, marginBottom: 4 }}>{g.emoji} {g.label}</div>
          {g.lines.map((l) => (
            <div key={l.key} style={{ display: "flex", alignItems: "center", gap: 6, borderBottom: `1px solid ${alpha(C.border, "60")}` }}>
              <button onClick={() => toggle(l)} aria-pressed={l.checked} aria-label={`${l.checked ? "Untick" : "Tick"} ${l.text}`} style={{
                flex: 1, display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", padding: "11px 0", cursor: "pointer", textAlign: "left",
              }}>
                <span style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0, border: `2px solid ${l.checked ? C.sage : C.border}`,
                  background: l.checked ? C.sage : "transparent", color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
                }}>{l.checked ? "✓" : ""}</span>
                <span style={{ fontSize: 17, color: l.checked ? C.muted : C.charcoal, textDecoration: l.checked ? "line-through" : "none", fontFamily: "Georgia,serif" }}>
                  {l.text}{l.count > 1 && <span style={{ color: C.mid, fontSize: 14 }}> ×{l.count}</span>}
                </span>
              </button>
              {!offline && (
                <button onClick={() => removeLines(l.ids).catch(() => {})} aria-label={`Remove ${l.text}`} style={{ background: "none", border: "none", color: C.muted, fontSize: 16, cursor: "pointer", padding: 8 }}>✕</button>
              )}
            </div>
          ))}
        </Card>
      ))}

      {ticked > 0 && !offline && (
        <button style={{ ...btn(false), alignSelf: "center" }} onClick={() => clearTicked(profileId).catch(() => {})}>
          Clear ticked items ({ticked})
        </button>
      )}
      {rows.length > 0 && (
        <div style={{ fontSize: 12, color: C.muted, textAlign: "center" }}>
          Lines are kept as you wrote them. The same line twice shows ×2; nothing is added up or changed.
        </div>
      )}
    </div>
  );
}
