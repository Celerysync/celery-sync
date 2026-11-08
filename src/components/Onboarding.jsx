import { Fragment, useState } from "react";
import { crisisContacts } from "../lib/voiceTabContext.js";
import { PLACEHOLDER_NAME } from "../hooks/useProfiles.js";
import C from "../lib/colors.js";
import { useRhythm } from "../hooks/useRhythm.js";
import { withStepWords } from "../lib/stepEmoji.js";
import { splitRoutine, timeIn } from "../lib/routineSplit.js";
import { supabase } from "../lib/supabase.js";
import { useWebPush } from "../hooks/useWebPush.js";
import { useInstallPrompt } from "../hooks/useInstallPrompt.js";
import InstallCard from "./InstallCard.jsx";
import { parseVoiceTranscript } from "../lib/voiceIntake.js";
import { useVoiceOrchestrator } from "../context/VoiceContext.jsx";
import { srSupported } from "../hooks/useVoice.js";

// The wizard asks for the day in one box, and supplements in a second,
// optional one (they go on the supplement list, not the rhythm).
const DAY_SLOT = { key: "day", emoji: "🌿", label: "My day", placeholder: "e.g. Lemon water when I wake, celery juice at 6:30, smoothie at 8, snack every 2 hours, dinner at 6, herbal tea at 8" };
const SUPP_SLOT = { key: "supplement", emoji: "💊", label: "Supplements", placeholder: "e.g. B12 and zinc with my smoothie" };


// Everyday symptoms only — no named diseases. A list of conditions (MS, lupus,
// autism, diabetes…) in a wellness app reads as "this app is for managing
// these", which the TGA wellness exclusion does not allow. Same wording as the
// daily check-in so whatever is picked here shows up there. Anything else, the
// person types in their own words.

function Footer() {
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.55)", textAlign: "center" }}>
        🌿 Independent app · Not affiliated with Anthony William or Medical Medium LLC
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", textAlign: "center", marginTop: 10, lineHeight: 1.8 }}>
        If you're in crisis, please reach out:{" "}
        {crisisContacts().map((c, i) => (
          <Fragment key={c.label}>
            {i > 0 && " · "}
            <a href={c.href} style={{ color: "#fff", fontWeight: 700 }}>{c.label} {c.num}</a>
          </Fragment>
        ))}
        {!crisisContacts().length && "your local emergency number or crisis line."}
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
        <div role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={step} aria-label="Setup progress"
          style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.3)", marginBottom: 20, overflow: "hidden" }}>
          <div style={{ width: `${Math.round((step / total) * 100)}%`, height: "100%", background: "#fff", borderRadius: 3, transition: "width 0.3s" }} />
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

// useProfiles creates a profile named "Me" on first sign-in so the app has
// something to hang data on. That is a placeholder, not a name the person gave
// us — treat it as "no name yet" or onboarding skips the question and greets
// everyone as "Me".

export default function Onboarding({ authUser, existingProfile, createProfile, switchProfile, updateProfile, onDone }) {
  const hasRealName = !!existingProfile && existingProfile.name !== PLACEHOLDER_NAME;
  const [step, setStep] = useState(0);
  const [name, setName] = useState(hasRealName ? existingProfile.name : "");
  const [profile, setProfile] = useState(existingProfile || null);
  const [creating, setCreating] = useState(false);

  // Symptoms and cycle tracking are chosen later (Settings → profile), not
  // in the setup wizard; keep whatever the profile already has.
  const symptoms = existingProfile?.symptoms || [];
  const cycleTracking = existingProfile?.cycle_tracking_enabled || false;

  const [savedItems, setSavedItems] = useState([]); // { name, fixedTime } — for the finish-screen reflection
  // Typed text per slot lives here, not inside SlotInput, so Continue can save
  // whatever was typed. Most people type and tap Continue without pressing
  // Enter — before, that silently threw their whole routine away.
  const [slotText, setSlotText] = useState({});
  const [slotSaving, setSlotSaving] = useState({});
  const [slotSaved, setSlotSaved] = useState({});
  const [savingAll, setSavingAll] = useState(false);

  const { addItem } = useRhythm(authUser, profile?.id);
  const { supported: pushSupported, subscribe } = useWebPush(authUser);
  const { shouldOfferInstall, isIOS } = useInstallPrompt();
  const [notifChoice, setNotifChoice] = useState(null); // 'yes' | 'no' | null

  const handleCreateProfile = async () => {
    if (!name.trim() || creating) return;
    setCreating(true);
    if (profile?.id) {
      // Rename the placeholder rather than creating a second profile.
      await updateProfile(profile.id, { name: name.trim() });
      setProfile({ ...profile, name: name.trim() });
      setCreating(false);
      setStep(2);
      return;
    }
    const created = await createProfile({ name: name.trim() });
    setCreating(false);
    if (created) {
      setProfile(created);
      switchProfile(created.id);
      setStep(2);
    }
  };

  // The section label goes with the text so "tea at 8" under Wind-down reads as
  // the evening.
  const parseSlot = (slot, text) => parseVoiceTranscript(`${slot.label}: ${text}`).catch(() => null);

  const saveSlot = async (slot, rawText, parsing) => {
    const trimmed = rawText.trim();
    if (!trimmed || slotSaving[slot.key]) return;
    setSlotSaving((p) => ({ ...p, [slot.key]: true }));
    const parsed = await (parsing || parseSlot(slot, trimmed));
    // If the AI couldn't sort it, split it ourselves (their words only) —
    // never one long step made of their whole day.
    const items = parsed?.fields?.scheduleItems?.length
      ? parsed.fields.scheduleItems
      : splitRoutine(trimmed).map((i) => ({ ...i, category: slot.key === "day" ? "other" : slot.key }));

    // Supplements go on the supplement list, so they have one home. If a time
    // was given, a "Supplements" step at that time carries the reminder, and
    // they're linked to it ("with" it).
    if (slot.key === "supplement" && profile?.id) {
      // Each supplement goes with what was said about IT: "B12 and zinc with
      // my smoothie, magnesium at bedtime" links B12 and zinc to the smoothie,
      // and puts magnesium in the evening on its own.
      const parts = trimmed.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
      const partFor = (name) => {
        const first = String(name).toLowerCase().split(/\s+/)[0];
        return parts.find((x) => x.toLowerCase().includes(first)) || trimmed;
      };
      const { data: steps } = await supabase.from("rhythm_items").select("id, name, fixed_time")
        .eq("profile_id", profile.id).is("archived_at", null);
      const stepFor = (words) => {
        if (!words) return null;
        const w = words.toLowerCase();
        const keys = w.split(/\s+/).filter((k) => k.length >= 4);
        const hits = (steps || []).filter((st) => {
          const n = st.name.toLowerCase();
          return n.includes(w) || w.includes(n) || keys.some((k) => n.includes(k));
        });
        return hits.length === 1 ? hits[0] : null;
      };
      const madeSteps = {}; // one "Supplements" step per time they gave
      const rows = [];
      const said = [];
      for (const i of items) {
        const part = partFor(i.name);
        let step = stepFor(withStepWords(part));
        const time = i.fixedTime || timeIn(part) || (step?.fixed_time ? String(step.fixed_time).slice(0, 5) : null);
        if (!step && time) {
          madeSteps[time] ||= await addItem({ name: "Supplements", category: "supplement", fixedTime: time, note: "", frequency: "daily" });
          step = madeSteps[time];
        }
        const evening = /bed|night|evening|dinner/i.test(part);
        const hour = time ? Number(time.slice(0, 2)) : evening ? 20 : 8;
        const timing = hour < 11 ? "morning_food" : hour < 16 ? "midday" : "evening";
        rows.push({ profile_id: profile.id, name: i.name, dose_label: null, timing, with_item_id: step?.id ?? null });
        said.push(step && step.name !== "Supplements" ? `${i.name} (with ${step.name})` : time ? `${i.name} (at ${time})` : i.name);
        if (step) setSavedItems((prev) => (prev.some((x) => x.id === step.id) ? prev : [...prev, step]));
      }
      await supabase.from("user_supplements").insert(rows);
      setSlotSaving((p) => ({ ...p, [slot.key]: false }));
      setSlotSaved((p) => ({ ...p, [slot.key]: `${said.join(", ")}, on your supplement list` }));
      setSlotText((p) => ({ ...p, [slot.key]: "" }));
      return;
    }

    const saved = [];
    for (const item of items) {
      const created = await addItem({
        name: item.name,
        category: item.category || (slot.key === "day" ? "other" : slot.key),
        fixedTime: item.fixedTime || null,
        note: item.note || "",
        frequency: item.frequency || "daily",
      });
      if (created) saved.push(created);
    }
    setSlotSaving((p) => ({ ...p, [slot.key]: false }));
    setSlotSaved((p) => ({ ...p, [slot.key]: saved.map((s) => s.name).join(", ") }));
    setSlotText((p) => ({ ...p, [slot.key]: "" }));
    setSavedItems((prev) => [...prev, ...saved]);
  };

  const continueFromSlots = async () => {
    setSavingAll(true);
    // Understand them together, but save one at a time, so the routine keeps the
    // order it was written in.
    // Supplements last, so "with my smoothie / breakfast" finds that step.
    const slots = [DAY_SLOT, SUPP_SLOT].filter((slot) => (slotText[slot.key] || "").trim());
    const parsing = slots.map((slot) => parseSlot(slot, slotText[slot.key].trim()));
    for (let i = 0; i < slots.length; i++) {
      await saveSlot(slots[i], slotText[slots[i].key], parsing[i]);
    }
    setSavingAll(false);
    setStep(3);
  };
  const skipFromSlots = () => setStep(3);

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

  // ── The setup wizard: four short steps, one question each ─────────────────
  // 0 What this is for · 1 Your name · 2 Your day · 3 Reminders · 4 All set
  const TOTAL = 4;
  const back = (to) => (
    <button style={{ ...skipBtn, marginTop: 2 }} onClick={() => setStep(to)}>← Back</button>
  );

  // ── Step 0: what CelerySync is for ────────────────────────────────────────
  if (step === 0) {
    return (
      <Shell step={0} total={TOTAL}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🌿</div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 26, color: "#fff", lineHeight: 1.3 }}>
            Welcome to CelerySync
          </div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 18, color: C.charcoal, lineHeight: 1.45, marginBottom: 14 }}>
            CelerySync helps you keep up your own healing routine, one day at a time.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 6 }}>
            {[
              ["📝", "Put in what you do each day, from your own books or protocol."],
              ["✅", "Tick things off, and get gentle reminders."],
              ["📈", "See how you're going over time."],
              ["🎙", "Talk to Fern, your helper, if you'd rather not tap."],
            ].map(([emoji, text]) => (
              <div key={text} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontSize: 22, lineHeight: 1.2 }} aria-hidden="true">{emoji}</span>
                <span style={{ fontSize: 16, color: C.charcoal, lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
          <button style={primaryBtn} onClick={() => setStep(hasRealName ? 2 : 1)}>Let's start →</button>
          <div style={{ fontSize: 13, color: C.muted, textAlign: "center", marginTop: 10 }}>Takes about 2 minutes. You can change everything later.</div>
        </div>
      </Shell>
    );
  }

  // ── Step 1: your name ─────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <Shell step={1} total={TOTAL}>
        <div style={cardStyle}>
          <StepLabel n={1} total={TOTAL} />
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 20, color: C.charcoal, marginBottom: 12 }}>
            What should we call you?
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateProfile(false)}
            placeholder="Your first name"
            aria-label="Your first name"
            autoFocus
            style={{
              width: "100%", padding: "14px 16px", borderRadius: 12,
              border: `1.5px solid ${C.border}`, fontFamily: "Georgia,serif",
              fontSize: 18, outline: "none", background: C.mist, boxSizing: "border-box",
            }}
          />
          <button style={primaryBtn} onClick={() => handleCreateProfile(false)} disabled={!name.trim() || creating}>
            {creating ? "Just a moment…" : "Next →"}
          </button>
          {back(0)}
        </div>
      </Shell>
    );
  }

  // ── Step 2: your day, in your own words ──────────────────────────────────
  if (step === 2) {
    return (
      <Shell step={2} total={TOTAL}>
        <div style={cardStyle}>
          <StepLabel n={2} total={TOTAL} />
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 20, color: C.charcoal, marginBottom: 6 }}>
            What do you do each day?
          </div>
          <div style={{ fontSize: 15, color: C.mid, marginBottom: 14, lineHeight: 1.6 }}>
            Write it the way you'd say it, with times if you have them. Or tap 🎙 and say it.
          </div>
          <DayInput
            slot={DAY_SLOT}
            text={slotText[DAY_SLOT.key] || ""}
            onTextChange={(t) => setSlotText((p) => ({ ...p, [DAY_SLOT.key]: t }))}
            saving={!!slotSaving[DAY_SLOT.key]}
            savedLabel={slotSaved[DAY_SLOT.key] || null}
          />
          <div style={{ fontSize: 15, fontWeight: 700, color: C.charcoal, fontFamily: "Georgia,serif", margin: "16px 0 6px" }}>
            Any supplements? <span style={{ fontWeight: 400, color: C.muted, fontSize: 14 }}>(optional)</span>
          </div>
          <SlotInput
            slot={SUPP_SLOT}
            text={slotText[SUPP_SLOT.key] || ""}
            onTextChange={(t) => setSlotText((p) => ({ ...p, [SUPP_SLOT.key]: t }))}
            onSubmit={(t) => saveSlot(SUPP_SLOT, t)}
            saving={!!slotSaving[SUPP_SLOT.key]}
            savedLabel={slotSaved[SUPP_SLOT.key] || null}
            hideLabel
          />
          <button style={primaryBtn} onClick={continueFromSlots} disabled={savingAll}>
            {savingAll ? "Setting up your day…" : "Next →"}
          </button>
          <button style={skipBtn} onClick={skipFromSlots}>I'll do this later</button>
          {back(hasRealName ? 0 : 1)}
        </div>
      </Shell>
    );
  }

  // ── Step 3: reminders ─────────────────────────────────────────────────────
  // Install comes first when it's still available: on iOS, push cannot work
  // from a Safari tab at all, so asking for notifications before offering the
  // install would dead-end the user with "not available" and no way forward.
  if (step === 3) {
    const handleYes = async () => {
      setNotifChoice("yes");
      if (pushSupported) await subscribe().catch(() => {});
      setStep(4);
    };
    return (
      <Shell step={3} total={TOTAL}>
        <div style={cardStyle}>
          <StepLabel n={3} total={TOTAL} />
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 20, color: C.charcoal, marginBottom: 8 }}>
            Would you like gentle reminders?
          </div>
          <div style={{ fontSize: 15, color: C.charcoal, lineHeight: 1.6, marginBottom: 16 }}>
            We'll send a small note when it's time for a step on your list. You can turn them off any time.
          </div>

          {shouldOfferInstall && (
            <div style={{ marginBottom: 16 }}>
              <InstallCard compact />
            </div>
          )}

          {!pushSupported && (
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 12, fontStyle: "italic", lineHeight: 1.6 }}>
              {isIOS
                ? "Add CelerySync to your home screen using the steps above, then open it from there. The reminder switch appears once you do."
                : "Reminders aren't available in this browser. Everything else still works."}
            </div>
          )}

          <button style={primaryBtn} onClick={handleYes} disabled={!pushSupported}>
            🔔 Yes, remind me
          </button>
          <button style={skipBtn} onClick={() => { setNotifChoice("no"); setStep(4); }}>
            Not right now
          </button>
          {back(2)}
        </div>
      </Shell>
    );
  }

  // ── Step 4: all set ───────────────────────────────────────────────────────
  const first = savedItems[0];
  return (
    <Shell step={4} total={TOTAL}>
      <div style={cardStyle}>
        <div style={{ textAlign: "center", fontSize: 44, marginBottom: 8 }}>✨</div>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 22, color: C.charcoal, textAlign: "center", marginBottom: 10 }}>
          You're all set, {profile?.name || name}
        </div>
        <div style={{ fontSize: 15, color: C.mid, textAlign: "center", lineHeight: 1.6 }}>
          {savedItems.length
            ? `${savedItems.length} step${savedItems.length === 1 ? " is" : "s are"} on your list${notifChoice === "yes" && first?.fixedTime ? ", with reminders" : ""}.`
            : "You can add your daily steps on Today whenever you're ready."}
        </div>
        <div style={{ background: C.sageLight, borderRadius: 12, padding: "12px 14px", marginTop: 16, fontSize: 15, color: C.charcoal, lineHeight: 1.6 }}>
          On <strong>Today</strong> you'll find a short <strong>Getting started</strong> list. It shows you around, one thing at a time.
        </div>
        <div style={{ fontSize: 13, color: C.muted, textAlign: "center", marginTop: 12 }}>
          🎉 Your 7-day free trial starts now
        </div>
        <button style={primaryBtn} onClick={finish}>Take me to Today →</button>
      </div>
    </Shell>
  );
}

function StepLabel({ n, total }) {
  return (
    <div style={{ fontSize: 13, color: C.muted, fontWeight: 700, letterSpacing: 0.3, marginBottom: 6 }}>
      Step {n} of {total}
    </div>
  );
}

// The one big box for their day: several lines, with a mic.
function DayInput({ slot, text, onTextChange, saving, savedLabel }) {
  const { listening, startListening, stopListening } = useVoiceOrchestrator();
  const handleMic = () => {
    if (listening) { stopListening(); return; }
    startListening((transcript) => onTextChange(`${text ? `${text}\n` : ""}${transcript}`), { silenceMs: 2000 });
  };
  return (
    <div>
      <div style={{ position: "relative" }}>
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={slot.placeholder}
          aria-label="What you do each day"
          rows={5}
          style={{
            width: "100%", boxSizing: "border-box", padding: "12px 14px", paddingRight: srSupported ? 56 : 14,
            borderRadius: 12, border: `1.5px solid ${C.border}`, fontFamily: "Georgia,serif",
            fontSize: 16, lineHeight: 1.5, outline: "none", background: C.mist, resize: "vertical",
          }}
        />
        {srSupported && (
          <button
            onClick={handleMic}
            aria-label={listening ? "Stop listening" : "Say it instead"}
            style={{
              position: "absolute", right: 8, top: 8, width: 42, height: 42, borderRadius: 12, border: "none",
              background: listening ? C.sage : C.sageLight, color: listening ? "#fff" : C.sageDark, cursor: "pointer", fontSize: 18,
            }}
          >
            {listening ? "👂" : "🎙"}
          </button>
        )}
      </div>
      {saving && <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Saving…</div>}
      {savedLabel && !saving && <div style={{ fontSize: 13, color: C.sage, marginTop: 4 }}>✓ {savedLabel}: added to your list</div>}
    </div>
  );
}

function SlotInput({ slot, text, onTextChange, onSubmit, saving, savedLabel, hideLabel = false }) {
  const { listening, startListening, stopListening } = useVoiceOrchestrator();

  const handleMic = () => {
    if (listening) { stopListening(); return; }
    startListening((transcript) => onSubmit(transcript), { silenceMs: 1500 });
  };

  return (
    <div style={{ marginBottom: 14 }}>
      {!hideLabel && (
        <div style={{ fontSize: 14, fontWeight: 700, color: C.charcoal, fontFamily: "Georgia,serif", marginBottom: 6 }}>
          {slot.emoji} {slot.label}
        </div>
      )}
      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit(text)}
          placeholder={slot.placeholder}
          style={{
            flex: 1, padding: "9px 12px", borderRadius: 10,
            border: `1.5px solid ${C.border}`, fontFamily: "Georgia,serif",
            fontSize: 16, outline: "none", background: C.mist,
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
      {saving && <div style={{ fontSize: 13.5, color: C.muted, marginTop: 4 }}>Saving…</div>}
      {savedLabel && !saving && (
        <div style={{ fontSize: 13.5, color: C.sage, marginTop: 4 }}>✓ {savedLabel} — added to your rhythm</div>
      )}
    </div>
  );
}
