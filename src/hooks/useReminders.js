import { useState, useEffect, useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage.js";

// The in-app "snack break" banner (every 90 min, with suggested food pairings)
// was removed: the app was supplying a protocol step of its own. People who
// want snack reminders add them to their own rhythm, which has its own
// reminders. Only the generic morning banner remains — it points at the
// person's own Today list. (The key is still "morningProtocol" because that
// is what is stored server-side in reminder_prefs.)

export function useReminders(authUser) {
  const [settings, setSettings] = useLocalStorage("cs_reminders", {
    morningProtocol: true,
  });
  const [activeReminder, setActiveReminder] = useState(null);

  // This toggle gates the in-app reminder banners below. They're stored
  // server-side as well so the choice follows the user across devices — pull
  // the server's current state in on mount so they don't silently drift apart.
  useEffect(() => {
    if (!authUser) return;
    fetch(`/api/notifications/reminder-preferences?userId=${authUser.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.reminderPrefs) {
          setSettings((s) => ({ ...s, ...data.reminderPrefs }));
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id]);

  const dismiss = useCallback(() => setActiveReminder(null), []);

  const checkMorningProtocol = useCallback(() => {
    const now = new Date();
    const h = now.getHours();
    const today = now.toISOString().split("T")[0];
    const lastShown = localStorage.getItem("cs_morning_reminder_date");
    if (h >= 5 && h < 9 && lastShown !== today) {
      localStorage.setItem("cs_morning_reminder_date", today);
      setActiveReminder({ type: "morning" });
    }
  }, []);

  useEffect(() => {
    if (!settings.morningProtocol) return;
    checkMorningProtocol();
    // Check again every 10 minutes in case the app is left open
    const t = setInterval(checkMorningProtocol, 10 * 60 * 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.morningProtocol]);

  const updateSetting = useCallback((key, val) => {
    setSettings((s) => {
      const next = { ...s, [key]: val };
      if (authUser && key === "morningProtocol") {
        fetch("/api/notifications/reminder-preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: authUser.id,
            reminderPrefs: { morningProtocol: next.morningProtocol },
          }),
        }).catch(() => {});
      }
      return next;
    });
  }, [setSettings, authUser]);

  return {
    settings,
    updateSetting,
    activeReminder,
    dismiss,
  };
}
