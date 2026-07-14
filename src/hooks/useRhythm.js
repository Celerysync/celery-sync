import { useEffect, useCallback, useMemo, useState } from "react";
import { useLocalStorage } from "./useLocalStorage.js";
import { supabase } from "../lib/supabase.js";
import { RHYTHM_PRESETS, ALL_PROGRAMS } from "../data/rhythmTemplates.js";
import { TODAY, programDayNumber, filterTodaysItems, rhythmRowToItem } from "../lib/rhythmSchedule.js";

// scheduledMs is computed for relative items (cascading from the anchor, or
// the previous item's actual completion time) AND for fixedTime items
// (absolute "HH:MM", independent of the anchor entirely) — a fixedTime item
// shows up even if the user has never set a wake-time anchor at all, since
// voice-entered items ("B12 at 9am") shouldn't require that setup first.
function calculateSequence(orderedItems, anchorTime, completions) {
  if (orderedItems.length === 0) return [];
  const today = new Date();
  let prevMs = null;
  if (anchorTime) {
    const [h, m] = anchorTime.split(":").map(Number);
    prevMs = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m, 0, 0).getTime();
  }
  return orderedItems.map((item) => {
    const completionStr = completions[item.id];
    const completedAt = completionStr ? new Date(completionStr) : null;
    let scheduledMs = null;
    if (item.fixedTime) {
      const [fh, fm] = item.fixedTime.split(":").map(Number);
      scheduledMs = new Date(today.getFullYear(), today.getMonth(), today.getDate(), fh, fm, 0, 0).getTime();
    } else if (prevMs != null) {
      scheduledMs = prevMs + (item.spacingMinutes || 0) * 60_000;
      prevMs = completedAt ? completedAt.getTime() : scheduledMs;
    }
    return { ...item, scheduledMs, completedAt };
  });
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

const rowToItem = rhythmRowToItem;

function itemToRow(item, profileId) {
  return {
    profile_id: profileId,
    name: item.name,
    emoji: item.emoji || "🌿",
    category: item.category || "other",
    spacing_minutes: item.spacingMinutes ?? 0,
    fixed_time: item.fixedTime ?? null,
    frequency: item.frequency ?? "daily",
    duration_type: item.durationType ?? "ongoing",
    duration_days: item.durationDays ?? null,
    start_date: item.startDate ?? null,
    is_medicine: item.isMedicine ?? false,
    note: item.note ?? "",
    sort_order: item.sortOrder ?? 0,
  };
}

export function useRhythm(authUser, profileId) {
  const [baseItems, setBaseItems] = useState([]);
  const [anchorTime, setAnchorTimeState] = useState("");
  const [rhythmLoaded, setRhythmLoaded] = useState(false);
  const [activeProgram, setActiveProgram] = useLocalStorage("cs_active_program", null);
  // localStorage completions as instant-response cache; Supabase is source of truth
  const [completions, setCompletions] = useLocalStorage(`cs_completions_${TODAY()}`, {});
  const [syncError, setSyncError] = useState(null);

  // Auto-clear the sync error banner after a few seconds
  useEffect(() => {
    if (!syncError) return;
    const id = setTimeout(() => setSyncError(null), 5000);
    return () => clearTimeout(id);
  }, [syncError]);

  // Load rhythm items + anchor from Supabase, migrating any existing
  // localStorage data on first load so nobody loses their schedule.
  useEffect(() => {
    if (!profileId) { setRhythmLoaded(false); return; }
    (async () => {
      setRhythmLoaded(false);
      const [itemsRes, profileRes] = await Promise.all([
        supabase.from("rhythm_items").select("*").eq("profile_id", profileId).order("sort_order", { ascending: true }),
        supabase.from("profiles").select("rhythm_anchor_time").eq("id", profileId).maybeSingle(),
      ]);

      let items = itemsRes.data || [];
      let anchor = profileRes.data?.rhythm_anchor_time || "";

      if (!items.length) {
        let localItems = [];
        try { localItems = JSON.parse(localStorage.getItem("cs_rhythm_items") || "[]"); } catch { localItems = []; }
        if (localItems.length) {
          const rows = localItems.map((item) => itemToRow(item, profileId));
          const { data: inserted } = await supabase.from("rhythm_items").insert(rows).select("*");
          items = inserted || [];
        }
        if (!anchor) {
          anchor = localStorage.getItem("cs_rhythm_anchor") || "";
          if (anchor) await supabase.from("profiles").update({ rhythm_anchor_time: anchor }).eq("id", profileId);
        }
      }

      setBaseItems(items.map(rowToItem));
      setAnchorTimeState(anchor);
      setRhythmLoaded(true);
    })();
  }, [profileId]);

  const setAnchorTime = useCallback((t) => {
    setAnchorTimeState(t);
    if (profileId) supabase.from("profiles").update({ rhythm_anchor_time: t }).eq("id", profileId).then(() => {});
  }, [profileId]);

  // On mount + profile change, pull today's status from the ledger view.
  // The ledger is the source of truth; localStorage is only the instant-paint
  // cache, so a successful load replaces it (a failed load keeps it).
  useEffect(() => {
    if (!authUser?.id || !profileId) return;
    (async () => {
      const { data, error } = await supabase
        .from("v_daily_status")
        .select("item_id, status, occurred_at")
        .eq("profile_id", profileId)
        .eq("local_date", TODAY());
      if (error) return;
      const fromDb = {};
      (data || []).forEach((r) => {
        if (r.status === "completed") fromDb[r.item_id] = r.occurred_at;
      });
      setCompletions(fromDb);
    })();
  }, [authUser?.id, profileId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime: any new ledger event for this profile — a voice tick, another
  // device, a carer — updates today's checkboxes live, no refresh.
  useEffect(() => {
    if (!profileId) return;
    const channel = supabase
      .channel(`activity_events_${profileId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "activity_events",
        filter: `profile_id=eq.${profileId}`,
      }, ({ new: row }) => {
        if (row.local_date !== TODAY()) return;
        setCompletions((prev) => {
          if (row.event_type === "completed") {
            if (prev[row.item_id]) return prev;
            return { ...prev, [row.item_id]: row.occurred_at };
          }
          if (!(row.item_id in prev)) return prev;
          const next = { ...prev };
          delete next[row.item_id];
          return next;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profileId, setCompletions]);

  const currentProgramDay = useMemo(() => {
    if (!activeProgram) return null;
    return programDayNumber(activeProgram.startDate, activeProgram.totalDays);
  }, [activeProgram]);

  const sequence = useMemo(() => {
    const todaysItems = filterTodaysItems(baseItems, activeProgram);
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

  const completeItem = useCallback(async (itemId) => {
    if (!authUser?.id || !profileId) {
      // Can't persist yet (profile still loading) — don't show a false "done"
      setSyncError("Still loading your profile — try again in a moment.");
      return;
    }
    const now = new Date().toISOString();
    let previous;
    setCompletions((prev) => {
      previous = prev;
      return { ...prev, [itemId]: now };
    });

    const item = [...baseItems, ...(ALL_PROGRAMS.find(p => p.id === activeProgram?.id)?.items ?? [])]
      .find((i) => i.id === itemId);
    // Append-only ledger — the single source of truth (spec §1). Every tick
    // is one event row; voice and reports read the same ledger.
    const { error } = await supabase.from("activity_events").insert({
      user_id: authUser.id,
      profile_id: profileId,
      item_id: itemId,
      item_name: item?.name ?? itemId,
      item_category: item?.category ?? "other",
      event_type: "completed",
      source: "tap",
      occurred_at: now,
      local_date: TODAY(),
      program_id: activeProgram?.id ?? null,
      program_day: currentProgramDay ?? null,
    });

    if (error) {
      console.error("activity_events insert failed:", error.message);
      setCompletions(previous);
      setSyncError("Couldn't save — check your connection and try again.");
      return;
    }

    setCompletions((latest) => {
      const todaysItems = filterTodaysItems(baseItems, activeProgram);
      const total = todaysItems.length;
      const completed = todaysItems.filter((i) => latest[i.id]).length;
      syncRhythmCountsToCheckin(profileId, authUser.id, completed, total, activeProgram, currentProgramDay);
      return latest;
    });
  }, [authUser?.id, profileId, baseItems, activeProgram, currentProgramDay, setCompletions]);

  const uncompleteItem = useCallback(async (itemId) => {
    if (!authUser?.id || !profileId) {
      setSyncError("Still loading your profile — try again in a moment.");
      return;
    }
    let previous;
    setCompletions((prev) => {
      previous = prev;
      const next = { ...prev };
      delete next[itemId];
      return next;
    });

    // Un-ticking is a reversal EVENT, not a deletion — the ledger is
    // append-only, and the latest event per item/day wins (v_daily_status).
    const item = baseItems.find((i) => i.id === itemId);
    const { error } = await supabase.from("activity_events").insert({
      user_id: authUser.id,
      profile_id: profileId,
      item_id: itemId,
      item_name: item?.name ?? itemId,
      item_category: item?.category ?? "other",
      event_type: "uncompleted",
      source: "tap",
      occurred_at: new Date().toISOString(),
      local_date: TODAY(),
      program_id: activeProgram?.id ?? null,
      program_day: currentProgramDay ?? null,
    });

    if (error) {
      console.error("activity_events insert failed:", error.message);
      setCompletions(previous);
      setSyncError("Couldn't save — check your connection and try again.");
      return;
    }

    setCompletions((latest) => {
      const todaysItems = filterTodaysItems(baseItems, activeProgram);
      const total = todaysItems.length;
      const completed = todaysItems.filter((i) => latest[i.id]).length;
      syncRhythmCountsToCheckin(profileId, authUser.id, completed, total, activeProgram, currentProgramDay);
      return latest;
    });
  }, [authUser?.id, profileId, baseItems, activeProgram, currentProgramDay, setCompletions]);

  // Adds an item and persists it immediately — used by both the manual
  // RhythmBuilder form and the voice/chat extraction path, so anything
  // captured either way is saved and shows up in today's sequence right away.
  const addItem = useCallback(async (item) => {
    if (!profileId) return null;
    const maxOrder = baseItems.reduce((mx, i) => Math.max(mx, i.sortOrder), 0);
    const row = itemToRow({ ...item, sortOrder: maxOrder + 1 }, profileId);
    const { data, error } = await supabase.from("rhythm_items").insert(row).select().single();
    if (error || !data) return null;
    const newItem = rowToItem(data);
    setBaseItems((prev) => [...prev, newItem]);
    return newItem;
  }, [baseItems, profileId]);

  const updateItem = useCallback((id, patch) => {
    setBaseItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    if (profileId) {
      const current = baseItems.find((i) => i.id === id);
      if (current) supabase.from("rhythm_items").update(itemToRow({ ...current, ...patch }, profileId)).eq("id", id).then(() => {});
    }
  }, [profileId, baseItems]);

  const removeItem = useCallback((id) => {
    setBaseItems((prev) => prev.filter((i) => i.id !== id));
    if (profileId) supabase.from("rhythm_items").delete().eq("id", id).then(() => {});
  }, [profileId]);

  const reorderItems = useCallback((fromIndex, toIndex) => {
    setBaseItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      const reordered = next.map((item, idx) => ({ ...item, sortOrder: idx + 1 }));
      if (profileId) {
        Promise.all(reordered.map((item) =>
          supabase.from("rhythm_items").update({ sort_order: item.sortOrder }).eq("id", item.id)
        )).catch(() => {});
      }
      return reordered;
    });
  }, [profileId]);

  const applyTemplate = useCallback(async (presetId, customItems) => {
    const items = customItems ?? RHYTHM_PRESETS.find((p) => p.id === presetId)?.items;
    if (!items || !profileId) return;
    const ordered = items.map((item, idx) => ({ ...item, sortOrder: idx + 1 }));

    // Replace the whole schedule — delete existing items, insert the template's
    await supabase.from("rhythm_items").delete().eq("profile_id", profileId);
    const rows = ordered.map((item) => itemToRow(item, profileId));
    const { data } = await supabase.from("rhythm_items").insert(rows).select("*");
    setBaseItems((data || []).map(rowToItem));
  }, [profileId]);

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
    rhythmLoaded,
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
    syncError,
  };
}
