import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase.js";

// user_voice_prefs (spec §2.5) — one row per auth user (not per profile):
// the companion's voice, its optional name, and the morning/evening TTS
// nudge toggles. RLS restricts every row to its owner.
const DEFAULT_PREFS = {
  voice_id: null,        // 'hume:<PROVIDER>:<id>' or 'el:<id>' (see voiceService.js)
  companion_name: null,
  morning_nudge: true,
  evening_nudge: true,
};

export function useVoicePrefs(authUser) {
  const userId = authUser?.id;
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from("user_voice_prefs")
      .select("voice_id, companion_name, morning_nudge, evening_nudge")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) setPrefs({ ...DEFAULT_PREFS, ...data });
        setLoaded(true);
      });
    return () => { cancelled = true; };
  }, [userId]);

  // Optimistic: the UI updates immediately; a failed write rolls back so the
  // toggles never lie about what's persisted.
  const savePrefs = useCallback(async (patch) => {
    if (!userId) return;
    let previous;
    setPrefs((p) => { previous = p; return { ...p, ...patch }; });
    const { error } = await supabase.from("user_voice_prefs").upsert(
      { user_id: userId, ...previous, ...patch, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    if (error) {
      console.error("user_voice_prefs upsert failed:", error.message);
      setPrefs(previous);
    }
  }, [userId]);

  return { prefs, loaded, savePrefs };
}
