import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase.js";

const DEFAULT_VOICE = "el:IKne3meq5aSn9XLyUdCD"; // Charlie — friendly Aussie
const LS_KEY = "cs_voiceName";

const VoiceContext = createContext({
  voiceName: DEFAULT_VOICE,
  setVoiceName: () => {},
});

export function VoiceProvider({ authUser, children }) {
  const [voiceName, setVoiceNameState] = useState(
    () => localStorage.getItem(LS_KEY) || DEFAULT_VOICE
  );

  // When the user logs in, pull their saved voice from Supabase metadata.
  // Falls back to whatever is already in localStorage.
  useEffect(() => {
    if (!authUser) return;
    const remote = authUser.user_metadata?.voice_name;
    if (remote && remote !== voiceName) {
      setVoiceNameState(remote);
      localStorage.setItem(LS_KEY, remote);
    }
  // Only run when the auth user identity changes, not on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  const setVoiceName = useCallback(async (name) => {
    setVoiceNameState(name);
    localStorage.setItem(LS_KEY, name);
    if (authUser) {
      // Fire-and-forget — don't block the UI on a network call.
      supabase.auth.updateUser({ data: { voice_name: name } }).catch(() => {});
    }
  }, [authUser]);

  return (
    <VoiceContext.Provider value={{ voiceName, setVoiceName }}>
      {children}
    </VoiceContext.Provider>
  );
}

export const useVoicePrefs = () => useContext(VoiceContext);
