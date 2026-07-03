import { useState, useCallback, useRef, useEffect } from "react";
import { parseVoiceTranscript } from "../lib/voiceIntake.js";
import { useVoiceOrchestrator } from "../context/VoiceContext.jsx";

// FSM states
export const INTAKE_STATE = {
  IDLE:       "idle",
  LISTENING:  "listening",
  PARSING:    "parsing",
  CONFIRMING: "confirming",
  WRITING:    "writing",
  ERROR:      "error",
};

const CONFIRM_WORDS = ["yes", "yeah", "yep", "correct", "right", "sure", "ok", "okay",
  "that's right", "that's correct", "sounds good", "perfect", "good", "confirm", "save it",
  "save that", "log it", "log that", "write it", "write that", "go ahead"];

const REJECT_WORDS = ["no", "nope", "wrong", "not right", "that's wrong", "incorrect",
  "not quite", "try again", "redo", "start over", "cancel", "discard", "forget it",
  "never mind", "nevermind", "delete", "clear"];

function isConfirmation(text) {
  const t = text.toLowerCase().trim();
  return CONFIRM_WORDS.some((w) => t === w || t.startsWith(w + " ") || t.endsWith(" " + w));
}

function isRejection(text) {
  const t = text.toLowerCase().trim();
  return REJECT_WORDS.some((w) => t === w || t.startsWith(w + " ") || t.endsWith(" " + w));
}

/**
 * useVoiceIntake — orchestrates the full voice data-entry pipeline:
 *
 *   IDLE → LISTENING → PARSING → CONFIRMING → WRITING → IDLE
 *                                           ↘ LISTENING (rejected → re-listen)
 *
 * @param {object} opts
 * @param {function} opts.onWrite  - async fn(fields) called after user confirms.
 *                                   Caller writes to Supabase here.
 * @param {function} [opts.onQuestion] - fn(text) called when the AI detects a
 *                                   conversational question rather than data entry.
 *                                   Optional; handled by the caller (e.g. Coach chat).
 */
export function useVoiceIntake({ onWrite, onQuestion } = {}) {
  const [mode, setMode] = useState(INTAKE_STATE.IDLE);
  const [pendingFields, setPendingFields] = useState(null);
  const [displayItems, setDisplayItems] = useState([]); // { label, value }[] for UI
  const [lastTranscript, setLastTranscript] = useState("");

  const { speak, stopSpeaking, startListening, stopListening, getAbortSignal, cancelPending } =
    useVoiceOrchestrator();

  // Keep stable refs so callbacks inside startListening don't close over stale state
  const modeRef    = useRef(mode);
  const onWriteRef = useRef(onWrite);
  const onQRef     = useRef(onQuestion);
  modeRef.current    = mode;
  onWriteRef.current = onWrite;
  onQRef.current     = onQuestion;

  // Cancel any pending fetch + stop audio on unmount (tab navigation)
  useEffect(() => {
    return () => {
      cancelPending();
      stopSpeaking();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const sayAndThen = useCallback((text, afterFn) => {
    speak(text, afterFn);
  }, [speak]);

  // Start listening for the confirm/reject response after speaking confirmation
  const listenForConfirmation = useCallback((pendingParsed) => {
    startListening((response) => {
      if (modeRef.current !== INTAKE_STATE.CONFIRMING) return;

      if (isConfirmation(response)) {
        setMode(INTAKE_STATE.WRITING);
        onWriteRef.current?.(pendingParsed.fields)
          .then(() => {
            setMode(INTAKE_STATE.IDLE);
            setPendingFields(null);
            setDisplayItems([]);
          })
          .catch(() => {
            sayAndThen("Sorry, something went wrong saving that. Want to try again?", () => {
              setMode(INTAKE_STATE.IDLE);
            });
          });
        return;
      }

      if (isRejection(response)) {
        setPendingFields(null);
        setDisplayItems([]);
        setMode(INTAKE_STATE.IDLE);
        sayAndThen("No problem, let's start again.", () => {
          // Re-open listening after discarding
          startIntake();
        });
        return;
      }

      // Neither confirm nor reject — treat as a correction/addition, re-parse
      setMode(INTAKE_STATE.PARSING);
      const combined = `${lastTranscript} — correction: ${response}`;
      runParse(combined);
    }, { silenceMs: 1800 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startListening, sayAndThen]);

  const runParse = useCallback(async (transcript) => {
    setMode(INTAKE_STATE.PARSING);
    const signal = getAbortSignal();

    let parsed;
    try {
      parsed = await parseVoiceTranscript(transcript, { signal });
    } catch (err) {
      if (err?.name === "AbortError") return; // navigation cancelled — exit silently
      parsed = null;
    }

    if (!parsed) {
      setMode(INTAKE_STATE.ERROR);
      sayAndThen("I didn't catch that — want to try again?", () => {
        setMode(INTAKE_STATE.IDLE);
      });
      return;
    }

    // Purely conversational — no data to log
    if (!parsed.hasData) {
      if (parsed.conversationalReply) {
        onQRef.current?.(transcript); // let Coach handle it
        sayAndThen(parsed.conversationalReply, () => setMode(INTAKE_STATE.IDLE));
      } else {
        sayAndThen("I didn't catch anything to log. Try again?", () => setMode(INTAKE_STATE.IDLE));
      }
      return;
    }

    // Has data — import summariseParsed here to avoid circular import issues
    import("../lib/voiceIntake.js").then(({ summariseParsed }) => {
      const items = summariseParsed(parsed.fields);
      setPendingFields(parsed);
      setDisplayItems(items);
      setMode(INTAKE_STATE.CONFIRMING);

      const confirmation = parsed.confirmation
        ?? `Got it. ${items.map((i) => i.value).join(", ")}. Shall I save that?`;

      sayAndThen(confirmation, () => {
        listenForConfirmation(parsed);
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAbortSignal, sayAndThen, listenForConfirmation]);

  // ── Public API ────────────────────────────────────────────────────────────────

  const startIntake = useCallback(() => {
    stopSpeaking();
    cancelPending();
    setPendingFields(null);
    setDisplayItems([]);
    setMode(INTAKE_STATE.LISTENING);

    startListening((transcript) => {
      if (!transcript?.trim()) {
        sayAndThen("I didn't hear anything — tap the mic and try again.", () =>
          setMode(INTAKE_STATE.IDLE)
        );
        return;
      }
      setLastTranscript(transcript);
      runParse(transcript);
    }, {
      silenceMs: 1500, // commit after 1.5 s of silence
    });
  }, [stopSpeaking, cancelPending, startListening, runParse, sayAndThen]);

  const cancelIntake = useCallback(() => {
    cancelPending();
    stopSpeaking();
    stopListening();
    setPendingFields(null);
    setDisplayItems([]);
    setMode(INTAKE_STATE.IDLE);
  }, [cancelPending, stopSpeaking, stopListening]);

  return {
    mode,
    pendingFields,
    displayItems,
    startIntake,
    cancelIntake,
  };
}
