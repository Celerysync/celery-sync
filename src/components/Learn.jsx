import { useState } from "react";
import ReactMarkdown from "react-markdown";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { ARTICLES_BY_CATEGORY } from "../lib/learnContent.js";
import Knowledge from "./Knowledge.jsx";

const MARKDOWN_COMPONENTS = {
  h2: ({ children }) => (
    <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginTop: 18, marginBottom: 8 }}>
      {children}
    </div>
  ),
  h3: ({ children }) => (
    <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13.5, color: C.sageDark, marginTop: 14, marginBottom: 6 }}>
      {children}
    </div>
  ),
  p: ({ children }) => (
    <p style={{ fontSize: 13.5, color: C.charcoal, lineHeight: 1.75, margin: "0 0 10px" }}>{children}</p>
  ),
  ul: ({ children }) => (
    <ul style={{ margin: "0 0 12px", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>{children}</ul>
  ),
  li: ({ children }) => (
    <li style={{ fontSize: 13.5, color: C.charcoal, lineHeight: 1.6 }}>{children}</li>
  ),
  strong: ({ children }) => <strong style={{ color: C.sageDark }}>{children}</strong>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: C.sage, fontWeight: 700 }}>{children}</a>
  ),
};

function ArticleCard({ article, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card style={{ border: open ? `1.5px solid ${C.sage}` : `1.5px solid ${C.border}` }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          width: "100%", background: "none", border: "none",
          cursor: "pointer", padding: 0, textAlign: "left",
        }}
      >
        <span style={{ fontSize: 26, flexShrink: 0 }}>{article.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14.5, color: C.charcoal }}>
            {article.title}
          </div>
        </div>
        <span style={{ fontSize: 14, color: C.muted, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 16, maxWidth: 640 }}>
          <ReactMarkdown components={MARKDOWN_COMPONENTS}>{article.content}</ReactMarkdown>
        </div>
      )}
    </Card>
  );
}

const RECIPE_LINKS = [
  { label: "Recipes", emoji: "🍽", url: "https://www.medicalmedium.com/medical-medium-categories/recipes", desc: "Anthony William's official recipe collection" },
  { label: "Juices & smoothies", emoji: "🥤", url: "https://www.medicalmedium.com/medical-medium-categories/juices", desc: "Official juice, smoothie, and healing water recipes" },
];


const SECTIONS = [
  { id: "articles",   label: "📖 Learn"      },
  { id: "recipes",    label: "🍽 Recipes"     },
  { id: "resources",  label: "🔗 Resources"   },
];

export default function Learn({ authUser, user, navQuery }) {
  const [section, setSection] = useState("articles");
  const categories = Object.entries(ARTICLES_BY_CATEGORY);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: "Georgia,serif", fontSize: 22, color: C.charcoal }}>
          🌱 Understand Your Healing
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: C.mid, fontFamily: "Georgia,serif" }}>
          CelerySync teaches general wellness mechanics in our own words. For Medical Medium protocols, always go to the official sources.
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
          CelerySync is an independent app — not affiliated with, endorsed by, or connected to Anthony William or Medical Medium LLC.
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 10.5, color: C.muted, lineHeight: 1.6 }}>
          If you're in crisis, please reach out:{" "}
          <a href="tel:131114" style={{ color: C.mid, fontWeight: 700 }}>Lifeline 13 11 14</a>
          {" · "}
          <a href="tel:1300224636" style={{ color: C.mid, fontWeight: 700 }}>Beyond Blue 1300 22 4636</a>
          {" · "}
          <a href="tel:000" style={{ color: C.mid, fontWeight: 700 }}>Emergency 000</a>
        </p>
      </div>

      {/* Section tabs — scrollable row */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            style={{
              flexShrink: 0, padding: "8px 14px", borderRadius: 30, border: "none",
              background: section === s.id ? C.sage : C.mist,
              fontFamily: "Georgia,serif", fontSize: 12.5,
              color: section === s.id ? "#fff" : C.muted,
              fontWeight: section === s.id ? 700 : 400,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Articles — original content, grouped by category */}
      {section === "articles" && (
        <>
          {categories.length === 0 ? (
            <div style={{ fontSize: 13, color: C.muted, textAlign: "center", padding: "20px 0" }}>
              No articles yet — add markdown files to src/content/learn/.
            </div>
          ) : (
            categories.map(([category, articles]) => (
              <div key={category}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.sage, textTransform: "uppercase", letterSpacing: 0.6, margin: "4px 0 8px" }}>
                  {category}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {articles.map((article, i) => (
                    <ArticleCard key={article.slug} article={article} defaultOpen={categories.length === 1 && i === 0} />
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {section === "recipes" && (
        <>
          <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.6 }}>
            We don't reproduce Anthony William's specific recipes here — his full collection lives at the official source, linked below.
          </div>
          {RECIPE_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "14px 16px", borderRadius: 14,
                background: C.white, border: `1.5px solid ${C.sage}50`,
                borderLeftWidth: 4, borderLeftColor: C.sage,
                textDecoration: "none",
              }}
            >
              <span style={{ fontSize: 24, flexShrink: 0 }}>{l.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>{l.label}</div>
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>{l.desc}</div>
              </div>
              <span style={{
                fontSize: 9, fontWeight: 700, color: C.sage, letterSpacing: 0.4,
                textTransform: "uppercase", flexShrink: 0, whiteSpace: "nowrap",
              }}>
                Official ↗
              </span>
            </a>
          ))}
        </>
      )}

      {section === "resources" && (
        <Knowledge authUser={authUser} />
      )}
    </div>
  );
}
