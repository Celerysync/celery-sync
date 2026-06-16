import { useState, useRef, useCallback } from "react";

export const ELEVENLABS_VOICES = [
  { id: "el:EXAVITQu4vr4xnSDxMaL", name: "Sarah — reassuring & mature ✨" },
  { id: "el:XrExE9yKIg1WjnnlVkGX", name: "Matilda — knowledgeable & warm ✨" },
  { id: "el:cgSgspJ2msm6clMCkdW9", name: "Jessica — bright & warm ✨" },
  { id: "el:pFZP5JQG7iQjIQuC4Bku", name: "Lily — velvety & calm ✨" },
  { id: "el:hpp4J3VqNfWAUOO0d1Us", name: "Bella — professional & warm ✨" },
  { id: "el:nPczCjzI2devNBz1zQrb", name: "Brian — deep & comforting ✨" },
  { id: "el:JBFqnCBsd6RMkjVDRZzb", name: "George — warm storyteller ✨" },
  { id: "el:SAz9YHcvj6GT2YYXdXww", name: "River — relaxed & neutral ✨" },
];

export function useVoice(preferredVoiceName = "") {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const recogRef = useRef(null);
  const audioRef = useRef(null);
  const preferredVoiceRef = useRef(preferredVoiceName);
  preferredVoiceRef.current = preferredVoiceName;

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  // Browser TTS — used as primary for non-ElevenLabs voices and as fallback
  const browserSpeak = useCallback((text, voiceName, onDone) => {
    const clean = text
      .replace(/[#*_`•→]/g, "")
      .replace(/\n+/g, ". ")
      .replace(/\s+/g, " ");
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
        (v) =>
          v.name.includes("Samantha") ||
          v.name.includes("Karen") ||
          v.name.includes("Moira")
      );
      u.voice = chosen ?? fallback ?? null;
      u.onend = next;
      window.speechSynthesis.speak(u);
    };
    setTimeout(next, 100);
  }, []);

  const speak = useCallback(
    async (text, onDone) => {
      stopSpeaking();
      const voice = preferredVoiceRef.current;

      if (voice.startsWith("el:")) {
        // ── ElevenLabs path (with server-side caching) ────
        const voiceId = voice.slice(3);
        setSpeaking(true);
        try {
          const res = await fetch("/api/elevenlabs/speak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, voiceId }),
          });

          if (!res.ok) {
            setSpeaking(false);
            browserSpeak(text, "", onDone);
            return;
          }

          // Server now returns { url, cached } — url is either a Supabase CDN
          // URL (cache hit, instant) or a data URL (storage fallback)
          const { url } = await res.json();
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
        } catch {
          setSpeaking(false);
          browserSpeak(text, "", onDone);
        }
      } else {
        // ── Browser TTS path ──────────────────────────────
        browserSpeak(text, voice, onDone);
      }
    },
    [stopSpeaking, browserSpeak]
  );

  const startListening = useCallback((onResult) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input requires Chrome.");
      return;
    }
    const r = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.lang = "en-US";
    r.onstart = () => setListening(true);
    r.onresult = (e) => {
      const t = Array.from(e.results)
        .map((x) => x[0].transcript)
        .join("");
      setTranscript(t);
      if (e.results[e.results.length - 1].isFinal) onResult(t);
    };
    r.onend = () => {
      setListening(false);
      setTranscript("");
    };
    r.onerror = () => setListening(false);
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
  };
}
