import { useState } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";

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
}) {
  const [expandedId, setExpandedId] = useState(null);

  if (!anchorTime || sequence.length === 0) {
    return (
      <Card style={{ textAlign: "center", padding: "28px 20px" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🌿</div>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16, color: C.charcoal, marginBottom: 8 }}>
          Your daily rhythm is empty
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
          Set up your daily rhythm to see today's sequence here — one anchor time, and the app maps out your whole day.
        </div>
        <button
          onClick={onEdit}
          style={{
            background: C.sageDark, color: C.white, border: "none",
            borderRadius: 30, padding: "10px 22px",
            fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14,
            cursor: "pointer",
          }}
        >
          Set up my rhythm →
        </button>
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
      {/* Program progress banner */}
      {activeProgram && currentProgramDay !== null && (
        <div style={{
          background: `linear-gradient(135deg,${C.plum}22,${C.plumLight})`,
          border: `1.5px solid ${C.plum}40`,
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
              <div style={{ width: 80, height: 6, background: `${C.plum}30`, borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  width: `${(currentProgramDay / activeProgram.totalDays) * 100}%`,
                  height: "100%", background: C.plum, borderRadius: 3,
                  transition: "width 0.3s",
                }} />
              </div>
              <div style={{ fontSize: 10, color: C.plum, marginTop: 4 }}>
                {activeProgram.totalDays - currentProgramDay} days remaining
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prescription medicine notice */}
      {hasMedicine && (
        <div style={{
          background: `${C.plum}12`,
          border: `1.5px solid ${C.plum}40`,
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
        <button
          onClick={onEdit}
          style={{
            background: "none", border: `1.5px solid ${C.border}`,
            borderRadius: 20, padding: "4px 12px",
            fontSize: 11, color: C.mid, cursor: "pointer",
          }}
        >
          Edit
        </button>
      </div>

      {/* Anchor time display */}
      <div style={{ fontSize: 12, color: C.muted }}>
        ⏰ Wake anchor: <strong style={{ color: C.sageDark }}>{anchorTime}</strong>
      </div>

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
          statusLabel = item.scheduledMs != null ? `Now · ${formatTime(item.scheduledMs)}` : "Up next";
          statusColor = C.leaf;
        } else if (isPast) {
          statusLabel = `Overdue · ${formatTime(item.scheduledMs)}`;
          statusColor = C.gold;
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
                <div style={{ flex: 1, height: 1, background: `${C.leaf}60` }} />
                <div style={{ fontSize: 10, color: C.leaf, fontWeight: 700, letterSpacing: 0.5 }}>NOW</div>
                <div style={{ flex: 1, height: 1, background: `${C.leaf}60` }} />
              </div>
            )}

            <div
              style={{
                background: isNext ? C.sageLight : isDone ? "#f9f9f9" : C.white,
                border: `1.5px solid ${isNext ? C.sage : C.border}${isDone ? "80" : ""}`,
                borderRadius: 14,
                padding: "12px 14px",
                opacity: isDone ? 0.6 : 1,
                transition: "all 0.2s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* Check button */}
                <button
                  onClick={() => isDone ? onUncomplete(item.id) : onComplete(item.id)}
                  style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
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
                    <span style={{ fontSize: 16 }}>{item.emoji}</span>
                    <span style={{
                      fontFamily: "Georgia,serif", fontWeight: 700,
                      fontSize: 14, color: C.charcoal,
                      textDecoration: isDone ? "line-through" : "none",
                    }}>
                      {item.name}
                    </span>
                    {isMed && (
                      <span style={{
                        fontSize: 9, background: `${C.plum}20`, color: C.plum,
                        borderRadius: 20, padding: "1px 6px", fontWeight: 700,
                      }}>Rx</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: statusColor, marginTop: 2, fontWeight: isDone || isNext ? 700 : 400 }}>
                    {statusLabel}
                  </div>
                </div>

                {/* Category dot + expand */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: catColor }} />
                  {(item.awNote || item.note) && (
                    <button
                      onClick={() => setExpandedId(expanded ? null : item.id)}
                      style={{
                        background: "none", border: "none", color: C.muted,
                        fontSize: 11, cursor: "pointer", padding: 0,
                      }}
                    >
                      {expanded ? "▲" : "▼"}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded detail */}
              {expanded && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                  {item.awNote && (
                    <div style={{ fontSize: 12, color: C.mid, fontStyle: "italic", lineHeight: 1.6, marginBottom: 6 }}>
                      💛 {item.awNote}
                    </div>
                  )}
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
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
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
            Every step done. Your body is grateful.
          </div>
        </div>
      )}
    </div>
  );
}
