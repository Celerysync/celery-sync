// Safety net for the setup wizard: if the AI can't sort what someone typed
// (no signal, a slow reply), split it ourselves rather than saving their whole
// day as one long step. Only their words: split at new lines, commas,
// semicolons and "then"; pick out a plain time ("at 6:30", "8pm"). Nothing is
// added or guessed.

const pad = (n) => String(n).padStart(2, "0");

// "at 6:30" / "6:30am" / "at 8pm" / "@ 7" → "HH:MM", or null.
export function timeIn(text) {
  const m = String(text).match(/(?:\bat\s+|@\s*)?\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|(?:\bat\s+|@\s*)(\d{1,2})(?::(\d{2}))?\b/i);
  if (!m) return null;
  let h = Number(m[1] ?? m[4]);
  const min = Number(m[2] ?? m[5] ?? 0);
  const ap = (m[3] || "").toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}`;
}

const withoutTime = (text) => String(text)
  .replace(/\s*(?:\bat\s+|@\s*)\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/gi, "")
  .replace(/\s*\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, "")
  .replace(/\s+/g, " ")
  .trim();

export function splitRoutine(text) {
  return String(text || "")
    .split(/\n|[,;]|\band then\b|\bthen\b/i)
    .map((part) => part.trim().replace(/^(and|also)\s+/i, ""))
    .filter((part) => part.length > 1)
    .map((part) => {
      let fixedTime = timeIn(part);
      // "dinner at 6", "tea at 8": no am/pm, but clearly the evening.
      if (fixedTime && !/am|pm/i.test(part) && /dinner|supper|tea\b|evening|night|bed/i.test(part) && Number(fixedTime.slice(0, 2)) < 12) {
        fixedTime = `${pad(Number(fixedTime.slice(0, 2)) + 12)}${fixedTime.slice(2)}`;
      }
      const name = withoutTime(part) || part;
      return { name: (name.charAt(0).toUpperCase() + name.slice(1)).slice(0, 60), fixedTime, note: "", frequency: "daily" };
    });
}
