import { useEffect } from "react";
import { TODAY } from "../lib/rhythmSchedule.js";
import { useVoice } from "./useVoice.js";

// Spec §3.1 protocol-time nudges — when a fixed-time rhythm item comes due
// and isn't completed, speak one short reminder. The line contains ONLY the
// user's own item title (compliance: never protocol content of our own).
// Daytime items follow the morning_nudge toggle, items from 5pm onward the
// evening_nudge toggle (spec §2.5 defines just these two).

const DUE_WINDOW_MS = 2 * 60_000; // nudge within 2 min of the scheduled time, never later
const EVENING_HOUR = 17;

export function useProtocolNudges(sequence, prefs, enabled = true) {
  const { speak } = useVoice(prefs.voice_id || "");

  // The interval restarts whenever sequence/prefs change — harmless, since
  // the localStorage marker makes each item's nudge fire at most once a day.
  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      const now = Date.now();
      const today = TODAY();
      const p = prefs;
      for (const item of sequence) {
        // Fixed-time items only — cascading items shift with the user's real
        // pace, so a spoken "it's time" would often be wrong for them.
        if (!item.fixedTime || item.completedAt || item.scheduledMs == null) continue;
        if (now < item.scheduledMs || now - item.scheduledMs > DUE_WINDOW_MS) continue;
        const hour = new Date(item.scheduledMs).getHours();
        if (!(hour < EVENING_HOUR ? p.morning_nudge : p.evening_nudge)) continue;
        const nudgedKey = `cs_nudged_${item.id}_${today}`;
        if (localStorage.getItem(nudgedKey)) continue;
        localStorage.setItem(nudgedKey, "1");
        speak(`A gentle reminder — it's time for ${item.name}.`);
        break; // at most one spoken nudge per tick
      }
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [enabled, speak, sequence, prefs]);
}
