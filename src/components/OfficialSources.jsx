import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import Knowledge from "./Knowledge.jsx";

// Official Anthony William sources — the app points here for anything
// protocol-specific (compliance rails: link only official AW sources, never
// generated URLs). Previously the Learn tab's Recipes + Resources sections;
// the Learn tab itself only ever held a placeholder article.
const RECIPE_LINKS = [
  { label: "Recipes", emoji: "🍽", url: "https://www.medicalmedium.com/medical-medium-categories/recipes", desc: "Anthony William's official recipe collection" },
  { label: "Juices & smoothies", emoji: "🥤", url: "https://www.medicalmedium.com/medical-medium-categories/juices", desc: "Official juice, smoothie, and healing water recipes" },
];

export default function OfficialSources() {
  return (
    <Card>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 4 }}>
        📚 Official sources
      </div>
      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 14 }}>
        For anything about protocols, recipes or amounts, go straight to Anthony William's own books and channels.
        CelerySync is independent and not affiliated with Anthony William or Medical Medium.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {RECIPE_LINKS.map((l) => (
          <a
            key={l.url}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 14px", borderRadius: 14,
              background: C.mist, textDecoration: "none",
            }}
          >
            <span style={{ fontSize: 22, flexShrink: 0 }}>{l.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>{l.label}</div>
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>{l.desc}</div>
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, color: C.sage, letterSpacing: 0.4, textTransform: "uppercase" }}>
              Official ↗
            </span>
          </a>
        ))}
      </div>
      <Knowledge />
    </Card>
  );
}
