import { useState, useEffect, useRef } from "react";
import { price, CURRENCY_CODE } from "../lib/pricing.js";
import C, { alpha } from "../lib/colors.js";

// ─── Media slots ─────────────────────────────────────────────────────────────
// When Alli records the 20–30s phone demo (say it → it ticks), put the file in
// /public and set its path here — it replaces the animated demo in the hero.
const DEMO_VIDEO_URL = null; // e.g. "/demo.mp4"
// A short pre-recorded clip of the helper's voice explaining the app (fixed,
// approved wording — never a live AI call from this public page). Set the path
// to show the "Hear it" button.
const HEAR_IT_URL = null; // e.g. "/hear-it.mp3"

// ─── Copy ────────────────────────────────────────────────────────────────────
// Compliance: this is marketing copy, so the same rails apply as in-app —
// no AW content, nothing about healing/treating, the user's own routine only.

const PAIN_POINTS = [
  "You know your routine inside out — but life gets in the way and you fall off track",
  "You forget the snack window... again",
  "Your routine lives on sticky notes, phone alarms, and memory",
  "You started a multi-day program and lost track of which day you're on",
  "It's 2am, you can't sleep, and nobody around you understands the lifestyle",
  "The people in your life don't understand why celery juice matters so much to you",
];

const GROUPS = [
  {
    emoji: "🌅",
    title: "Your day",
    line: "Set your wake-up time and your whole routine falls into place.",
    points: [
      "Your routine in order, timed from when you wake",
      "Reminders for the snack windows and spacing you set",
      "Water and supplements — with a nudge before anything runs out",
      "Gentle check-ins through the day",
    ],
  },
  {
    emoji: "🗓",
    title: "Your programs",
    line: "Enter a program once from your own book — the app walks it with you.",
    points: [
      "Always know which day you're on and what today involves",
      "Save, copy, pause and reuse your programs",
      "Do another round, and choose what carries on after",
      "Reminders that follow on from each step",
    ],
  },
  {
    emoji: "🫐",
    title: "Your kitchen",
    line: "Your own recipes, planned into your week.",
    points: [
      "Your own recipe library, from your own books and notes",
      "Cook mode, one step at a time",
      "Plan recipes onto days and see your week at a glance",
      "A shopping list sorted by aisle — works offline in the shop",
    ],
  },
  {
    emoji: "🎙",
    title: "Your helper",
    badge: "Rhythm + Voice",
    line: "Talk or type — it does the ticking for you.",
    points: [
      "“Just finished my celery juice” — and it ticks on screen",
      "Add to your shopping list, log water and how you're feeling",
      "Cook along with it, hands-free",
      "Remembers your journey — and you can give it a name",
      "Chats in 15 languages",
    ],
  },
];

const ALSO = [
  "📊 Your streaks — showed-up and perfect",
  "📬 A summary every Sunday, and every month",
  "📋 A doctor-ready PDF of your own logged days",
  "💜 Invite a carer to follow along",
  "👥 Profiles for the adults in your household",
];

const FAQ = [
  {
    q: "Do I need Anthony William's books?",
    a: "Yes. CelerySync doesn't include any of his protocols or recipes — you add your own routine from your own copy of his books, and the app helps you live it. For the full detail it always points you to his official books, website and podcast.",
  },
  {
    q: "Does it give medical advice?",
    a: "No. CelerySync is a wellness routine app: it helps you keep up the routine you've chosen and shows you your own logged days. It doesn't diagnose, treat, or advise on medications — always work with your doctor.",
  },
  {
    q: "What's the difference between the two plans?",
    a: () => (
      <>
        <strong>Rhythm ({price("rhythm")}/month)</strong> — your day, programs, kitchen, reminders, streaks and reports. You tick things off yourself.
        <br /><br />
        <strong>Rhythm + Voice ({price("voice")}/month)</strong> — everything in Rhythm, plus the AI helper you can talk or type to. Includes 100 voice minutes a month; typed chat as much as you like. Extra voice minutes are {price("topup")} for 30.
      </>
    ),
  },
  {
    q: "What happens after the 7 free days?",
    a: "Your free week includes everything, with 20 voice minutes to try the helper. No card needed to start. When it ends you choose a plan — or simply stop. Plans are monthly and you can cancel anytime.",
  },
  {
    q: "Is my information private?",
    a: "Yes. Your data is never sold or shared. You can download it, or delete your account, anytime from Settings.",
  },
  {
    q: "Can my family use it?",
    a: "Adults in your household (18+) can each have their own profile on one subscription, with their own routine. You can also invite a carer to see how you're going.",
  },
  {
    q: "Does it work on my phone?",
    a: "Yes — it runs in your phone's browser, and you can add it to your home screen like an app. No app store needed.",
  },
];

// ─── Pieces ──────────────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: 1, background: C.border, margin: "0 24px" }} />;
}

const H2 = ({ children, mb = 8 }) => (
  <h2 style={{
    fontFamily: "Georgia,serif", fontWeight: 700,
    fontSize: 22, color: C.charcoal,
    marginBottom: mb, textAlign: "center", lineHeight: 1.3,
  }}>
    {children}
  </h2>
);

const reduceMotion = typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// The "say it — watch it tick" moment, shown rather than described. Loops
// gently; with reduced motion it just shows the finished state.
function TickDemo() {
  const [step, setStep] = useState(reduceMotion ? 3 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    const t = setTimeout(() => setStep((s) => (s + 1) % 5), [900, 1600, 900, 4200, 600][step]);
    return () => clearTimeout(t);
  }, [step]);

  const said = step >= 1 && step <= 3;
  const ticked = step >= 2 && step <= 3;
  const replied = step === 3;
  const show = (on) => ({ opacity: on ? 1 : 0, transform: on ? "none" : "translateY(6px)", transition: "all .35s ease" });

  const items = [
    { name: "Lemon water", time: "6:30", done: true },
    { name: "Celery juice", time: "7:00", done: ticked, live: true },
    { name: "Smoothie", time: "7:30", done: false },
  ];

  return (
    <div aria-label="Example: saying 'just finished my celery juice' ticks it off on screen" style={{
      background: C.surface, color: C.charcoal, borderRadius: 22,
      padding: "16px 14px 14px", maxWidth: 320, margin: "0 auto 26px",
      boxShadow: "0 10px 36px #00000030", textAlign: "left",
    }}>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 8, fontWeight: 700, letterSpacing: 0.4 }}>TODAY</div>
      {items.map((it) => (
        <div key={it.name} style={{
          display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 12,
          background: it.live && ticked ? C.sageLight : "transparent", transition: "background .35s",
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 7, flexShrink: 0,
            border: `2px solid ${it.done ? C.sage : C.border}`,
            background: it.done ? C.sage : "transparent", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700,
            transform: it.live && ticked ? "scale(1.12)" : "scale(1)", transition: "all .3s",
          }}>{it.done ? "✓" : ""}</div>
          <div style={{ flex: 1, fontSize: 14.5, textDecoration: it.done ? "line-through" : "none", color: it.done ? C.mid : C.charcoal }}>{it.name}</div>
          <div style={{ fontSize: 13, color: C.muted }}>{it.time}</div>
        </div>
      ))}
      <div style={{ minHeight: 112, marginTop: 10 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8, ...show(said) }}>
          <div style={{ background: C.sage, color: "#fff", borderRadius: 14, padding: "8px 12px", fontSize: 13.5, maxWidth: "85%" }}>
            🎙 “Just finished my celery juice”
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, ...show(replied) }}>
          <div style={{ fontSize: 16, flexShrink: 0 }}>🌿</div>
          <div style={{ background: C.mist, borderRadius: 14, padding: "8px 12px", fontSize: 13.5, lineHeight: 1.55 }}>
            Lovely — ticked it off ✓ Your smoothie's next, in about half an hour.
          </div>
        </div>
      </div>
    </div>
  );
}

function HearIt() {
  const audio = useRef(null);
  const [playing, setPlaying] = useState(false);
  if (!HEAR_IT_URL) return null;
  const toggle = () => {
    if (!audio.current) {
      audio.current = new Audio(HEAR_IT_URL);
      audio.current.onended = () => setPlaying(false);
    }
    if (playing) { audio.current.pause(); setPlaying(false); }
    else { audio.current.currentTime = 0; audio.current.play().catch(() => {}); setPlaying(true); }
  };
  return (
    <button onClick={toggle} style={{
      background: "rgba(255,255,255,0.15)", color: "#fff",
      border: "1px solid rgba(255,255,255,0.45)", borderRadius: 30,
      padding: "9px 18px", fontFamily: "Georgia,serif", fontSize: 14, fontWeight: 700,
      cursor: "pointer", margin: "0 auto 22px", display: "block",
    }}>
      {playing ? "⏸ Pause" : "🔊 Hear it explain itself (20s)"}
    </button>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer",
          padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
          fontFamily: "Georgia,serif", fontSize: 15, fontWeight: 700, color: C.charcoal,
        }}
      >
        <span>{q}</span>
        <span style={{ color: C.sage, fontSize: 18, flexShrink: 0 }}>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 16px 16px", fontSize: 14, color: C.mid, lineHeight: 1.7 }}>
          {typeof a === "function" ? a() : a}
        </div>
      )}
    </div>
  );
}

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid = /android/i.test(navigator.userAgent);
const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Landing({ onGetStarted, onSignIn }) {
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
          <span style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: "#1E2A1E" }}>CelerySync</span>
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
        padding: "48px 24px 48px",
        textAlign: "center",
        color: "#fff",
      }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🌿</div>

        <h1 style={{
          fontFamily: "Georgia,serif", fontWeight: 700,
          fontSize: 32, lineHeight: 1.25,
          margin: "0 auto 14px", maxWidth: 360,
        }}>
          You've read the books.<br />Now live them.
        </h1>

        <p style={{
          fontSize: 16.5, lineHeight: 1.7,
          maxWidth: 350, margin: "0 auto 26px",
          opacity: 0.95,
        }}>
          Your daily routine, programs, recipes and reminders — in one app, with a helper you can simply talk to.
        </p>

        {DEMO_VIDEO_URL ? (
          <video
            src={DEMO_VIDEO_URL}
            autoPlay muted loop playsInline controls
            style={{ width: "100%", maxWidth: 320, borderRadius: 22, display: "block", margin: "0 auto 26px", boxShadow: "0 10px 36px #00000030" }}
          />
        ) : (
          <TickDemo />
        )}

        <HearIt />

        <button
          onClick={onGetStarted}
          style={{
            background: "#fff", color: "#3D6B44",
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

        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 18 }}>
          No credit card needed · Plans from {price("rhythm")}/month after · Cancel anytime
        </div>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          background: "rgba(255,255,255,0.15)",
          border: "1px solid rgba(255,255,255,0.3)",
          borderRadius: 20, padding: "6px 14px",
        }}>
          <span style={{ fontSize: 12, opacity: 0.95, letterSpacing: 0.3 }}>
            🌿 Independent app · Not affiliated with or endorsed by Anthony William or Medical Medium LLC
          </span>
        </div>
      </div>

      {/* ── DOES THIS SOUND FAMILIAR? ── */}
      <div style={{ padding: "40px 24px 36px", maxWidth: 500, margin: "0 auto" }}>
        <H2>Does this sound familiar?</H2>
        <p style={{ fontSize: 14, color: C.mid, textAlign: "center", marginBottom: 24, lineHeight: 1.6 }}>
          You believe in Anthony William's work. You've invested in the books, the supplements, the protocols. But staying consistent — every single day — is harder than it looks.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(openPain ? PAIN_POINTS : PAIN_POINTS.slice(0, 3)).map((p, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              background: C.surface, borderRadius: 14, padding: "13px 16px",
              border: `1px solid ${C.border}`, boxShadow: "0 1px 6px #00000006",
            }}>
              <div style={{ color: C.sage, fontSize: 16, flexShrink: 0, marginTop: 1 }}>✓</div>
              <div style={{ fontSize: 14, color: C.charcoal, lineHeight: 1.6 }}>{p}</div>
            </div>
          ))}
        </div>

        {!openPain && (
          <button
            onClick={() => setOpenPain(true)}
            style={{ background: "none", border: "none", color: C.sage, fontFamily: "Georgia,serif", fontSize: 14, cursor: "pointer", marginTop: 10, fontWeight: 700, padding: 0 }}
          >
            See more →
          </button>
        )}
      </div>

      {/* ── FOUNDER STORY ── */}
      <div style={{ padding: "4px 24px 40px", maxWidth: 500, margin: "0 auto" }}>
        <div style={{
          background: C.surface, borderRadius: 18, padding: "24px 22px",
          border: `1px solid ${C.border}`, boxShadow: "0 2px 12px #00000008",
        }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 17, color: C.sageDark, marginBottom: 10 }}>
            You are not alone in this.
          </div>
          <div style={{ fontSize: 14.5, color: C.charcoal, lineHeight: 1.85, fontStyle: "italic", marginBottom: 8 }}>
            I've lived the Medical Medium lifestyle for over ten years. The books tell you
            everything about the what and the why — but nothing ever helped with the how of an
            ordinary Tuesday: remembering the spacing between steps, knowing what day of a
            program you're on, staying consistent when life is loud.
          </div>
          <div style={{ fontSize: 14.5, color: C.charcoal, lineHeight: 1.85, fontStyle: "italic", marginBottom: 16 }}>
            So I built the thing I couldn't find — for myself and my own family first. Not
            another source of information. Your books stay the source. CelerySync helps you
            live them.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: C.sageLight, border: `2px solid ${alpha(C.sage, "50")}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, flexShrink: 0,
            }}>
              🌿
            </div>
            <div>
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>
                Alli · <span style={{ fontWeight: 400, color: C.muted }}>Founder</span>
              </div>
              <div style={{ fontSize: 13.5, color: C.sage, marginTop: 2 }}>10+ years living the MM lifestyle</div>
            </div>
          </div>
        </div>
      </div>

      <Divider />

      {/* ── WHAT IT DOES ── */}
      <div style={{ padding: "40px 20px", maxWidth: 520, margin: "0 auto" }}>
        <H2>What CelerySync does</H2>
        <p style={{ fontSize: 14, color: C.mid, textAlign: "center", marginBottom: 24, lineHeight: 1.6 }}>
          Not more information — the support to actually live what you already know.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {GROUPS.map((g) => (
            <div key={g.title} style={{
              background: C.surface, borderRadius: 18, padding: "18px 18px 16px",
              border: `1px solid ${C.border}`, boxShadow: "0 2px 8px #00000008",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 26 }}>{g.emoji}</span>
                <span style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 18, color: C.charcoal }}>{g.title}</span>
                {g.badge && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.plum, background: C.plumLight, borderRadius: 20, padding: "3px 10px" }}>
                    {g.badge}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 14.5, color: C.mid, lineHeight: 1.55, marginBottom: 10 }}>{g.line}</div>
              {g.points.map((p) => (
                <div key={p} style={{ display: "flex", gap: 9, fontSize: 14, color: C.charcoal, lineHeight: 1.55, marginBottom: 5 }}>
                  <span style={{ color: C.sage, flexShrink: 0 }}>✓</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 16, background: C.sageLight, borderRadius: 18, padding: "16px 18px",
          border: `1.5px solid ${alpha(C.sage, "40")}`,
        }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15.5, color: C.sageDark, marginBottom: 8 }}>
            …and it shows you how you're going
          </div>
          {ALSO.map((t) => (
            <div key={t} style={{ fontSize: 14, color: C.charcoal, lineHeight: 1.6, marginBottom: 3 }}>{t}</div>
          ))}
          <div style={{ fontSize: 13, color: C.mid, marginTop: 8, lineHeight: 1.6 }}>
            Always your own logged days, shown as they are — and always pointing you to Anthony William's official sources for the detail.
          </div>
        </div>
      </div>

      <Divider />

      {/* ── FAQ ── */}
      <div style={{ padding: "40px 20px", maxWidth: 520, margin: "0 auto" }}>
        <H2 mb={20}>Questions people ask</H2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FAQ.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
        </div>
        <div style={{ marginTop: 14, background: C.mist, borderRadius: 14, padding: "14px 18px", textAlign: "center" }}>
          <div style={{ fontSize: 14, color: C.mid, lineHeight: 1.7 }}>
            CelerySync is young and always evolving — one person building what our community
            needed. Something else you'd like to know, or wish it did?{" "}
            <a href="mailto:allij@live.com.au?subject=CelerySync%20question" style={{ color: C.sageDark, fontWeight: 700 }}>
              Ask me
            </a>
            {" "}— I read everything.
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
            <p style={{ fontSize: 14, color: C.mid, textAlign: "center", marginBottom: 20, lineHeight: 1.65 }}>
              Add CelerySync like an app — no app store needed — so your reminders reach you even when it's closed.
            </p>

            <div style={{
              background: C.surface, borderRadius: 18, padding: "18px 16px",
              border: `1px solid ${C.border}`, boxShadow: "0 2px 10px #00000008",
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {(isIOS ? [
                  'Tap the Share button at the bottom of Safari (the box with an arrow)',
                  'Scroll down and tap "Add to Home Screen"',
                  'Tap "Add" — CelerySync appears on your home screen instantly',
                ] : [
                  'Tap the three-dot menu (⋮) in the top right of Chrome',
                  'Tap "Add to Home screen"',
                  'Tap "Add" — CelerySync is on your home screen',
                ]).map((text, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%",
                      background: C.sageDark, color: "#fff", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13.5,
                    }}>{i + 1}</div>
                    <div style={{ fontSize: 14, color: C.charcoal, lineHeight: 1.6, paddingTop: 3 }}>{text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── FINAL CTA ── */}
      <div style={{ padding: "32px 20px 20px", maxWidth: 480, margin: "0 auto" }}>
        <div style={{
          background: `linear-gradient(135deg,${C.sageDark},${C.leaf})`,
          borderRadius: 24, padding: "34px 26px",
          textAlign: "center", color: "#fff",
        }}>
          <h2 style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 24, marginBottom: 8, lineHeight: 1.3 }}>
            The lifestyle you chose deserves real support.
          </h2>
          <p style={{ fontSize: 14.5, opacity: 0.9, lineHeight: 1.7, marginBottom: 22 }}>
            Try everything free for 7 days. No credit card, no commitment.
          </p>

          <div style={{ display: "flex", gap: 10, marginBottom: 20, textAlign: "left" }}>
            {[
              { name: "Rhythm", p: price("rhythm"), d: "Your day, programs, kitchen, reminders and reports" },
              { name: "Rhythm + Voice", p: price("voice"), d: "Everything, plus the helper you talk or type to" },
            ].map((pl) => (
              <div key={pl.name} style={{ flex: 1, background: "rgba(255,255,255,0.13)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 14, padding: "12px 12px" }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, opacity: 0.95 }}>{pl.name}</div>
                <div style={{ fontSize: 21, fontWeight: 700, margin: "2px 0 4px" }}>
                  {pl.p}<span style={{ fontSize: 12, fontWeight: 400, opacity: 0.85 }}>/mo</span>
                </div>
                <div style={{ fontSize: 12.5, opacity: 0.85, lineHeight: 1.45 }}>{pl.d}</div>
              </div>
            ))}
          </div>

          <button
            onClick={onGetStarted}
            style={{
              background: "#fff", color: "#3D6B44",
              border: "none", borderRadius: 40, padding: "16px 32px",
              fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 17,
              cursor: "pointer", width: "100%", marginBottom: 12,
              boxShadow: "0 4px 20px #00000020",
            }}
          >
            Begin My Free Trial →
          </button>

          <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.7 }}>
            Prices in {CURRENCY_CODE} · monthly, cancel anytime · secure Stripe checkout
            <br />
            Your data is private and never shared
          </div>
        </div>

        {/* Sign in link */}
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <span style={{ fontSize: 14, color: C.muted }}>Already a member? </span>
          <button
            onClick={onSignIn || onGetStarted}
            style={{ background: "none", border: "none", color: C.sageDark, fontFamily: "Georgia,serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
          >
            Sign in →
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ padding: "24px 24px 52px", maxWidth: 500, margin: "0 auto" }}>
        <div style={{
          background: C.mist,
          border: `1px solid ${C.border}`,
          borderRadius: 16, padding: "16px 18px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.charcoal, marginBottom: 6, fontFamily: "Georgia,serif" }}>
            Independent App — Important Notice
          </div>
          <div style={{ fontSize: 13.5, color: C.mid, lineHeight: 1.75 }}>
            CelerySync is an <strong>independent</strong> companion app created by a Medical Medium community member. It is <strong>not affiliated with, endorsed by, or connected to</strong> Anthony William or Medical Medium LLC in any way. "Medical Medium" is a registered trademark of Anthony William, Inc. All health information in this app is for <strong>educational and personal reference only</strong> and is not a substitute for professional medical advice. Always work with your healthcare provider.
            <div style={{ marginTop: 8 }}>
              <a href="/terms.html" style={{ color: C.sageDark }}>Terms of Use</a>{" · "}
              <a href="/privacy.html" style={{ color: C.sageDark }}>Privacy Policy</a>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
