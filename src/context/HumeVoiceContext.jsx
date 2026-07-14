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

  // Session shell state (spec §3.2): timer, silence containment, meter
  const [sessionStartedAt, setSessionStartedAt] = useState(null);
  const [silenceWarning, setSilenceWarning] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [meterSecondsRemaining, setMeterSecondsRemaining] = useState(null);
  const lastActivityRef = useRef(0);
  const playingRef = useRef(false);
  const disconnectRef = useRef(() => {});

  useEffect(() => {
    playingRef.current = voice.isPlaying;
    disconnectRef.current = voice.disconnect;
  }, [voice.isPlaying, voice.disconnect]);

  // Any turn activity (including interim transcripts) resets the silence clock;
  // the interval below clears the warning on its next tick.
  useEffect(() => {
    lastActivityRef.current = Date.now();
  }, [voice.lastUserMessage, voice.lastVoiceMessage, voice.isPlaying]);

  // Track session open/close; on open, load this month's voice meter
  useEffect(() => {
    if (voice.readyState === "open") {
      setSessionStartedAt(Date.now());
      setTimedOut(false);
      lastActivityRef.current = Date.now();
      if (authUser?.id) {
        const d = new Date();
        const periodMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
        supabase.from("voice_usage_meter")
          .select("evi_seconds_used, evi_seconds_included, topup_seconds_remaining")
          .eq("user_id", authUser.id)
          .eq("period_month", periodMonth)
          .maybeSingle()
          .then(({ data }) => {
            // No meter row (e.g. pre-billing beta) → show nothing, never a scary zero
            setMeterSecondsRemaining(data
              ? Math.max(0, data.evi_seconds_included + data.topup_seconds_remaining - data.evi_seconds_used)
              : null);
          });
      }
    } else {
      setSessionStartedAt(null);
      setSilenceWarning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.readyState]);

  // Silence containment: warn at 20s of mutual silence, close gently at 30s
  useEffect(() => {
    if (voice.readyState !== "open") return;
    const id = setInterval(() => {
      if (playingRef.current) return;
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= SILENCE_CLOSE_MS) {
        setTimedOut(true);
        setSilenceWarning(false);
        disconnectRef.current();
      } else {
        setSilenceWarning(idle >= SILENCE_WARN_MS);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [voice.readyState]);

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

  const connect = useCallback(async () => {
    if (!enabled) return;
    setTimedOut(false);
    const [{ accessToken }, { configId }] = await Promise.all([
      fetchJSON("/api/hume/token", { method: "POST" }),
      fetchJSON("/api/hume/config"),
    ]);
    if (!accessToken || !configId) {
      throw new Error("Hume voice isn't configured yet — set HUME_API_KEY/HUME_SECRET_KEY/HUME_EVI_CONFIG_ID.");
    }
    const contextText = [memory.healingProfile?.healing_summary, TAB_CONTEXT[tab]]
      .filter(Boolean)
      .join("\n\n");
    await voice.connect({
      auth: { type: "accessToken", value: accessToken },
      configId,
      sessionSettings: contextText
        ? { context: { text: contextText, type: "persistent" } }
        : undefined,
    });
  }, [enabled, voice, memory.healingProfile, tab]);

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
        body: JSON.stringify({
          userId: authUser.id,
          profileId,
          surface: tab,
          userTranscript: userText || null,
          assistantTranscript: assistantText,
          latencyMs,
          emotionScores: voice.lastAssistantProsodyMessage?.models?.prosody?.scores ?? null,
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
