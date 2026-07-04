import { useState, useEffect, useCallback } from "react";

const DEFAULT_PREFS = { afternoon: { enabled: true, hour: 15 }, evening: { enabled: true, hour: 20 } };

export function useEncouragementPrefs(authUser, subscribed) {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authUser || !subscribed) return;
    fetch(`/api/encouragement/preferences?userId=${authUser.id}`)
      .then((res) => res.json())
      .then((data) => { if (data.encouragementPrefs) setPrefs(data.encouragementPrefs); })
      .catch(() => {});
  }, [authUser, subscribed]);

  const updatePrefs = useCallback(async (next) => {
    if (!authUser) return;
    setPrefs(next);
    setLoading(true);
    try {
      await fetch("/api/encouragement/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: authUser.id, encouragementPrefs: next }),
      });
    } catch {
      // best-effort — local state already reflects the user's choice
    }
    setLoading(false);
  }, [authUser]);

  const updateWindow = useCallback((window, patch) => {
    updatePrefs({ ...prefs, [window]: { ...prefs[window], ...patch } });
  }, [prefs, updatePrefs]);

  return { prefs, updateWindow, loading };
}
