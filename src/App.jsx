import { useEffect, useState, lazy, Suspense } from "react";
import "./App.css";
import C from "./lib/colors.js";
import { useLocalStorage } from "./hooks/useLocalStorage.js";
import { useAuth } from "./hooks/useAuth.js";
import { useSubscription } from "./hooks/useSubscription.js";
import { useProfiles } from "./hooks/useProfiles.js";
import { useReminders } from "./hooks/useReminders.js";
import { useAnalytics } from "./hooks/useAnalytics.js";
import { VoiceProvider } from "./context/VoiceContext.jsx";
import { HumeVoiceProvider } from "./context/HumeVoiceContext.jsx";
import VoiceOrb from "./components/VoiceOrb.jsx";

// Always-loaded: auth and home are needed on every visit
import Auth from "./components/Auth.jsx";
import Home from "./components/Home.jsx";
import ReminderBanner from "./components/ReminderBanner.jsx";
import GlobalVoice from "./components/GlobalVoice.jsx";

// Lazy-loaded: only fetched when first needed
const Onboarding         = lazy(() => import("./components/Onboarding.jsx"));
const Account            = lazy(() => import("./components/Account.jsx"));
const ProfileManager     = lazy(() => import("./components/ProfileManager.jsx"));
const ReminderSettings   = lazy(() => import("./components/ReminderSettings.jsx"));
const WelcomeVoice       = lazy(() => import("./components/WelcomeVoice.jsx"));
const Coach              = lazy(() => import("./components/Coach.jsx"));
const TrackView          = lazy(() => import("./components/TrackView.jsx"));
const Learn              = lazy(() => import("./components/Learn.jsx"));
const Supplements        = lazy(() => import("./components/Supplements.jsx"));
const Reports            = lazy(() => import("./components/Reports.jsx"));
const AW                 = lazy(() => import("./components/AW.jsx"));
const CarerView          = lazy(() => import("./components/CarerView.jsx"));
const PractitionerPortal = lazy(() => import("./components/PractitionerPortal.jsx"));
const CaregiverDashboard = lazy(() => import("./components/CaregiverDashboard.jsx"));
const AdminDashboard     = lazy(() => import("./components/AdminDashboard.jsx"));
const DoctorReport       = lazy(() => import("./components/DoctorReport.jsx"));
const HealingLetters     = lazy(() => import("./components/HealingLetters.jsx"));
const CarerInviteManager = lazy(() => import("./components/CarerInviteManager.jsx"));
const BeginnerHome       = lazy(() => import("./components/BeginnerHome.jsx"));
const CompanionVoiceSettings = lazy(() => import("./components/CompanionVoiceSettings.jsx"));

const TABS = [
  { id: "home",        label: "Today",       emoji: "🏠", free: true  },
  { id: "companion",   label: "Companion",   emoji: "🎙", free: false },
  { id: "track",       label: "Track",       emoji: "📊", free: false },
  { id: "progress",    label: "Progress",    emoji: "📋", free: false },
  { id: "supplements", label: "Supplements", emoji: "💊", free: false },
  { id: "learn",       label: "Learn",       emoji: "🌱", free: false },
  { id: "settings",    label: "Settings",    emoji: "⚙️", free: true  },
  { id: "admin",       label: "Admin",       emoji: "📊", free: true, adminOnly: true },
];

// Map old tab IDs to new ones — handles existing localStorage values
const TAB_MIGRATIONS = {
  coach:     "companion",
  reports:   "progress",
  account:   "settings",
  journal:   "track",
  symptoms:  "track",
  recipes:   "learn",
  juices:    "learn",
  knowledge: "learn",
  cleanses:  "home",
  body:      "home",
  community: "home",
  carers:    "settings",
  practice:  "settings",
  aw:        "settings",
};

function LoadingScreen({ message = "Loading your healing journey…" }) {
  return (
    <div style={{
      minHeight: "100dvh",
      background: `linear-gradient(160deg,${C.sageDark} 0%,${C.leaf} 100%)`,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      color: C.white, gap: 16,
    }}>
      <div style={{ fontSize: 52 }}>🌿</div>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 22 }}>CelerySync</div>
      <div style={{ fontSize: 13, opacity: 0.7 }}>{message}</div>
    </div>
  );
}

function ProfileDropdown({ profiles, activeProfileId, onSwitch, onClose }) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 19 }}
      />
      {/* Dropdown */}
      <div style={{
        position: "absolute", top: "calc(100% + 8px)", right: 0,
        background: C.white, borderRadius: 16,
        boxShadow: "0 8px 32px #00000022",
        border: `1px solid ${C.border}`,
        zIndex: 20, minWidth: 200, overflow: "hidden",
      }}>
        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.muted, fontFamily: "Georgia,serif" }}>
          Switch profile
        </div>
        {profiles.map((p) => (
          <button
            key={p.id}
            onClick={() => { onSwitch(p.id); onClose(); }}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "11px 14px",
              background: p.id === activeProfileId ? C.sageLight : "transparent",
              border: "none", borderBottom: `1px solid ${C.border}40`,
              cursor: "pointer", textAlign: "left",
            }}
          >
            <span style={{ fontSize: 20 }}>{p.avatar_emoji}</span>
            <div>
              <div style={{ fontFamily: "Georgia,serif", fontWeight: p.id === activeProfileId ? 700 : 400, fontSize: 13, color: C.charcoal }}>
                {p.name}
              </div>
              {p.id === activeProfileId && (
                <div style={{ fontSize: 10, color: C.sage }}>● active</div>
              )}
            </div>
          </button>
        ))}
        <div style={{ padding: "10px 14px", fontSize: 11, color: C.muted, textAlign: "center", borderTop: `1px solid ${C.border}` }}>
          Manage profiles in Settings
        </div>
      </div>
    </>
  );
}

export default function App() {
  const { authUser, authLoading, signOut } = useAuth();
  const { isSubscribed, isPractitioner, subData, subLoading, refetch: refetchSub, isInTrial, trialDaysLeft } = useSubscription(authUser);
  const {
    profiles, activeProfile, activeProfileId,
    profilesLoading, loadProfiles,
    createProfile, updateProfile, deleteProfile, switchProfile,
  } = useProfiles(authUser);
  const [tab, setTab] = useLocalStorage("cs_tab", "home");
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [pageContext, setPageContext] = useState(null);
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem(`cs_welcomed_${authUser?.id}`));
  const [navQuery, setNavQuery] = useState(null);
  const [caregiverMode] = useLocalStorage("cs_caregiver", false);
  const [isBeginnerMode, setIsBeginnerMode] = useState(() => localStorage.getItem("cs_journey_type") === "beginner");
  const [justOnboarded, setJustOnboarded] = useState(null); // { name, firstItem } — one-time, not persisted

  const graduateToFullApp = () => {
    localStorage.setItem("cs_journey_type", "experienced");
    setIsBeginnerMode(false);
  };
  const [darkMode] = useLocalStorage("cs_darkMode", false);
  const [largeText] = useLocalStorage("cs_largeText", false);
  const { track } = useAnalytics(authUser);
  const isAdmin = authUser?.email === "allij@live.com.au";

  // Hume EVI rollout flag — default "legacy" so existing users see zero
  // behaviour change. Phase 1 of the rollout also gates on isAdmin so only
  // the admin account can opt in while the new stack is being validated,
  // even if the flag is somehow flipped elsewhere.
  const [voiceProvider] = useLocalStorage("cs_voiceProvider", "legacy");
  const humeEnabled = voiceProvider === "hume" && isAdmin;

  // Migrate old tab IDs saved in localStorage
  useEffect(() => {
    if (TAB_MIGRATIONS[tab]) setTab(TAB_MIGRATIONS[tab]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-dark", darkMode ? "true" : "false");
    document.documentElement.setAttribute("data-large", largeText ? "true" : "false");
  }, [darkMode, largeText]);

  // iOS audio unlock: prime AudioContext on first user touch so programmatic play() works
  useEffect(() => {
    const unlock = () => {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) { const ctx = new AC(); ctx.resume().then(() => ctx.close()); }
      } catch {}
      document.removeEventListener("touchstart", unlock);
    };
    document.addEventListener("touchstart", unlock, { once: true, passive: true });
    return () => document.removeEventListener("touchstart", unlock);
  }, []);

  const handleNavigate = (tabId, query) => {
    const resolved = TAB_MIGRATIONS[tabId] || tabId;
    setNavQuery(query || null);
    setTab(resolved);
  };
  const { activeReminder, dismiss: dismissReminder, snooze: snoozeReminder } = useReminders();

  // Load profiles once authenticated
  useEffect(() => {
    if (authUser) loadProfiles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  // Handle Stripe redirect back after checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("subscribed") === "true") {
      window.history.replaceState({}, "", "/");
      setTimeout(() => refetchSub(), 2500);
    }
    const returnTab = params.get("tab");
    if (returnTab) {
      setTab(TAB_MIGRATIONS[returnTab] || returnTab);
      window.history.replaceState({}, "", "/");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle carer invite acceptance via URL token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const carerToken = params.get("carer_token");
    if (!carerToken || !authUser?.id) return;
    window.history.replaceState({}, "", "/");
    fetch("/api/carers/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: authUser.id, token: carerToken }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) setTab("settings");
        else alert("This invite link has already been used or has expired.");
      })
      .catch(() => alert("Couldn't accept invite — please try again."));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  if (authLoading) return <LoadingScreen />;
  if (!authUser) return <Auth />;
  if (profilesLoading) return <LoadingScreen message="Loading your healing profiles…" />;

  // No profiles yet, or an existing profile never finished onboarding
  // (e.g. closed the app mid-flow) — onboarding_completed_at is the one
  // durable signal, replacing the old scattered localStorage flags.
  if (profiles.length === 0 || (activeProfile && !activeProfile.onboarding_completed_at)) {
    return (
      <VoiceProvider authUser={authUser}>
        <Suspense fallback={<LoadingScreen message="Setting up your journey…" />}>
          <Onboarding
            authUser={authUser}
            existingProfile={profiles.length === 0 ? null : activeProfile}
            createProfile={createProfile}
            switchProfile={switchProfile}
            updateProfile={updateProfile}
            onDone={({ name, firstItem }) => {
              localStorage.setItem(`cs_welcomed_${authUser.id}`, "1"); // skip the separate welcome tour — onboarding already covered it
              setShowWelcome(false);
              setJustOnboarded({ name, firstItem });
              setTab("companion");
            }}
          />
        </Suspense>
      </VoiceProvider>
    );
  }

  const handleTabClick = (t) => {
    if (!t.free && !isSubscribed && !subLoading) setTab("settings");
    else { setTab(t.id); track("tab_view", { tab: t.id }); }
  };

  const renderTab = () => {
    const effectiveTab = TAB_MIGRATIONS[tab] || tab;
    const current = TABS.find((t) => t.id === effectiveTab);
    if (current && !current.free && !isSubscribed && !subLoading) {
      return (
        <Account
          authUser={authUser}
          isSubscribed={isSubscribed}
          isPractitioner={isPractitioner}
          subData={subData}
          subLoading={subLoading}
          isInTrial={isInTrial}
          trialDaysLeft={trialDaysLeft}
          onSignOut={signOut}
        />
      );
    }

    switch (effectiveTab) {
      case "home":
        return caregiverMode
          ? <CaregiverDashboard patient={activeProfile} />
          : isBeginnerMode
          ? <BeginnerHome onGraduate={graduateToFullApp} onNavigate={setTab} />
          : <Home user={activeProfile} authUser={authUser} profileId={activeProfileId} />;

      case "companion":
        return <Coach authUser={authUser} user={activeProfile} profileId={activeProfileId} onNavigate={handleNavigate} caregiverMode={caregiverMode} units={localStorage.getItem('cs_units') === 'imperial' ? 'imperial' : 'metric'} pageContext={pageContext} justOnboarded={justOnboarded} onConsumedJustOnboarded={() => setJustOnboarded(null)} />;

      case "track":
        return <TrackView authUser={authUser} user={activeProfile} profileId={activeProfileId} navQuery={navQuery} onPageContext={setPageContext} />;

      case "progress":
        return <Reports authUser={authUser} profileId={activeProfileId} user={activeProfile} />;

      case "supplements":
        return <Supplements authUser={authUser} user={activeProfile} profileId={activeProfileId} />;

      case "learn":
        return <Learn authUser={authUser} user={activeProfile} navQuery={navQuery} />;

      case "settings":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Account
              authUser={authUser}
              isSubscribed={isSubscribed}
              isPractitioner={isPractitioner}
              subData={subData}
              subLoading={subLoading}
              isInTrial={isInTrial}
              trialDaysLeft={trialDaysLeft}
              onSignOut={signOut}
              onReplayWelcome={() => setShowWelcome(true)}
              profileId={activeProfileId}
            />
            <CompanionVoiceSettings authUser={authUser} />
            <ReminderSettings authUser={authUser} />
            <ProfileManager
              profiles={profiles}
              activeProfileId={activeProfileId}
              onSwitch={switchProfile}
              onCreate={createProfile}
              onUpdate={updateProfile}
              onDelete={deleteProfile}
            />
            {activeProfileId && (
              <>
                <CarerInviteManager authUser={authUser} profileId={activeProfileId} />
                <DoctorReport profileId={activeProfileId} />
                <HealingLetters profileId={activeProfileId} />
              </>
            )}
            <CarerView authUser={authUser} />
            {isPractitioner && <PractitionerPortal authUser={authUser} />}
            <AW onNavigate={handleNavigate} />
          </div>
        );

      case "admin":
        return isAdmin ? <AdminDashboard authUser={authUser} /> : null;

      default:
        return caregiverMode
          ? <CaregiverDashboard patient={activeProfile} />
          : isBeginnerMode
          ? <BeginnerHome onGraduate={graduateToFullApp} onNavigate={setTab} />
          : <Home user={activeProfile} authUser={authUser} profileId={activeProfileId} />;
    }
  };

  return (
    <VoiceProvider authUser={authUser}>
    <HumeVoiceProvider
      authUser={authUser}
      profileId={activeProfileId}
      tab={tab}
      enabled={humeEnabled}
      onSwitchTab={(tabId) => setTab(TAB_MIGRATIONS[tabId] || tabId)}
    >
    <div style={{ background: C.cream, minHeight: "100dvh" }}>
      {/* Sticky header */}
      <div style={{
        background: `linear-gradient(135deg,${C.sageDark},${C.leaf})`,
        paddingTop: "calc(14px + env(safe-area-inset-top, 0px))",
        paddingBottom: 12,
        paddingLeft: 18,
        paddingRight: 18,
        color: C.white,
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ fontSize: 24, flexShrink: 0 }}>🌿</div>
          <div style={{ minWidth: 0, flex: "0 0 auto" }}>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 17 }}>CelerySync</div>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {!subLoading && isSubscribed && (
              <div style={{
                background: "rgba(255,255,255,0.2)", borderRadius: 20,
                padding: "3px 10px", fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                whiteSpace: "nowrap",
              }}>
                {isPractitioner ? "🏥 Practitioner" : "✨ Healer"}
              </div>
            )}

            {/* Profile switcher */}
            {activeProfile && (
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setProfileDropdownOpen((v) => !v)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: "rgba(255,255,255,0.18)", borderRadius: 20,
                    padding: "5px 10px 5px 8px", border: "none", cursor: "pointer",
                    color: C.white, maxWidth: 160,
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{activeProfile.avatar_emoji}</span>
                  <span style={{
                    fontFamily: "Georgia,serif", fontSize: 12, fontWeight: 600,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {activeProfile.name}
                  </span>
                  {profiles.length > 1 && (
                    <span style={{ fontSize: 9, opacity: 0.8, flexShrink: 0 }}>▼</span>
                  )}
                </button>

                {profileDropdownOpen && profiles.length > 1 && (
                  <ProfileDropdown
                    profiles={profiles}
                    activeProfileId={activeProfileId}
                    onSwitch={switchProfile}
                    onClose={() => setProfileDropdownOpen(false)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reminder banners */}
      <ReminderBanner reminder={activeReminder} onDismiss={dismissReminder} onSnooze={snoozeReminder} />

      {/* Page content */}
      <div style={{ padding: "14px 14px calc(110px + env(safe-area-inset-bottom, 0px))", maxWidth: 680, margin: "0 auto" }}>
        <Suspense fallback={
          <div style={{ textAlign: "center", padding: 48, color: C.muted, fontFamily: "Georgia,serif" }}>
            🌿 Loading…
          </div>
        }>
          <div key={tab} className="cs-tab-content">
            {renderTab()}
          </div>
        </Suspense>
      </div>

      {/* Bottom nav */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: C.white, borderTop: `1px solid ${C.border}`,
        boxShadow: "0 -4px 24px #1e2a1e12",
        paddingBottom: "env(safe-area-inset-bottom, 6px)",
      }}>
        <div className="scrollbar-none" style={{ display: "flex", overflowX: "auto" }}>
          {TABS.filter(t => (!t.practitionerOnly || isPractitioner) && (!t.adminOnly || isAdmin)).map((t) => {
            const locked = !t.free && !isSubscribed && !subLoading;
            const active = (TAB_MIGRATIONS[tab] || tab) === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleTabClick(t)}
                style={{
                  flexShrink: 0, flex: "1 0 auto", minWidth: 46,
                  padding: "9px 4px 6px", border: "none", background: "none",
                  cursor: "pointer", display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 2, position: "relative",
                }}
              >
                <div style={{ fontSize: 18, position: "relative" }}>
                  {t.emoji}
                  {locked && (
                    <span style={{
                      position: "absolute", top: -4, right: -7, fontSize: 7,
                      background: C.gold, borderRadius: "50%",
                      width: 13, height: 13, display: "flex",
                      alignItems: "center", justifyContent: "center",
                      color: C.white,
                    }}>🔒</span>
                  )}
                </div>
                <div style={{
                  fontSize: 8.5, fontFamily: "Georgia,serif",
                  color: active ? C.sage : "#bbb",
                  fontWeight: active ? 700 : 400,
                }}>
                  {t.label}
                </div>
                {active && (
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.sage }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {showWelcome && (
        <Suspense fallback={null}>
          <WelcomeVoice
            userId={authUser?.id}
            onDone={() => setShowWelcome(false)}
            onNavigate={(tabId) => setTab(TAB_MIGRATIONS[tabId] || tabId)}
            humeEnabled={humeEnabled}
          />
        </Suspense>
      )}
      {humeEnabled ? <VoiceOrb /> : <GlobalVoice currentTab={tab} user={activeProfile} />}
    </div>
    </HumeVoiceProvider>
    </VoiceProvider>
  );
}
