import { useState } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import InstallCard from "./InstallCard.jsx";
import { useInstallPrompt } from "../hooks/useInstallPrompt.js";

// A re-findable "how do I…" surface. Onboarding covers this once, but these
// users are specifically the people who will not remember it and will not go
// hunting — so it lives permanently in Settings, collapsed, scannable, with
// one concrete action per row rather than prose.
const TIPS = [
  {
    emoji: "⏰",
    title: "Put a time on the things you want reminding about",
    body: "Open My Rhythm, edit any item, and choose “At a set time”. That item will then nudge you at that time every day. Items left on “After previous step” just sit in order on your Rhythm screen — they won't chase you.",
  },
  {
    emoji: "🎙",
    title: "Talk to it instead of tapping",
    body: "The companion button is on every screen. You can say things like “just finished my juice” and it ticks off — or “add magnesium at 9pm” and it's on your rhythm. On a foggy day this is the easiest way to use the whole app.",
  },
  {
    emoji: "📋",
    title: "Let it do the remembering",
    body: "Everything you tick, say, or log builds your own history. Progress shows your streaks and what's been consistent — useful on days when it doesn't feel like anything is happening, and something concrete to take to your doctor.",
  },
  {
    emoji: "💜",
    title: "Add someone who helps you",
    body: "If a partner, parent, or friend supports your days, invite them as a carer in Settings. They get a simple view of how you're going, so you don't have to keep explaining it.",
  },
  {
    emoji: "🔋",
    title: "On a bad day, do one thing",
    body: "One tick still counts — the “showed up” streak only needs a single item a day, not a perfect one. The app is built so a hard day doesn't wipe out your progress.",
  },
];

export default function GettingTheMostCard() {
  // Open until it has been read once. Collapsed-by-default meant nobody ever
  // found it — nothing in the app links here, so a new user would have had to
  // open Settings and guess. After the first read it stays shut and out of
  // the way.
  const [seen, setSeen] = useState(() => localStorage.getItem("cs_guide_seen") === "1");
  const [open, setOpen] = useState(() => localStorage.getItem("cs_guide_seen") !== "1");
  const { shouldOfferInstall } = useInstallPrompt();

  const toggle = () => {
    setOpen((v) => {
      if (v && !seen) {
        localStorage.setItem("cs_guide_seen", "1");
        setSeen(true);
      }
      return !v;
    });
  };

  return (
    <Card>
      <button
        onClick={toggle}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: 0, textAlign: "left",
        }}
      >
        <div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal }}>
            💡 Getting the most out of CelerySync
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
            Short guide — worth a look on a clearer day
          </div>
        </div>
        <span style={{ fontSize: 16, color: C.muted }}>{open ? "▼" : "▶"}</span>
      </button>

      {open && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
          {shouldOfferInstall && <InstallCard compact />}

          {TIPS.map((tip) => (
            <div key={tip.title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{tip.emoji}</span>
              <div>
                <div style={{
                  fontFamily: "Georgia,serif", fontWeight: 700,
                  fontSize: 13, color: C.charcoal, marginBottom: 3,
                }}>
                  {tip.title}
                </div>
                <div style={{ fontSize: 12.5, color: C.mid, lineHeight: 1.65 }}>
                  {tip.body}
                </div>
              </div>
            </div>
          ))}

          <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6, paddingTop: 2 }}>
            Not sure about something? Ask the companion — it knows how the app works and
            can take you to the right screen.
          </div>
        </div>
      )}
    </Card>
  );
}
