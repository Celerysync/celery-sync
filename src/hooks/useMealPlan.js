import { useCallback, useEffect, useState } from "react";
import { loadPlan, MEAL_PLAN_CHANGED_EVENT } from "../lib/mealPlan.js";
import { KITCHEN_CHANGED_EVENT } from "../lib/kitchen.js";

// Their planned recipes from `from` to `to` (YYYY-MM-DD), kept current when
// they plan by tap or by voice, or change a recipe.
export function useMealPlan(profileId, from, to = from) {
  const [entries, setEntries] = useState([]);
  const load = useCallback(async () => {
    if (!profileId) return;
    try { setEntries(await loadPlan(profileId, from, to)); } catch { /* offline: keep what we have */ }
  }, [profileId, from, to]);
  useEffect(() => {
    load();
    window.addEventListener(MEAL_PLAN_CHANGED_EVENT, load);
    window.addEventListener(KITCHEN_CHANGED_EVENT, load);
    return () => {
      window.removeEventListener(MEAL_PLAN_CHANGED_EVENT, load);
      window.removeEventListener(KITCHEN_CHANGED_EVENT, load);
    };
  }, [load]);
  return { entries, reload: load };
}
