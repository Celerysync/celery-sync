import { useState, useEffect } from "react";
import C from "../lib/colors.js";

// ─── Copy ────────────────────────────────────────────────────────────────────

const PAIN_POINTS = [
  "You know the protocols but life gets in the way and you fall off track",
  "You have questions at 2am that nobody around you understands",
  "You started a cleanse but aren't sure if what you're feeling is normal",
  "You forget the adrenal snack window... again",
  "You know which supplements to take but can never remember the exact dosages",
  "The people in your life don't understand why celery juice matters so much to you",
];

const TRANSFORMATION = [
  { before: "Drowning in books, unsure what applies to you", after: "Your exact protocol, personalised to your conditions and symptoms" },
  { before: "Alone with questions no one around you can answer", after: "An AI that speaks your language, any time you need it" },
  { before: "Starting cleanses, falling off, starting again", after: "Guided through every single day with reminders and support" },
  { before: "No idea if you're actually getting better", after: "Weekly summaries that track your energy, progress, and patterns over time" },
  { before: "No way to show your doctor what you've been doing", after: "A professional health report — one tap, ready to hand to any practitioner" },
  { before: "Doing it alone, nobody around you truly understands", after: "Invite a carer to see your journey — and get a personal letter on every healing anniversary" },
];

const FEATURES = [
  {
    emoji: "🎙",
    title: "AI Guide that never forgets you",
    desc: "Speaks your language, answers with exact dosages, and permanently remembers your conditions, milestones, setbacks, and wins — building deeper understanding with every single session.",
  },
  {
    emoji: "🧠",
    title: "Healing memory that lasts forever",
    desc: "Every conversation is distilled into milestones — insights your AI keeps permanently. Years from now it still knows your full story. Nothing is ever lost.",
  },
  {
    emoji: "📊",
    title: "See your healing in numbers",
    desc: "Track energy, mood, celery juice, symptoms, morning protocol. Your charts reveal patterns you'd never spot otherwise — including die-off reactions.",
  },
  {
    emoji: "📋",
    title: "Weekly summary + doctor report",
    desc: "Every Sunday your AI writes a personal summary of your week. One tap generates a professional PDF for any medical appointment — energy trends, supplements, symptoms, timeline.",
  },
  {
    emoji: "💌",
    title: "Your healing anniversary letter",
    desc: "Each year on your healing anniversary, your AI writes you a personal letter — reflecting on how far you've come and what it sees ahead. Yours to keep forever.",
  },
  {
    emoji: "⏰",
    title: "Reminders that keep you on track",
    desc: "Adrenal snack every 1.5 hours. Morning protocol sequence. The nudges that stop you from forgetting the details that make the biggest difference.",
  },
  {
    emoji: "🔍",
    title: "Symptom search with exact protocols",
    desc: "Select your symptoms and get the true cause, exact supplements with dosages, healing foods, and what to avoid — all from Anthony William's books.",
  },
  {
    emoji: "🌿",
    title: "Every cleanse, every day",
    desc: "The 3:6:9, mono eating, heavy metal detox — all mapped out day by day so you know exactly what to eat and when.",
  },
  {
    emoji: "🍽",
    title: "MM-compliant meals, planned for you",
    desc: "50+ healing recipes, a weekly meal planner, and an auto shopping list. Snap a photo of your fridge and get meal ideas instantly.",
  },
  {
    emoji: "📚",
    title: "Upload your books — they come alive",
    desc: "Upload your purchased MM books and AW YouTube videos. The entire app gets smarter. Your AI quotes your actual books back to you.",
  },
  {
    emoji: "💜",
    title: "Invite a carer to see your progress",
    desc: "Share your healing journey with someone who supports you. They see your energy trends, check-ins, and milestones — so they can show up for you better.",
  },
  {
    emoji: "👨‍👩‍👧‍👦",
    title: "Your whole family, one subscription",
    desc: "Separate profiles for every family member. Each person gets their own healing journey, AI memory, weekly summaries, and daily journal.",
  },
];

const TESTIMONIALS = [
  {
    quote: "I've had Hashimoto's for seven years. I've read every AW book twice. But I kept forgetting dosages, skipping the adrenal snack, losing track of what was working. This app is the missing piece — my AI literally remembers my last conversation and picks up where we left off.",
    name: "Michelle R.",
    loc: "Brisbane, AU",
    condition: "Hashimoto's · 7 years on MM",
  },
  {
    quote: "The 3:6:9 cleanse guide alone is worth it. Having it mapped out day by day with exactly what to eat, a reminder when to drink the celery juice, and an AI to ask questions — I finally completed it properly for the first time.",
    name: "Tanya W.",
    loc: "Auckland, NZ",
    condition: "Liver healing · chronic fatigue",
  },
  {
    quote: "My daughter has eczema and I have fibromyalgia. We both have our own profiles and our AI knows our separate symptoms and protocols. It feels like having Anthony William on speed dial — without the wait.",
    name: "Karen S.",
    loc: "Melbourne, AU",
    condition: "Fibromyalgia · family of 3",
  },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Tell it about you",
    desc: "Enter your name, your conditions, and your healing goal. Takes 2 minutes. Your AI companion is immediately personalised to you.",
  },
  {
    step: "2",
    title: "Upload your books",
    desc: "Add the MM books you own and Anthony William YouTube videos. The app reads them privately and becomes smarter with every addition.",
  },
  {
    step: "3",
    title: "Let it guide your day",
    desc: "Morning protocol reminders, adrenal snack alerts, AI answers to your questions, a journal to track your progress. Your healing becomes consistent.",
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

        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 28, fontStyle: "italic" }}>
          Inspired by the teachings of Anthony William
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

      {/* ── TESTIMONIALS ── */}
      <div style={{ padding: "40px 24px", maxWidth: 500, margin: "0 auto" }}>
        <h2 style={{
          fontFamily: "Georgia,serif", fontWeight: 700,
          fontSize: 22, color: C.charcoal,
          marginBottom: 6, textAlign: "center",
        }}>
          From healers on the same path
        </h2>
        <p style={{ fontSize: 13, color: C.muted, textAlign: "center", marginBottom: 24, lineHeight: 1.6 }}>
          Real people. Real conditions. Real healing journeys.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {TESTIMONIALS.map((t, i) => (
            <div key={i} style={{
              background: "#fff", borderRadius: 18, padding: "20px 18px",
              border: `1px solid ${C.border}`, boxShadow: "0 2px 12px #00000008",
            }}>
              <div style={{ fontSize: 28, marginBottom: 10, color: C.sage, lineHeight: 1 }}>"</div>
              <div style={{ fontSize: 13.5, color: C.charcoal, lineHeight: 1.8, fontStyle: "italic", marginBottom: 14 }}>
                {t.quote}
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
                    {t.name} · <span style={{ fontWeight: 400, color: C.muted }}>{t.loc}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.sage, marginTop: 2 }}>{t.condition}</div>
                </div>
              </div>
            </div>
          ))}
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
            An AI that actually knows Medical Medium
          </h2>
          <p style={{ fontSize: 13.5, color: C.mid, lineHeight: 1.8, marginBottom: 20, textAlign: "center" }}>
            Not a generic chatbot with a prompt. CelerySync's AI is built on Anthony William's full knowledge base — every book, every protocol, every supplement dosage. It permanently remembers your milestones, patterns, and setbacks — building a deeper picture of <em>you</em> with every single conversation, for as long as you heal.
          </p>

          {/* Mock AI conversation */}
          <div style={{ background: "#fff", borderRadius: 18, padding: "18px 16px", border: `1px solid ${C.border}`, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: C.muted, fontFamily: "Georgia,serif", marginBottom: 12, textAlign: "center" }}>
              Example conversation
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
              <div style={{ background: C.sage, color: "#fff", borderRadius: 14, padding: "9px 13px", maxWidth: "75%", fontSize: 13 }}>
                I have Hashimoto's and my hair is falling out again — what should I do?
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 0 }}>
              <div style={{ fontSize: 18, flexShrink: 0 }}>🌿</div>
              <div style={{ background: C.mist, borderRadius: 14, padding: "10px 13px", fontSize: 12.5, color: C.charcoal, lineHeight: 1.7 }}>
                Anthony William teaches in <em>Thyroid Healing</em> that hair loss with Hashimoto's is driven by EBV attacking the thyroid, combined with zinc deficiency. The two most important steps: zinc sulfate liquid (1 tsp twice daily) and L-lysine (500mg, 4 capsules twice daily) to slow viral replication. Avoid eggs — they feed EBV directly. Based on your history, I'd also check your adrenal snack consistency as adrenaline spikes worsen viral activity...
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {["100 exact condition protocols", "Permanent healing memory", "Speaks & listens", "Quotes your own books", "Weekly summaries", "Doctor reports"].map((t) => (
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
              Install CelerySync like a native app — no App Store needed. You get healing reminders even when the app is closed.
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
                ✓ Background healing reminders · ✓ Offline access · ✓ Full-screen experience
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
            Your healing journey deserves real support.
          </h2>
          <p style={{ fontSize: 14, opacity: 0.88, lineHeight: 1.7, marginBottom: 24 }}>
            Try CelerySync free for 7 days. No credit card. No commitment. Just your healing, supported the way it should be.
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
      <div style={{ padding: "20px 24px 48px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.7, maxWidth: 420, margin: "0 auto" }}>
          CelerySync is an independent companion app, not affiliated with Anthony William or Medical Medium Inc. "Medical Medium" is a registered trademark of Anthony William, Inc. This app is for educational and personal reference purposes only and is not a substitute for professional medical advice.
        </div>
      </div>

    </div>
  );
}
