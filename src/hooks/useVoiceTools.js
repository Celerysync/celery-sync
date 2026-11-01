import { useMemo } from "react";
import { supabase } from "../lib/supabase.js";
import { TODAY, filterTodaysItems, rhythmRowToItem, rhythmItemToRow, RHYTHM_CHANGED_EVENT } from "../lib/rhythmSchedule.js";
import { buildProgramItem, programDescription, isProgramRow, savedRowToProgram } from "../lib/savedRhythms.js";
import { setLocalStorageValue } from "./useLocalStorage.js";
import { SUPPLEMENTS_CHANGED_EVENT } from "./useUserSupplements.js";
import { TAB_CONTEXT, resolveDestination } from "../lib/voiceTabContext.js";

const todayStr = TODAY;

// Fuzzy name match shared by every tool that acts on something by name:
// exact first, then contains either way. Never guesses between several.
function matchByName(rows, query, nameOf = (r) => r.name) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return { error: "name_required", message: "Ask the user which one they mean." };
  const exact = rows.filter((r) => nameOf(r).trim().toLowerCase() === q);
  if (exact.length === 1) return { match: exact[0] };
  const loose = rows.filter((r) => { const n = nameOf(r).toLowerCase(); return n.includes(q) || q.includes(n); });
  if (loose.length === 1) return { match: loose[0] };
  const names = rows.map(nameOf).join(", ") || "nothing";
  if (loose.length > 1) return { error: "ambiguous", message: `Several match "${query}": ${loose.map(nameOf).join(", ")}. Ask which one — never guess.` };
  return { error: "not_found", message: `Nothing matches "${query}". What's there: ${names}. Ask which one they meant — never guess.` };
}

// Anything that removes or replaces needs the user's spoken yes first. The
// tool itself enforces it: without confirmed=true it changes nothing and
// tells the companion exactly what to ask. A misheard word alone can't
// remove anything.
const needsYes = (question) => ({
  needs_confirmation: true,
  changed_nothing: true,
  message: `Nothing has been changed yet. Ask the user: "${question}" Only if they clearly say yes, call this tool again with confirmed: true.`,
});

async function activeRhythmRows(profileId) {
  const { data } = await supabase
    .from("rhythm_items")
    .select("*")
    .eq("profile_id", profileId)
    .is("archived_at", null)
    .order("sort_order", { ascending: true });
  return data || [];
}

const rhythmChanged = () => window.dispatchEvent(new Event(RHYTHM_CHANGED_EVENT));
const cleanTime = (t) => (/^\d{1,2}:\d{2}$/.test(String(t || "").trim()) ? String(t).trim().padStart(5, "0") : null);

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
    .is("archived_at", null)
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
      // Resolves through the shared app map, so retired names ("track",
      // "supplements", "learn") from an older Hume tool config still land
      // in the right place.
      const dest = resolveDestination(args?.tab, args?.section);
      if (!dest) {
        return { error: "invalid_tab", message: `"${args?.tab}" isn't a place in the app. Valid: ${Object.keys(TAB_CONTEXT).join(", ")} (optionally with a section, e.g. home:supplements, companion:feelings, settings:sources).` };
      }
      if (!onSwitchTab) {
        return { error: "unavailable", message: "Tab switching isn't available right now." };
      }
      onSwitchTab(dest.tab, dest.section);
      return { switched_to: dest.section ? `${dest.tab}:${dest.section}` : dest.tab };
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
        // celery_oz / morning_protocol are deliberately not written: they were
        // app-supplied protocol fields. A Hume config that still declares them
        // is ignored here; "I had my juice" should go through mark_activity
        // against the user's own rhythm item instead.
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
      rhythmChanged();

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
      const name = String(args?.name || "").trim();
      if (!name) throw new Error("name required");
      const time = /^\d{1,2}:\d{2}$/.test(args?.fixedTime || "") ? args.fixedTime.padStart(5, "0") : null;
      const rows = await activeRhythmRows(profileId);
      // Same name again = the user is adjusting that item (usually adding a
      // time), not asking for a second copy. This used to insert duplicates.
      const existing = rows.find((r) => r.name.trim().toLowerCase() === name.toLowerCase());
      // A set time is what makes the server send a reminder for the item
      // (server/routes/rhythm.js) — schedule is the source of truth, fixed_time mirrors it.
      const timing = time ? { fixed_time: time, schedule: { type: "times", times: [time] } } : {};
      let error;
      if (existing) {
        const patch = { ...timing, ...(args.note ? { note: args.note } : {}), ...(args.frequency ? { frequency: args.frequency } : {}), changed_via: "voice" };
        ({ error } = await supabase.from("rhythm_items").update(patch).eq("id", existing.id));
      } else {
        ({ error } = await supabase.from("rhythm_items").insert({
          profile_id: profileId,
          name,
          emoji: "🌿",
          category: args.category || "other",
          fixed_time: null,
          note: args.note || "",
          frequency: args.frequency || "daily",
          sort_order: (rows.at(-1)?.sort_order ?? 0) + 1,
          changed_via: "voice",
          ...timing,
        }));
      }
      if (error) throw new Error(error.message);
      rhythmChanged();
      const names = existing ? rows.map((r) => r.name) : [...rows.map((r) => r.name), name];
      return {
        saved: true,
        action: existing ? "updated_existing_item" : "added_new_item",
        item: existing ? existing.name : name,
        reminder_time: time,
        rhythm_now: names,
        message: existing
          ? `"${existing.name}" was already in their rhythm, so it was updated${time ? ` with a reminder at ${time}` : ""} — no duplicate added.`
          : `"${name}" is now in their rhythm${time ? ` with a reminder at ${time}` : ""}. It's on their screen now.`,
      };
    },

    // Change anything about an existing item: name, reminder times, how
    // often, note, category. times: [] clears the time (and so the reminder).
    async update_rhythm_item(args) {
      if (!profileId) throw new Error("No active profile");
      const rows = await activeRhythmRows(profileId);
      const found = matchByName(rows, args?.item_name);
      if (found.error) return found;
      const item = found.match;
      const patch = { changed_via: "voice" };
      const said = [];
      if (args.new_name && String(args.new_name).trim()) { patch.name = String(args.new_name).trim(); said.push(`renamed to "${patch.name}"`); }
      if (Array.isArray(args.times)) {
        const times = [...new Set(args.times.map(cleanTime).filter(Boolean))].sort();
        if (args.times.length && !times.length) return { error: "invalid_time", message: "Times must be 24-hour HH:MM, e.g. 05:45 or 20:30. Ask the user to repeat the time." };
        patch.schedule = times.length ? { type: "times", times } : null;
        patch.fixed_time = times[0] ?? null;
        said.push(times.length ? `reminder${times.length > 1 ? "s" : ""} at ${times.join(", ")}` : "time and reminder removed");
      }
      if (["daily", "weekdays", "as_needed"].includes(args.frequency)) { patch.frequency = args.frequency; said.push(`frequency ${args.frequency}`); }
      if (typeof args.note === "string") { patch.note = args.note; said.push("note updated"); }
      if (["morning", "supplement", "food", "medicine", "other"].includes(args.category)) { patch.category = args.category; said.push(`category ${args.category}`); }
      if (said.length === 0) return { error: "nothing_to_change", message: "Ask the user what they'd like to change about it." };
      const { error } = await supabase.from("rhythm_items").update(patch).eq("id", item.id);
      if (error) throw new Error(error.message);
      rhythmChanged();
      return { saved: true, item: patch.name || item.name, changes: said, message: `"${item.name}": ${said.join("; ")}. It's on their screen now.` };
    },

    // Removing hides the item (kept in history, can be restored) — never a
    // hard delete. Needs the user's yes first.
    async remove_rhythm_item(args) {
      if (!profileId) throw new Error("No active profile");
      const rows = await activeRhythmRows(profileId);
      // Exact copies (same name) can't be told apart by voice, which used to
      // dead-end in "ambiguous". Treat them as duplicates: remove the extra
      // copies and keep one — the one with a reminder time, if any. Asking
      // again once only one is left removes that one.
      const q = String(args?.item_name || "").trim().toLowerCase();
      const loose = rows.filter((r) => { const n = r.name.toLowerCase(); return n === q || n.includes(q) || q.includes(n); });
      const sameName = loose.length > 1 && loose.every((r) => r.name.trim().toLowerCase() === loose[0].name.trim().toLowerCase());
      if (sameName) {
        const keep = loose.find((r) => r.fixed_time || r.schedule) || loose[0];
        const extras = loose.filter((r) => r.id !== keep.id);
        const keepTime = keep.fixed_time ? ` (keeping the one with a reminder at ${keep.fixed_time.slice(0, 5)})` : "";
        if (args?.confirmed !== true) {
          return needsYes(`You have ${loose.length} copies of ${keep.name}. Remove the ${extras.length} extra ${extras.length === 1 ? "copy" : "copies"} and keep one${keepTime} — yes?`);
        }
        const { error } = await supabase.from("rhythm_items")
          .update({ archived_at: new Date().toISOString(), changed_via: "voice" })
          .in("id", extras.map((r) => r.id));
        if (error) throw new Error(error.message);
        rhythmChanged();
        return {
          saved: true, removed_extra_copies: extras.length, kept: keep.name,
          message: `Removed ${extras.length} extra ${extras.length === 1 ? "copy" : "copies"} of "${keep.name}" — one is left${keepTime}. If they want that one gone too, call remove_rhythm_item again.`,
        };
      }
      const found = matchByName(rows, args?.item_name);
      if (found.error) return found;
      const item = found.match;
      if (args?.confirmed !== true) return needsYes(`Remove ${item.name} from your rhythm — yes?`);
      const { error } = await supabase.from("rhythm_items")
        .update({ archived_at: new Date().toISOString(), changed_via: "voice" })
        .eq("id", item.id);
      if (error) throw new Error(error.message);
      rhythmChanged();
      return {
        saved: true, removed: item.name,
        rhythm_now: rows.filter((r) => r.id !== item.id).map((r) => r.name),
        message: `"${item.name}" is removed from their rhythm and its reminders. Its history is kept, and if they change their mind you can bring it back with restore_rhythm_item.`,
      };
    },

    // "Undo" / "bring back my lemon water" — restores the most recently
    // removed item with that name, reminders included.
    async restore_rhythm_item(args) {
      if (!profileId) throw new Error("No active profile");
      const { data } = await supabase
        .from("rhythm_items")
        .select("*")
        .eq("profile_id", profileId)
        .not("archived_at", "is", null)
        .order("archived_at", { ascending: false })
        .limit(50);
      const removed = data || [];
      if (!removed.length) return { error: "nothing_removed", message: "There's nothing removed to bring back." };
      // No name = undo the most recent removal
      const found = args?.item_name ? matchByName(removed.filter((r, i, a) => a.findIndex((x) => x.name.toLowerCase() === r.name.toLowerCase()) === i), args.item_name) : { match: removed[0] };
      if (found.error) return found;
      const item = found.match;
      const active = await activeRhythmRows(profileId);
      if (active.some((r) => r.name.toLowerCase() === item.name.toLowerCase())) {
        return { error: "already_there", message: `"${item.name}" is already in their rhythm.` };
      }
      const { error } = await supabase.from("rhythm_items")
        .update({ archived_at: null, changed_via: "voice", sort_order: (active.at(-1)?.sort_order ?? 0) + 1 })
        .eq("id", item.id);
      if (error) throw new Error(error.message);
      rhythmChanged();
      return { saved: true, restored: item.name, message: `"${item.name}" is back in their rhythm, with its reminder times.` };
    },

    async list_saved_rhythms() {
      if (!profileId) throw new Error("No active profile");
      const { data } = await supabase.from("saved_rhythms").select("name, items, description").eq("profile_id", profileId).order("created_at", { ascending: false });
      const rows = data || [];
      const active = readActiveProgram();
      return {
        day_templates: rows.filter((r) => !isProgramRow(r)).map((r) => `${r.name} (${(r.items || []).length} items)`),
        programs: rows.filter(isProgramRow).map((r) => `${r.name} (${r.description || "program"})`),
        running_program: active ? `${active.name}, started ${active.startDate}` : null,
      };
    },

    // Saves the rhythm as it is right now as a reusable day template.
    // Same name again = update that template.
    async save_day_template(args) {
      if (!profileId) throw new Error("No active profile");
      const name = String(args?.name || "").trim();
      if (!name) return { error: "name_required", message: "Ask what they'd like to call this day template." };
      const rows = await activeRhythmRows(profileId);
      if (!rows.length) return { error: "empty", message: "Their rhythm is empty, so there's nothing to save yet. Offer to build it with them first." };
      const items = rows.map(rhythmRowToItem);
      const { data: existing } = await supabase.from("saved_rhythms").select("id").eq("profile_id", profileId).ilike("name", name).maybeSingle();
      const row = { profile_id: profileId, name, emoji: args.emoji || "✨", items };
      const { error } = existing
        ? await supabase.from("saved_rhythms").update(row).eq("id", existing.id)
        : await supabase.from("saved_rhythms").insert(row);
      if (error) throw new Error(error.message);
      rhythmChanged();
      return { saved: true, template: name, updated_existing: !!existing, items: items.map((i) => i.name), message: `Day template "${name}" saved with ${items.length} items. They'll see it under Day Templates.` };
    },

    // Swaps today's whole rhythm for a saved template. The current items are
    // kept in history (archived), not deleted. Needs the user's yes first.
    async load_day_template(args) {
      if (!profileId) throw new Error("No active profile");
      const { data } = await supabase.from("saved_rhythms").select("*").eq("profile_id", profileId);
      const templates = (data || []).filter((r) => !isProgramRow(r));
      if (!templates.length) return { error: "none_saved", message: "They have no saved day templates yet. Offer to save their current rhythm as one." };
      const found = matchByName(templates, args?.name);
      if (found.error) return found;
      const tpl = found.match;
      const current = await activeRhythmRows(profileId);
      if (args?.confirmed !== true) {
        return needsYes(`Switch your rhythm to "${tpl.name}"? That replaces the ${current.length} items you have now — they'll be kept in your history.`);
      }
      const now = new Date().toISOString();
      if (current.length) {
        const { error } = await supabase.from("rhythm_items")
          .update({ archived_at: now, changed_via: "voice" })
          .eq("profile_id", profileId).is("archived_at", null);
        if (error) throw new Error(error.message);
      }
      const rows = (tpl.items || []).map((it, idx) => rhythmItemToRow({ ...it, sortOrder: idx + 1, changedVia: "voice" }, profileId));
      const { error } = await supabase.from("rhythm_items").insert(rows);
      if (error) throw new Error(error.message);
      rhythmChanged();
      return { saved: true, loaded: tpl.name, rhythm_now: rows.map((r) => r.name), message: `Their rhythm is now "${tpl.name}". It's on their screen.` };
    },

    async start_program(args) {
      if (!profileId || !userId) throw new Error("No active profile");
      const { data } = await supabase.from("saved_rhythms").select("*").eq("profile_id", profileId);
      const programs = (data || []).filter(isProgramRow);
      if (!programs.length) return { error: "none_saved", message: "They have no saved programs yet. Offer to save one with save_program — they read it to you from their own book." };
      const found = matchByName(programs, args?.name);
      if (found.error) return found;
      const program = savedRowToProgram(found.match);
      const running = readActiveProgram();
      if (running && args?.confirmed !== true) return needsYes(`You're on day-by-day "${running.name}" right now. Stop that and start "${program.name}"?`);
      const start = /^\d{4}-\d{2}-\d{2}$/.test(args?.start_date || "") ? args.start_date : todayStr();
      if (running?.dbId) await supabase.from("active_protocols").update({ abandoned: true, end_date: todayStr() }).eq("id", running.dbId);
      const { data: row } = await supabase.from("active_protocols").insert({
        profile_id: profileId, program_id: program.id, program_name: program.name, start_date: start, total_days: program.totalDays,
      }).select().single();
      setLocalStorageValue("cs_active_program", {
        id: program.id, name: program.name, startDate: start, totalDays: program.totalDays, items: program.items, dbId: row?.id ?? null,
      });
      rhythmChanged();
      return { saved: true, started: program.name, start_date: start, total_days: program.totalDays, message: `"${program.name}" starts ${start === todayStr() ? "today" : start} — ${program.totalDays} days. Each day's items will show on their rhythm.` };
    },

    async end_program(args) {
      const running = readActiveProgram();
      if (!running) return { error: "none_running", message: "No program is running right now." };
      if (args?.confirmed !== true) return needsYes(`End "${running.name}" now?`);
      if (running.dbId) await supabase.from("active_protocols").update({ abandoned: true, end_date: todayStr() }).eq("id", running.dbId);
      setLocalStorageValue("cs_active_program", null);
      rhythmChanged();
      return { saved: true, ended: running.name, message: `"${running.name}" has ended. Their everyday rhythm carries on as normal.` };
    },

    async add_supplement(args) {
      if (!profileId) throw new Error("No active profile");
      const name = String(args?.name || "").trim();
      if (!name) return { error: "name_required", message: "Ask which supplement." };
      const timing = ["morning_empty", "morning_food", "midday", "evening"].includes(args?.timing) ? args.timing : "morning_food";
      const { data: list } = await supabase.from("user_supplements").select("id, name").eq("profile_id", profileId);
      const dupe = (list || []).find((s) => s.name.toLowerCase() === name.toLowerCase() && !args?.another_time);
      if (dupe) return { error: "already_there", message: `"${dupe.name}" is already in their supplements. If they take it at another time of day too, call again with another_time: true.` };
      // The amount is only ever what the user says from their own bottle/book.
      const { error } = await supabase.from("user_supplements").insert({
        profile_id: profileId, name, dose_label: String(args?.dose_label || "").trim() || null, timing,
      });
      if (error) throw new Error(error.message);
      window.dispatchEvent(new Event(SUPPLEMENTS_CHANGED_EVENT));
      return { saved: true, added: name, timing, message: `${name} is in their supplements (${timing.replace("_", " ")}). It's on their Today screen now.` };
    },

    async remove_supplement(args) {
      if (!profileId) throw new Error("No active profile");
      const { data: list } = await supabase.from("user_supplements").select("id, name, timing").eq("profile_id", profileId);
      const found = matchByName(list || [], args?.name);
      if (found.error) return found;
      const supp = found.match;
      if (args?.confirmed !== true) return needsYes(`Remove ${supp.name} from your supplements — yes?`);
      const { error } = await supabase.from("user_supplements").delete().eq("id", supp.id);
      if (error) throw new Error(error.message);
      window.dispatchEvent(new Event(SUPPLEMENTS_CHANGED_EVENT));
      return { saved: true, removed: supp.name, message: `${supp.name} is removed from their supplements.` };
    },
  }), [userId, profileId, onSwitchTab]);
}
