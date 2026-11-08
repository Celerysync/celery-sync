import { useEffect, useRef, useState } from "react";
import C from "../lib/colors.js";
import { formatTimer, stepTimerSeconds } from "../lib/kitchen.js";

// Cook mode, for any recipe (meals, juices, smoothies): big text, one step at a
// time, the screen kept on, and a timer when a step mentions a time.
export default function CookMode({ recipe, onClose }) {
  const steps = recipe.steps || [];
  // Page 0 is the ingredients, then one page per step.
  const [page, setPage] = useState(0);
  const [timerLeft, setTimerLeft] = useState(null);
  const [timerDone, setTimerDone] = useState(false);
  const wakeLock = useRef(null);
  const total = steps.length + 1;
  const step = page > 0 ? steps[page - 1] : null;
  const stepSecs = step ? stepTimerSeconds(step) : null;

  useEffect(() => {
    let released = false;
    const keepAwake = async () => {
      try {
        if (document.visibilityState === "visible" && "wakeLock" in navigator) {
          wakeLock.current = await navigator.wakeLock.request("screen");
        }
      } catch { /* not supported or refused: cooking still works */ }
    };
    keepAwake();
    const onVisible = () => { if (!released) keepAwake(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      wakeLock.current?.release?.().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (timerLeft == null || timerLeft <= 0) return;
    const t = setTimeout(() => {
      const next = timerLeft - 1;
      setTimerLeft(next);
      if (next === 0) {
        setTimerDone(true);
        navigator.vibrate?.([300, 150, 300, 150, 300]);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [timerLeft]);

  const go = (n) => { setPage(Math.max(0, Math.min(total - 1, n))); setTimerLeft(null); setTimerDone(false); };

  return (
    <div role="dialog" aria-label={`Cooking ${recipe.name}`} style={{
      position: "fixed", inset: 0, zIndex: 80, background: C.cream,
      display: "flex", flexDirection: "column", padding: "18px 18px calc(18px + env(safe-area-inset-bottom, 0px))",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 18, color: C.charcoal }}>{recipe.name}</div>
        <button onClick={onClose} style={{ background: "none", border: `1.5px solid ${C.border}`, borderRadius: 30, padding: "8px 16px", fontSize: 15, color: C.mid, cursor: "pointer" }}>
          Done
        </button>
      </div>
      <div style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>
        {page === 0 ? "Ingredients" : `Step ${page} of ${steps.length}`}
      </div>

      <div style={{ flex: 1, overflowY: "auto", marginTop: 16 }}>
        {page === 0 ? (
          <ul style={{ margin: 0, paddingLeft: 22, fontSize: 24, lineHeight: 1.6, color: C.charcoal, fontFamily: "Georgia,serif" }}>
            {(recipe.ingredients || []).map((i, n) => <li key={n}>{i.text}</li>)}
            {!recipe.ingredients?.length && <li style={{ listStyle: "none", color: C.muted }}>No ingredients saved.</li>}
          </ul>
        ) : (
          <div style={{ fontSize: 28, lineHeight: 1.5, color: C.charcoal, fontFamily: "Georgia,serif" }}>{step}</div>
        )}

        {stepSecs && (
          <div style={{ marginTop: 24 }}>
            {timerLeft == null ? (
              <button onClick={() => { setTimerLeft(stepSecs); setTimerDone(false); }} style={{
                padding: "14px 22px", borderRadius: 30, border: "none", background: C.sageDark, color: C.white,
                fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 18, cursor: "pointer",
              }}>
                ⏱ Start {formatTimer(stepSecs)} timer
              </button>
            ) : (
              <div role="timer" aria-live="polite" style={{ fontSize: 44, fontWeight: 700, color: timerDone ? C.sage : C.charcoal, fontFamily: "Georgia,serif" }}>
                {timerDone ? "⏰ Time's up" : formatTimer(timerLeft)}
                <button onClick={() => { setTimerLeft(null); setTimerDone(false); }} style={{ marginLeft: 14, fontSize: 15, background: "none", border: `1.5px solid ${C.border}`, borderRadius: 30, padding: "6px 12px", cursor: "pointer", color: C.mid }}>
                  {timerDone ? "OK" : "Stop"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button onClick={() => go(page - 1)} disabled={page === 0} style={{
          flex: 1, padding: "18px 0", borderRadius: 16, border: `2px solid ${C.border}`, background: C.surface,
          fontSize: 18, fontFamily: "Georgia,serif", color: page === 0 ? C.muted : C.charcoal, cursor: page === 0 ? "default" : "pointer",
        }}>
          ← Back
        </button>
        {page < total - 1 ? (
          <button onClick={() => go(page + 1)} style={{
            flex: 2, padding: "18px 0", borderRadius: 16, border: "none", background: C.sageDark, color: C.white,
            fontSize: 20, fontWeight: 700, fontFamily: "Georgia,serif", cursor: "pointer",
          }}>
            {page === 0 ? (steps.length ? "Start →" : "Close") : "Next →"}
          </button>
        ) : (
          <button onClick={onClose} style={{
            flex: 2, padding: "18px 0", borderRadius: 16, border: "none", background: C.sage, color: C.white,
            fontSize: 20, fontWeight: 700, fontFamily: "Georgia,serif", cursor: "pointer",
          }}>
            Finished ✓
          </button>
        )}
      </div>
    </div>
  );
}
