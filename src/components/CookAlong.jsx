import { useEffect, useState } from "react";
import CookMode from "./CookMode.jsx";
import { COOK_ALONG_EVENT, syncCookAlong } from "../lib/kitchenVoice.js";

// Cook mode on screen while the companion reads a recipe step by step
// ("read me the steps"). Follows the voice; taps go back to the voice.
export default function CookAlong() {
  const [state, setState] = useState(null); // { recipe, page }
  useEffect(() => {
    const on = (e) => setState(e.detail || null);
    window.addEventListener(COOK_ALONG_EVENT, on);
    return () => window.removeEventListener(COOK_ALONG_EVENT, on);
  }, []);
  if (!state) return null;
  return (
    <CookMode
      key={`${state.recipe.id}-${state.page}`}
      recipe={state.recipe}
      initialPage={state.page}
      onPage={(page) => syncCookAlong(page)}
      onClose={() => { syncCookAlong(null); setState(null); }}
    />
  );
}
