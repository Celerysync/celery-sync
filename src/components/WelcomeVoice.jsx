import { useEffect } from "react";
import { useHumeVoiceOrchestrator } from "../context/HumeVoiceContext.jsx";

// First-run welcome: hand straight off to the live companion, which
// introduces itself and the app conversationally (no fixed script, fully
// two-way from the first moment). This replaced the old scripted ElevenLabs
// narration + separate SpeechRecognition pipeline when the app went
// Hume-only — one companion, everywhere (spec §3.2).
const WELCOME_TAB_TOUR =
  "This is the user's very first time opening CelerySync. Warmly welcome " +
  "them in a sentence. Say simply what the app is for: helping them keep up " +
  "their own healing routine, one day at a time, using what's in their own " +
  "books or protocol. Then, briefly and in your own words, the five tabs: " +
  "Today (their daily steps to tick off, supplements, how they're feeling, " +
  "and water), Kitchen (their own juices, smoothies and meals, a week plan " +
  "and a shopping list), Companion (talking with you any time), Progress " +
  "(how they're going over time, and a report for their GP), and Settings. " +
  "Tell them there's a short 'Getting started' list on Today that shows " +
  "them around one thing at a time, and that they can just tell you things " +
  "instead of tapping, for example 'I've had my celery juice'. Keep it " +
  "warm and short, not a lecture. Then ask if they'd like help with anything.";

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
