import { useState, useEffect } from "react";
import C from "../lib/colors.js";

// ─── Copy ────────────────────────────────────────────────────────────────────

const PAIN_POINTS = [
  "You know your routine inside out — but life gets in the way and you fall off track",
  "It's 2am, you can't sleep, and nobody around you understands the lifestyle",
  "You forget the snack window... again",
  "Your routine lives on sticky notes, phone alarms, and memory",
  "You started a multi-day program and lost track of which day you're on",
  "The people in your life don't understand why celery juice matters so much to you",
];

const TRANSFORMATION = [
  { before: "A routine scattered across sticky notes and memory", after: "Your whole day sequenced from one wake-time anchor — entered once from your own book" },
  { before: "Alone at 2am with no one who gets it", after: "A voice companion that speaks your language, any time you need it" },
  { before: "Starting programs, losing track, starting again", after: "Your program mapped into your days, with reminders — you always know which day you're on" },
  { before: "No record of what you've actually been doing", after: "Weekly summaries of your own logged trends — energy, mood, consistency" },
  { before: "No way to show your doctor what you've been doing", after: "A professional report of your own logged data — one tap, ready for any appointment" },
  { before: "Doing it alone, nobody around you truly understands", after: "Invite a carer to see your journey — and get a personal letter on every anniversary of it" },
];

const FEATURES = [
  {
    emoji: "🎙",
    title: "Say it — watch it tick",
    desc: "“Just finished my celery juice” — and the checkbox ticks itself on screen. Log your whole morning hands-free while you're actually living it.",
  },
  {
    emoji: "📖",
    title: "Your book stays the source",
    desc: "Read your routine or program straight from your own copy of the books and speak it in — the companion builds it into your day. We never sell you content; you already own it.",
  },
  {
    emoji: "🌅",
    title: "Your day, sequenced",
    desc: "Set one wake anchor and your whole rhythm cascades from it — lemon water, juice, snacks, supplements, whatever your routine holds. Reorder, space, and time everything your way.",
  },
  {
    emoji: "🗓",
    title: "Multi-day programs, tracked",
    desc: "Enter any program once — 5 days, 9 days, 28 days — and the app walks it with you: which day you're on, what today involves, how consistently you showed up.",
  },
  {
    emoji: "🧠",
    title: "A companion that remembers you",
    desc: "Every conversation is distilled into milestones your companion keeps. Months from now it still knows your story, your wins, and your hard days.",
  },
  {
    emoji: "📊",
    title: "Your trends, in numbers",
    desc: "Energy, mood, juice, streaks, consistency. Your own logged data, charted so you can spot your patterns — and two streaks: showed-up and perfect.",
  },
  {
    emoji: "📋",
    title: "Weekly summary + doctor report",
    desc: "Every Sunday, a personal summary of your week. One tap generates a professional PDF of your logged data for any medical appointment.",
  },
  {
    emoji: "⏰",
    title: "Reminders that keep you on track",
    desc: "The snack windows, spacings, and sequences you set — nudged at exactly the right moment, so the details stop slipping.",
  },
  {
    emoji: "💊",
    title: "Supplement tracker + restock",
    desc: "Track what you take and when. Say “I bought more zinc” and inventory updates itself — with a nudge before anything runs out.",
  },
  {
    emoji: "🔗",
    title: "Always points to the source",
    desc: "Direct links to Anthony William's official website, YouTube, podcast, and books — the companion always sends you to the source for the full detail.",
  },
  {
    emoji: "💜",
    title: "Invite a carer",
    desc: "Share your journey with someone who supports you. They see your trends, check-ins, and milestones — so they can show up for you better.",
  },
  {
    emoji: "👨‍👩‍👧‍👦",
    title: "Your whole family, one subscription",
    desc: "Separate profiles for every family member. Each person gets their own rhythm, companion memory, weekly summaries, and journal.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Bring your routine",
    desc: "Open your own book, and tell the companion what you follow — or tap it in. Two minutes, and your day is mapped.",
  },
  {
    step: "2",
    title: "Live it out loud",
    desc: "“Done my lemon water.” “Just finished the smoothie.” Your checklist keeps itself. Log energy and mood in a sentence.",
  },
  {
    step: "3",
    title: "Watch it hold",
    desc: "Reminders at the right moments, streaks that honour showing up, and a weekly summary of your own data. Your routine becomes consistent.",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: 1, background: C.border, margin: "0 24px" }} />;
}

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid = /android/i.test(navigator.userAgent);
const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;

export default function Landing({ onGetStarted }) {
  const [openPain, setOpenPain] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setStickyVisible(window.scrollY > 320);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ background: C.cream, minHeight: "100dvh", fontFamily: "Georgia,serif" }}>

      {/* ── STICKY HEADER ── */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(255,255,255,0.96)",
        backdropFilter: "blur(10px)",
        borderBottom: `1px solid ${C.border}`,
        padding: "10px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        transform: stickyVisible ? "translateY(0)" : "translateY(-100%)",
        transition: "transform 0.25s ease",
        boxShadow: "0 2px 16px #00000012",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>🌿</span>
          <span style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal }}>CelerySync</span>
        </div>
        <button
          onClick={onGetStarted}
          style={{
            background: C.sageDark, color: "#fff",
            border: "none", borderRadius: 30,
            padding: "9px 20px",
            fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13,
            cursor: "pointer",
          }}
        >
          Start Free →
        </button>
      </div>

      {/* ── HERO ── */}
      <div style={{
        background: `linear-gradient(160deg,${C.sageDark} 0%,${C.leaf} 65%,#5a9a6a 100%)`,
        padding: "56px 24px 52px",
        textAlign: "center",
        color: "#fff",
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🌿</div>

        <h1 style={{
          fontFamily: "Georgia,serif", fontWeight: 700,
          fontSize: 32, lineHeight: 1.25,
          margin: "0 auto 14px", maxWidth: 360,
        }}>
          You've read the books.<br />Now live them.
        </h1>

        <p style={{
          fontSize: 16, lineHeight: 1.75,
          maxWidth: 340, margin: "0 auto 10px",
          opacity: 0.92,
        }}>
          CelerySync is the only companion built for Medical Medium followers — an AI that speaks your language, remembers your journey, and guides you through every single day.
        </p>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          background: "rgba(255,255,255,0.15)",
          border: "1px solid rgba(255,255,255,0.3)",
          borderRadius: 20, padding: "6px 14px",
          marginBottom: 28,
        }}>
          <span style={{ fontSize: 11, opacity: 0.95, letterSpacing: 0.3 }}>
            🌿 Independent app · Inspired by Anthony William's teachings · Not affiliated with or endorsed by Medical Medium LLC
          </span>
        </div>

        <button
          onClick={onGetStarted}
          style={{
            background: "#fff", color: C.sageDark,
            border: "none", borderRadius: 40,
            padding: "17px 40px",
            fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 17,
            cursor: "pointer", boxShadow: "0 8px 32px #00000035",
            display: "block", margin: "0 auto 12px",
            width: "100%", maxWidth: 320,
          }}
        >
          Start Free — 7 Days →
        </button>

        <div style={{ fontSize: 12, opacity: 0.7 }}>
          No credit card needed · $14.97/month after · Cancel anytime
        </div>
      </div>

      {/* ── DOES THIS SOUND FAMILIAR? ── */}
      <div style={{ padding: "40px 24px 36px", maxWidth: 500, margin: "0 auto" }}>
        <h2 style={{
          fontFamily: "Georgia,serif", fontWeight: 700,
          fontSize: 22, color: C.charcoal,
          marginBottom: 8, textAlign: "center",
        }}>
          Does this sound familiar?
        </h2>
        <p style={{ fontSize: 13, color: C.muted, textAlign: "center", marginBottom: 24, lineHeight: 1.6 }}>
          You believe in Anthony William's work. You've invested in the books, the supplements, the protocols. But healing consistently — every single day — is harder than it looks.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(openPain ? PAIN_POINTS : PAIN_POINTS.slice(0, 3)).map((p, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              background: "#fff", borderRadius: 14, padding: "13px 16px",
              border: `1px solid ${C.border}`, boxShadow: "0 1px 6px #00000006",
            }}>
              <div style={{ color: C.sage, fontSize: 16, flexShrink: 0, marginTop: 1 }}>✓</div>
              <div style={{ fontSize: 13.5, color: C.charcoal, lineHeight: 1.6 }}>{p}</div>
            </div>
          ))}
        </div>

        {!openPain && (
          <button
            onClick={() => setOpenPain(true)}
            style={{ background: "none", border: "none", color: C.sage, fontFamily: "Georgia,serif", fontSize: 13, cursor: "pointer", marginTop: 10, fontWeight: 700, padding: 0 }}
          >
            See more →
          </button>
        )}

        <div style={{
          marginTop: 24, background: C.sageLight,
          border: `1.5px solid ${C.sage}40`,
          borderRadius: 16, padding: "16px 18px",
          textAlign: "center",
        }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.sageDark, marginBottom: 6 }}>
            You are not alone in this.
          </div>
          <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.7 }}>
            CelerySync was built for exactly where you are — already on the path, ready to go deeper, needing something that truly gets it.
          </div>
        </div>
      </div>

      <Divider />

      {/* ── TRANSFORMATION ── */}
      <div style={{ padding: "40px 24px", maxWidth: 500, margin: "0 auto" }}>
        <h2 style={{
          fontFamily: "Georgia,serif", fontWeight: 700,
          fontSize: 22, color: C.charcoal,
          marginBottom: 6, textAlign: "center",
        }}>
          Imagine your healing life with real support
        </h2>
        <p style={{ fontSize: 13, color: C.muted, textAlign: "center", marginBottom: 24, lineHeight: 1.6 }}>
          Not more information. The support to actually use what you already know.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {TRANSFORMATION.map((t, i) => (
            <div key={i} style={{
              background: "#fff", borderRadius: 16, overflow: "hidden",
              border: `1px solid ${C.border}`, boxShadow: "0 2px 8px #00000008",
            }}>
              <div style={{ display: "flex", alignItems: "stretch" }}>
                <div style={{ flex: 1, padding: "13px 14px", borderRight: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 9, color: "#ef4444", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Before</div>
                  <div style={{ fontSize: 12.5, color: "#6b7280", lineHeight: 1.5 }}>{t.before}</div>
                </div>
                <div style={{ flex: 1, padding: "13px 14px", background: C.sageLight }}>
                  <div style={{ fontSize: 9, color: C.sageDark, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>With CelerySync</div>
                  <div style={{ fontSize: 12.5, color: C.charcoal, lineHeight: 1.5, fontWeight: 600 }}>{t.after}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Divider />

      {/* ── HOW IT WORKS ── */}
      <div style={{ padding: "40px 24px", maxWidth: 500, margin: "0 auto" }}>
        <h2 style={{
          fontFamily: "Georgia,serif", fontWeight: 700,
          fontSize: 22, color: C.charcoal,
          marginBottom: 24, textAlign: "center",
        }}>
          Simple to start. Powerful over time.
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {HOW_IT_WORKS.map((h, i) => (
            <div key={i} style={{ display: "flex", gap: 16, marginBottom: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: C.sageDark, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15,
                }}>
                  {h.step}
                </div>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div style={{ width: 2, flex: 1, background: C.border, marginTop: 6, minHeight: 24 }} />
                )}
              </div>
              <div style={{ paddingTop: 6 }}>
                <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 4 }}>
                  {h.title}
                </div>
                <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.65 }}>{h.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Divider />

      {/* ── FOUNDER STORY ── */}
      <div style={{ padding: "40px 24px", maxWidth: 500, margin: "0 auto" }}>
        <h2 style={{
          fontFamily: "Georgia,serif", fontWeight: 700,
          fontSize: 22, color: C.charcoal,
          marginBottom: 20, textAlign: "center",
        }}>
          Why CelerySync exists
        </h2>

        <div style={{
          background: "#fff", borderRadius: 18, padding: "24px 22px",
          border: `1px solid ${C.border}`, boxShadow: "0 2px 12px #00000008",
        }}>
          <div style={{ fontSize: 28, marginBottom: 10, color: C.sage, lineHeight: 1 }}>"</div>
          <div style={{ fontSize: 14, color: C.charcoal, lineHeight: 1.85, fontStyle: "italic", marginBottom: 8 }}>
            I've lived the Medical Medium lifestyle for fifteen years. The books tell you
            everything about the what and the why — but nothing ever helped with the how of an
            ordinary Tuesday: remembering the spacing between steps, knowing what day of a
            program you're on, staying consistent when life is loud.
          </div>
          <div style={{ fontSize: 14, color: C.charcoal, lineHeight: 1.85, fontStyle: "italic", marginBottom: 16 }}>
            So I built the thing I couldn't find — for myself and my own family first. Not
            another source of information. An engine for living what you've already chosen:
            reminders, rhythm, and a companion that listens. Your books stay the source.
            CelerySync keeps you living them.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: C.sageLight, border: `2px solid ${C.sage}50`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, flexShrink: 0,
            }}>
              🌿
            </div>
            <div>
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.charcoal }}>
                Alli · <span style={{ fontWeight: 400, color: C.muted }}>Founder</span>
              </div>
              <div style={{ fontSize: 11, color: C.sage, marginTop: 2 }}>15 years living the MM lifestyle</div>
            </div>
          </div>
        </div>

        {/* Honest, human note — this app is one person's evolving labour of love */}
        <div style={{
          marginTop: 12, background: C.mist, borderRadius: 14,
          padding: "14px 18px", textAlign: "center",
        }}>
          <div style={{ fontSize: 12.5, color: C.mid, lineHeight: 1.7 }}>
            CelerySync is young and always evolving. I'm not a big app company — I'm one
            person building the thing our community needed. If something feels rough, or
            you wish it worked differently,{" "}
            <a href="mailto:allij@live.com.au?subject=CelerySync%20feedback" style={{ color: C.sageDark, fontWeight: 700 }}>
              tell me
            </a>{" "}
            — I read everything, and the app gets better because of it.
          </div>
        </div>
      </div>

      <Divider />

      {/* ── FEATURES ── */}
      <div style={{ padding: "40px 24px", maxWidth: 520, margin: "0 auto" }}>
        <h2 style={{
          fontFamily: "Georgia,serif", fontWeight: 700,
          fontSize: 22, color: C.charcoal,
          marginBottom: 6, textAlign: "center",
        }}>
          Everything built for the MM lifestyle
        </h2>
        <p style={{ fontSize: 13, color: C.muted, textAlign: "center", marginBottom: 24, lineHeight: 1.6 }}>
          Not a generic health app with an MM skin. Built from the ground up for this community.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{
              background: "#fff", borderRadius: 16, padding: "16px 14px",
              border: `1px solid ${C.border}`, boxShadow: "0 2px 8px #00000008",
            }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{f.emoji}</div>
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 12.5, color: C.charcoal, marginBottom: 4, lineHeight: 1.3 }}>
                {f.title}
              </div>
              <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.55 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <Divider />

      {/* ── AI PROOF SECTION ── */}
      <div style={{ background: `linear-gradient(135deg,${C.sageLight},#fdf9f0)`, padding: "40px 24px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: "Georgia,serif", fontWeight: 700,
            fontSize: 22, color: C.charcoal,
            marginBottom: 12, textAlign: "center",
          }}>
            A companion you can actually talk to
          </h2>
          <p style={{ fontSize: 13.5, color: C.mid, lineHeight: 1.8, marginBottom: 20, textAlign: "center" }}>
            Not a chatbot in a box. A real voice that lives across the whole app — it knows what's
            on your rhythm, hears you say you've done it, and ticks it off on screen while you
            watch. It remembers your milestones and always points you to the official books
            and sources for anything deeper.
          </p>

          {/* Mock AI conversation */}
          <div style={{ background: "#fff", borderRadius: 18, padding: "18px 16px", border: `1px solid ${C.border}`, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: C.muted, fontFamily: "Georgia,serif", marginBottom: 12, textAlign: "center" }}>
              Example conversation
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
              <div style={{ background: C.sage, color: "#fff", borderRadius: 14, padding: "9px 13px", maxWidth: "75%", fontSize: 13 }}>
                Just finished my celery juice — what's next?
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <div style={{ fontSize: 18, flexShrink: 0 }}>🌿</div>
              <div style={{ background: C.mist, borderRadius: 14, padding: "10px 13px", fontSize: 12.5, color: C.charcoal, lineHeight: 1.7 }}>
                Lovely — ticked it off for you ✓ That's three mornings in a row. Next in your
                rhythm is your smoothie, in about twenty minutes. Want me to log how your
                energy's feeling while we wait?
              </div>
            </div>
            <div style={{ fontSize: 11, color: C.muted, textAlign: "center" }}>
              The checkbox ticks itself on screen as you speak — that's the moment people don't go back from.
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {["Hands-free logging", "Remembers your journey", "Links to official AW sources", "Weekly summaries", "Doctor reports"].map((t) => (
              <div key={t} style={{
                background: C.sageDark, color: "#fff",
                borderRadius: 20, padding: "6px 14px",
                fontSize: 11.5, fontFamily: "Georgia,serif",
              }}>
                ✓ {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── INSTALL SECTION (mobile only, not already installed) ── */}
      {(isIOS || isAndroid) && !isStandalone && (
        <>
          <Divider />
          <div style={{ padding: "36px 24px", maxWidth: 480, margin: "0 auto" }}>
            <h2 style={{
              fontFamily: "Georgia,serif", fontWeight: 700,
              fontSize: 20, color: C.charcoal,
              marginBottom: 6, textAlign: "center",
            }}>
              Works best on your home screen
            </h2>
            <p style={{ fontSize: 13, color: C.muted, textAlign: "center", marginBottom: 20, lineHeight: 1.65 }}>
              Install CelerySync like a native app — no App Store needed. You get your routine reminders even when the app is closed.
            </p>

            <div style={{
              background: "#fff", borderRadius: 18, padding: "18px 16px",
              border: `1px solid ${C.border}`, boxShadow: "0 2px 10px #00000008",
            }}>
              {isIOS ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { step: "1", text: 'Tap the Share button at the bottom of Safari (the box with an arrow)' },
                    { step: "2", text: 'Scroll down and tap "Add to Home Screen"' },
                    { step: "3", text: 'Tap "Add" — CelerySync appears on your home screen instantly' },
                  ].map(({ step, text }) => (
                    <div key={step} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: "50%",
                        background: C.sageDark, color: "#fff", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 12,
                      }}>{step}</div>
                      <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.6, paddingTop: 4 }}>{text}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { step: "1", text: 'Tap the three-dot menu (⋮) in the top right of Chrome' },
                    { step: "2", text: 'Tap "Add to Home screen"' },
                    { step: "3", text: 'Tap "Add" — CelerySync is on your home screen' },
                  ].map(({ step, text }) => (
                    <div key={step} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: "50%",
                        background: C.sageDark, color: "#fff", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 12,
                      }}>{step}</div>
                      <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.6, paddingTop: 4 }}>{text}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 14, padding: "10px 14px", background: C.sageLight, borderRadius: 12, fontSize: 12, color: C.sageDark, lineHeight: 1.6 }}>
                ✓ Background reminders · ✓ Offline access · ✓ Full-screen experience
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── FINAL CTA ── */}
      <div style={{ padding: "40px 20px 20px", maxWidth: 480, margin: "0 auto" }}>
        <div style={{
          background: `linear-gradient(135deg,${C.sageDark},${C.leaf})`,
          borderRadius: 24, padding: "36px 28px",
          textAlign: "center", color: "#fff",
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌿</div>
          <h2 style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 24, marginBottom: 8, lineHeight: 1.3 }}>
            The lifestyle you chose deserves real support.
          </h2>
          <p style={{ fontSize: 14, opacity: 0.88, lineHeight: 1.7, marginBottom: 24 }}>
            Try CelerySync free for 7 days. No credit card. No commitment. Just your routine, supported the way it should be.
          </p>

          <div style={{ fontSize: 28, fontFamily: "Georgia,serif", fontWeight: 700, marginBottom: 4 }}>
            $14.97<span style={{ fontSize: 14, fontWeight: 400, opacity: 0.85 }}>/month AUD</span>
          </div>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>
            or $119/year — save $61
          </div>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 20 }}>
            Powered by the world's most advanced AI · Unlimited family members included
          </div>

          <button
            onClick={onGetStarted}
            style={{
              background: "#fff", color: C.sageDark,
              border: "none", borderRadius: 40, padding: "16px 32px",
              fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 17,
              cursor: "pointer", width: "100%", marginBottom: 12,
              boxShadow: "0 4px 20px #00000020",
            }}
          >
            Begin My Free Trial →
          </button>

          <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.8 }}>
            Cancel before day 7 and pay nothing · Secure checkout via Stripe{"\n"}
            Your data is private and never shared
          </div>
        </div>

        {/* Sign in link */}
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <span style={{ fontSize: 13, color: C.muted }}>Already a member? </span>
          <button
            onClick={onGetStarted}
            style={{ background: "none", border: "none", color: C.sageDark, fontFamily: "Georgia,serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
          >
            Sign in →
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ padding: "24px 24px 52px", maxWidth: 500, margin: "0 auto" }}>
        <div style={{
          background: "#f9f9f7",
          border: `1px solid ${C.border}`,
          borderRadius: 16, padding: "16px 18px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.charcoal, marginBottom: 6, fontFamily: "Georgia,serif" }}>
            Independent App — Important Notice
          </div>
          <div style={{ fontSize: 11.5, color: C.mid, lineHeight: 1.75 }}>
            CelerySync is an <strong>independent</strong> companion app created by a Medical Medium community member. It is <strong>not affiliated with, endorsed by, or connected to</strong> Anthony William or Medical Medium LLC in any way. "Medical Medium" is a registered trademark of Anthony William, Inc. All health information in this app is for <strong>educational and personal reference only</strong> and is not a substitute for professional medical advice. Always work with your healthcare provider.
          </div>
        </div>
      </div>

    </div>
  );
}
