import { useState, useRef, useCallback } from "react";
import { cleanForSpeech } from "../lib/ttsClean.js";
import { ttsProvider } from "../lib/voiceService.js";

export const ELEVENLABS_VOICES = [
  // Warm & healing — best for this app
  { id: "el:EXAVITQu4vr4xnSDxMaL", name: "Sarah — reassuring & mature", group: "Warm & Healing" },
  { id: "el:XrExE9yKIg1WjnnlVkGX", name: "Matilda — knowledgeable & warm", group: "Warm & Healing" },
  { id: "el:pFZP5JQG7iQjIQuC4Bku", name: "Lily — velvety & calm", group: "Warm & Healing" },
  { id: "el:cgSgspJ2msm6clMCkdW9", name: "Jessica — bright & uplifting", group: "Warm & Healing" },
  { id: "el:9BWtsMINqrJLrRacOk9x", name: "Aria — gentle & empathetic", group: "Warm & Healing" },
  { id: "el:FGY2WhTYpPnrIDTdsKH5", name: "Laura — serene & soothing", group: "Warm & Healing" },
  { id: "el:jsCqWAovK2LkecY7zXl4", name: "Freya — natural & earthy", group: "Warm & Healing" },
  // Professional & clear
  { id: "el:hpp4J3VqNfWAUOO0d1Us", name: "Bella — professional & clear", group: "Professional" },
  { id: "el:21m00Tcm4TlvDq8ikWAM", name: "Rachel — confident & articulate", group: "Professional" },
  { id: "el:AZnzlk1XvdvUeBnXmlld", name: "Domi — expressive & precise", group: "Professional" },
  { id: "el:MF3mGyEYCl7XYWbV9V6O", name: "Elli — friendly & warm", group: "Professional" },
  // Male voices
  { id: "el:nPczCjzI2devNBz1zQrb", name: "Brian — deep & comforting", group: "Male Voices" },
  { id: "el:JBFqnCBsd6RMkjVDRZzb", name: "George — warm storyteller", group: "Male Voices" },
  { id: "el:SAz9YHcvj6GT2YYXdXww", name: "River — relaxed & neutral", group: "Male Voices" },
  { id: "el:TxGEqnHWrfWFTfGW9XjX", name: "Josh — young & energetic", group: "Male Voices" },
  { id: "el:VR6AewLTigWG4xSOukaG", name: "Arnold — authoritative & calm", group: "Male Voices" },
  { id: "el:ErXwobaYiN019PkySvjV", name: "Antoni — natural & conversational", group: "Male Voices" },
  // Australian / NZ accents
  { id: "el:XB0fDUnXU5powFXDhCwa", name: "Charlotte — Australian warmth", group: "Australian / NZ" },
  { id: "el:IKne3meq5aSn9XLyUdCD", name: "Charlie — friendly Aussie", group: "Australian / NZ" },
];

export const srSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

export function useVoice(preferredVoiceName = "", units = "metric") {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const recogRef = useRef(null);
  const audioRef = useRef(null);
  const preferredVoiceRef = useRef(preferredVoiceName);
  preferredVoiceRef.current = preferredVoiceName;

  // ── Sentence-streaming queue ─────────────────────────────────────
  // Each message gets a new "generation" so stale promises self-discard.
  const generationRef = useRef(0);
  const sentenceQueue = useRef([]);
  const queueActive = useRef(false);
  const queueFinished = useRef(false);
  const queueOnDone = useRef(null);

  const _playNext = useCallback(() => {
    const gen = generationRef.current;
    if (sentenceQueue.current.length === 0) {
      queueActive.current = false;
      if (queueFinished.current) {
        setSpeaking(false);
        queueOnDone.current?.();
      }
      return;
    }
    const { promise } = sentenceQueue.current.shift();
    promise.then((url) => {
      if (gen !== generationRef.current) return;
      if (!url) { _playNext(); return; }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        if (gen !== generationRef.current) return;
        audioRef.current = null;
        _playNext();
      };
      audio.onerror = () => {
        if (gen !== generationRef.current) return;
        audioRef.current = null;
        _playNext();
      };
      audio.play().catch(() => {
        if (gen !== generationRef.current) return;
        audioRef.current = null;
        _playNext();
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add a sentence to the TTS queue — fires the provider fetch immediately.
  const queueSentence = useCallback((text) => {
    const voice = preferredVoiceRef.current;
    if (!ttsProvider.isElVoice(voice)) return;
    const voiceId = ttsProvider.extractVoiceId(voice);
    const cleaned = cleanForSpeech(text, units);
    const promise = ttsProvider.fetchAudioUrl(cleaned, voiceId);

    sentenceQueue.current.push({ promise });
    setSpeaking(true);
    if (!queueActive.current) {
      queueActive.current = true;
      _playNext();
    }
  }, [_playNext, units]);

  // Signal that no more sentences are coming.
  const endQueue = useCallback((onDone) => {
    queueFinished.current = true;
    queueOnDone.current = onDone ?? null;
    if (!queueActive.current && sentenceQueue.current.length === 0) {
      setSpeaking(false);
      onDone?.();
    }
  }, []);

  // Reset queue — call at start of each new send to discard any stale audio.
  const resetQueue = useCallback(() => {
    generationRef.current++;
    sentenceQueue.current = [];
    queueActive.current = false;
    queueFinished.current = false;
    queueOnDone.current = null;
  }, []);
  // ────────────────────────────────────────────────────────────────

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    window.speechSynthesis.cancel();
    resetQueue();
    setSpeaking(false);
  }, [resetQueue]);

  // Browser TTS — fallback for non-provider voices
  const browserSpeak = useCallback((text, voiceName, onDone) => {
    const clean = cleanForSpeech(text, units);
    const chunks = clean.match(/.{1,200}(?:[.!?,\s]|$)/g) ?? [clean];
    setSpeaking(true);
    let i = 0;
    const next = () => {
      if (i >= chunks.length) {
        setSpeaking(false);
        onDone?.();
        return;
      }
      const u = new SpeechSynthesisUtterance(chunks[i++]);
      u.rate = 0.88;
      u.pitch = 1.08;
      const voices = window.speechSynthesis.getVoices();
      const chosen = voiceName ? voices.find((v) => v.name === voiceName) : null;
      const fallback = voices.find(
        (v) => v.name.includes("Samantha") || v.name.includes("Karen") || v.name.includes("Moira")
      );
      u.voice = chosen ?? fallback ?? null;
      u.onend = next;
      window.speechSynthesis.speak(u);
    };
    setTimeout(next, 100);
  }, [units]);

  const speak = useCallback(
    async (text, onDone) => {
      stopSpeaking();
      const voice = preferredVoiceRef.current;

      if (ttsProvider.isElVoice(voice)) {
        const voiceId = ttsProvider.extractVoiceId(voice);
        setSpeaking(true);
        const url = await ttsProvider.fetchAudioUrl(text, voiceId);

        if (!url) {
          setSpeaking(false);
          browserSpeak(text, "", onDone);
          return;
        }

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          setSpeaking(false);
          audioRef.current = null;
          onDone?.();
        };
        audio.onerror = () => {
          setSpeaking(false);
          audioRef.current = null;
          browserSpeak(text, "", onDone);
        };
        audio.play().catch(() => {
          setSpeaking(false);
          audioRef.current = null;
          browserSpeak(text, "", onDone);
        });
      } else {
        browserSpeak(text, voice, onDone);
      }
    },
    [stopSpeaking, browserSpeak]
  );

  // startListening — two call signatures for backward compatibility:
  //   startListening(onResult, onUnsupported)        — legacy, one-shot
  //   startListening(onResult, { silenceMs, lang })  — new, with tunable VAD
  //
  // When silenceMs > 0, continuous mode is used: onspeechend starts a timer;
  // onspeechstart cancels it. After silenceMs of silence, the transcript is committed.
  const startListening = useCallback((onResult, optionsOrUnsupported = {}) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const isLegacy = typeof optionsOrUnsupported === 'function';
    const onUnsupported = isLegacy ? optionsOrUnsupported : undefined;
    const { silenceMs = 0, lang = 'en-US' } = isLegacy ? {} : (optionsOrUnsupported || {});

    if (!SR) {
      onUnsupported?.();
      return;
    }

    const r = new SR();
    r.continuous = silenceMs > 0;
    r.interimResults = true;
    r.lang = lang;

    let finalTranscript = '';
    let silenceTimer = null;

    r.onstart = () => setListening(true);

    r.onresult = (e) => {
      const t = Array.from(e.results).map((x) => x[0].transcript).join('');
      setTranscript(t);
      if (e.results[e.results.length - 1].isFinal) {
        finalTranscript = t;
        if (!silenceMs) onResult(t); // non-VAD: fire immediately on final result
      }
    };

    if (silenceMs > 0) {
      // VAD: wait for silence before committing
      r.onspeechend = () => {
        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
          if (finalTranscript.trim()) {
            r.stop();
            onResult(finalTranscript);
          }
        }, silenceMs);
      };
      r.onspeechstart = () => clearTimeout(silenceTimer);
    }

    r.onend = () => {
      setListening(false);
      setTranscript('');
      clearTimeout(silenceTimer);
    };
    r.onerror = () => {
      setListening(false);
      clearTimeout(silenceTimer);
    };

    recogRef.current = r;
    r.start();
  }, []);

  const stopListening = useCallback(() => {
    recogRef.current?.stop();
    setListening(false);
  }, []);

  return {
    listening,
    transcript,
    speaking,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    queueSentence,
    endQueue,
    resetQueue,
  };
}
