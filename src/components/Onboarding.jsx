import { useState } from "react";
import C from "../lib/colors.js";
import { CONDITIONS } from "../data/conditions.js";
import { useRhythm } from "../hooks/useRhythm.js";
import { useWebPush } from "../hooks/useWebPush.js";
import { parseVoiceTranscript } from "../lib/voiceIntake.js";
import { useVoiceOrchestrator } from "../context/VoiceContext.jsx";
import { srSupported } from "../hooks/useVoice.js";

const SLOTS = [
  { key: "morning", emoji: "🌅", label: "Morning drink(s)", placeholder: "e.g. \"Lemon water at 6:30, then celery juice at 7\"" },
  { key: "supplement", emoji: "💊", label: "Supplements", placeholder: "e.g. \"B12 and zinc at 9am with breakfast\"" },
  { key: "food", emoji: "🍽", label: "Meals & snacks rhythm", placeholder: "e.g. \"Snack every 2 hours, lunch around 1\"" },
  { key: "other", emoji: "🌙", label: "Wind-down", placeholder: "e.g. \"Herbal tea at 8, in bed by 10\"" },
];

function Footer() {
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", textAlign: "center" }}>
        🌿 Independent app · Inspired by Anthony William's teachings · Not affiliated with Medical Medium LLC
      </div>
      <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.55)", textAlign: "center", marginTop: 10, lineHeight: 1.8 }}>
        If you're in crisis, please reach out:{" "}
        <a href="tel:131114" style={{ color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>Lifeline 13 11 14</a>
        {" · "}
        <a href="tel:1300224636" style={{ color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>Beyond Blue 1300 22 4636</a>
        {" · "}
        <a href="tel:000" style={{ color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>Emergency 000</a>
      </div>
    </div>
  );
}

function Shell({ children, step, total }) {
  return (
    <div style={{
      minHeight: "100dvh",
      background: `linear-gradient(160deg,${C.sageDark} 0%,${C.leaf} 100%)`,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 20 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: "50%",
              background: i <= step ? "#fff" : "rgba(255,255,255,0.35)",
            }} />
          ))}
        </div>
        {children}
        <Footer />
      </div>
    </div>
  );
}

const cardStyle = {
  background: "rgba(255,255,255,0.96)",
  borderRadius: 20, padding: "24px 22px",
  boxShadow: "0 8px 32px #00000020",
};

const primaryBtn = {
  width: "100%", padding: "14px", borderRadius: 30, border: "none",
  background: C.sageDark, color: "#fff", fontFamily: "Georgia,serif",
  fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 14,
};

const skipBtn = {
  width: "100%", padding: "10px", borderRadius: 30, border: "none",
  background: "transparent", color: C.mid, fontFamily: "Georgia,serif",
  fontSize: 13, cursor: "pointer", marginTop: 6,
};

export default function Onboarding({ authUser, existingProfile, createProfile, switchProfile, updateProfile, onDone }) {
  const [step, setStep] = useState(existingProfile ? 1 : 0);
  const [name, setName] = useState(existingProfile?.name || "");
  const [profile, setProfile] = useState(existingProfile || null);
  const [creating, setCreating] = useState(false);

  const [symptoms, setSymptoms] = useState(existingProfile?.symptoms || []);
  const [cycleTracking, setCycleTracking] = useState(existingProfile?.cycle_tracking_enabled || false);
  const [condSearch, setCondSearch] = useState("");

  const [savedItems, setSavedItems] = useState([]); // { name, fixedTime } — for the finish-screen reflection

  const { addItem } = useRhythm(authUser, profile?.id);
  const { supported: pushSupported, subscribe, subscribed } = useWebPush(authUser);
  const [notifChoice, setNotifChoice] = useState(null); // 'yes' | 'no' | null

  const handleCreateProfile = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    const created = await createProfile({ name: name.trim() });
    setCreating(false);
    if (created) {
      setProfile(created);
      switchProfile(created.id);
      setStep(1);
    }
  };

  const finish = async () => {
    if (profile?.id) {
      await updateProfile(profile.id, {
        symptoms,
        cycle_tracking_enabled: cycleTracking,
        onboarding_completed_at: new Date().toISOString(),
      });
    }
    onDone?.({ name: profile?.name || name, firstItem: savedItems[0] || null });
  };

  // ── Step 0: Welcome ──────────────────────────────────────────────────────
  if (step === 0) {
    return (
      <Shell step={0} total={5}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌿</div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 24, color: "#fff", lineHeight: 1.3, marginBottom: 10 }}>
            Welcome to CelerySync
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>
            I help you actually do your healing day — reminders, tracking, and a companion who knows you.
          </div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 12, color: C.mid, marginBottom: 6, fontFamily: "Georgia,serif" }}>What should I call you?</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateProfile()}
            placeholder="Your first name"
            autoFocus
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 12,
              border: `1.5px solid ${C.border}`, fontFamily: "Georgia,serif",
              fontSize: 16, outline: "none", background: C.mist, boxSizing: "border-box",
            }}
          />
          <button style={primaryBtn} onClick={handleCreateProfile} disabled={!name.trim() || creating}>
            {creating ? "Just a moment…" : "Continue →"}
          </button>
        </div>
      </Shell>
    );
  }

  // ── Step 1: Her protocol, her words ──────────────────────────────────────
  if (step === 1) {
    return (
      <Shell step={1} total={5}>
        <div style={cardStyle}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 18, color: C.charcoal, marginBottom: 6 }}>
            Your protocol, your words
          </div>
          <div style={{ fontSize: 13, color: C.mid, marginBottom: 18, lineHeight: 1.6 }}>
            Tell me what you actually do — nothing pre-filled, nothing suggested. Type it, or tap the mic and just talk me through it.
          </div>
          {SLOTS.map((slot) => (
            <SlotInput
              key={slot.key}
              slot={slot}
              addItem={addItem}
              onSaved={(items) => setSavedItems((prev) => [...prev, ...items])}
            />
          ))}
          <button style={primaryBtn} onClick={() => setStep(2)}>Continue →</button>
          <button style={skipBtn} onClick={() => setStep(2)}>Skip for now</button>
        </div>
      </Shell>
    );
  }

  // ── Step 2: What she wants to track ──────────────────────────────────────
  if (step === 2) {
    const toggleSymptom = (s) => setSymptoms((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
    return (
      <Shell step={2} total={5}>
        <div style={cardStyle}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 18, color: C.charcoal, marginBottom: 6 }}>
            What do you want to track?
          </div>
          <div style={{ fontSize: 13, color: C.mid, marginBottom: 16, lineHeight: 1.6 }}>
            Energy and mood are part of every daily check-in already. Anything else?
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <div style={{ flex: 1, padding: "10px 12px", borderRadius: 12, background: C.sageLight, textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.sageDark }}>⚡ Energy</div>
              <div style={{ fontSize: 10, color: C.mid, marginTop: 2 }}>always included</div>
            </div>
            <div style={{ flex: 1, padding: "10px 12px", borderRadius: 12, background: C.sageLight, textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.sageDark }}>🙂 Mood</div>
              <div style={{ fontSize: 10, color: C.mid, marginTop: 2 }}>always included</div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: C.mid, marginBottom: 8, fontFamily: "Georgia,serif" }}>
            Symptoms to keep an eye on (optional)
          </div>
          <input
            value={condSearch}
            onChange={(e) => setCondSearch(e.target.value)}
            placeholder="Search…"
            style={{
              width: "100%", boxSizing: "border-box", padding: "8px 14px", borderRadius: 30,
              border: `1.5px solid ${C.border}`, fontFamily: "Georgia,serif", fontSize: 12,
              outline: "none", background: C.mist, marginBottom: 8,
            }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 140, overflowY: "auto", marginBottom: 16 }}>
            {Object.keys(CONDITIONS)
              .filter((s) => !condSearch || s.toLowerCase().includes(condSearch.toLowerCase()))
              .slice(0, 40)
              .map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSymptom(s)}
                  style={{
                    padding: "5px 12px", borderRadius: 20,
                    border: `1.5px solid ${symptoms.includes(s) ? C.sage : C.border}`,
                    background: symptoms.includes(s) ? C.sageLight : "transparent",
                    color: symptoms.includes(s) ? C.sageDark : C.mid,
                    fontSize: 12, fontFamily: "Georgia,serif", cursor: "pointer",
                    fontWeight: symptoms.includes(s) ? 700 : 400,
                  }}
                >
                  {s}
                </button>
              ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.mist, borderRadius: 12, padding: "10px 14px" }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: C.charcoal, fontFamily: "Georgia,serif" }}>🩸 Track my cycle</div>
              <div style={{ fontSize: 10.5, color: C.mid, marginTop: 1 }}>Adds a cycle-day overlay to Progress reports</div>
            </div>
            <button
              onClick={() => setCycleTracking((v) => !v)}
              style={{
                width: 42, height: 24, borderRadius: 12, border: "none", flexShrink: 0,
                background: cycleTracking ? C.sage : "#d1d5db", cursor: "pointer", position: "relative",
              }}
            >
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: cycleTracking ? 21 : 3, transition: "left 0.2s" }} />
            </button>
          </div>

          <button style={primaryBtn} onClick={() => setStep(3)}>Continue →</button>
        </div>
      </Shell>
    );
  }

  // ── Step 3: Notifications ────────────────────────────────────────────────
  if (step === 3) {
    const handleYes = async () => {
      setNotifChoice("yes");
      if (pushSupported) await subscribe(6).catch(() => {});
      setStep(4);
    };
    return (
      <Shell step={3} total={5}>
        <div style={cardStyle}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 18, color: C.charcoal, marginBottom: 10 }}>
            One honest thing
          </div>
          <div style={{ fontSize: 14, color: C.charcoal, lineHeight: 1.7, marginBottom: 18 }}>
            This only works if I can nudge you. Without notifications, I can still track everything — I just can't remind you when it's time.
          </div>
          {!pushSupported && (
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, fontStyle: "italic" }}>
              Notifications aren't available in this browser — you can still use everything else.
            </div>
          )}
          <button style={primaryBtn} onClick={handleYes} disabled={!pushSupported}>
            🔔 Yes, remind me
          </button>
          <button style={skipBtn} onClick={() => { setNotifChoice("no"); setStep(4); }}>
            Not right now
          </button>
        </div>
      </Shell>
    );
  }

  // ── Step 4: Finish ────────────────────────────────────────────────────────
  const first = savedItems[0];
  return (
    <Shell step={4} total={5}>
      <div style={cardStyle}>
        <div style={{ textAlign: "center", fontSize: 40, marginBottom: 10 }}>✨</div>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 18, color: C.charcoal, textAlign: "center", marginBottom: 8 }}>
          You're all set, {profile?.name || name}
        </div>
        <div style={{ fontSize: 13, color: C.mid, textAlign: "center", lineHeight: 1.6, marginBottom: 4 }}>
          {first
            ? `${first.name}${first.fixedTime ? ` at ${first.fixedTime}` : ""} is on your rhythm — I'll remind you.`
            : "Your day is ready — add to it anytime from Track or by just talking to me."}
        </div>
        <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 12, marginBottom: 4 }}>
          🎉 Your 7-day free trial starts now
        </div>
        <button style={primaryBtn} onClick={finish}>Take me to Today →</button>
      </div>
    </Shell>
  );
}

function SlotInput({ slot, addItem, onSaved }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedLabel, setSavedLabel] = useState(null);
  const { listening, startListening, stopListening } = useVoiceOrchestrator();

  const submit = async (rawText) => {
    const trimmed = rawText.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    const parsed = await parseVoiceTranscript(trimmed).catch(() => null);
    const items = parsed?.fields?.scheduleItems?.length
      ? parsed.fields.scheduleItems
      : [{ name: trimmed.slice(0, 60), category: slot.key, fixedTime: null, note: "", frequency: "daily" }];

    const saved = [];
    for (const item of items) {
      const created = await addItem({
        name: item.name,
        category: item.category || slot.key,
        fixedTime: item.fixedTime || null,
        note: item.note || "",
        frequency: item.frequency || "daily",
      });
      if (created) saved.push(created);
    }
    setSaving(false);
    setSavedLabel(saved.map((s) => s.name).join(", "));
    onSaved(saved);
    setText("");
  };

  const handleMic = () => {
    if (listening) { stopListening(); return; }
    startListening((transcript) => submit(transcript), { silenceMs: 1500 });
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.charcoal, fontFamily: "Georgia,serif", marginBottom: 6 }}>
        {slot.emoji} {slot.label}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit(text)}
          placeholder={slot.placeholder}
          style={{
            flex: 1, padding: "9px 12px", borderRadius: 10,
            border: `1.5px solid ${C.border}`, fontFamily: "Georgia,serif",
            fontSize: 12.5, outline: "none", background: C.mist,
          }}
        />
        {srSupported && (
          <button
            onClick={handleMic}
            style={{
              width: 38, borderRadius: 10, border: "none", flexShrink: 0,
              background: listening ? C.sage : C.sageLight, color: listening ? "#fff" : C.sageDark,
              cursor: "pointer", fontSize: 15,
            }}
          >
            {listening ? "👂" : "🎙"}
          </button>
        )}
      </div>
      {saving && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Saving…</div>}
      {savedLabel && !saving && (
        <div style={{ fontSize: 11, color: C.sage, marginTop: 4 }}>✓ {savedLabel} — added to your rhythm</div>
      )}
    </div>
  );
}
