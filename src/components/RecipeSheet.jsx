import { useState } from "react";
import C from "../lib/colors.js";
import { useKitchen } from "../hooks/useKitchen.js";
import { RecipeView } from "./Kitchen.jsx";
import CookMode from "./CookMode.jsx";

// The recipe a rhythm step is linked to, opened from Today's 📖. Uses the
// copy kept on the phone, so it opens without signal too.
export default function RecipeSheet({ profileId, recipeId, onClose, onOpenKitchen }) {
  const { recipes, loading } = useKitchen(profileId);
  const [cooking, setCooking] = useState(false);
  const recipe = recipes.find((r) => r.id === recipeId);

  if (cooking && recipe) return <CookMode recipe={recipe} onClose={() => setCooking(false)} />;

  return (
    <div role="dialog" aria-label={recipe ? recipe.name : "Recipe"} style={{
      position: "fixed", inset: 0, zIndex: 50, background: C.cream,
      overflowY: "auto", padding: "calc(14px + env(safe-area-inset-top, 0px)) 14px 40px",
    }}>
      <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          {onOpenKitchen && (
            <button onClick={onOpenKitchen} style={{
              background: "transparent", color: C.mid, border: `1.5px solid ${C.border}`, borderRadius: 30,
              padding: "8px 16px", fontFamily: "Georgia,serif", cursor: "pointer",
            }}>
              🥬 Kitchen
            </button>
          )}
          <button onClick={onClose} style={{
            background: C.sageDark, color: C.white, border: "none", borderRadius: 30,
            padding: "8px 16px", fontFamily: "Georgia,serif", fontWeight: 700, cursor: "pointer",
          }}>
            Done
          </button>
        </div>
        {recipe
          ? <RecipeView recipe={recipe} onCook={() => setCooking(true)} compact />
          : <div style={{ textAlign: "center", padding: 32, color: C.muted }}>{loading ? "🌿" : "That recipe isn't in your Kitchen any more."}</div>}
      </div>
    </div>
  );
}
