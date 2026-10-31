import { useEffect } from "react";
import { useHumeVoiceOrchestrator } from "../context/HumeVoiceContext.jsx";

// First-run welcome: hand straight off to the live companion, which
// introduces itself and the app conversationally (no fixed script, fully
// two-way from the first moment). This replaced the old scripted ElevenLabs
// narration + separate SpeechRecognition pipeline when the app went
// Hume-only — one companion, everywhere (spec §3.2).
const WELCOME_TAB_TOUR =
  "This is the user's very first time opening CelerySync. Warmly welcome " +
  "them, then briefly explain in your own words what each of the app's " +
  "four tabs is for - Today (their own daily rhythm to tick off, today's " +
  "check-in, and their supplements), Companion (talking with you any time, " +
  "plus 'How I feel'), Progress (their own streaks and trends over time, " +
  "and a report for their GP), and Settings (voice, reminders, carers, and " +
  "official Anthony William sources). Keep it warm and conversational, not " +
  "a lecture - a sentence or two per tab at most. Mention they can ask you " +
  "to take them anywhere. Then invite them to ask you anything or just " +
  "start exploring.";

export default function WelcomeVoice({ onDone }) {
  const companion = useHumeVoiceOrchestrator();

  useEffect(() => {
    companion.openSheet?.();
    companion.connect?.(WELCOME_TAB_TOUR).catch(() => {});
    onDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
