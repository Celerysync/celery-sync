import { useEffect, useState } from "react";
import C from "../lib/colors.js";
import { useHumeVoiceOrchestrator } from "../context/HumeVoiceContext.jsx";
import { micHelp } from "../lib/micPermission.js";

function fmtElapsed(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// The single persistent voice affordance for the Hume EVI stack — replaces
// GlobalVoice.jsx, every VoiceIntakeButton mount, and WelcomeVoice's/
// Onboarding's bespoke mic logic once cs_voiceProvider === "hume". One
// session, one button, available on every tab.
export default function VoiceOrb() {
  const {
    isConnected, isConnecting, speaking, listening, isMuted,
    connect, disconnect, mute, unmute, error, lastUserMessage, lastVoiceMessage,
    sessionStartedAt, silenceWarning, timedOut, meterSecondsRemaining, capReached,
    sheetOpen: open, openSheet, closeSheet,
  } = useHumeVoiceOrchestrator();
  const [connectError, setConnectError] = useState(null);

  // Session clock — ticks only while a session is live; shows 0:00 until
  // the first tick so render stays pure.
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!sessionStartedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sessionStartedAt]);
  const elapsedMs = sessionStartedAt && now > sessionStartedAt ? now - sessionStartedAt : 0;

  const handleTap = async () => {
    if (!isConnected && !isConnecting) {
      setConnectError(null);
      openSheet();
      try {
        await connect();
      } catch (err) {
        setConnectError(err.message);
      }
      return;
    }
    if (isMuted) unmute();
    else mute();
    openSheet();
  };

  const close = () => {
    disconnect();
    closeSheet();
  };

  const icon = isConnecting ? "⏳" : speaking ? "🔊" : isMuted ? "🔇" : listening ? "👂" : "🎙";
  const bg = speaking ? C.gold : isConnected && !isMuted ? C.sage : C.sageDark;

  return (
    <>
      <button
        onClick={handleTap}
        aria-label="Voice companion"
        style={{
          position: "fixed",
          bottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
          right: 16,
          width: 52,
          height: 52,
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          background: bg,
          color: C.white,
          fontSize: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isConnected
            ? `0 0 0 6px ${C.sage}44, 0 4px 20px rgba(0,0,0,0.25)`
            : "0 4px 20px rgba(0,0,0,0.2)",
          transition: "background 0.2s, box-shadow 0.2s",
          zIndex: 200,
        }}
      >
        {icon}
      </button>

      {open && (
        <div style={{
          position: "fixed",
          bottom: "calc(144px + env(safe-area-inset-bottom, 0px))",
          right: 16,
          width: "min(320px, calc(100vw - 32px))",
          background: C.white,
          borderRadius: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          padding: "16px 18px",
          zIndex: 200,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.sageDark }}>
              🌿 CelerySync Companion
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isConnected && sessionStartedAt && (
                <span style={{ fontSize: 11, color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                  {fmtElapsed(elapsedMs)}
                </span>
              )}
              <button onClick={close} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.muted, padding: "0 2px" }}>✕</button>
            </div>
          </div>

          {/* Gentle fuel gauge (spec §7b: minutes, never a stopwatch of seconds;
              hidden entirely when no meter row exists, e.g. during beta).
              Turns into a gentle warning when running low — no surprises. */}
          {meterSecondsRemaining != null && meterSecondsRemaining > 0 && (
            <div style={{
              fontSize: 11, marginBottom: 8,
              color: meterSecondsRemaining <= 300 ? C.terracotta : C.muted,
              fontWeight: meterSecondsRemaining <= 300 ? 700 : 400,
            }}>
              ⏳ About {Math.max(1, Math.round(meterSecondsRemaining / 60))} voice minutes left this month
              {meterSecondsRemaining <= 300 && " — running low. Top up any time in Settings → Companion Voice."}
            </div>
          )}

          {capReached && (
            <div style={{ background: C.cream, borderRadius: 10, padding: "8px 12px", marginBottom: 8, fontSize: 12, color: C.charcoal, lineHeight: 1.5 }}>
              🌿 That's all your voice minutes for now — they refresh monthly, or you can add a
              top-up in Settings → Companion Voice. I'm still right here in text chat.
            </div>
          )}

          {silenceWarning && isConnected && (
            <div style={{ background: C.cream, borderRadius: 10, padding: "8px 12px", marginBottom: 8, fontSize: 12, color: C.charcoal, lineHeight: 1.5 }}>
              🌙 Still there? I'll close in a moment to save your minutes — just speak to keep going.
            </div>
          )}

          {timedOut && !isConnected && !isConnecting && (
            <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.6, padding: "4px 0 8px" }}>
              I'm here when you need me — tap Start talking when you're ready. 🌿
            </div>
          )}

          {/* People don't know what they're allowed to say to an AI, so they
              say nothing and decide it's useless. Shown only before the first
              conversation connects. */}
          {!isConnected && !isConnecting && !timedOut && !connectError && (
            <div style={{
              background: C.sageLight, borderRadius: 10,
              padding: "10px 12px", marginBottom: 8,
              fontSize: 12, color: C.mid, lineHeight: 1.7,
            }}>
              <div style={{ fontWeight: 700, color: C.charcoal, marginBottom: 4 }}>
                Things you can say
              </div>
              “Just finished my juice” · “What's left today?” ·
              “Add magnesium at 9pm” · “I'm wiped out today”
            </div>
          )}

          {/* A blocked mic is the likeliest failure, and "Permission denied"
              helps nobody — show the actual steps for this platform instead. */}
          {(() => {
            const help = micHelp(connectError) || micHelp(error);
            if (!help) return null;
            return (
              <div style={{
                background: C.terracottaLight, borderRadius: 12,
                padding: "12px 14px", margin: "4px 0 8px",
              }}>
                <div style={{
                  fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13,
                  color: C.charcoal, marginBottom: 6,
                }}>
                  🎙 {help.title}
                </div>
                <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: C.mid, lineHeight: 1.8 }}>
                  {help.steps.map((s) => <li key={s}>{s}</li>)}
                </ol>
              </div>
            );
          })()}

          {connectError && !micHelp(connectError) && (
            <div style={{ fontSize: 13, color: C.terracotta, lineHeight: 1.6, padding: "4px 0 8px" }}>
              {connectError}
            </div>
          )}
          {error && !micHelp(error) && (
            <div style={{ fontSize: 13, color: C.terracotta, lineHeight: 1.6, padding: "4px 0 8px" }}>
              {error.message}
            </div>
          )}
          {isConnecting && (
            <div style={{ color: C.sageDark, fontSize: 13, fontFamily: "Georgia,serif", textAlign: "center", padding: "8px 0" }}>
              🌿 Connecting…
            </div>
          )}
          {isConnected && listening && (
            <div style={{ color: C.sage, fontSize: 13, fontFamily: "Georgia,serif", textAlign: "center", padding: "8px 0" }}>
              <span style={{ display: "inline-block", animation: "pulse 1.2s infinite" }}>👂</span> Listening…
            </div>
          )}
          {lastUserMessage?.message?.content && (
            <div style={{ background: C.cream, borderRadius: 10, padding: "8px 12px", marginBottom: 8, fontSize: 13, color: C.charcoal }}>
              <span style={{ fontSize: 10, color: C.muted, display: "block", marginBottom: 2 }}>You said</span>
              {lastUserMessage.message.content}
            </div>
          )}
          {lastVoiceMessage?.message?.content && (
            <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.5, marginBottom: 10 }}>
              {lastVoiceMessage.message.content}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            {!isConnected && !isConnecting && (
              <button
                onClick={handleTap}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 50, border: "none", cursor: "pointer",
                  background: C.sage, color: C.white,
                  fontFamily: "Georgia,serif", fontSize: 12, fontWeight: 700,
                }}
              >
                🎙 Start talking
              </button>
            )}
            {isConnected && (
              <button
                onClick={() => (isMuted ? unmute() : mute())}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 50, border: "none", cursor: "pointer",
                  background: isMuted ? C.sage : "#e57373", color: C.white,
                  fontFamily: "Georgia,serif", fontSize: 12, fontWeight: 700,
                }}
              >
                {isMuted ? "🎙 Unmute" : "🔇 Mute"}
              </button>
            )}
            {isConnected && (
              <button
                onClick={close}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 50, border: "none", cursor: "pointer",
                  background: C.muted, color: C.white,
                  fontFamily: "Georgia,serif", fontSize: 12, fontWeight: 700,
                }}
              >
                ⏹ End
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
