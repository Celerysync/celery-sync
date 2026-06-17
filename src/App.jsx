import { useEffect, useState, lazy, Suspense } from "react";
import "./App.css";
import C from "./lib/colors.js";
import { useLocalStorage } from "./hooks/useLocalStorage.js";
import { useAuth } from "./hooks/useAuth.js";
import { useSubscription } from "./hooks/useSubscription.js";
import { useProfiles } from "./hooks/useProfiles.js";
import { useBooks } from "./hooks/useBooks.js";
import { useReminders } from "./hooks/useReminders.js";
import { useAnalytics } from "./hooks/useAnalytics.js";

// Always-loaded: auth, onboarding, home, account (needed immediately)
import Auth from "./components/Auth.jsx";
import Account from "./components/Account.jsx";
import ProfileManager from "./components/ProfileManager.jsx";
import Onboarding from "./components/Onboarding.jsx";
import Home from "./components/Home.jsx";
import ReminderBanner from "./components/ReminderBanner.jsx";
import ReminderSettings from "./components/ReminderSettings.jsx";
import WelcomeVoice from "./components/WelcomeVoice.jsx";

// Lazy-loaded: only fetched when the user first taps that tab
const Coach            = lazy(() => import("./components/Coach.jsx"));
const Journal          = lazy(() => import("./components/Journal.jsx"));
const Recipes          = lazy(() => import("./components/Recipes.jsx"));
const Cleanse          = lazy(() => import("./components/Cleanse.jsx"));
const Symptom          = lazy(() => import("./components/Symptom.jsx"));
const Knowledge        = lazy(() => import("./components/Knowledge.jsx"));
const Body             = lazy(() => import("./components/Body.jsx"));
const Community        = lazy(() => import("./components/Community.jsx"));
const PractitionerPortal = lazy(() => import("./components/PractitionerPortal.jsx"));
const AW               = lazy(() => import("./components/AW.jsx"));
const CaregiverDashboard = lazy(() => import("./components/CaregiverDashboard.jsx"));
const AdminDashboard   = lazy(() => import("./components/AdminDashboard.jsx"));

const TABS = [
  { id: "home",      label: "Today",      emoji: "🏠", free: true  },
  { id: "coach",     label: "AI Guide",   emoji: "🎙", free: false },
  { id: "journal",   label: "Journal",    emoji: "📊", free: false },
  { id: "recipes",   label: "Recipes",    emoji: "🍽", free: false },
  { id: "cleanses",  label: "Cleanses",   emoji: "🌿", free: false },
  { id: "symptoms",  label: "Symptoms",   emoji: "🔍", free: false },
  { id: "knowledge", label: "My Books",   emoji: "📖", free: false },
  { id: "body",      label: "The Body",   emoji: "🫁", free: false },
  { id: "community",    label: "Circles",   emoji: "💚", free: false },
  { id: "practice",    label: "Practice",  emoji: "🏥", free: false, practitionerOnly: true },
  { id: "aw",          label: "Support AW",emoji: "💛", free: true  },
  { id: "account",   label: "Account",    emoji: "👤", free: true  },
  { id: "admin",     label: "Admin",      emoji: "📊", free: true, adminOnly: true },
];

function LoadingScreen({ message = "Loading your healing journey…" }) {
  return (
    <div style={{
      minHeight: "100vh",
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
          Manage profiles in Account tab
        </div>
      </div>
    </>
  );
}

export default function App() {
  const { authUser, authLoading, signOut } = useAuth();
  const { isSubscribed, isPractitioner, subData, subLoading, refetch: refetchSub } = useSubscription(authUser);
  const {
    profiles, activeProfile, activeProfileId,
    profilesLoading, loadProfiles,
    createProfile, updateProfile, deleteProfile, switchProfile,
  } = useProfiles(authUser);
  const [bookNotes, setBookNotes] = useLocalStorage("cs_bookNotes", []);
  const [videoNotes, setVideoNotes] = useLocalStorage("cs_videoNotes", []);
  const [tab, setTab] = useLocalStorage("cs_tab", "home");
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem("cs_welcomed"));
  const [navQuery, setNavQuery] = useState(null);
  const [caregiverMode] = useLocalStorage("cs_caregiver", false);
  const { track } = useAnalytics(authUser);
  const isAdmin = authUser?.email === "allij@live.com.au";

  const handleNavigate = (tabId, query) => {
    setNavQuery(query || null);
    setTab(tabId);
  };
  const { activeReminder, dismiss: dismissReminder, snooze: snoozeReminder } = useReminders();
  const { searchBooks } = useBooks(authUser);

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
      setTab(returnTab);
      window.history.replaceState({}, "", "/");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (authLoading) return <LoadingScreen />;
  if (!authUser) return <Auth />;
  if (profilesLoading) return <LoadingScreen message="Loading your healing profiles…" />;

  // No profiles yet = first time setup
  if (profiles.length === 0) {
    return (
      <Onboarding
        onDone={async (data) => {
          const created = await createProfile({
            name: data.name,
            symptoms: data.symptoms,
            goal: data.goal,
            avatar_emoji: "🌿",
          });
          if (created) switchProfile(created.id);
        }}
      />
    );
  }

  const handleTabClick = (t) => {
    if (!t.free && !isSubscribed && !subLoading) setTab("account");
    else { setTab(t.id); track("tab_view", { tab: t.id }); }
  };

  const renderTab = () => {
    const current = TABS.find((t) => t.id === tab);
    if (current && !current.free && !isSubscribed && !subLoading) {
      return (
        <Account
          authUser={authUser}
          isSubscribed={isSubscribed}
          isPractitioner={isPractitioner}
          subData={subData}
          subLoading={subLoading}
          onSignOut={signOut}
        />
      );
    }

    switch (tab) {
      case "home":
        return caregiverMode
          ? <CaregiverDashboard patient={activeProfile} />
          : <Home user={activeProfile} authUser={authUser} profileId={activeProfileId} />;
      case "coach":
        return <Coach authUser={authUser} user={activeProfile} profileId={activeProfileId} bookNotes={bookNotes} videoNotes={videoNotes} searchBooks={searchBooks} onNavigate={handleNavigate} caregiverMode={caregiverMode} />;
      case "journal":
        return <Journal authUser={authUser} user={activeProfile} profileId={activeProfileId} />;
      case "recipes":
        return <Recipes user={activeProfile} navQuery={navQuery} />;
      case "cleanses":
        return <Cleanse navQuery={navQuery} />;
      case "symptoms":
        return <Symptom user={activeProfile} bookNotes={bookNotes} searchBooks={searchBooks} navQuery={navQuery} />;
      case "knowledge":
        return <Knowledge authUser={authUser} bookNotes={bookNotes} setBookNotes={setBookNotes} videoNotes={videoNotes} setVideoNotes={setVideoNotes} />;
      case "body":
        return <Body searchBooks={searchBooks} navQuery={navQuery} />;
      case "community":
        return <Community authUser={authUser} userProfile={activeProfile} />;
      case "practice":
        return isPractitioner ? <PractitionerPortal authUser={authUser} /> : <Account authUser={authUser} isSubscribed={isSubscribed} isPractitioner={isPractitioner} subData={subData} subLoading={subLoading} onSignOut={signOut} onReplayWelcome={() => setShowWelcome(true)} />;
      case "aw":
        return <AW />;
      case "admin":
        return isAdmin ? <AdminDashboard authUser={authUser} /> : null;
      case "account":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Account
              authUser={authUser}
              isSubscribed={isSubscribed}
              subData={subData}
              subLoading={subLoading}
              onSignOut={signOut}
              onReplayWelcome={() => setShowWelcome(true)}
            />
            <ReminderSettings authUser={authUser} />
            <ProfileManager
              profiles={profiles}
              activeProfileId={activeProfileId}
              onSwitch={switchProfile}
              onCreate={createProfile}
              onUpdate={updateProfile}
              onDelete={deleteProfile}
            />
          </div>
        );
      default:
        return caregiverMode
          ? <CaregiverDashboard patient={activeProfile} />
          : <Home user={activeProfile} authUser={authUser} profileId={activeProfileId} />;
    }
  };

  return (
    <div style={{ background: C.cream, minHeight: "100vh" }}>
      {/* Sticky header */}
      <div style={{
        background: `linear-gradient(135deg,${C.sageDark},${C.leaf})`,
        padding: "14px 18px 12px",
        color: C.white,
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 24 }}>🌿</div>
          <div>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 17 }}>CelerySync</div>
            <div style={{ fontSize: 9, opacity: 0.8, letterSpacing: 1, textTransform: "uppercase" }}>
              Inspired by Medical Medium · Anthony William
            </div>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {!subLoading && isSubscribed && (
              <div style={{
                background: "rgba(255,255,255,0.2)", borderRadius: 20,
                padding: "3px 10px", fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
              }}>
                ✨ Healer
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
                    padding: "5px 12px 5px 8px", border: "none", cursor: "pointer",
                    color: C.white,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{activeProfile.avatar_emoji}</span>
                  <span style={{ fontFamily: "Georgia,serif", fontSize: 12, fontWeight: 600 }}>
                    {activeProfile.name}
                  </span>
                  {profiles.length > 1 && (
                    <span style={{ fontSize: 9, opacity: 0.8 }}>▼</span>
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
      <div style={{ padding: "14px 14px 110px" }}>
        <Suspense fallback={
          <div style={{ textAlign: "center", padding: 48, color: C.muted, fontFamily: "Georgia,serif" }}>
            🌿 Loading…
          </div>
        }>
          {renderTab()}
        </Suspense>
      </div>

      {/* Bottom nav */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: C.white, borderTop: `1px solid ${C.border}`,
        boxShadow: "0 -4px 24px #1e2a1e12",
        paddingBottom: "env(safe-area-inset-bottom, 6px)",
      }}>
        <div style={{ display: "flex", overflowX: "auto", scrollbarWidth: "none" }}>
          {TABS.filter(t => (!t.practitionerOnly || isPractitioner) && (!t.adminOnly || isAdmin)).map((t) => {
            const locked = !t.free && !isSubscribed && !subLoading;
            const active = tab === t.id;
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

      {showWelcome && <WelcomeVoice onDone={() => setShowWelcome(false)} />}
    </div>
  );
}
