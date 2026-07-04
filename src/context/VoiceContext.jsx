import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase.js";
import { useVoice } from "../hooks/useVoice.js";

const DEFAULT_VOICE = "el:IKne3meq5aSn9XLyUdCD"; // Charlie — friendly Aussie
const LS_KEY = "cs_voiceName";

const VoiceContext = createContext(null);

export function VoiceProvider({ authUser, children }) {
  // ── Preferences ──────────────────────────────────────────────────────────────
  const [voiceName, setVoiceNameState] = useState(
    () => localStorage.getItem(LS_KEY) || DEFAULT_VOICE
  );

  useEffect(() => {
    if (!authUser) return;
    const remote = authUser.user_metadata?.voice_name;
    if (remote && remote !== voiceName) {
      setVoiceNameState(remote);
      localStorage.setItem(LS_KEY, remote);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  const setVoiceName = useCallback(async (name) => {
    setVoiceNameState(name);
    localStorage.setItem(LS_KEY, name);
    if (authUser) {
      supabase.auth.updateUser({ data: { voice_name: name } }).catch(() => {});
    }
  }, [authUser]);

  // ── Single shared audio/STT instance for Today, Track, Companion, and GlobalVoice ──
  // Other TTS-only components (WeeklyReport, Cleanse, Body, Symptom) keep their
  // own useVoice instances; the _globalAudio singleton in useVoice.js already
  // prevents simultaneous playback.
  const units = localStorage.getItem("cs_units") === "imperial" ? "imperial" : "metric";
  const voice = useVoice(voiceName, units);

  // ── AbortController for cancellable AI/ElevenLabs fetch calls ─────────────────
  // Components call getAbortSignal() to get a signal tied to their latest request;
  // calling it again cancels the previous one. cancelPending() cancels without
  // issuing a new controller.
  const abortRef = useRef(null);

  // Combined with a timeout — previously this only cancelled the PREVIOUS
  // request when a new one started; a hung request with no follow-up call
  // would never be aborted and left the UI stuck (e.g. "Understanding…"
  // forever).
  const getAbortSignal = useCallback((timeoutMs = 20000) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    return AbortSignal.any([ac.signal, AbortSignal.timeout(timeoutMs)]);
  }, []);

  const cancelPending = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  // Session-wide "has the user interacted at all yet" flag — browsers block
  // autoplay without a gesture, and until now every unlock check was scoped
  // to a single component instance (Coach's own ref, WelcomeVoice's own
  // state), resetting every remount. This is shared app-wide so anything —
  // like ambient per-tab guidance — can check it once, globally.
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  useEffect(() => {
    if (audioUnlocked) return;
    const unlock = () => setAudioUnlocked(true);
    document.addEventListener("touchstart", unlock, { once: true, passive: true });
    document.addEventListener("click", unlock, { once: true });
    return () => {
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("click", unlock);
    };
  }, [audioUnlocked]);

  return (
    <VoiceContext.Provider value={{
      voiceName,
      setVoiceName,
      ...voice,
      getAbortSignal,
      cancelPending,
      audioUnlocked,
    }}>
      {children}
    </VoiceContext.Provider>
  );
}

// Backward-compatible: components that only need voice name preference (Account, WelcomeVoice, etc.)
export const useVoicePrefs = () => {
  const ctx = useContext(VoiceContext);
  return { voiceName: ctx.voiceName, setVoiceName: ctx.setVoiceName };
};

// Full orchestrator: shared voice state + methods + AbortController helpers.
// Used by Today, Track, Companion, and GlobalVoice — one source of truth for
// listening/speaking/transcript state across those surfaces.
export const useVoiceOrchestrator = () => useContext(VoiceContext);
