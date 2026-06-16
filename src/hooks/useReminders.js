import { useState, useEffect, useCallback, useRef } from "react";
import { useLocalStorage } from "./useLocalStorage.js";

const SNACK_INTERVAL_MS = 90 * 60 * 1000; // 1.5 hours

const ADRENAL_SNACKS = [
  "Apple + celery sticks 🍎",
  "Banana + 3 Medjool dates 🍌",
  "Coconut water + banana 🥥",
  "Apple + dates + celery 🌿",
  "Orange slices + dates 🍊",
];

const MORNING_STEPS = [
  { id: "lemon",   time: "On waking",      label: "Lemon water",              emoji: "🍋", desc: "16–32oz of fresh lemon water on an empty stomach" },
  { id: "celery",  time: "15–30 min later", label: "Celery juice",             emoji: "🥬", desc: "16oz pure fresh celery juice — nothing added" },
  { id: "hmds",    time: "15–30 min later", label: "Heavy Metal Detox Smoothie", emoji: "🫐", desc: "Wild blueberries, banana, spirulina, barley grass, Atlantic dulse, cilantro, orange juice" },
];

function getRandomSnack() {
  return ADRENAL_SNACKS[Math.floor(Math.random() * ADRENAL_SNACKS.length)];
}

export function useReminders() {
  const [settings, setSettings] = useLocalStorage("cs_reminders", {
    adrenalSnack: true,
    morningProtocol: true,
    supplements: false,
  });
  const [activeReminder, setActiveReminder] = useState(null);
  const snackTimerRef = useRef(null);
  const lastSnackRef = useRef(null);

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
    setSettings((s) => ({ ...s, [key]: val }));
  }, [setSettings]);

  return {
    settings,
    updateSetting,
    activeReminder,
    dismiss,
    snooze,
    MORNING_STEPS,
  };
}
