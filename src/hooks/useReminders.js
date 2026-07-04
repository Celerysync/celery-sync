import { useState, useEffect, useCallback, useRef } from "react";
import { useLocalStorage } from "./useLocalStorage.js";

const SNACK_INTERVAL_MS = 90 * 60 * 1000; // 1.5 hours

// Generic whole-food pairings in our own words — deliberately avoids any
// named health author's specific signature combinations. See LEGAL_CONSTRAINTS.md.
const ADRENAL_SNACKS = [
  "An apple with a spoon of nut butter 🍎",
  "A pear with a small handful of walnuts 🍐",
  "Orange segments with a few almonds 🍊",
  "Grapes with a couple of cashews 🍇",
  "Berries with a spoonful of tahini 🫐",
];

const MORNING_STEPS = [
  { id: "lemon",   time: "On waking",      label: "Lemon water",              emoji: "🍋", desc: "16–32oz of fresh lemon water on an empty stomach" },
  { id: "celery",  time: "15–30 min later", label: "Celery juice",             emoji: "🥬", desc: "16oz pure fresh celery juice — nothing added" },
  { id: "hmds",    time: "15–30 min later", label: "Heavy Metal Detox Smoothie", emoji: "🫐", desc: "Wild blueberries, banana, spirulina, barley grass, Atlantic dulse, cilantro, orange juice" },
];

function getRandomSnack() {
  return ADRENAL_SNACKS[Math.floor(Math.random() * ADRENAL_SNACKS.length)];
}

export function useReminders(authUser) {
  const [settings, setSettings] = useLocalStorage("cs_reminders", {
    adrenalSnack: true,
    morningProtocol: true,
    supplements: false,
  });
  const [activeReminder, setActiveReminder] = useState(null);
  const snackTimerRef = useRef(null);
  const lastSnackRef = useRef(null);

  // These two toggles also gate the server-side push reminders (not just the
  // in-app banners below) — pull the server's current state in on mount so
  // they don't silently drift apart.
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

  const snooze = useCallback(() => {
    setActiveReminder(null);
    // Re-fire after 20 minutes
    setTimeout(() => {
      setActiveReminder({
        type: "snack",
        snack: getRandomSnack(),
        snoozed: true,
      });
    }, 20 * 60 * 1000);
  }, []);

  const scheduleSnackReminder = useCallback(() => {
    if (snackTimerRef.current) clearInterval(snackTimerRef.current);
    snackTimerRef.current = setInterval(() => {
      const now = new Date();
      const h = now.getHours();
      // Only remind 7am–8pm
      if (h >= 7 && h <= 20) {
        setActiveReminder({ type: "snack", snack: getRandomSnack() });
        lastSnackRef.current = Date.now();
      }
    }, SNACK_INTERVAL_MS);
  }, []);

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
    if (settings.adrenalSnack) {
      scheduleSnackReminder();
    } else {
      if (snackTimerRef.current) clearInterval(snackTimerRef.current);
    }
    return () => {
      if (snackTimerRef.current) clearInterval(snackTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.adrenalSnack]);

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
      if (authUser && (key === "morningProtocol" || key === "adrenalSnack")) {
        fetch("/api/notifications/reminder-preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: authUser.id,
            reminderPrefs: { morningProtocol: next.morningProtocol, adrenalSnack: next.adrenalSnack },
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
    snooze,
    MORNING_STEPS,
  };
}
