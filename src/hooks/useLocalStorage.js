import { useEffect, useState, useCallback } from "react";

// Per-key subscriber lists so every useLocalStorage(key) instance in the
// page — not just the one that called setValue — re-renders when any of
// them changes the value. Without this, two components reading the same
// key (e.g. the Admin voice-provider toggle and App's own read of it)
// silently disagree until a full page reload.
const listeners = new Map(); // key -> Set<(next) => void>

function subscribe(key, fn) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(fn);
  return () => {
    const set = listeners.get(key);
    if (!set) return;
    set.delete(fn);
    if (set.size === 0) listeners.delete(key);
  };
}

function notify(key, next) {
  listeners.get(key)?.forEach((fn) => fn(next));
}

function readValue(key, initialValue) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  } catch {
    return initialValue;
  }
}

export function useLocalStorage(key, initialValue) {
  const [stored, setStored] = useState(() => readValue(key, initialValue));

  // Same-tab sync: another instance of this hook (any component) changed
  // this key via setValue below.
  useEffect(() => {
    return subscribe(key, (next) => setStored(next));
     
  }, [key]);

  // Cross-tab sync: the native storage event only fires in OTHER tabs/windows,
  // never the one that made the change — same-tab sync is handled above.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== key) return;
      setStored(e.newValue ? JSON.parse(e.newValue) : initialValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setValue = useCallback((value) => {
    setStored((prev) => {
      try {
        const next = typeof value === "function" ? value(prev) : value;
        localStorage.setItem(key, JSON.stringify(next));
        notify(key, next);
        return next;
      } catch {
        // localStorage unavailable (private browsing quota, etc.) — silently fall back to memory
        const next = typeof value === "function" ? value(prev) : value;
        notify(key, next);
        return next;
      }
    });
     
  }, [key]);

  return [stored, setValue];
}
