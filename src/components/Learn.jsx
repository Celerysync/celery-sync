import { useState } from "react";
import C from "../lib/colors.js";
import { Card, Btn } from "./ui.jsx";
import { WEEKLY_LESSONS, CONDITION_EXPLAINERS, SHAREABLES } from "../data/learn.js";
import Knowledge from "./Knowledge.jsx";

const RECIPE_LINKS = [
  { label: "Recipes", emoji: "🍽", url: "https://www.medicalmedium.com/blog/recipes", desc: "Anthony William's official recipe collection" },
  { label: "Juices & smoothies", emoji: "🥤", url: "https://www.medicalmedium.com/blog/juices-and-smoothies", desc: "Official juice, smoothie, and healing water recipes" },
];

function LessonCard({ lesson, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card style={{ border: open ? `1.5px solid ${C.sage}` : `1.5px solid ${C.border}` }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "flex-start", gap: 12,
          width: "100%", background: "none", border: "none",
          cursor: "pointer", padding: 0, textAlign: "left",
        }}
      >
        <span style={{ fontSize: 28, flexShrink: 0 }}>{lesson.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: C.sage, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 }}>
            Week {lesson.week} · {lesson.duration}
          </div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 4 }}>
            {lesson.title}
          </div>
          <div style={{ fontSize: 12.5, color: C.mid, lineHeight: 1.5 }}>
            {lesson.summary}
          </div>
        </div>
        <span style={{ fontSize: 14, color: C.muted, flexShrink: 0, marginTop: 2 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
          <MarkdownBody text={lesson.body} />
          <div style={{
            marginTop: 16,
            padding: "12px 14px",
            background: C.sageLight,
            borderRadius: 12,
            border: `1px solid ${C.sage}40`,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.sageDark, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>
              Key takeaway
            </div>
            <div style={{ fontSize: 13, color: C.sageDark, lineHeight: 1.6, fontFamily: "Georgia,serif" }}>
              {lesson.keyTakeaway}
            </div>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 10, fontStyle: "italic" }}>
            📚 {lesson.bookRef}
          </div>
        </div>
      )}
    </Card>
  );
}

function ExplainerCard({ id, explainer }) {
  const [open, setOpen] = useState(false);

  const share = () => {
    const text = `${explainer.headline}\n\n${explainer.body.slice(0, 300)}…\n\nRead more in the CelerySync app`;
    if (navigator.share) {
      navigator.share({ title: id, text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text).catch(() => {});
    }
  };

  return (
    <Card style={{ border: open ? `1.5px solid ${C.plum}30` : `1.5px solid ${C.border}` }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "flex-start", gap: 12,
          width: "100%", background: "none", border: "none",
          cursor: "pointer", padding: 0, textAlign: "left",
        }}
      >
        <span style={{ fontSize: 24, flexShrink: 0 }}>{explainer.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 3 }}>
            {id}
          </div>
          <div style={{ fontSize: 12.5, color: C.mid, lineHeight: 1.4, fontStyle: "italic" }}>
            {explainer.headline}
          </div>
        </div>
        <span style={{ fontSize: 14, color: C.muted, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
          <MarkdownBody text={explainer.body} />
          <div style={{ fontSize: 11, color: C.muted, marginTop: 12, fontStyle: "italic" }}>
            📚 {explainer.bookRef}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button
              onClick={share}
              style={{
                padding: "6px 14px", borderRadius: 20,
                border: `1.5px solid ${C.plum}50`,
                background: C.plumLight, color: C.plum,
                fontSize: 12, cursor: "pointer", fontFamily: "Georgia,serif",
              }}
            >
              📤 Share this
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

function ShareableCard({ id, item }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const text = `${item.title}\n\n${item.content}`;
    if (navigator.share) {
      navigator.share({ title: item.title, text }).catch(() => {});
    } else {
      await navigator.clipboard?.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <Card style={{ background: `${C.sage}08`, border: `1.5px solid ${C.sage}30` }}>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 3 }}>
        {item.title}
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
        {item.subtitle}
      </div>
      <div style={{
        fontSize: 13, color: C.charcoal, lineHeight: 1.75,
        background: C.white, borderRadius: 10, padding: "12px 14px",
        border: `1px solid ${C.border}`, marginBottom: 12,
        whiteSpace: "pre-wrap",
      }}>
        {item.content}
      </div>
      <Btn full color={C.sage} onClick={share}>
        {copied ? "✓ Copied to clipboard" : "📤 Share this explanation"}
      </Btn>
    </Card>
  );
}

function MarkdownBody({ text }) {
  const parts = text.split(/\n\n+/);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {parts.map((block, i) => {
        if (block.startsWith("**") && block.endsWith("**") && !block.slice(2).includes("**")) {
          return (
            <div key={i} style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13.5, color: C.charcoal, marginTop: 6 }}>
              {block.slice(2, -2)}
            </div>
          );
        }
        const lines = block.split("\n").map((line, j) => {
          if (line.startsWith("• ") || line.startsWith("🫐 ") || line.startsWith("🌿 ") ||
              line.startsWith("🟢 ") || line.startsWith("🟤 ") || line.startsWith("🍌 ") ||
              line.startsWith("🚫 ") || line.startsWith("⚔️ ") || line.startsWith("🧠 ") ||
              line.startsWith("🦠 ") || line.startsWith("💧 ")) {
            const isBold = line.includes("**");
            const cleaned = line.replace(/\*\*(.*?)\*\*/g, "$1");
            return (
              <div key={j} style={{ display: "flex", gap: 8, fontSize: 13, color: C.charcoal, lineHeight: 1.6 }}>
                <span style={{ flexShrink: 0 }}>{cleaned.split(" ")[0]}</span>
                <span>{cleaned.split(" ").slice(1).join(" ")}</span>
              </div>
            );
          }
          const withBold = line.replace(/\*\*(.*?)\*\*/g, (_, m) => `<strong>${m}</strong>`);
          return (
            <span key={j} style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.7 }}
              dangerouslySetInnerHTML={{ __html: withBold }} />
          );
        });
        if (block.startsWith("**")) {
          const heading = block.match(/\*\*(.*?)\*\*/)?.[1];
          const rest = block.replace(/^\*\*.*?\*\*\n?/, "");
          return (
            <div key={i}>
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13.5, color: C.charcoal, marginBottom: 4, marginTop: 6 }}>
                {heading}
              </div>
              {rest && <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: rest.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />}
            </div>
          );
        }
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {lines}
          </div>
        );
      })}
    </div>
  );
}

const SECTIONS = [
  { id: "lessons",    label: "📖 Learn"      },
  { id: "conditions", label: "🔍 Understand"  },
  { id: "share",      label: "📤 Share"       },
  { id: "recipes",    label: "🍽 Recipes"     },
  { id: "resources",  label: "🔗 Resources"   },
];

export default function Learn({ authUser, user, navQuery }) {
  const [section, setSection] = useState("lessons");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 style={{ margin: 0, fontFamily: "Georgia,serif", fontSize: 22, color: C.charcoal }}>
          🌱 Understand Your Healing
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: C.mid, fontFamily: "Georgia,serif" }}>
          Plain-English explanations from Anthony William's public teachings
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

      {/* Weekly lessons */}
      {section === "lessons" && (
        <>
          <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.6 }}>
            Short reads that explain the <em>why</em> behind the core MM protocols — one lesson per week as you build your healing routine.
          </div>
          {WEEKLY_LESSONS.map((lesson) => (
            <LessonCard key={lesson.week} lesson={lesson} defaultOpen={lesson.week === 1} />
          ))}
          <div style={{
            padding: "12px 14px", background: C.sageLight,
            borderRadius: 12, fontSize: 12.5, color: C.sageDark, lineHeight: 1.6,
          }}>
            📖 All content is paraphrased from Anthony William's publicly available teachings. Not medical advice. Always work with your healthcare provider.
          </div>
        </>
      )}

      {/* Condition explainers */}
      {section === "conditions" && (
        <>
          <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.6 }}>
            Plain-English explanations of what's actually happening in common conditions — and how Anthony William approaches them.
          </div>
          {Object.entries(CONDITION_EXPLAINERS).map(([id, explainer]) => (
            <ExplainerCard key={id} id={id} explainer={explainer} />
          ))}
          <div style={{
            padding: "12px 14px", background: C.sageLight,
            borderRadius: 12, fontSize: 12.5, color: C.sageDark, lineHeight: 1.6,
          }}>
            📖 Paraphrased from Anthony William's publicly available teachings. Not medical advice.
          </div>
        </>
      )}

      {/* Shareables */}
      {section === "share" && (
        <>
          <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.6 }}>
            Clean, jargon-free explanations you can share with someone curious or sceptical — family, friends, a GP. Tap share to send or copy.
          </div>
          {Object.entries(SHAREABLES).map(([id, item]) => (
            <ShareableCard key={id} id={id} item={item} />
          ))}
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
                textDecoration: "none",
              }}
            >
              <span style={{ fontSize: 24, flexShrink: 0 }}>{l.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>{l.label}</div>
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 1 }}>{l.desc}</div>
              </div>
              <span style={{ fontSize: 11, color: C.sage, fontWeight: 700, flexShrink: 0 }}>Official ↗</span>
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
