import { useState } from "react";
import C, { alpha } from "../lib/colors.js";
import Account from "./Account.jsx";
import ReminderSettings from "./ReminderSettings.jsx";
import CompanionVoiceSettings from "./CompanionVoiceSettings.jsx";
import ProfileManager from "./ProfileManager.jsx";
import CarerInviteManager from "./CarerInviteManager.jsx";
import CarerView from "./CarerView.jsx";
import OfficialSources from "./OfficialSources.jsx";
import GettingTheMostCard from "./GettingTheMostCard.jsx";
import PractitionerPortal from "./PractitionerPortal.jsx";

// Settings, ordered by how often people actually reach for things: the
// everyday controls first (reminders, voice, who you're looking after),
// comfort next, then people, plan, preferences, devices, help, and the
// account housekeeping last. The section ids are destinations the voice
// companion can take people to (lib/voiceTabContext.js) — keep them stable.

const JUMPS = [
  ["section-reminders", "⏰ Reminders"],
  ["section-voice", "🎙 Voice"],
  ["section-display", "🌙 Display"],
  ["section-people", "💜 People"],
  ["section-plan", "✨ Plan"],
  ["section-help", "📚 Help"],
];

function Group({ id, label, children }) {
  return (
    <section id={id} style={{ scrollMarginTop: 80, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{
        fontSize: 11.5, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase",
        color: C.muted, fontFamily: "Georgia,serif", padding: "10px 4px 0",
      }}>
        {label}
      </div>
      {children}
    </section>
  );
}

// For things set once and rarely touched again — kept to one line until opened.
function Folded({ title, hint, startOpen = false, children }) {
  const [open, setOpen] = useState(startOpen);
  if (open) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {children}
        <button onClick={() => setOpen(false)} style={linkStyle}>Hide</button>
      </div>
    );
  }
  return (
    <button
      onClick={() => setOpen(true)}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
        background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 16,
        padding: "14px 16px", cursor: "pointer", fontFamily: "Georgia,serif", color: C.charcoal,
      }}
    >
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontWeight: 700, fontSize: 15 }}>{title}</span>
        {hint && <span style={{ display: "block", fontSize: 12.5, color: C.muted, marginTop: 2 }}>{hint}</span>}
      </span>
      <span style={{ fontSize: 18, color: C.muted }}>›</span>
    </button>
  );
}

const linkStyle = {
  alignSelf: "center", background: "none", border: "none", cursor: "pointer",
  fontSize: 13, color: C.muted, textDecoration: "underline", fontFamily: "Georgia,serif",
};

export default function SettingsPage({
  accountProps, isRhythm, isSubscribed, isPractitioner, authUser, activeProfileId,
  profiles, onSwitchProfile, onCreateProfile, onUpdateProfile, onDeleteProfile, onReplayWelcome, section,
}) {
  // Sent here for the sources ("take me to the books") — open them, don't make people hunt.
  const openSources = section === "sources";
  const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Quick jumps — the page is long, nobody should have to scroll to find a thing */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {JUMPS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => jump(id)}
            style={{
              padding: "8px 13px", borderRadius: 20, cursor: "pointer",
              border: `1.5px solid ${alpha(C.sage, "55")}`, background: C.surface,
              fontFamily: "Georgia,serif", fontSize: 13, color: C.sageDark,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <Group id="section-everyday" label="Everyday">
        <div id="section-reminders" style={{ scrollMarginTop: 80 }}><ReminderSettings authUser={authUser} /></div>
        <div id="section-voice" style={{ scrollMarginTop: 80 }}><CompanionVoiceSettings authUser={authUser} isRhythm={isRhythm} /></div>
        <div id="section-profiles" style={{ scrollMarginTop: 80 }}>
          <ProfileManager
            profiles={profiles}
            activeProfileId={activeProfileId}
            onSwitch={onSwitchProfile}
            onCreate={onCreateProfile}
            onUpdate={onUpdateProfile}
            onDelete={onDeleteProfile}
          />
        </div>
      </Group>

      <Group id="section-display" label="Comfort">
        <Account {...accountProps} part="display" />
      </Group>

      <Group id="section-people" label="People who help">
        {activeProfileId && (
          <div id="section-carers" style={{ scrollMarginTop: 80 }}>
            <CarerInviteManager authUser={authUser} profileId={activeProfileId} />
          </div>
        )}
        <CarerView authUser={authUser} />
        <Account {...accountProps} part="people" />
      </Group>

      <Group id="section-plan" label="Your plan">
        <Account {...accountProps} part="plan" />
        {isPractitioner && <PractitionerPortal authUser={authUser} />}
      </Group>

      <Group id="section-preferences" label="Preferences">
        <Account {...accountProps} part="preferences" />
      </Group>

      {isSubscribed && (
        <Group id="section-devices" label="Devices">
          <Folded title="💓 Connect a wearable" hint="Optional — Oura, Apple Health, Garmin and more">
            <Account {...accountProps} part="devices" />
          </Folded>
        </Group>
      )}

      <Group id="section-help" label="Help & official sources">
        <Folded title="💡 Tips for getting the most out of CelerySync" hint="Five small things that make the biggest difference">
          <GettingTheMostCard />
        </Folded>
        {onReplayWelcome && (
          <button
            onClick={onReplayWelcome}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
              background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 16,
              padding: "14px 16px", cursor: "pointer", fontFamily: "Georgia,serif", color: C.charcoal,
            }}
          >
            <span style={{ flex: 1, fontWeight: 700, fontSize: 15 }}>🎙 Replay the welcome tour</span>
            <span style={{ fontSize: 18, color: C.muted }}>›</span>
          </button>
        )}
        <div id="section-sources" style={{ scrollMarginTop: 80 }}>
          <Folded title="📚 Official Anthony William sources" hint="His books, website, podcast and recipes" startOpen={openSources}>
            <OfficialSources />
          </Folded>
        </div>
      </Group>

      <Group id="section-account" label="Account">
        <Account {...accountProps} part="account" />
      </Group>
    </div>
  );
}
