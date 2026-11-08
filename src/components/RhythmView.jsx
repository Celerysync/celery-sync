import { useState } from "react";
import C, { alpha } from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { stepEmoji } from "../lib/stepEmoji.js";

function formatTime(ms) {
  return new Date(ms).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" });
}

function fmtDiff(ms) {
  const mins = Math.round(ms / 60_000);
  if (Math.abs(mins) < 60) return `${Math.abs(mins)}min`;
  const h = Math.floor(Math.abs(mins) / 60);
  const m = Math.abs(mins) % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

const CATEGORY_COLORS = {
  morning: C.leaf,
  supplement: C.sage,
  food: C.gold,
  medicine: C.plum,
  other: C.mid,
};

export default function RhythmView({
  sequence,
  anchorTime,
  hasMedicine,
  activeProgram,
  currentProgramDay,
  onComplete,
  onUncomplete,
  onEdit,
  lastFinishedProgram,
  onAnotherRound,
  onDismissFinished,
  takenWith = {},
  onTickTakenWith,
  onOpenRecipe,
  recipeFor = () => null,
  plannedLoose = [],
  // One clear door per job: onOpen("add" | "step" | "order" | "saved" | "wake" | "programs", itemId)
  onOpen = null,
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const open = (level, itemId) => { setMoreOpen(false); if (onOpen) onOpen(level, itemId); else onEdit?.(); };
  const [offerFor, setOfferFor] = useState(null); // step just ticked that has supplements with it
  const [offerError, setOfferError] = useState("");
  const linkedTo = (item) => takenWith[item.baseItemId ?? item.id] || [];

  // Only empty when there are no items. Items with their own time (or none)
  // don't need a wake anchor — useRhythm's calculateSequence handles both —
  // and onboarding never asks for one, so gating on it hid every new user's
  // freshly entered rhythm behind "Your daily rhythm is empty".
  if (sequence.length === 0) {
    return (
      <Card style={{ textAlign: "center", padding: "28px 20px" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🌿</div>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16, color: C.charcoal, marginBottom: 8 }}>
          Your daily rhythm is empty
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
          Add what you do each day, in your own words, and it will show here.
        </div>
        <button
          onClick={() => open("add")}
          style={{
            background: C.sageDark, color: C.white, border: "none",
            borderRadius: 30, padding: "12px 24px",
            fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15,
            cursor: "pointer",
          }}
        >
          + Add my first step
        </button>
        {onOpen && (
          <div style={{ marginTop: 12 }}>
            <button onClick={() => open("programs")} style={{ background: "none", border: "none", color: C.plum, fontFamily: "Georgia,serif", fontSize: 14, textDecoration: "underline", cursor: "pointer" }}>
              Or start a program (a cleanse) →
            </button>
          </div>
        )}
      </Card>
    );
  }

  const now = Date.now();

  // Find the current position in the sequence
  const currentIdx = sequence.findIndex((item) => {
    if (item.completedAt) return false;
    return item.scheduledMs == null || item.scheduledMs >= now;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* A program just finished: offer the same again */}
      {!activeProgram && lastFinishedProgram && (
        <div style={{
          background: `linear-gradient(135deg,${alpha(C.plum, "22")},${C.plumLight})`,
          border: `1.5px solid ${alpha(C.plum, "40")}`,
          borderRadius: 14, padding: "12px 16px",
        }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.plum }}>
            ✨ You finished {lastFinishedProgram.name}
          </div>
          <div style={{ fontSize: 13, color: C.plum, marginTop: 4 }}>
            Would you like to do another round, starting today?
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button onClick={onAnotherRound} style={{
              padding: "9px 16px", borderRadius: 30, border: "none", background: C.plum, color: C.white,
              fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}>
              Do another round
            </button>
            <button onClick={onDismissFinished} style={{
              padding: "9px 16px", borderRadius: 30, border: `1.5px solid ${alpha(C.plum, "50")}`, background: "transparent",
              color: C.plum, fontFamily: "Georgia,serif", fontSize: 14, cursor: "pointer",
            }}>
              Not now
            </button>
          </div>
        </div>
      )}

      {/* Program progress banner */}
      {activeProgram && currentProgramDay !== null && (
        <div style={{
          background: `linear-gradient(135deg,${alpha(C.plum, "22")},${C.plumLight})`,
          border: `1.5px solid ${alpha(C.plum, "40")}`,
          borderRadius: 14, padding: "12px 16px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.plum }}>
                ✨ {activeProgram.name}
              </div>
              <div style={{ fontSize: 12, color: C.plum, opacity: 0.8, marginTop: 2 }}>
                Day {currentProgramDay} of {activeProgram.totalDays}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ width: 80, height: 6, background: `${alpha(C.plum, "30")}`, borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  width: `${(currentProgramDay / activeProgram.totalDays) * 100}%`,
                  height: "100%", background: C.plum, borderRadius: 3,
                  transition: "width 0.3s",
                }} />
              </div>
              <div style={{ fontSize: 12, color: C.plum, marginTop: 4 }}>
                {activeProgram.totalDays - currentProgramDay} days remaining
              </div>
            </div>
          </div>
          {onOpen && (
            <button onClick={() => open("programs")} style={{
              marginTop: 10, background: "none", border: `1.5px solid ${alpha(C.plum, "50")}`, color: C.plum,
              borderRadius: 30, padding: "7px 14px", fontFamily: "Georgia,serif", fontSize: 13, cursor: "pointer",
            }}>
              See this program, or end it
            </button>
          )}
        </div>
      )}

      {/* Prescription medicine notice */}
      {hasMedicine && (
        <div style={{
          background: `${alpha(C.plum, "12")}`,
          border: `1.5px solid ${alpha(C.plum, "40")}`,
          borderRadius: 14, padding: "10px 14px",
          display: "flex", alignItems: "flex-start", gap: 10,
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>⚕️</span>
          <div style={{ fontSize: 12, color: C.plum, lineHeight: 1.6 }}>
            <strong>You have prescribed medicines in your rhythm.</strong> Please confirm timing and any interactions with your doctor or pharmacist.
          </div>
        </div>
      )}

      {/* Sequence header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal }}>
          🗓 Today's Rhythm
        </div>
        {onOpen ? (
          <div style={{ display: "flex", gap: 6, position: "relative" }}>
            <button onClick={() => open("add")} style={{
              background: C.sageDark, color: C.white, border: "none", borderRadius: 20, padding: "8px 14px",
              fontSize: 14, fontFamily: "Georgia,serif", fontWeight: 700, cursor: "pointer",
            }}>
              + Add
            </button>
            <button onClick={() => setMoreOpen((o) => !o)} aria-expanded={moreOpen} aria-label="More options for your rhythm" style={{
              background: "none", border: `1.5px solid ${C.border}`, borderRadius: 20, padding: "8px 12px",
              fontSize: 14, color: C.mid, cursor: "pointer",
            }}>
              ⋯ More
            </button>
            {moreOpen && (
              <div role="menu" style={{
                position: "absolute", top: "110%", right: 0, zIndex: 20, background: C.surface,
                border: `1.5px solid ${C.border}`, borderRadius: 14, boxShadow: "0 8px 24px #1e2a1e22",
                padding: 6, minWidth: 230, display: "flex", flexDirection: "column",
              }}>
                {[
                  ["order", "↕  Change the order of steps"],
                  ["saved", "📅  My saved days"],
                  ["wake", "⏰  My usual wake time"],
                  ["programs", "✨  Programs (cleanses)"],
                ].map(([level, label]) => (
                  <button key={level} role="menuitem" onClick={() => open(level)} style={{
                    textAlign: "left", background: "none", border: "none", padding: "12px 12px", fontSize: 15,
                    fontFamily: "Georgia,serif", color: C.charcoal, cursor: "pointer", borderRadius: 10,
                  }}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onEdit}
            style={{
              background: "none", border: `1.5px solid ${C.border}`,
              borderRadius: 20, padding: "8px 16px",
              fontSize: 13, color: C.mid, cursor: "pointer",
            }}
          >
            Edit
          </button>
        )}
      </div>
      {onOpen && (
        <div style={{ fontSize: 12, color: C.muted, marginTop: -4 }}>Tick a step when it's done. Tap its name to change it.</div>
      )}

      {/* Anchor time display */}
      {anchorTime && (
        <div style={{ fontSize: 12, color: C.muted }}>
          ⏰ Wake time: <strong style={{ color: C.sageDark }}>{new Date(`2000-01-01T${anchorTime}`).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}</strong>
        </div>
      )}

      {/* Sequence items */}
      {sequence.map((item, idx) => {
        const isDone = !!item.completedAt;
        const isNext = idx === currentIdx && !isDone;
        const isPast = item.scheduledMs != null && item.scheduledMs < now && !isDone;
        const expanded = expandedId === item.id;
        const catColor = CATEGORY_COLORS[item.category] || C.mid;
        const isMed = item.isMedicine;

        let statusLabel = "";
        let statusColor = C.muted;
        if (isDone) {
          statusLabel = `Done · ${new Date(item.completedAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}`;
          statusColor = C.sage;
        } else if (isNext) {
          statusLabel = item.scheduledMs != null ? `Up next · ${formatTime(item.scheduledMs)}` : "Up next";
          statusColor = C.leaf;
        } else if (isPast) {
          // Never "overdue": many people here are unwell, and a missed time
          // isn't a failing. It simply happened earlier in the day.
          statusLabel = `Earlier · ${formatTime(item.scheduledMs)}`;
          statusColor = C.muted;
        } else if (item.waitingFor) {
          statusLabel = `After ${item.waitingFor}`;
          statusColor = C.muted;
        } else if (item.scheduledMs != null) {
          const minsTillScheduled = Math.round((item.scheduledMs - now) / 60_000);
          statusLabel = minsTillScheduled > 0
            ? `${formatTime(item.scheduledMs)} · in ${fmtDiff(item.scheduledMs - now)}`
            : formatTime(item.scheduledMs);
          statusColor = C.muted;
        }

        return (
          <div key={item.id}>
            {/* "Now" marker */}
            {isNext && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                marginBottom: 4, paddingLeft: 2,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.leaf, flexShrink: 0 }} />
                <div style={{ flex: 1, height: 1, background: `${alpha(C.leaf, "60")}` }} />
                <div style={{ fontSize: 12, color: C.leaf, fontWeight: 700, letterSpacing: 0.5 }}>UP NEXT</div>
                <div style={{ flex: 1, height: 1, background: `${alpha(C.leaf, "60")}` }} />
              </div>
            )}

            <div
              style={{
                background: isNext ? C.sageLight : isDone ? C.mist : C.surface,
                border: `1.5px solid ${isNext ? C.sage : C.border}${isDone ? "80" : ""}`,
                borderRadius: 14,
                padding: "12px 14px",
                opacity: isDone && offerFor !== item.id ? 0.6 : 1,
                transition: "all 0.2s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* Check button */}
                <button
                  onClick={() => {
                    if (isDone) { onUncomplete(item.id); return; }
                    onComplete(item.id);
                    if (linkedTo(item).length) { setOfferFor(item.id); setOfferError(""); }
                  }}
                  aria-label={isDone ? `Mark ${item.name} as not done` : `Mark ${item.name} as done`}
                  style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    border: `2px solid ${isDone ? C.sage : isNext ? C.sage : C.border}`,
                    background: isDone ? C.sage : "transparent",
                    color: C.white, fontWeight: 700, fontSize: 13,
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    touchAction: "manipulation",
                  }}
                >
                  {isDone ? "✓" : ""}
                </button>

                {/* Emoji + name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 18 }} aria-hidden="true">{stepEmoji(item)}</span>
                    {onOpen ? (
                      <button
                        onClick={() => (item.programId ? open("programs") : open("step", item.baseItemId ?? item.id))}
                        aria-label={`Change ${item.name}`}
                        style={{
                          background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer",
                          fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal,
                          textDecoration: isDone ? "line-through" : "none",
                        }}
                      >
                        {item.name}
                      </button>
                    ) : (
                      <span style={{
                        fontFamily: "Georgia,serif", fontWeight: 700,
                        fontSize: 14, color: C.charcoal,
                        textDecoration: isDone ? "line-through" : "none",
                      }}>
                        {item.name}
                      </span>
                    )}
                    {isMed && (
                      <span style={{
                        fontSize: 11, background: `${alpha(C.plum, "20")}`, color: C.plum,
                        borderRadius: 20, padding: "1px 6px", fontWeight: 700,
                      }}>Rx</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: statusColor, marginTop: 2, fontWeight: isDone || isNext ? 700 : 400 }}>
                    {statusLabel}
                  </div>
                  {recipeFor(item.id)?.planned && recipeFor(item.id).recipeName && (
                    <div style={{ fontSize: 12, color: C.mid, marginTop: 2 }}>
                      🍽 {recipeFor(item.id).recipeName}
                    </div>
                  )}
                  {linkedTo(item).length > 0 && (
                    <div style={{ fontSize: 12, color: C.mid, marginTop: 2 }}>
                      💊 with {linkedTo(item).map((s) => s.name).join(", ")}
                    </div>
                  )}
                </div>

                {/* Category dot + expand */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: catColor }} />
                  {recipeFor(item.id) && onOpenRecipe && (
                    <button
                      onClick={() => onOpenRecipe(recipeFor(item.id).recipeId)}
                      aria-label={`Open the recipe for ${item.name}`}
                      style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: 2, lineHeight: 1 }}
                    >
                      📖
                    </button>
                  )}
                  {item.note && (
                    <button
                      onClick={() => setExpandedId(expanded ? null : item.id)}
                      style={{
                        background: "none", border: "none", color: C.muted,
                        fontSize: 12, cursor: "pointer", padding: 0,
                      }}
                    >
                      {expanded ? "▲" : "▼"}
                    </button>
                  )}
                </div>
              </div>

              {offerFor === item.id && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 13, color: C.charcoal }}>
                    Did you have {linkedTo(item).map((s) => s.name).join(" and ")} with it?
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={async () => {
                        try { await onTickTakenWith?.(linkedTo(item)); setOfferFor(null); }
                        catch { setOfferError("That didn't save. Please try again."); }
                      }}
                      style={{ padding: "8px 14px", borderRadius: 30, border: "none", background: C.sage, color: C.white, fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                    >
                      Tick {linkedTo(item).length > 1 ? "them" : "it"} too
                    </button>
                    <button
                      onClick={() => setOfferFor(null)}
                      style={{ padding: "8px 14px", borderRadius: 30, border: `1.5px solid ${C.border}`, background: "transparent", color: C.mid, fontFamily: "Georgia,serif", fontSize: 14, cursor: "pointer" }}
                    >
                      Not now
                    </button>
                  </div>
                  {offerError && <div role="alert" style={{ fontSize: 13, color: C.terracotta, marginTop: 6 }}>{offerError}</div>}
                </div>
              )}

              {/* Expanded detail */}
              {expanded && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                  {item.note && (
                    <div style={{ fontSize: 12, color: C.charcoal, lineHeight: 1.5 }}>
                      {item.note}
                    </div>
                  )}
                  {item.durationType === "days" && item.durationDays && item.startDate && (() => {
                    const start = new Date(item.startDate + "T00:00:00");
                    const today = new Date();
                    const dayOn = Math.floor((today - start) / 86_400_000) + 1;
                    return (
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                        Day {dayOn} of {item.durationDays}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {onOpen && !activeProgram && (
        <button onClick={() => open("programs")} style={{
          background: "none", border: `1.5px dashed ${alpha(C.plum, "60")}`, color: C.plum, borderRadius: 14,
          padding: "12px", fontFamily: "Georgia,serif", fontSize: 15, cursor: "pointer",
        }}>
          ✨ Start a program (a cleanse or protocol)
        </button>
      )}

      {plannedLoose.length > 0 && (
        <div style={{ fontSize: 13, color: C.mid, background: C.mist, borderRadius: 12, padding: "8px 12px", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <span>🍽 Planned today:</span>
          {plannedLoose.map((p) => (
            <button key={p.id} onClick={() => onOpenRecipe?.(p.recipeId)} style={{ background: "none", border: "none", padding: 0, color: C.sageDark, fontSize: 13, fontFamily: "Georgia,serif", textDecoration: "underline", cursor: "pointer" }}>
              📖 {p.label}
            </button>
          ))}
        </div>
      )}

      {/* All done banner */}
      {sequence.length > 0 && sequence.every((i) => i.completedAt) && (
        <div style={{
          background: `linear-gradient(135deg,${C.leaf},${C.sage})`,
          borderRadius: 16, padding: "16px", color: C.white, textAlign: "center",
        }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>✨</div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16 }}>
            Rhythm complete today!
          </div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
            Every step done. Nicely done.
          </div>
        </div>
      )}
    </div>
  );
}
