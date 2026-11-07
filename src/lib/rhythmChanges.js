// Plain-English wording for rhythm_item_changes rows (the change diary that
// supabase/rhythm_history.sql's trigger writes). Descriptive only: it says what
// the person changed and when, never why or what it might mean.

const FIELD_LABELS = {
  name: "name",
  emoji: "icon",
  category: "category",
  fixed_time: "time",
  schedule: "time",
  frequency: "days",
  note: "note",
  duration_type: "how long it runs",
  duration_days: "how long it runs",
  start_date: "start date",
  spacing_minutes: "spacing",
  is_medicine: "medicine setting",
};

const SOURCE_LABELS = { voice: "by voice", carer: "by a carer" };

function listWords(words) {
  if (words.length <= 1) return words[0] || "";
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

export function describeRhythmChange(row) {
  const name = row.item_name || "An item";
  switch (row.change_type) {
    case "added": return `Added ${name}`;
    case "removed": return `Removed ${name}`;
    case "restored": return `Brought back ${name}`;
    case "updated": {
      const fields = row.changed_fields || [];
      const oldName = row.before?.name;
      const renamed = fields.includes("name") && oldName && oldName !== name;
      const others = [...new Set(fields.filter((f) => f !== "name").map((f) => FIELD_LABELS[f] || "details"))];
      const parts = [];
      if (renamed) parts.push(`Renamed ${oldName} to ${name}`);
      if (others.length) parts.push(`${renamed ? "changed" : `Changed ${name}:`} ${listWords(others)}`);
      return parts.join(", ") || `Changed ${name}`;
    }
    default: return `Changed ${name}`;
  }
}

export const describeRhythmChangeSource = (source) => SOURCE_LABELS[source] || null;
