import { useEffect, useCallback, useMemo, useRef } from "react";
import { useLocalStorage } from "./useLocalStorage.js";
import { supabase } from "../lib/supabase.js";
import { RHYTHM_PRESETS, ALL_PROGRAMS } from "../data/rhythmTemplates.js";

const TODAY = () => new Date().toISOString().split("T")[0];

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function programDayNumber(startDate, totalDays) {
  if (!startDate) return null;
  const start = new Date(startDate + "T00:00:00");
  const today = new Date(TODAY() + "T00:00:00");
  const diff = Math.floor((today - start) / 86_400_000) + 1;
  if (diff < 1 || diff > totalDays) return null;
  return diff;
}

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
    prevMs = completedAt ? completedAt.getTime() : scheduledMs;
    return { ...item, scheduledMs, completedAt };
  });
}

function filterTodaysItems(baseItems, activeProgram) {
  const today = TODAY();
  const dow = new Date().getDay();
  const isWeekday = dow >= 1 && dow <= 5;

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

  return [...baseItems, ...programItems].filter((item) => {
    if (item.frequency === "weekdays" && !isWeekday) return false;
    if (item.durationType === "days" && item.durationDays && item.startDate) {
      const endDate = addDays(item.startDate, item.durationDays - 1);
      if (today > endDate) return false;
    }
    if (item.durationType === "cleanse" && !item.programId) return false;
    return true;
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

// Write rhythm completion counts back to daily_checkins so the AI coach sees them
async function syncRhythmCountsToCheckin(profileId, userId, completed, total, activeProgram, programDay) {
  if (!profileId || !userId) return;
  await supabase.from("daily_checkins").upsert({
    profile_id: profileId,
    user_id: userId,
    check_date: TODAY(),
    rhythm_completed: completed,
    rhythm_total: total,
    active_protocol_id: activeProgram?.dbId ?? null,
    active_protocol_day: programDay ?? null,
  }, { onConflict: "profile_id,check_date" });
}

export function useRhythm(authUser, profileId) {
  const [baseItems, setBaseItems] = useLocalStorage("cs_rhythm_items", []);
  const [anchorTime, setAnchorTimeRaw] = useLocalStorage("cs_rhythm_anchor", "");
  const [activeProgram, setActiveProgram] = useLocalStorage("cs_active_program", null);
  // localStorage completions as instant-response cache; Supabase is source of truth
  const [completions, setCompletions] = useLocalStorage(`cs_completions_${TODAY()}`, {});

  const setAnchorTime = useCallback((t) => setAnchorTimeRaw(t), [setAnchorTimeRaw]);

  // On mount + profile change, pull today's completions from Supabase and merge
  useEffect(() => {
    if (!authUser?.id || !profileId) return;
    (async () => {
      const { data } = await supabase
        .from("rhythm_completions")
        .select("item_id, completed_at")
        .eq("profile_id", profileId)
        .eq("date", TODAY());
      if (data?.length) {
        const fromDb = {};
        data.forEach((r) => { fromDb[r.item_id] = r.completed_at; });
        setCompletions((prev) => ({ ...fromDb, ...prev }));
      }
    })();
  }, [authUser?.id, profileId]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentProgramDay = useMemo(() => {
    if (!activeProgram) return null;
    return programDayNumber(activeProgram.startDate, activeProgram.totalDays);
  }, [activeProgram]);

  const sequence = useMemo(() => {
    const todaysItems = filterTodaysItems(baseItems, activeProgram);
    if (!anchorTime) return todaysItems.map((item) => ({ ...item, scheduledMs: null, completedAt: null }));
    return calculateSequence(todaysItems, anchorTime, completions);
  }, [baseItems, activeProgram, anchorTime, completions]);

  const hasMedicine = useMemo(() => baseItems.some((i) => i.isMedicine), [baseItems]);

  // Auto-complete program when it ends
  useEffect(() => {
    if (!activeProgram || currentProgramDay !== null) return;
    // Program has ended — mark complete in Supabase
    if (authUser?.id && activeProgram.dbId) {
      supabase.from("active_protocols")
        .update({ completed: true, end_date: TODAY() })
        .eq("id", activeProgram.dbId)
        .then(() => {});
    }
    setActiveProgram(null);
  }, [activeProgram, currentProgramDay, authUser?.id, setActiveProgram]);

  const completeItem = useCallback((itemId) => {
    const now = new Date().toISOString();
    setCompletions((prev) => ({ ...prev, [itemId]: now }));

    // Write to Supabase rhythm_completions
    if (authUser?.id && profileId) {
      const item = [...baseItems, ...(ALL_PROGRAMS.find(p => p.id === activeProgram?.id)?.items ?? [])]
        .find((i) => i.id === itemId);
      supabase.from("rhythm_completions").upsert({
        profile_id: profileId,
        date: TODAY(),
        item_id: itemId,
        item_name: item?.name ?? itemId,
        item_category: item?.category ?? "other",
        completed_at: now,
        program_id: activeProgram?.id ?? null,
        program_day: currentProgramDay ?? null,
      }, { onConflict: "profile_id,date,item_id" }).then(() => {
        // After each completion, sync counts to daily_checkins
        setCompletions((latest) => {
          const todaysItems = filterTodaysItems(baseItems, activeProgram);
          const total = todaysItems.length;
          const completed = todaysItems.filter((i) => latest[i.id]).length;
          syncRhythmCountsToCheckin(profileId, authUser.id, completed, total, activeProgram, currentProgramDay);
          return latest;
        });
      });
    }
  }, [authUser?.id, profileId, baseItems, activeProgram, currentProgramDay, setCompletions]);

  const uncompleteItem = useCallback((itemId) => {
    setCompletions((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    if (authUser?.id && profileId) {
      supabase.from("rhythm_completions")
        .delete()
        .eq("profile_id", profileId)
        .eq("date", TODAY())
        .eq("item_id", itemId)
        .then(() => {
          setCompletions((latest) => {
            const todaysItems = filterTodaysItems(baseItems, activeProgram);
            const total = todaysItems.length;
            const completed = todaysItems.filter((i) => latest[i.id]).length;
            syncRhythmCountsToCheckin(profileId, authUser.id, completed, total, activeProgram, currentProgramDay);
            return latest;
          });
        });
    }
  }, [authUser?.id, profileId, baseItems, activeProgram, currentProgramDay, setCompletions]);

  const addItem = useCallback((item) => {
    const maxOrder = baseItems.reduce((mx, i) => Math.max(mx, i.sortOrder), 0);
    setBaseItems((prev) => [...prev, { ...item, id: makeId(), sortOrder: maxOrder + 1 }]);
  }, [baseItems, setBaseItems]);

  const updateItem = useCallback((id, patch) => {
    setBaseItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
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

  const applyTemplate = useCallback((presetId, customItems) => {
    const items = customItems ?? RHYTHM_PRESETS.find((p) => p.id === presetId)?.items;
    if (!items) return;
    setBaseItems(items.map((item, idx) => ({ ...item, sortOrder: idx + 1 })));
  }, [setBaseItems]);

  const startProgram = useCallback(async (programId, startDate) => {
    const program = ALL_PROGRAMS.find((p) => p.id === programId);
    if (!program) return;
    const start = startDate || TODAY();

    let dbId = null;
    if (authUser?.id && profileId) {
      const { data } = await supabase.from("active_protocols").insert({
        profile_id: profileId,
        program_id: programId,
        program_name: program.name,
        start_date: start,
        total_days: program.totalDays,
      }).select().single();
      dbId = data?.id ?? null;
    }

    setActiveProgram({
      id: programId,
      name: program.name,
      startDate: start,
      totalDays: program.totalDays,
      dbId,
    });
  }, [authUser?.id, profileId, setActiveProgram]);

  const cancelProgram = useCallback(() => {
    if (authUser?.id && activeProgram?.dbId) {
      supabase.from("active_protocols")
        .update({ abandoned: true, end_date: TODAY() })
        .eq("id", activeProgram.dbId)
        .then(() => {});
    }
    setActiveProgram(null);
  }, [authUser?.id, activeProgram, setActiveProgram]);

  return {
    sequence,
    baseItems,
    anchorTime,
    setAnchorTime,
    activeProgram,
    currentProgramDay,
    hasMedicine,
    hasRhythm: baseItems.length > 0,
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
