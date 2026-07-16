import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { useVoice } from "../hooks/useVoice.js";
import { useVoicePrefs } from "../hooks/useVoicePrefs.js";

// Spec §5 Sunday voice summary — the user's week read back in their
// companion's voice. Strictly descriptive (TGA rail): it recounts what the
// user logged, in their own numbers, and never interprets it.
function buildScript(userName, week) {
  const parts = [`Here's your week in review${userName ? ", " + userName : ""}.`];
  if (week.celery_days > 0) {
    parts.push(`You logged celery juice on ${week.celery_days} ${week.celery_days === 1 ? "day" : "days"}.`);
  }
  if (week.protocol_days > 0) {
    parts.push(`You completed your rhythm on ${week.protocol_days} ${week.protocol_days === 1 ? "day" : "days"}.`);
  }
  if (week.avg_energy) {
    parts.push(`Your average energy was ${Number(week.avg_energy).toFixed(1)} out of ten.`);
  }
  if (week.avg_mood) {
    parts.push(`Average mood, ${Number(week.avg_mood).toFixed(1)} out of five.`);
  }
  if (week.journal_entries > 0) {
    parts.push(`And you wrote ${week.journal_entries} journal ${week.journal_entries === 1 ? "entry" : "entries"}.`);
  }
  if (parts.length === 1) {
    parts.push("There wasn't much logged this week — and that's okay. A fresh week starts now.");
  } else {
    parts.push("However the week felt, you showed up for it — and it's all here in your own record.");
  }
  return parts.join(" ");
}

export default function WeeklyVoiceSummary({ authUser, user, weeklies }) {
  const { prefs, loaded } = useVoicePrefs(authUser);
  const { speak, speaking, stopSpeaking } = useVoice(prefs.voice_id || "");

  if (!loaded || !weeklies?.length) return null;

  const latest = [...weeklies].sort((a, b) =>
    String(b.week_start || "").localeCompare(String(a.week_start || ""))
  )[0];
  const script = buildScript(user?.name, latest);

  return (
    <Card style={{ border: `1.5px solid ${C.gold}40` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>
            🔊 Your week, out loud
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>
            Your Sunday summary, read in your companion's voice — just your own logged numbers.
          </div>
        </div>
        <button
          onClick={() => (speaking ? stopSpeaking() : speak(script))}
          style={{
            padding: "9px 16px", borderRadius: 50, border: "none", cursor: "pointer",
            background: speaking ? C.muted : C.sage, color: C.white,
            fontFamily: "Georgia,serif", fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}
        >
          {speaking ? "⏹ Stop" : "▶ Listen"}
        </button>
      </div>
    </Card>
  );
}
