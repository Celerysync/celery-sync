// Shared shape logic for saved_rhythms rows — the ONE place that knows how a
// user's saved day templates and multi-day programs are encoded. Both writers
// (RhythmBuilder's tap flow and useVoiceTools' save_program voice tool) and
// every reader go through here, so tap-built and voice-built programs can
// never drift apart in shape. The app ships no program content of its own
// (LEGAL_CONSTRAINTS.md) — every row here was entered by the user.

// A row is a program (vs. a day template) when its items carry per-day ranges.
export const isProgramRow = (row) => (row.items || []).some((it) => it.programDayRange);

export const programDescription = (totalDays) => `${totalDays}-day program`;

// The user's stated program length is written into description at save time
// ("9-day program") and read back as the authority — deriving it from item
// ranges alone would silently shorten a 9-day program whose longest item ends
// day 7 (e.g. rest days at the end carry no items).
export function rowTotalDays(row) {
  const stated = /^(\d+)-day program/.exec(row.description || "");
  if (stated) return Number(stated[1]);
  return (row.items || []).reduce((mx, it) => Math.max(mx, it.programDayRange?.[1] || 1), 1);
}

// Normalizes one dictated/typed program item into the canonical stored shape.
// Accepts both camelCase (RhythmBuilder forms) and snake_case (voice tool
// schema) field names. Day range is clamped into [1, totalDays].
export function buildProgramItem(raw, totalDays, sortOrder) {
  const from = Math.max(1, Math.min(Number(raw.fromDay ?? raw.from_day) || 1, totalDays));
  const to = Math.max(from, Math.min(Number(raw.toDay ?? raw.to_day) || totalDays, totalDays));
  const spacing = Number(raw.spacingMinutes ?? raw.spacing_minutes);
  return {
    id: crypto.randomUUID(),
    name: String(raw.name || "").trim(),
    emoji: raw.emoji || "✨",
    category: raw.category || "other",
    spacingMinutes: Number.isFinite(spacing) ? spacing : 30,
    frequency: "daily",
    durationType: "cleanse",
    note: raw.note || "",
    programDayRange: [from, to],
    sortOrder,
  };
}

// Inflates a saved_rhythms row into the program object startProgram expects —
// items are denormalized into activeProgram so the day filter and voice tools
// never need a shipped program library to resolve them.
export function savedRowToProgram(row) {
  const id = `sr-${row.id}`;
  return {
    id,
    name: row.name,
    emoji: row.emoji || "✨",
    totalDays: rowTotalDays(row),
    items: (row.items || []).map((it, idx) => ({
      frequency: "daily",
      durationType: "cleanse",
      sortOrder: idx + 1,
      ...it,
      programId: id,
    })),
  };
}
