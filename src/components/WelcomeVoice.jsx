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
  "tabs is for - Today (daily rhythm, morning routine, supplement " +
  "checklist), Companion (talking with you, any time), Track (daily " +
  "check-in: energy, mood, symptoms, celery juice), Supplements (today's " +
  "supplements plus shopping), Learn (educational library, official " +
  "Anthony William resources), Progress (their own trends over time), and " +
  "Settings (account and reminders). Keep it warm and conversational, not " +
  "a lecture - a sentence or two per tab at most. Then invite them to ask " +
  "you anything or just start exploring.";

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
