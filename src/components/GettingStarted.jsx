import { useEffect, useState } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { useWebPush } from "../hooks/useWebPush.js";
import { useHumeVoiceOrchestrator } from "../context/HumeVoiceContext.jsx";
import { useCompanionNamed } from "../context/VoiceContext.jsx";

const key = (pid) => `cs_getting_started_${pid}`;
const read = (pid) => { try { return JSON.parse(localStorage.getItem(key(pid)) || "{}"); } catch { return {}; } };
const write = (pid, v) => { try { localStorage.setItem(key(pid), JSON.stringify(v)); } catch { /* ignore */ } };
const NEW_FOR_DAYS = 30;

// A short list on Today for someone new: one thing at a time, each with a
// "Show me". Items tick themselves when done. Goes away when all are done,
// or when they say they've got it.
export default function GettingStarted({
  profileId, user, authUser, hasVoice,
  stepsCount, doneToday, hasCheckin, supplementsCount, recipesCount,
  onAddStep, onShowCheckin, onOpenSupplements, onOpenKitchen,
}) {
  const [saved, setSaved] = useState(() => read(profileId));
  const { supported: pushSupported, subscribed, subscribe } = useWebPush(authUser);
  const companion = useHumeVoiceOrchestrator();
  const named = useCompanionNamed();

  // Remember things they've done once (a tick, a check-in), so the item stays
  // done on later days.
  useEffect(() => {
    const next = { ...saved };
    let changed = false;
    if (doneToday > 0 && !next.ticked) { next.ticked = true; changed = true; }
    if (hasCheckin && !next.checkin) { next.checkin = true; changed = true; }
    if (changed) { setSaved(next); write(profileId, next); }
  }, [doneToday, hasCheckin]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch) => { const next = { ...saved, ...patch }; setSaved(next); write(profileId, next); };

  const createdAt = user?.created_at ? Date.parse(user.created_at) : Date.now();
  const isNew = Date.now() - createdAt < NEW_FOR_DAYS * 86_400_000;
  if (!profileId || !isNew || saved.dismissed) return null;

  const items = [
    { id: "steps", label: "Add your daily steps", done: stepsCount > 0, action: "Add a step", onClick: onAddStep },
    { id: "tick", label: "Tick off a step when you've done it", done: !!saved.ticked, hint: "Tap the box next to a step on your list below." },
    { id: "checkin", label: "Tell us how you're feeling today", done: !!saved.checkin, action: "Show me", onClick: onShowCheckin },
    { id: "supps", label: "Add your supplements", done: supplementsCount > 0 || !!saved.noSupps, action: "Add them", onClick: onOpenSupplements, skip: () => set({ noSupps: true }) },
    ...(pushSupported ? [{ id: "remind", label: "Turn on gentle reminders", done: subscribed, action: "Turn on", onClick: () => subscribe().catch(() => {}) }] : []),
    { id: "recipe", label: "Save one of your recipes in the Kitchen", done: recipesCount > 0 || !!saved.noRecipe, action: "Go to Kitchen", onClick: onOpenKitchen, skip: () => set({ noRecipe: true }) },
    ...(hasVoice ? [{ id: "fern", label: named ? `Try talking to ${named}, your helper` : "Try talking to your AI helper", done: !!saved.fern, action: "Try it", hint: "For example, say: \"I've had my celery juice\"", onClick: () => { set({ fern: true }); companion.openSheet?.(); } }] : []),
  ];
  const doneCount = items.filter((i) => i.done).length;
  if (doneCount === items.length) return null;
  const next = items.find((i) => !i.done);

  return (
    <Card style={{ border: `2px solid ${C.sage}`, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 18, color: C.charcoal }}>👋 Getting started</div>
        <div style={{ fontSize: 14, color: C.mid }}>{doneCount} of {items.length} done</div>
      </div>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={doneCount} aria-label="Getting started progress"
        style={{ height: 6, borderRadius: 3, background: C.mist, margin: "10px 0 12px", overflow: "hidden" }}>
        <div style={{ width: `${(doneCount / items.length) * 100}%`, height: "100%", background: C.sage, borderRadius: 3 }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((it) => {
          const isNext = it === next;
          return (
            <div key={it.id} style={{
              display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 10px", borderRadius: 12,
              background: isNext ? C.sageLight : "transparent",
            }}>
              <span aria-hidden="true" style={{
                width: 24, height: 24, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                border: `2px solid ${it.done ? C.sage : C.border}`, background: it.done ? C.sage : "transparent",
                color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
              }}>{it.done ? "✓" : ""}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, color: it.done ? C.muted : C.charcoal, textDecoration: it.done ? "line-through" : "none", fontWeight: isNext ? 700 : 400 }}>
                  {it.label}
                </div>
                {isNext && it.hint && <div style={{ fontSize: 14, color: C.mid, marginTop: 2 }}>{it.hint}</div>}
                {isNext && (it.onClick || it.skip) && (
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    {it.onClick && (
                      <button onClick={it.onClick} style={{ padding: "9px 16px", borderRadius: 30, border: "none", background: C.sageDark, color: "#fff", fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                        {it.action}
                      </button>
                    )}
                    {it.skip && (
                      <button onClick={it.skip} style={{ padding: "9px 14px", borderRadius: 30, border: `1.5px solid ${C.border}`, background: "transparent", color: C.mid, fontFamily: "Georgia,serif", fontSize: 14, cursor: "pointer" }}>
                        Not for me
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={() => set({ dismissed: true })} style={{ marginTop: 8, background: "none", border: "none", color: C.mid, fontFamily: "Georgia,serif", fontSize: 14, textDecoration: "underline", cursor: "pointer", padding: "4px 0" }}>
        I've got it, hide this
      </button>
    </Card>
  );
}
