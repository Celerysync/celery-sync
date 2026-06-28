import { useState } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { JUICES, SHOTS, getCoreProtocol, CATEGORY_ORDER } from "../data/juices.js";

const TYPE_BADGE = {
  juice: { label: "Juice", color: "#4a7c5e" },
  smoothie: { label: "Smoothie", color: "#5a6e9e" },
  shot: { label: "Shot", color: "#8b5e3c" },
  water: { label: "Water", color: "#4a7c7c" },
};

const DIFFICULTY_DOT = { Easy: C.sage, Medium: C.gold };

function IngredientRow({ ing }) {
  return (
    <div style={{
      display: "flex",
      gap: 10,
      padding: "7px 0",
      borderBottom: `1px solid ${C.border}40`,
      alignItems: "flex-start",
    }}>
      <span style={{ color: C.sage, fontSize: 14, flexShrink: 0, marginTop: 1 }}>•</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: C.charcoal, fontWeight: 600 }}>
          {ing.item}
          {ing.amount && (
            <span style={{ fontWeight: 400, color: C.mid }}> — {ing.amount}</span>
          )}
        </div>
        {ing.note && (
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>
            {ing.note}
          </div>
        )}
      </div>
    </div>
  );
}

function JuiceCard({ item, isCore = false }) {
  const [expanded, setExpanded] = useState(false);
  const badge = TYPE_BADGE[item.type] ?? TYPE_BADGE.juice;

  return (
    <div style={{
      background: C.white,
      border: `1.5px solid ${expanded ? C.sage : isCore ? C.sage + "60" : C.border}`,
      borderRadius: 16,
      overflow: "hidden",
      transition: "border-color 0.2s",
      boxShadow: isCore ? `0 2px 8px ${C.sage}20` : "none",
    }}>
      {/* Header */}
      <div
        style={{ padding: "12px 14px", cursor: "pointer" }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 24 }}>{item.emoji}</span>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>
                    {item.name}
                  </span>
                  <span style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 20,
                    background: badge.color + "22",
                    color: badge.color,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  }}>
                    {badge.label}
                  </span>
                  {isCore && (
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 20,
                      background: C.gold + "33",
                      color: C.gold,
                      letterSpacing: 0.5,
                    }}>
                      ⭐ Core
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  {item.size} · {item.timing}
                </div>
              </div>
            </div>

            {/* Good for chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
              {item.goodFor.slice(0, 4).map((g) => (
                <span key={g} style={{
                  fontSize: 10,
                  padding: "2px 8px",
                  borderRadius: 20,
                  background: C.sageLight,
                  color: C.sageDark,
                }}>
                  {g}
                </span>
              ))}
              {item.goodFor.length > 4 && (
                <span style={{ fontSize: 10, color: C.muted, padding: "2px 4px" }}>
                  +{item.goodFor.length - 4} more
                </span>
              )}
            </div>
          </div>

          <span style={{ fontSize: 12, color: C.muted, marginLeft: 8, marginTop: 2 }}>
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: "0 14px 16px", borderTop: `1px solid ${C.border}` }}>
          {/* Prep info row */}
          <div style={{
            display: "flex",
            gap: 12,
            padding: "10px 0 12px",
            fontSize: 12,
            color: C.mid,
            flexWrap: "wrap",
          }}>
            <span>⏱ {item.prepTime}</span>
            <span>📏 {item.size}</span>
            {item.difficulty && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: DIFFICULTY_DOT[item.difficulty] || C.border,
                  display: "inline-block",
                }} />
                {item.difficulty}
              </span>
            )}
          </div>

          {/* Ingredients */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.charcoal, marginBottom: 6 }}>
              Ingredients
            </div>
            {item.ingredients.map((ing, i) => (
              <IngredientRow key={i} ing={ing} />
            ))}
          </div>

          {/* Steps */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.charcoal, marginBottom: 8 }}>
              How to make it
            </div>
            {item.steps.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "5px 0", fontSize: 13, color: C.charcoal, lineHeight: 1.55 }}>
                <span style={{
                  flexShrink: 0, width: 20, height: 20,
                  background: C.sage, color: C.white, borderRadius: "50%",
                  fontSize: 11, display: "flex", alignItems: "center",
                  justifyContent: "center", fontWeight: 700, marginTop: 1,
                }}>
                  {i + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>

          {/* Why */}
          <div style={{
            background: "#f0f7f0",
            border: `1px solid ${C.sage}40`,
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 10,
            fontSize: 12.5,
            color: C.mid,
            lineHeight: 1.65,
          }}>
            <div style={{ fontWeight: 700, color: C.sageDark, marginBottom: 4, fontSize: 12 }}>
              🌿 Why this works
            </div>
            {item.why}
          </div>

          {/* MM Note */}
          <div style={{
            background: C.mist,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 10,
            fontSize: 12.5,
            color: C.mid,
            lineHeight: 1.65,
            fontStyle: "italic",
          }}>
            💛 <strong style={{ fontStyle: "normal", color: C.charcoal }}>MM Note:</strong> {item.mmNote}
          </div>

          {/* Book reference */}
          <div style={{ fontSize: 11, color: C.sage, fontWeight: 600 }}>
            📚 Anthony William · <em>{item.book}</em>
          </div>
        </div>
      )}
    </div>
  );
}

function MorningProtocolFlow() {
  const core = getCoreProtocol();
  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.sageDark}15, ${C.leaf}10)`,
      border: `1.5px solid ${C.sage}50`,
      borderRadius: 16,
      padding: "14px 16px",
      marginBottom: 4,
    }}>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.sageDark, marginBottom: 10 }}>
        ⭐ Morning Protocol Sequence
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "nowrap", overflowX: "auto", paddingBottom: 4 }}>
        {core.map((item, i) => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <div style={{
              background: C.white,
              border: `1.5px solid ${C.sage}60`,
              borderRadius: 12,
              padding: "8px 12px",
              textAlign: "center",
              minWidth: 90,
            }}>
              <div style={{ fontSize: 24 }}>{item.emoji}</div>
              <div style={{ fontSize: 10.5, fontFamily: "Georgia,serif", color: C.sageDark, marginTop: 3, fontWeight: 600, lineHeight: 1.2 }}>
                {item.name}
              </div>
              <div style={{ fontSize: 9.5, color: C.muted, marginTop: 2 }}>
                {item.size}
              </div>
            </div>
            {i < core.length - 1 && (
              <div style={{
                fontSize: 16,
                color: C.sage,
                padding: "0 6px",
                flexShrink: 0,
              }}>→</div>
            )}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
        Wait 15–30 min between each. All on an empty stomach. This sequence, done daily, is the foundation of Medical Medium healing.
      </div>
    </div>
  );
}

export default function Juices() {
  const [filter, setFilter] = useState("all"); // all | juice | shot | smoothie | water

  const ALL_ITEMS = [...JUICES, ...SHOTS];

  const FILTER_TABS = [
    { id: "all", label: "All", count: ALL_ITEMS.length },
    { id: "juice", label: "Juices", count: ALL_ITEMS.filter((j) => j.type === "juice").length },
    { id: "smoothie", label: "Smoothies", count: ALL_ITEMS.filter((j) => j.type === "smoothie").length },
    { id: "shot", label: "Shots", count: ALL_ITEMS.filter((j) => j.type === "shot").length },
    { id: "water", label: "Waters", count: ALL_ITEMS.filter((j) => j.type === "water").length },
  ];

  const filtered = filter === "all" ? ALL_ITEMS : ALL_ITEMS.filter((j) => j.type === filter);

  // Group by category for display
  const byCategory = filtered.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  // Sort categories
  const sortedCategories = Object.keys(byCategory).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: "Georgia,serif", fontSize: 20, color: C.charcoal }}>
          🥬 Juices, Shots & Waters
        </h2>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
          Based on Anthony William's publicly shared teachings
        </div>
      </div>

      {/* Public teachings note */}
      <div style={{
        background: C.sageLight,
        border: `1px solid ${C.sage}40`,
        borderRadius: 12,
        padding: "10px 12px",
        fontSize: 12,
        color: C.sageDark,
        lineHeight: 1.5,
      }}>
        📖 All content is paraphrased and attributed to Anthony William's publicly shared YouTube, podcast, and medicalmedium.com teachings. See the <strong>Resources</strong> tab for links to his official books and channels.
      </div>

      {/* Morning protocol sequence */}
      <MorningProtocolFlow />

      {/* Type filter */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
        {FILTER_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            style={{
              flexShrink: 0,
              padding: "7px 14px",
              borderRadius: 20,
              border: `1.5px solid ${filter === t.id ? C.sageDark : C.border}`,
              background: filter === t.id ? C.sageLight : "transparent",
              color: filter === t.id ? C.sageDark : C.mid,
              fontSize: 12,
              fontFamily: "Georgia,serif",
              cursor: "pointer",
              fontWeight: filter === t.id ? 700 : 400,
            }}
          >
            {t.label}
            <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>({t.count})</span>
          </button>
        ))}
      </div>

      {/* Cards grouped by category */}
      {sortedCategories.map((cat) => (
        <div key={cat}>
          <div style={{
            fontFamily: "Georgia,serif",
            fontWeight: 700,
            fontSize: 13,
            color: C.sageDark,
            marginBottom: 8,
            paddingBottom: 6,
            borderBottom: `1px solid ${C.border}`,
          }}>
            {cat === "Morning Protocol" ? "🌅" :
             cat.includes("Shot") ? "⚡" :
             cat.includes("Cleanse") ? "🌿" :
             cat.includes("Calming") ? "🍃" :
             "🥬"} {cat}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {byCategory[cat].map((item) => (
              <JuiceCard
                key={item.id}
                item={item}
                isCore={item.isCore ?? false}
              />
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", color: C.muted, padding: "30px 0", fontSize: 13 }}>
          No items match that filter.
        </div>
      )}
    </div>
  );
}
