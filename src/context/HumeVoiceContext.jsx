import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { VoiceProvider as HumeSDKProvider, useVoice as useHumeSDKVoice } from "@humeai/voice-react";
import { useHealingMemory } from "../hooks/useHealingMemory.js";
import { useVoiceTools } from "../hooks/useVoiceTools.js";
import { TAB_CONTEXT } from "../lib/voiceTabContext.js";
import { supabase } from "../lib/supabase.js";

// Spec §3.2 session containment: warn after this much silence, close a beat
// later. Client-side enforcement backs up the EVI config's own timeout.
const SILENCE_WARN_MS = 20_000;
const SILENCE_CLOSE_MS = 30_000;

const HumeVoiceContext = createContext(null);

// Safe no-op fallback — mirrors VoiceContext.jsx's NOOP_VOICE pattern so a
// component rendered without this provider (or before Hume is enabled)
// degrades silently instead of crashing.
const NOOP = {
  enabled: false,
  isConnected: false,
  isConnecting: false,
  isMuted: false,
  speaking: false,
  listening: false,
  messages: [],
  lastUserMessage: null,
  lastVoiceMessage: null,
  error: null,
  connect: async () => {},
  disconnect: () => {},
  mute: () => {},
  unmute: () => {},
  sendUserInput: () => {},
  registerToolHandlers: () => () => {},
  sessionStartedAt: null,
  silenceWarning: false,
  timedOut: false,
  meterSecondsRemaining: null,
  sheetOpen: false,
  openSheet: () => {},
  closeSheet: () => {},
};

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${url} failed: ${res.status}`);
  return res.json();
}

function HumeVoiceBridge({ authUser, profileId, tab, enabled, toolHandlersRef, onSwitchTab, children }) {
  const voice = useHumeSDKVoice();
  const memory = useHealingMemory(authUser, profileId);
  const lastUserTurnRef = useRef(null); // { text, at }
  const userId = authUser?.id;

  // Sheet open/closed lives here (not in VoiceOrb's own state) so anything
  // else in the app — e.g. WelcomeVoice handing off to the real companion —
  // can open it without duplicating a second chat UI (spec §3.2: one
  // companion, everywhere).
  const [sheetOpen, setSheetOpen] = useState(false);

  // Session shell state (spec §3.2): timer, silence containment, meter
  const [sessionStartedAt, setSessionStartedAt] = useState(null);
  const [silenceWarning, setSilenceWarning] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [meterSecondsRemaining, setMeterSecondsRemaining] = useState(null);
  const [capReached, setCapReached] = useState(false);
  const lastActivityRef = useRef(0);
  const playingRef = useRef(false);
  const disconnectRef = useRef(() => {});
  const sessionIdRef = useRef(null);
  const lastHeartbeatAtRef = useRef(0);

  // Shared by the gauge display AND the pre-connect cap check (spec §2.4) —
  // one read path so they can never disagree.
  const loadMeter = useCallback(async () => {
    if (!userId) return null;
    const d = new Date();
    const periodMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const { data } = await supabase.from("voice_usage_meter")
      .select("evi_seconds_used, evi_seconds_included, topup_seconds_remaining")
      .eq("user_id", userId)
      .eq("period_month", periodMonth)
      .maybeSingle();
    // No meter row (e.g. pre-billing beta) → null means "unmetered", never a scary zero
    return data
      ? Math.max(0, data.evi_seconds_included + data.topup_seconds_remaining - data.evi_seconds_used)
      : null;
  }, [userId]);

  useEffect(() => {
    playingRef.current = voice.isPlaying;
    disconnectRef.current = voice.disconnect;
  }, [voice.isPlaying, voice.disconnect]);

  // Any turn activity (including interim transcripts) resets the silence clock;
  // the interval below clears the warning on its next tick.
  useEffect(() => {
    lastActivityRef.current = Date.now();
  }, [voice.lastUserMessage, voice.lastVoiceMessage, voice.isPlaying]);

  // Track session open/close: start/end a companion_sessions row (spec §2.3),
  // load the meter for the gauge, and prime the heartbeat clock (spec §2.4).
  useEffect(() => {
    if (voice.readyState === "open") {
      setSessionStartedAt(Date.now());
      setTimedOut(false);
      lastActivityRef.current = Date.now();
      lastHeartbeatAtRef.current = Date.now();
      if (userId) {
        loadMeter().then(setMeterSecondsRemaining);
        fetchJSON("/api/hume/session/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, profileId }),
        }).then(({ sessionId }) => { sessionIdRef.current = sessionId; }).catch(() => {});
      }
    } else {
      setSessionStartedAt(null);
      setSilenceWarning(false);
      // Final partial chunk since the last heartbeat (or the whole session,
      // if it was shorter than one 60s heartbeat interval).
      if (userId && lastHeartbeatAtRef.current) {
        const finalSeconds = Math.round((Date.now() - lastHeartbeatAtRef.current) / 1000);
        const sid = sessionIdRef.current;
        sessionIdRef.current = null;
        lastHeartbeatAtRef.current = 0;
        fetch("/api/hume/session/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sid, userId, seconds: finalSeconds }),
        }).catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.readyState, userId]);

  // Silence containment (warn at 20s, close at 30s) + 60s usage heartbeats
  // (spec §2.4, so a crash mid-session only loses at most the last <60s) —
  // one interval for both, not two competing timers.
  useEffect(() => {
    if (voice.readyState !== "open") return;
    const id = setInterval(() => {
      if (!playingRef.current) {
        const idle = Date.now() - lastActivityRef.current;
        if (idle >= SILENCE_CLOSE_MS) {
          setTimedOut(true);
          setSilenceWarning(false);
          disconnectRef.current();
        } else {
          setSilenceWarning(idle >= SILENCE_WARN_MS);
        }
      }

      const sinceHeartbeat = Date.now() - lastHeartbeatAtRef.current;
      if (userId && sinceHeartbeat >= 60_000) {
        const seconds = Math.round(sinceHeartbeat / 1000);
        lastHeartbeatAtRef.current = Date.now();
        fetchJSON("/api/hume/session/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, seconds }),
        }).then((meter) => {
          if (typeof meter.remainingSeconds === "number") {
            setMeterSecondsRemaining(meter.remainingSeconds);
            // Hard mid-session cutoff: the connect-time check bounds the
            // start, this bounds the middle — without it a session could
            // run to the 30-min max after the balance hits zero, all of it
            // billable to us. Worst overrun is now one heartbeat (<60s).
            if (meter.remainingSeconds <= 0) {
              setCapReached(true);
              disconnectRef.current();
            }
          }
        }).catch(() => {});
      }
    }, 1000);
    return () => clearInterval(id);
  }, [voice.readyState, userId]);

  useEffect(() => {
    if (!enabled || !authUser?.id || !profileId) return;
    memory.loadMemory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, authUser?.id, profileId]);

  const registerToolHandlers = useCallback((handlers) => {
    Object.assign(toolHandlersRef.current, handlers);
    return () => {
      for (const key of Object.keys(handlers)) delete toolHandlersRef.current[key];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Registered once, globally — these write straight to Supabase rather than
  // through a specific tab's local state, so log_checkin/log_restock/
  // log_rhythm_item work identically no matter which tab is on screen. This
  // is what replaces src/lib/voiceIntake.js's parse-then-write flow.
  const voiceTools = useVoiceTools(authUser, profileId, onSwitchTab);
  useEffect(() => {
    return registerToolHandlers(voiceTools);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceTools]);

  // extraContext: an optional one-off instruction folded into this specific
  // connection's context (e.g. WelcomeVoice's "this is a first-time user,
  // introduce yourself and the app" hand-off) — same mechanism as the
  // ambient tab/memory context below, just for a one-time situational cue.
  const connect = useCallback(async (extraContext) => {
    if (!enabled) return;
    setTimedOut(false);
    setCapReached(false);

    // Pre-session cap check (spec §2.4) — never open the WebSocket at all if
    // the user is at (or over) their allowance. The SERVER is the authority
    // (it knows the tier and the trial-pool breaker; a new user has no meter
    // row for the client to read). Falls back to the client-side read only if
    // the endpoint is unreachable.
    let remaining;
    try {
      const a = await fetchJSON(`/api/hume/allowance?userId=${userId}`);
      remaining = typeof a.remainingSeconds === "number" ? a.remainingSeconds : null;
    } catch {
      remaining = await loadMeter();
    }
    if (remaining !== null && remaining <= 0) {
      setMeterSecondsRemaining(0);
      throw new Error("Voice minutes are used up for now. Text chat is always available — minutes refresh monthly, or you can add a top-up from Settings → Companion Voice.");
    }
    setMeterSecondsRemaining(remaining);

    const [{ accessToken }, { configId }] = await Promise.all([
      fetchJSON("/api/hume/token", { method: "POST" }),
      fetchJSON("/api/hume/config"),
    ]);
    if (!accessToken || !configId) {
      throw new Error("Hume voice isn't configured yet — set HUME_API_KEY/HUME_SECRET_KEY/HUME_EVI_CONFIG_ID.");
    }
    // Honor the user's chosen companion name (user_voice_prefs, spec §2.5) —
    // read fresh at connect time so a rename applies to the very next session.
    let nameLine = null;
    if (userId) {
      const { data: voicePrefs } = await supabase
        .from("user_voice_prefs")
        .select("companion_name")
        .eq("user_id", userId)
        .maybeSingle();
      if (voicePrefs?.companion_name) {
        nameLine = `The user has named you ${voicePrefs.companion_name} — refer to yourself by that name.`;
      }
    }
    const contextText = [nameLine, memory.healingProfile?.healing_summary, TAB_CONTEXT[tab], extraContext]
      .filter(Boolean)
      .join("\n\n");
    await voice.connect({
      auth: { type: "accessToken", value: accessToken },
      configId,
      sessionSettings: contextText
        ? { context: { text: contextText, type: "persistent" } }
        : undefined,
    });
  }, [enabled, voice, memory.healingProfile, tab, loadMeter, userId]);

  // Ambient tab-change context — pushed into the live session instead of
  // reconnecting, so the assistant knows where the user is without dropping
  // the conversation (this is the "carries over between tabs" fix).
  const prevTabRef = useRef(tab);
  useEffect(() => {
    if (voice.readyState !== "open") { prevTabRef.current = tab; return; }
    if (prevTabRef.current === tab) return;
    prevTabRef.current = tab;
    const line = TAB_CONTEXT[tab];
    if (line) voice.sendSessionSettings?.({ context: { text: line, type: "temporary" } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, voice.readyState]);

  // Persist every completed exchange (all surfaces, not just Companion) and
  // log it to voice_turns — the analytics/tracking that didn't exist before.
  useEffect(() => {
    const um = voice.lastUserMessage;
    if (um && !um.interim) {
      lastUserTurnRef.current = { text: um.message?.content || "", at: Date.now() };
    }
  }, [voice.lastUserMessage]);

  useEffect(() => {
    const am = voice.lastVoiceMessage;
    if (!am) return;
    const assistantText = am.message?.content || "";
    const turn = lastUserTurnRef.current;
    const userText = turn?.text || "";
    const latencyMs = turn ? Date.now() - turn.at : null;
    lastUserTurnRef.current = null;

    if (authUser?.id && profileId && userText) {
      memory.saveExchange(userText, assistantText);
    }
    if (authUser?.id) {
      fetch("/api/hume/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Emotion/prosody data is deliberately NOT sent — Hume uses it live to
        // shape the companion's tone, but spec §3.5 forbids storing or scoring
        // it (privacy + therapeutic-claims risk).
        body: JSON.stringify({
          userId: authUser.id,
          profileId,
          surface: tab,
          userTranscript: userText || null,
          assistantTranscript: assistantText,
          latencyMs,
        }),
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.lastVoiceMessage]);

  const value = {
    enabled,
    isConnected: voice.readyState === "open",
    isConnecting: voice.readyState === "connecting",
    isMuted: voice.isMuted,
    speaking: voice.isPlaying,
    listening: voice.readyState === "open" && !voice.isMuted && !voice.isPlaying,
    messages: voice.messages,
    lastUserMessage: voice.lastUserMessage,
    lastVoiceMessage: voice.lastVoiceMessage,
    error: voice.error,
    connect,
    disconnect: voice.disconnect,
    mute: voice.mute,
    unmute: voice.unmute,
    sendUserInput: voice.sendUserInput,
    registerToolHandlers,
    sessionStartedAt,
    silenceWarning,
    timedOut,
    meterSecondsRemaining,
    capReached,
    sheetOpen,
    openSheet: () => setSheetOpen(true),
    closeSheet: () => setSheetOpen(false),
  };

  return <HumeVoiceContext.Provider value={value}>{children}</HumeVoiceContext.Provider>;
}

// authUser/profileId/tab are read fresh on every connect() call via refs so
// the WS session itself doesn't get torn down on tab switches — only one
// session exists app-wide, which is the whole point of this provider.
export function HumeVoiceProvider({ authUser, profileId, tab, enabled, onSwitchTab, children }) {
  const toolHandlersRef = useRef({});

  const handleToolCall = useCallback(async (message, send) => {
    const handler = toolHandlersRef.current[message.name];
    if (!handler) {
      return send.error({
        error: "no_handler",
        code: "no_handler",
        level: "warn",
        content: `No handler registered for tool "${message.name}"`,
      });
    }
    try {
      const args = message.parameters ? JSON.parse(message.parameters) : {};
      const result = await handler(args);
      return send.success(result ?? { ok: true });
    } catch (err) {
      return send.error({
        error: "handler_error",
        code: "handler_error",
        level: "error",
        content: err.message,
      });
    }
  }, []);

  if (!enabled) {
    // Cheapest possible no-op — don't even mount the Hume SDK provider
    // (no socket, no mic prompt) until the rollout flag is on.
    return <HumeVoiceContext.Provider value={NOOP}>{children}</HumeVoiceContext.Provider>;
  }

  return (
    <HumeSDKProvider onToolCall={handleToolCall} clearMessagesOnDisconnect={false}>
      <HumeVoiceBridge
        authUser={authUser}
        profileId={profileId}
        tab={tab}
        enabled={enabled}
        toolHandlersRef={toolHandlersRef}
        onSwitchTab={onSwitchTab}
      >
        {children}
      </HumeVoiceBridge>
    </HumeSDKProvider>
  );
}

export const useHumeVoiceOrchestrator = () => useContext(HumeVoiceContext) || NOOP;
