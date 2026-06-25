import { useEffect, useCallback, useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage.js";
import { RHYTHM_PRESETS, PROGRAM_369, ALL_PROGRAMS } from "../data/rhythmTemplates.js";

const TODAY = () => new Date().toISOString().split("T")[0];
const COMPLETIONS_KEY = () => `cs_completions_${TODAY()}`;

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Returns ISO date YYYY-MM-DD, N days after a given date string
function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

// How many days into a program is today? Returns 1-based day number, or null if not started / ended
function programDayNumber(startDate, totalDays) {
  if (!startDate) return null;
  const start = new Date(startDate + "T00:00:00");
  const today = new Date(TODAY() + "T00:00:00");
  const diff = Math.floor((today - start) / 86_400_000) + 1; // 1-based
  if (diff < 1 || diff > totalDays) return null;
  return diff;
}

// Cascade calculation: returns items with scheduledMs and completedAt populated
function calculateSequence(orderedItems, anchorTime, completions) {
  if (!anchorTime || orderedItems.length === 0) return [];

  const [h, m] = anchorTime.split(":").map(Number);
  const today = new Date();
  const anchorMs = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m, 0, 0).getTime();

  let prevMs = anchorMs;
  return orderedItems.map((item) => {
    const spacingMs = item.spacingMinutes * 60_000;
    const scheduledMs = prevMs + spacingMs;
    const completionStr = completions[item.id];
    const completedAt = completionStr ? new Date(completionStr) : null;

    // Self-adjust: next item's base = completion time (if late) or scheduled time
    prevMs = completedAt ? completedAt.getTime() : scheduledMs;

    return { ...item, scheduledMs, completedAt };
  });
}

// Filter which items apply today
function filterTodaysItems(baseItems, activeProgram) {
  const today = TODAY();
  const dow = new Date().getDay(); // 0=Sun
  const isWeekday = dow >= 1 && dow <= 5;

  // Resolve program day
  let programDay = null;
  if (activeProgram) {
    programDay = programDayNumber(activeProgram.startDate, activeProgram.totalDays);
  }

  const programItems = [];
  if (programDay !== null && activeProgram) {
    const program = ALL_PROGRAMS.find((p) => p.id === activeProgram.id);
    if (program) {
      for (const item of program.items) {
        const [from, to] = item.programDayRange;
        if (programDay >= from && programDay <= to) {
          programItems.push(item);
        }
      }
    }
  }

  const allItems = [...baseItems, ...programItems];

  return allItems.filter((item) => {
    // Frequency filter
    if (item.frequency === "weekdays" && !isWeekday) return false;

    // Duration filter
    if (item.durationType === "days" && item.durationDays && item.startDate) {
      const endDate = addDays(item.startDate, item.durationDays - 1);
      if (today > endDate) return false;
    }
    if (item.durationType === "cleanse" && !item.programId) return false;

    return true;
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function useRhythm() {
  const [baseItems, setBaseItems] = useLocalStorage("cs_rhythm_items", []);
  const [anchorTime, setAnchorTimeRaw] = useLocalStorage("cs_rhythm_anchor", "");
  const [activeProgram, setActiveProgram] = useLocalStorage("cs_active_program", null);
  const [completionsRaw, setCompletionsRaw] = useLocalStorage(COMPLETIONS_KEY(), {});

  // Completions are date-keyed — reload if date changes across midnight
  const completions = completionsRaw;

  const setAnchorTime = useCallback((t) => setAnchorTimeRaw(t), [setAnchorTimeRaw]);

  // Compute today's ordered sequence with scheduled times
  const sequence = useMemo(() => {
    const todaysItems = filterTodaysItems(baseItems, activeProgram);
    if (!anchorTime) return todaysItems.map((item) => ({ ...item, scheduledMs: null, completedAt: null }));
    return calculateSequence(todaysItems, anchorTime, completions);
  }, [baseItems, activeProgram, anchorTime, completions]);

  // Check if program ended (day > totalDays)
  const currentProgramDay = useMemo(() => {
    if (!activeProgram) return null;
    return programDayNumber(activeProgram.startDate, activeProgram.totalDays);
  }, [activeProgram]);

  // Auto-clear ended program after last day passes
  useEffect(() => {
    if (activeProgram && currentProgramDay === null) {
      setActiveProgram(null);
    }
  }, [activeProgram, currentProgramDay, setActiveProgram]);

  const hasMedicine = useMemo(
    () => baseItems.some((i) => i.isMedicine),
    [baseItems]
  );

  const completeItem = useCallback((itemId) => {
    setCompletionsRaw((prev) => ({
      ...prev,
      [itemId]: new Date().toISOString(),
    }));
  }, [setCompletionsRaw]);

  const uncompleteItem = useCallback((itemId) => {
    setCompletionsRaw((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }, [setCompletionsRaw]);

  const addItem = useCallback((item) => {
    const maxOrder = baseItems.reduce((mx, i) => Math.max(mx, i.sortOrder), 0);
    setBaseItems((prev) => [
      ...prev,
      { ...item, id: makeId(), sortOrder: maxOrder + 1 },
    ]);
  }, [baseItems, setBaseItems]);

  const updateItem = useCallback((id, patch) => {
    setBaseItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...patch } : i))
    );
  }, [setBaseItems]);

  const removeItem = useCallback((id) => {
    setBaseItems((prev) => prev.filter((i) => i.id !== id));
  }, [setBaseItems]);

  const reorderItems = useCallback((fromIndex, toIndex) => {
    setBaseItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next.map((item, idx) => ({ ...item, sortOrder: idx + 1 }));
    });
  }, [setBaseItems]);

  const applyTemplate = useCallback((presetId) => {
    const preset = RHYTHM_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setBaseItems(preset.items.map((item, idx) => ({ ...item, sortOrder: idx + 1 })));
  }, [setBaseItems]);

  const startProgram = useCallback((programId, startDate) => {
    const program = ALL_PROGRAMS.find((p) => p.id === programId);
    if (!program) return;
    setActiveProgram({
      id: programId,
      name: program.name,
      startDate: startDate || TODAY(),
      totalDays: program.totalDays,
    });
  }, [setActiveProgram]);

  const cancelProgram = useCallback(() => {
    setActiveProgram(null);
  }, [setActiveProgram]);

  const hasRhythm = baseItems.length > 0;

  return {
    sequence,
    baseItems,
    anchorTime,
    setAnchorTime,
    activeProgram,
    currentProgramDay,
    hasMedicine,
    hasRhythm,
    completeItem,
    uncompleteItem,
    addItem,
    updateItem,
    removeItem,
    reorderItems,
    applyTemplate,
    startProgram,
    cancelProgram,
    completions,
  };
}
