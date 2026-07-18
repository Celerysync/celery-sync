import { useMemo } from "react";
import { supabase } from "../lib/supabase.js";
import { TODAY, filterTodaysItems, rhythmRowToItem } from "../lib/rhythmSchedule.js";
import { buildProgramItem, programDescription } from "../lib/savedRhythms.js";
import { TAB_CONTEXT } from "../lib/voiceTabContext.js";

const todayStr = TODAY;

// activeProgram lives in localStorage, not Supabase (see useRhythm.js) — read
// it directly since voice tools run client-side on the same page.
function readActiveProgram() {
  try {
    const raw = localStorage.getItem("cs_active_program");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// The SAME "what's actually scheduled today" filter the Rhythm screen uses
// (weekday-only items, multi-day program windows, expired items) — so voice
// can never see or tick something that isn't even showing on screen.
async function todaysItems(profileId) {
  const { data } = await supabase
    .from("rhythm_items")
    .select("*")
    .eq("profile_id", profileId)
    .order("sort_order", { ascending: true });
  return filterTodaysItems((data || []).map(rhythmRowToItem), readActiveProgram());
}

// Today's rhythm state from the activity_events ledger (spec §1) — the same
// v_daily_status the Rhythm screen reads, so the companion and the checkboxes
// can never disagree.
async function todayStatus(profileId) {
  const [items, statusRes] = await Promise.all([
    todaysItems(profileId),
    supabase.from("v_daily_status")
      .select("item_id, status")
      .eq("profile_id", profileId)
      .eq("local_date", TODAY()),
  ]);
  const doneIds = new Set(
    (statusRes.data || []).filter((r) => r.status === "completed").map((r) => r.item_id)
  );
  const withStatus = items.map((i) => ({
    name: i.name,
    done: doneIds.has(i.id),
    time: i.fixedTime || undefined,
  }));
  return { items: withStatus, completed: withStatus.filter((i) => i.done).length, total: withStatus.length };
}

// Hume EVI tool implementations — write directly to Supabase rather than
// delegating to a specific tab's local component state, so these work
// identically no matter which tab the user is actually looking at. This
// replaces src/lib/voiceIntake.js's parse-then-write flow: Hume's paired
// Claude model calls these as native tools mid-conversation instead of a
// separate post-hoc text parse.
export function useVoiceTools(authUser, profileId, onSwitchTab) {
  const userId = authUser?.id;
  return useMemo(() => ({
    // Lets the user navigate by voice ("take me to Track", "open supplements").
    // Ambient tab context (voiceTabContext.js) only tells the companion where
    // the user IS; this is the one tool that actually moves them.
    async switch_tab(args) {
      const requested = String(args?.tab || "").trim().toLowerCase();
      const validTabs = Object.keys(TAB_CONTEXT);
      if (!validTabs.includes(requested)) {
        return { error: "invalid_tab", message: `"${args?.tab}" isn't a real tab. Valid tabs are: ${validTabs.join(", ")}.` };
      }
      if (!onSwitchTab) {
        return { error: "unavailable", message: "Tab switching isn't available right now." };
      }
      onSwitchTab(requested);
      return { switched_to: requested };
    },

    // Spec §3.3 — "done my juice" ticks the real checkbox. Writes the same
    // activity_events ledger as a tap; the Rhythm screen's Realtime
    // subscription animates the checkbox on screen as this row lands.
    async mark_activity(args) {
      if (!profileId) throw new Error("No active profile");
      if (!userId) throw new Error("Not signed in");
      const query = String(args?.item_name || "").trim().toLowerCase();
      if (!query) throw new Error("item_name required");
      const action = args?.action === "uncomplete" ? "uncompleted" : "completed";

      const items = await todaysItems(profileId);
      const matches = items.filter((i) => {
        const n = i.name.toLowerCase();
        return n === query || n.includes(query) || query.includes(n);
      });
      if (matches.length === 0) {
        const names = items.map((i) => i.name).join(", ") || "nothing scheduled today";
        return { error: "not_found", message: `No item scheduled for today matches "${args.item_name}". Today's items are: ${names}. Ask which one they meant — never guess.` };
      }
      if (matches.length > 1) {
        return { error: "ambiguous", message: `Multiple items match: ${matches.map((m) => m.name).join(", ")}. Ask the user which one they meant.` };
      }

      const item = matches[0];
      const activeProgram = readActiveProgram();
      const { error } = await supabase.from("activity_events").insert({
        user_id: userId,
        profile_id: profileId,
        item_id: item.id,
        item_name: item.name,
        item_category: item.category || "other",
        event_type: action,
        source: "voice",
        occurred_at: new Date().toISOString(),
        local_date: todayStr(),
        program_id: activeProgram?.id ?? null,
      });
      if (error) throw new Error(error.message);

      const status = await todayStatus(profileId);
      return { marked: item.name, action, completed_today: status.completed, total_today: status.total };
    },

    // Spec §3.3 — the companion always knows the real state before speaking.
    async get_today_status() {
      if (!profileId) throw new Error("No active profile");
      return todayStatus(profileId);
    },

    // Spec §3.3 — spoken reflection saved to today's journal notes.
    async save_reflection(args) {
      if (!profileId) throw new Error("No active profile");
      const text = String(args?.text || "").trim();
      if (!text) throw new Error("text required");
      const { data: existing } = await supabase
        .from("daily_checkins")
        .select("notes")
        .eq("profile_id", profileId)
        .eq("check_date", todayStr())
        .maybeSingle();
      const notes = existing?.notes ? `${existing.notes}\n${text}` : text;
      const { error } = await supabase
        .from("daily_checkins")
        .upsert({ profile_id: profileId, check_date: todayStr(), notes }, { onConflict: "profile_id,check_date" });
      if (error) throw new Error(error.message);
      return { saved: true };
    },

    async log_checkin(args) {
      if (!profileId) throw new Error("No active profile");
      const { data: existing } = await supabase
        .from("daily_checkins")
        .select("*")
        .eq("profile_id", profileId)
        .eq("check_date", todayStr())
        .maybeSingle();

      const symptoms = args.symptoms?.length
        ? [...new Set([...(existing?.symptoms || []), ...args.symptoms])]
        : existing?.symptoms;
      const notes = args.notes
        ? (existing?.notes ? `${existing.notes}\n${args.notes}` : args.notes)
        : existing?.notes;

      const row = {
        profile_id: profileId,
        check_date: todayStr(),
        energy: args.energy ?? existing?.energy,
        mood: args.mood ?? existing?.mood,
        symptoms,
        celery_oz: args.celery_oz ?? existing?.celery_oz,
        morning_protocol: args.morning_protocol ?? existing?.morning_protocol,
        notes,
      };
      const { error } = await supabase
        .from("daily_checkins")
        .upsert(row, { onConflict: "profile_id,check_date" });
      if (error) throw new Error(error.message);
      return { logged: true };
    },

    async log_restock(args) {
      if (!profileId) throw new Error("No active profile");
      if (!args?.name || !args?.unitsAdded) throw new Error("name and unitsAdded required");
      const name = String(args.name).trim();
      const { data: existing } = await supabase
        .from("supplement_inventory")
        .select("*")
        .eq("profile_id", profileId)
        .eq("supplement_name", name)
        .maybeSingle();

      const newTotal = (existing?.units_on_hand ?? 0) + Number(args.unitsAdded);
      const { error } = await supabase.from("supplement_inventory").upsert({
        profile_id: profileId,
        supplement_name: name,
        units_on_hand: newTotal,
        units_per_dose: existing?.units_per_dose ?? 1,
        restock_threshold_days: existing?.restock_threshold_days ?? 7,
        low_stock_alerted_on: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "profile_id,supplement_name" });
      if (error) throw new Error(error.message);
      return { logged: true, newTotal };
    },

    // Voice-first program building: the user reads their own book aloud and the
    // companion collects the program (name, length, items with day ranges) and
    // saves it in one call. Same saved_rhythms shape the RhythmBuilder writes —
    // a row whose items carry programDayRange IS a program (no schema change).
    // Calling again with the same name replaces the items, so the user can
    // correct by voice ("actually make the apples days 4 to 6").
    async save_program(args) {
      if (!profileId) throw new Error("No active profile");
      const name = String(args?.name || "").trim();
      const totalDays = Number(args?.total_days);
      const rawItems = Array.isArray(args?.items) ? args.items : [];
      if (!name) throw new Error("name required");
      if (!Number.isInteger(totalDays) || totalDays < 2 || totalDays > 90) {
        return { error: "invalid_days", message: "total_days must be a whole number between 2 and 90. Ask the user how many days their program runs." };
      }
      if (!rawItems.length) {
        return { error: "no_items", message: "At least one item is required. Ask the user what the program includes and on which days." };
      }

      const items = [];
      for (const [idx, it] of rawItems.entries()) {
        if (!String(it?.name || "").trim()) {
          return { error: "invalid_item", message: `Item ${idx + 1} has no name. Ask the user to repeat it.` };
        }
        items.push(buildProgramItem(it, totalDays, idx + 1));
      }

      // Same name = update in place, so voice corrections don't pile up copies
      const { data: existing } = await supabase
        .from("saved_rhythms")
        .select("id")
        .eq("profile_id", profileId)
        .eq("name", name)
        .maybeSingle();

      const row = {
        profile_id: profileId,
        name,
        emoji: args.emoji || "✨",
        description: programDescription(totalDays),
        items,
      };
      const { error } = existing
        ? await supabase.from("saved_rhythms").update(row).eq("id", existing.id)
        : await supabase.from("saved_rhythms").insert(row);
      if (error) throw new Error(error.message);

      return {
        saved: name,
        updated_existing: !!existing,
        total_days: totalDays,
        items: items.map((i) => `${i.name} (days ${i.programDayRange[0]}–${i.programDayRange[1]})`),
        message: `Program "${name}" saved. The user can start it from the Programs tab of their Rhythm builder — offer to take them there with switch_tab("home").`,
      };
    },

    async log_rhythm_item(args) {
      if (!profileId) throw new Error("No active profile");
      if (!args?.name) throw new Error("name required");
      const { data: maxRow } = await supabase
        .from("rhythm_items")
        .select("sort_order")
        .eq("profile_id", profileId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { error } = await supabase.from("rhythm_items").insert({
        profile_id: profileId,
        name: args.name,
        emoji: "🌿",
        category: args.category || "other",
        fixed_time: args.fixedTime || null,
        note: args.note || "",
        frequency: args.frequency || "daily",
        sort_order: (maxRow?.sort_order ?? 0) + 1,
      });
      if (error) throw new Error(error.message);
      return { logged: true };
    },
  }), [userId, profileId, onSwitchTab]);
}
