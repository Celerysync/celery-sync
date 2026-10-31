import { useState, lazy, Suspense } from "react";
import C from "../lib/colors.js";

const Coach = lazy(() => import("./Coach.jsx"));
const Symptom = lazy(() => import("./Symptom.jsx"));

// The Companion tab: the conversation, plus "How I feel" (moved here from the
// old Track tab — describing how you feel is a conversation, not a log).
// Whatever is shared in "How I feel" is handed to the conversation as page
// context, so switching back to Talk picks up right where they were.
const VIEWS = [
  { id: "talk", label: "💬 Talk" },
  { id: "feelings", label: "💚 How I feel" },
];

export default function CompanionTab({ section, navQuery, onPageContext, user, ...coachProps }) {
  const [view, setView] = useState(section === "feelings" ? "feelings" : "talk");

  // The companion (voice or text) can send people straight to a view —
  // follow a changed `section` prop during render (no effect round-trip).
  const [lastSection, setLastSection] = useState(section);
  if (section !== lastSection) {
    setLastSection(section);
    if (section === "feelings" || section === "talk") setView(section);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 8 }} id="section-talk">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 30,
              border: `2px solid ${view === v.id ? C.sage : C.border}`,
              background: view === v.id ? C.sageLight : "transparent",
              color: view === v.id ? C.sageDark : C.mid,
              fontFamily: "Georgia,serif", fontWeight: view === v.id ? 700 : 400,
              fontSize: 14, cursor: "pointer",
            }}
          >
            {v.label}
          </button>
        ))}
      </div>
      <Suspense fallback={<div style={{ textAlign: "center", padding: 32, color: C.muted }}>🌿</div>}>
        {view === "talk"
          ? <Coach user={user} {...coachProps} />
          : (
            <div id="section-feelings">
              <Symptom user={user} navQuery={navQuery} onPageContext={onPageContext} />
            </div>
          )}
      </Suspense>
    </div>
  );
}
