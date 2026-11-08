// The running program lives in the account (active_protocols), so every device,
// the companion and (later) reminders see the same one. The phone keeps a copy
// in localStorage ("cs_active_program") only so Today draws instantly; the
// account is the truth. Used by useRhythm (taps) and useVoiceTools (voice).
//
// Every step in a program is the person's own, from their saved programs.
import { supabase } from "./supabase.js";
import { TODAY } from "./rhythmSchedule.js";

export const ACTIVE_PROGRAM_KEY = "cs_active_program";

const savedIdOf = (programId) => (String(programId || "").startsWith("sr-") ? String(programId).slice(3) : null);

export function programFromRow(row) {
  if (!row?.items?.length) return null;
  return {
    id: row.program_id,
    name: row.program_name,
    startDate: row.start_date,
    totalDays: row.total_days,
    items: row.items,
    dbId: row.id,
    keepEveryday: row.keep_everyday ?? null,
    savedRhythmId: row.saved_rhythm_id ?? null,
    chainedFromId: row.chained_from_id ?? null,
  };
}

const COLUMNS = "id, program_id, program_name, start_date, total_days, items, keep_everyday, saved_rhythm_id, chained_from_id, completed, abandoned";

export async function fetchRunningProgram(profileId) {
  const { data, error } = await supabase
    .from("active_protocols")
    .select(COLUMNS)
    .eq("profile_id", profileId)
    .eq("completed", false)
    .eq("abandoned", false)
    .not("items", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return programFromRow(data);
}

export async function startProgramInAccount({ profileId, program, startDate, keepEveryday = null, chainedFromId = null }) {
  const { data, error } = await supabase.from("active_protocols").insert({
    profile_id: profileId,
    program_id: program.id,
    program_name: program.name,
    start_date: startDate || TODAY(),
    total_days: program.totalDays,
    items: program.items,
    keep_everyday: keepEveryday,
    saved_rhythm_id: savedIdOf(program.id),
    chained_from_id: chainedFromId,
  }).select(COLUMNS).single();
  if (error) throw new Error(error.message);
  return programFromRow(data);
}

export async function endProgramInAccount(dbId, { completed = false } = {}) {
  if (!dbId) return;
  const { error } = await supabase.from("active_protocols")
    .update(completed ? { completed: true, end_date: TODAY() } : { abandoned: true, end_date: TODAY() })
    .eq("id", dbId);
  if (error) throw new Error(error.message);
}

// What this device should show: the account's running program. A program that
// was started before programs were kept in the account exists only on this
// phone; copy it up once, so it isn't lost and other devices see it.
export async function reconcileRunningProgram(profileId, local) {
  const remote = await fetchRunningProgram(profileId);
  if (remote) return remote;
  if (!local?.items?.length) return null;

  if (local.dbId) {
    const { data } = await supabase.from("active_protocols")
      .select("completed, abandoned").eq("id", local.dbId).maybeSingle();
    if (data?.completed || data?.abandoned) return null; // ended on another device
    if (data) {
      const { data: row, error } = await supabase.from("active_protocols")
        .update({ items: local.items, saved_rhythm_id: savedIdOf(local.id) })
        .eq("id", local.dbId).select(COLUMNS).single();
      if (error) throw new Error(error.message);
      return programFromRow(row);
    }
  }
  return startProgramInAccount({ profileId, program: local, startDate: local.startDate });
}
