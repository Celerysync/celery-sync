import { useMemo } from "react";
import { supabase } from "../lib/supabase.js";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Today's rhythm state from the activity_events ledger (spec §1) — the same
// v_daily_status the Rhythm screen reads, so the companion and the checkboxes
// can never disagree.
async function todayStatus(profileId) {
  const [itemsRes, statusRes] = await Promise.all([
    supabase.from("rhythm_items")
      .select("id, name, category, fixed_time")
      .eq("profile_id", profileId)
      .order("sort_order", { ascending: true }),
    supabase.from("v_daily_status")
      .select("item_id, status")
      .eq("profile_id", profileId)
      .eq("local_date", todayStr()),
  ]);
  const doneIds = new Set(
    (statusRes.data || []).filter((r) => r.status === "completed").map((r) => r.item_id)
  );
  const items = (itemsRes.data || []).map((i) => ({
    name: i.name,
    done: doneIds.has(i.id),
    time: i.fixed_time || undefined,
  }));
  return { items, completed: items.filter((i) => i.done).length, total: items.length };
}

// Hume EVI tool implementations — write directly to Supabase rather than
// delegating to a specific tab's local component state, so these work
// identically no matter which tab the user is actually looking at. This
// replaces src/lib/voiceIntake.js's parse-then-write flow: Hume's paired
// Claude model calls these as native tools mid-conversation instead of a
// separate post-hoc text parse.
export function useVoiceTools(authUser, profileId) {
  const userId = authUser?.id;
  return useMemo(() => ({
    // Spec §3.3 — "done my juice" ticks the real checkbox. Writes the same
    // activity_events ledger as a tap; the Rhythm screen's Realtime
    // subscription animates the checkbox on screen as this row lands.
    async mark_activity(args) {
      if (!profileId) throw new Error("No active profile");
      if (!userId) throw new Error("Not signed in");
      const query = String(args?.item_name || "").trim().toLowerCase();
      if (!query) throw new Error("item_name required");
      const action = args?.action === "uncomplete" ? "uncompleted" : "completed";

      const { data: items } = await supabase
        .from("rhythm_items")
        .select("id, name, category")
        .eq("profile_id", profileId);
      const matches = (items || []).filter((i) => {
        const n = i.name.toLowerCase();
        return n === query || n.includes(query) || query.includes(n);
      });
      if (matches.length === 0) {
        const names = (items || []).map((i) => i.name).join(", ") || "none yet";
        return { error: "not_found", message: `No rhythm item matches "${args.item_name}". The user's items are: ${names}. Ask which one they meant — never guess.` };
      }
      if (matches.length > 1) {
        return { error: "ambiguous", message: `Multiple items match: ${matches.map((m) => m.name).join(", ")}. Ask the user which one they meant.` };
      }

      const item = matches[0];
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
  }), [userId, profileId]);
}
