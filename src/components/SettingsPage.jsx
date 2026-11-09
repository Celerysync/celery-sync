import { useEffect, useState } from "react";
import C from "../lib/colors.js";
import Account from "./Account.jsx";
import ReminderSettings from "./ReminderSettings.jsx";
import CompanionVoiceSettings from "./CompanionVoiceSettings.jsx";
import ProfileManager from "./ProfileManager.jsx";
import CarerInviteManager from "./CarerInviteManager.jsx";
import CarerView from "./CarerView.jsx";
import OfficialSources from "./OfficialSources.jsx";
import GettingTheMostCard from "./GettingTheMostCard.jsx";
import PractitionerPortal from "./PractitionerPortal.jsx";
import { useCompanionName, useCompanionNamed } from "../context/VoiceContext.jsx";

// Settings is a short menu; each line opens its own page with a way back.
// The voice companion and links can open a page directly by its section id
// (lib/voiceTabContext.js SECTIONS.settings) — keep those ids working.
const SECTION_TO_PAGE = {
  reminders: "reminders", voice: "fern", profiles: "profiles", display: "display",
  carers: "people", plan: "plan", preferences: "preferences", devices: "devices",
  sources: "help", help: "help", account: "account",
};

function Row({ emoji, title, hint, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 14, width: "100%", textAlign: "left",
        background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 16,
        padding: "15px 16px", cursor: "pointer", fontFamily: "Georgia,serif", color: C.charcoal,
      }}
    >
      <span style={{ fontSize: 24, width: 30, textAlign: "center" }} aria-hidden="true">{emoji}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontWeight: 700, fontSize: 17 }}>{title}</span>
        {hint && <span style={{ display: "block", fontSize: 14, color: C.muted, marginTop: 2 }}>{hint}</span>}
      </span>
      <span style={{ fontSize: 22, color: C.muted }} aria-hidden="true">›</span>
    </button>
  );
}

function Folded({ title, hint, startOpen = false, children }) {
  const [open, setOpen] = useState(startOpen);
  if (open) return <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>;
  return <Row emoji="" title={title} hint={hint} onClick={() => setOpen(true)} />;
}

export default function SettingsPage({
  accountProps, isRhythm, isSubscribed, isPractitioner, authUser, activeProfileId,
  profiles, onSwitchProfile, onCreateProfile, onUpdateProfile, onDeleteProfile, onReplayWelcome, section,
}) {
  const fern = useCompanionName();
  const named = useCompanionNamed();
  const [page, setPage] = useState(SECTION_TO_PAGE[section] || null);
  // Sent here again for a different setting: open that one.
  const [seenSection, setSeenSection] = useState(section);
  if (seenSection !== section) { setSeenSection(section); setPage(SECTION_TO_PAGE[section] || null); }
  useEffect(() => { window.scrollTo(0, 0); document.querySelector("[data-scroll-root]")?.scrollTo?.(0, 0); }, [page]);

  const pages = [
    { id: "reminders", emoji: "⏰", title: "Reminders", hint: "Gentle nudges for your steps" },
    { id: "fern", emoji: "🎙", title: isRhythm ? "Voice" : named ? `${named} & voice` : "AI helper & voice", hint: isRhythm ? "Voice settings" : named ? `${named}'s voice, name, and voice minutes` : "Its voice, giving it a name, and voice minutes" },
    { id: "profiles", emoji: "👨‍👩‍👧", title: "Profiles", hint: "You, and anyone you look after" },
    { id: "display", emoji: "🌙", title: "Display & text size", hint: "Dark mode and bigger text" },
    { id: "people", emoji: "💜", title: "Carers", hint: "Let someone see how you're going" },
    { id: "plan", emoji: "✨", title: "My plan", hint: "Your plan and billing" },
    { id: "preferences", emoji: "🌍", title: "Language & units", hint: `The language ${fern} replies in` },
    ...(isSubscribed ? [{ id: "devices", emoji: "💓", title: "Wearables", hint: "Optional: Oura, Apple Health, Garmin and more" }] : []),
    { id: "help", emoji: "📚", title: "Help & official sources", hint: "Tips, the welcome tour, Anthony William's books" },
    { id: "account", emoji: "🔑", title: "Account", hint: "Sign out, your data, terms and privacy" },
  ];

  if (!page) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 22, color: C.charcoal, marginBottom: 4 }}>⚙️ Settings</div>
        {pages.map((p) => <Row key={p.id} emoji={p.emoji} title={p.title} hint={p.hint} onClick={() => setPage(p.id)} />)}
      </div>
    );
  }

  const current = pages.find((p) => p.id === page) || pages[0];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <button
        onClick={() => setPage(null)}
        style={{ alignSelf: "flex-start", background: "none", border: "none", color: C.sageDark, fontFamily: "Georgia,serif", fontSize: 16, fontWeight: 700, cursor: "pointer", padding: "4px 0" }}
      >
        ← Settings
      </button>
      <div id={`section-${page}`} style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 22, color: C.charcoal }}>
        {current.emoji} {current.title}
      </div>

      {page === "reminders" && <ReminderSettings authUser={authUser} />}
      {page === "fern" && <CompanionVoiceSettings authUser={authUser} isRhythm={isRhythm} />}
      {page === "profiles" && (
        <ProfileManager
          profiles={profiles}
          activeProfileId={activeProfileId}
          onSwitch={onSwitchProfile}
          onCreate={onCreateProfile}
          onUpdate={onUpdateProfile}
          onDelete={onDeleteProfile}
        />
      )}
      {page === "display" && <Account {...accountProps} part="display" />}
      {page === "people" && (
        <>
          {activeProfileId && <CarerInviteManager authUser={authUser} profileId={activeProfileId} />}
          <CarerView authUser={authUser} hideWhenEmpty />
          <Account {...accountProps} part="people" />
        </>
      )}
      {page === "plan" && (
        <>
          <Account {...accountProps} part="plan" />
          {isPractitioner && <PractitionerPortal authUser={authUser} />}
        </>
      )}
      {page === "preferences" && <Account {...accountProps} part="preferences" />}
      {page === "devices" && <Account {...accountProps} part="devices" />}
      {page === "help" && (
        <>
          <Folded title="💡 Tips for getting the most out of CelerySync" hint="Five small things that make the biggest difference">
            <GettingTheMostCard />
          </Folded>
          {onReplayWelcome && <Row emoji="🎙" title="Replay the welcome tour" onClick={onReplayWelcome} />}
          <div id="section-sources">
            <Folded title="📚 Official Anthony William sources" hint="His books, website, podcast and recipes" startOpen={section === "sources"}>
              <OfficialSources />
            </Folded>
          </div>
        </>
      )}
      {page === "account" && <Account {...accountProps} part="account" />}
    </div>
  );
}
