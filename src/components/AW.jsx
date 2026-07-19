import { useState } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { callClaude } from "../lib/api.js";

const MM_BOOKS_URL = "https://medicalmedium.com/books";

const BOOKS = [
  { title: "Medical Medium",                        emoji: "📗", desc: "Where it all began — the foundation of everything Anthony William teaches about chronic illness." },
  { title: "Life-Changing Foods",                   emoji: "🍇", desc: "50 healing foods with their supportive properties and the unique gifts each one offers — a beautiful, essential read." },
  { title: "Thyroid Healing",                       emoji: "🦋", desc: "The truth behind Hashimoto's, Graves', hypothyroidism, and thyroid nodules. Life-changing for millions." },
  { title: "Liver Rescue",                          emoji: "🍋", desc: "The liver is behind almost everything — skin, weight, mystery symptoms, mood. This book is extraordinary." },
  { title: "Celery Juice",                          emoji: "🥬", desc: "Everything about the global celery juice movement Anthony William started. Simple, profound, nourishing." },
  { title: "Cleanse to Heal",                       emoji: "✨", desc: "The master protocol guide — the 3:6:9 cleanse, every variation, and protocols for 200+ conditions." },
  { title: "Brain Saver",                           emoji: "🧠", desc: "Answers to brain inflammation, anxiety, depression, and every neurological condition." },
  { title: "Brain Saver Protocols, Cleanses & Recipes", emoji: "💊", desc: "300+ symptoms with exact supplement dosages — the most clinical and detailed book in the series." },
];

const LINKS = [
  { label: "🌿 medicalmedium.com",     url: "https://medicalmedium.com",                                        desc: "Free articles, healing reports, podcast episodes, live stream archive" },
  { label: "▶️ YouTube",               url: "https://www.youtube.com/channel/UCUORv_qpgmg8N5plVqlYjXg",                              desc: "Hundreds of free healing videos — subscribe and share with everyone you know" },
  { label: "📸 Instagram",             url: "https://instagram.com/medicalmedium",                             desc: "Daily healing tips, recipes, and community" },
  { label: "🎙 Podcast",               url: "https://medicalmedium.com/medical-medium-podcast",                desc: "Free episodes — deep dives on conditions, foods, supplements, and healing" },
  { label: "📘 Facebook",              url: "https://facebook.com/medicalmedium",                              desc: "Community groups and daily posts" },
];

// ─────────────────────────────────────────────────────────────────────────────
// YOUTUBE VIDEOS — paste real video IDs here (11-char code after watch?v=)
// To find an ID: open any AW YouTube video → copy the ?v=XXXXXXXXXXX part
// ─────────────────────────────────────────────────────────────────────────────
const AW_VIDEOS = [
  // { id: "PASTE_ID_HERE", title: "Video title", topic: "Celery Juice" },
  // Examples of how to add once you have IDs:
  // { id: "abc123defgh", title: "Why Celery Juice Heals", topic: "Celery Juice" },
  // { id: "xyz987uvwqr", title: "Heavy Metal Detox Smoothie", topic: "Heavy Metal Detox" },
];

const TOPICS = [
  { label: "Celery Juice",        emoji: "🥬", search: "celery juice healing" },
  { label: "Heavy Metal Detox",   emoji: "🫐", search: "heavy metal detox smoothie" },
  { label: "Morning Protocol",    emoji: "🌅", search: "morning protocol lemon water" },
  { label: "Liver",               emoji: "🍋", search: "liver rescue healing" },
  { label: "Thyroid",             emoji: "🦋", search: "thyroid healing hashimotos" },
  { label: "EBV & Viral",         emoji: "🛡", search: "epstein barr virus chronic illness" },
  { label: "Anxiety & Brain",     emoji: "🧠", search: "anxiety depression brain healing" },
  { label: "Adrenal Health",      emoji: "⚡", search: "adrenal fatigue healing protocol" },
  { label: "3:6:9 Cleanse",       emoji: "✨", search: "369 cleanse detox" },
  { label: "Supplements",         emoji: "💊", search: "supplements healing protocol" },
];

function YouTubeSection() {
  const [activeVideo, setActiveVideo] = useState(null);   // { id, title }
  const [activeTopic, setActiveTopic] = useState(null);   // topic label
  const [open, setOpen] = useState(false);

  const videosByTopic = AW_VIDEOS.reduce((acc, v) => {
    (acc[v.topic] = acc[v.topic] || []).push(v);
    return acc;
  }, {});

  const hasVideos = AW_VIDEOS.length > 0;

  if (!open) return (
    <Card style={{ border: `1.5px solid ${C.gold}40`, cursor: "pointer" }} onClick={() => setOpen(true)}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 28 }}>▶️</div>
        <div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>
            Watch AW's healing videos
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>
            Browse Anthony William's teachings by topic — watch in-app or open on YouTube.
          </div>
        </div>
        <div style={{ marginLeft: "auto", color: C.gold, fontSize: 20 }}>›</div>
      </div>
    </Card>
  );

  return (
    <Card style={{ border: `1.5px solid ${C.gold}50` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal }}>
          ▶️ AW's Healing Videos
        </div>
        <button onClick={() => { setOpen(false); setActiveVideo(null); setActiveTopic(null); }}
          style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16 }}>✕</button>
      </div>

      {/* In-app player */}
      {activeVideo && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 12, overflow: "hidden", background: "#000" }}>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${activeVideo.id}?autoplay=1&rel=0&modestbranding=1`}
              title={activeVideo.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
            />
          </div>
          <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, color: C.charcoal, fontFamily: "Georgia,serif", fontWeight: 700, flex: 1 }}>
              {activeVideo.title}
            </div>
            <a
              href={`https://www.youtube.com/watch?v=${activeVideo.id}`}
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: C.sage, textDecoration: "none", flexShrink: 0, marginLeft: 8 }}
            >
              Watch on YouTube ↗
            </a>
          </div>
          <button onClick={() => setActiveVideo(null)}
            style={{ marginTop: 8, background: "none", border: `1px solid ${C.border}`, borderRadius: 20, padding: "5px 14px", fontSize: 11, color: C.muted, cursor: "pointer" }}>
            ← Back to topics
          </button>
        </div>
      )}

      {/* Topic grid */}
      {!activeVideo && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {TOPICS.map(t => {
              const count = (videosByTopic[t.label] || []).length;
              const isActive = activeTopic === t.label;
              return (
                <button
                  key={t.label}
                  onClick={() => setActiveTopic(isActive ? null : t.label)}
                  style={{
                    background: isActive ? C.sage : C.mist,
                    color: isActive ? C.white : C.charcoal,
                    border: `1.5px solid ${isActive ? C.sage : C.border}`,
                    borderRadius: 30, padding: "6px 12px",
                    fontSize: 12, fontFamily: "Georgia,serif", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 5,
                  }}
                >
                  <span>{t.emoji}</span>
                  <span>{t.label}</span>
                  {count > 0 && <span style={{ fontSize: 10, background: isActive ? "rgba(255,255,255,0.3)" : C.sage + "30", borderRadius: 10, padding: "1px 6px", color: isActive ? C.white : C.sage }}>{count}</span>}
                </button>
              );
            })}
          </div>

          {/* Videos for selected topic */}
          {activeTopic && (
            <div style={{ marginBottom: 12 }}>
              {(videosByTopic[activeTopic] || []).length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(videosByTopic[activeTopic] || []).map(v => (
                    <button
                      key={v.id}
                      onClick={() => setActiveVideo(v)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        background: C.white, border: `1px solid ${C.border}`,
                        borderRadius: 12, padding: "10px 12px", cursor: "pointer", textAlign: "left",
                      }}
                    >
                      {/* Lazy thumbnail */}
                      <div style={{
                        width: 80, height: 45, borderRadius: 6, overflow: "hidden",
                        background: "#000", flexShrink: 0, position: "relative",
                      }}>
                        <img
                          src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`}
                          alt={v.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                        <div style={{
                          position: "absolute", inset: 0, display: "flex",
                          alignItems: "center", justifyContent: "center",
                          background: "rgba(0,0,0,0.3)",
                        }}>
                          <div style={{ width: 0, height: 0, borderTop: "7px solid transparent", borderBottom: "7px solid transparent", borderLeft: "12px solid white", marginLeft: 2 }} />
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.charcoal, fontFamily: "Georgia,serif", lineHeight: 1.4 }}>{v.title}</div>
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Anthony William · Medical Medium</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ background: C.mist, borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 13, color: C.charcoal, fontFamily: "Georgia,serif", marginBottom: 6 }}>
                    Search AW's free content on {activeTopic}:
                  </div>
                  <a
                    href="https://www.youtube.com/channel/UCUORv_qpgmg8N5plVqlYjXg"
                    target="_blank" rel="noopener noreferrer"
                    style={{
                      display: "inline-block", background: "#FF0000", color: C.white,
                      borderRadius: 30, padding: "7px 16px", fontSize: 12,
                      fontFamily: "Georgia,serif", fontWeight: 700, textDecoration: "none",
                    }}
                  >
                    ▶ Visit AW's YouTube channel
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Browse all CTA */}
          <a
            href="https://www.youtube.com/channel/UCUORv_qpgmg8N5plVqlYjXg"
            target="_blank" rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: C.mist, borderRadius: 12, padding: "12px 14px",
              textDecoration: "none",
            }}
          >
            <div style={{ fontSize: 13, color: C.charcoal, fontFamily: "Georgia,serif", fontWeight: 700 }}>
              Browse all of AW's videos on YouTube
            </div>
            <div style={{ color: C.sage, fontSize: 18 }}>›</div>
          </a>
        </>
      )}
    </Card>
  );
}

function HealingStorySection() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ how_long: "", conditions: "", changes: "", message: "" });
  const [story, setStory] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const QUESTIONS = [
    { key: "how_long",   label: "How long have you been following Medical Medium?", placeholder: "e.g. 3 years, since 2020…" },
    { key: "conditions", label: "What were you experiencing when you found Anthony William's work?", placeholder: "e.g. chronic fatigue, EBV, thyroid issues…" },
    { key: "changes",    label: "What has improved or changed for you?", placeholder: "e.g. energy levels, brain fog lifted, test results improved…" },
    { key: "message",    label: "What would you say to someone just discovering Medical Medium?", placeholder: "From your heart…" },
  ];

  const generate = async () => {
    setLoading(true);
    const text = await callClaude({
      tier: "quick", maxTokens: 350,
      messages: [{ role: "user", content: `Write a heartfelt, genuine healing testimony for Anthony William's website based on these answers. Write in first person, warm and personal, 3-4 short paragraphs. Do NOT include any medical claims or promises of cure — keep it personal experience only. End with genuine gratitude to Anthony William.\n\nHow long following MM: ${answers.how_long}\nWhat they were experiencing: ${answers.conditions}\nWhat changed: ${answers.changes}\nMessage to others: ${answers.message}` }],
    }).catch(() => null);
    setStory((text || "").replace(/\*\*/g, "").replace(/[*_`#]/g, "").trim());
    setLoading(false);
    setStep(5);
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(story).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open) return (
    <Card style={{ border: `1.5px solid ${C.sage}40`, cursor: "pointer" }} onClick={() => setOpen(true)}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 28 }}>💚</div>
        <div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>Share your healing story</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>
            AW collects healing testimonials — your story could give someone hope. Takes 2 minutes.
          </div>
        </div>
        <div style={{ marginLeft: "auto", color: C.sage, fontSize: 20 }}>›</div>
      </div>
    </Card>
  );

  return (
    <Card style={{ border: `1.5px solid ${C.sage}50` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.sageDark }}>💚 Your healing story</div>
        <button onClick={() => { setOpen(false); setStep(0); setStory(""); }} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16 }}>✕</button>
      </div>

      {step < 4 && (
        <>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Question {step + 1} of 4</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.charcoal, fontFamily: "Georgia,serif", marginBottom: 10, lineHeight: 1.5 }}>
            {QUESTIONS[step].label}
          </div>
          <textarea
            value={answers[QUESTIONS[step].key]}
            onChange={e => setAnswers(a => ({ ...a, [QUESTIONS[step].key]: e.target.value }))}
            placeholder={QUESTIONS[step].placeholder}
            rows={3}
            style={{
              width: "100%", border: `1px solid ${C.border}`, borderRadius: 10,
              padding: "10px 12px", fontSize: 13, fontFamily: "Georgia,serif",
              resize: "none", boxSizing: "border-box", color: C.charcoal,
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} style={{ flex: 1, padding: "9px", borderRadius: 30, border: `1px solid ${C.border}`, background: "none", fontSize: 13, color: C.muted, cursor: "pointer" }}>← Back</button>
            )}
            <button
              onClick={() => step === 3 ? generate() : setStep(s => s + 1)}
              disabled={!answers[QUESTIONS[step].key].trim()}
              style={{
                flex: 2, padding: "9px", borderRadius: 30, border: "none",
                background: answers[QUESTIONS[step].key].trim() ? C.sage : C.border,
                color: C.white, fontSize: 13, fontFamily: "Georgia,serif", fontWeight: 700, cursor: "pointer",
              }}
            >
              {step === 3 ? "✨ Generate my story" : "Next →"}
            </button>
          </div>
        </>
      )}

      {step === 5 && loading && (
        <div style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: "20px 0" }}>✨ Writing your story…</div>
      )}

      {step === 5 && !loading && story && (
        <>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 1.6 }}>
            Here's your story — read it, make it yours, then copy and submit to Anthony William's website.
          </div>
          <div style={{
            background: C.mist, borderRadius: 12, padding: "14px 16px",
            fontSize: 13, color: C.charcoal, lineHeight: 1.8, marginBottom: 12,
            whiteSpace: "pre-wrap",
          }}>
            {story}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={handleCopy} style={{
              flex: 1, background: copied ? C.sage : C.white, color: copied ? C.white : C.sageDark,
              border: `1.5px solid ${C.sage}`, borderRadius: 30, padding: "8px 14px",
              fontSize: 12, fontFamily: "Georgia,serif", fontWeight: 700, cursor: "pointer",
            }}>
              {copied ? "✓ Copied!" : "📋 Copy story"}
            </button>
            <a
              href="https://www.medicalmedium.com/medical-medium-blog-testimonials"
              target="_blank" rel="noopener noreferrer"
              style={{
                flex: 1, background: C.sageDark, color: C.white, textDecoration: "none",
                border: "none", borderRadius: 30, padding: "8px 14px",
                fontSize: 12, fontFamily: "Georgia,serif", fontWeight: 700,
                cursor: "pointer", textAlign: "center",
              }}
            >
              Submit to AW's team →
            </a>
          </div>
        </>
      )}
    </Card>
  );
}

function IntroduceSection() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);

  const message = (n) => `Hi${n ? " " + n : ""},

I wanted to share something that has genuinely changed my life — Anthony William, the Medical Medium.

He's a New York Times #1 bestselling author who has spent decades helping people with chronic illness, mystery symptoms, fatigue, brain fog, autoimmune conditions, and things doctors can't explain.

His books explain the real causes behind conditions like EBV, thyroid disease, anxiety, and so much more — and give full protocols for supporting the body.

If you've been suffering and not getting answers, please look him up. His website has a huge amount of free content too.

🌿 medicalmedium.com

I also use an app called CelerySync that helps me follow his protocols daily — but start with his books. They will change how you see everything.

With love`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(message(name)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ text: message(name) }).catch(() => {});
    } else handleCopy();
  };

  if (!open) return (
    <Card style={{ border: `1.5px solid ${C.gold}40`, cursor: "pointer" }} onClick={() => setOpen(true)}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 28 }}>💛</div>
        <div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>Introduce someone to AW</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>
            Know someone who is suffering and hasn't found his work yet? Send them a personal message.
          </div>
        </div>
        <div style={{ marginLeft: "auto", color: C.gold, fontSize: 20 }}>›</div>
      </div>
    </Card>
  );

  return (
    <Card style={{ border: `1.5px solid ${C.gold}50` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal }}>💛 Introduce someone to AW</div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16 }}>✕</button>
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Personalise with their name (optional):</div>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Their name…"
        style={{
          width: "100%", border: `1px solid ${C.border}`, borderRadius: 10,
          padding: "8px 12px", fontSize: 13, fontFamily: "Georgia,serif",
          boxSizing: "border-box", marginBottom: 12, color: C.charcoal,
        }}
      />
      <div style={{
        background: C.mist, borderRadius: 12, padding: "12px 14px",
        fontSize: 12.5, color: C.charcoal, lineHeight: 1.8, marginBottom: 12,
        whiteSpace: "pre-wrap", maxHeight: 180, overflowY: "auto",
      }}>
        {message(name)}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleCopy} style={{
          flex: 1, background: copied ? C.sage : C.white, color: copied ? C.white : C.mid,
          border: `1px solid ${C.border}`, borderRadius: 30, padding: "8px",
          fontSize: 12, fontFamily: "Georgia,serif", fontWeight: 700, cursor: "pointer",
        }}>
          {copied ? "✓ Copied!" : "📋 Copy"}
        </button>
        <button onClick={handleShare} style={{
          flex: 2, background: C.gold, color: C.white, border: "none",
          borderRadius: 30, padding: "8px",
          fontSize: 12, fontFamily: "Georgia,serif", fontWeight: 700, cursor: "pointer",
        }}>
          Share via…
        </button>
      </div>
    </Card>
  );
}

function GiftBookSection() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ recipient: "", book: "Medical Medium", reason: "" });
  const [sent, setSent] = useState(false);

  const BOOK_TITLES = [
    "Medical Medium", "Life-Changing Foods", "Thyroid Healing",
    "Liver Rescue", "Celery Juice", "Cleanse to Heal",
    "Brain Saver", "Brain Saver Protocols, Cleanses & Recipes",
  ];

  const handleSend = () => {
    const subject = encodeURIComponent(`Book Gift Request — ${form.book}`);
    const body = encodeURIComponent(`Hi CelerySync team,\n\nI'd like to gift an Anthony William book to someone in need.\n\nRecipient / situation: ${form.recipient}\nBook: ${form.book}\nWhy they need it: ${form.reason}\n\nPlease let me know how I can help make this happen.\n\nThank you`);
    window.open(`mailto:healing@celerysync.com?subject=${subject}&body=${body}`);
    setSent(true);
  };

  if (!open) return (
    <Card style={{ border: `1.5px solid ${C.plum}40`, cursor: "pointer" }} onClick={() => setOpen(true)}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 28 }}>📖</div>
        <div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>Gift someone an AW book</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>
            Know someone who needs his books but can't afford them? The Healing Access Fund will help.
          </div>
        </div>
        <div style={{ marginLeft: "auto", color: C.plum, fontSize: 20 }}>›</div>
      </div>
    </Card>
  );

  if (sent) return (
    <Card style={{ border: `1.5px solid ${C.sage}50`, textAlign: "center" }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>💚</div>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.sageDark, marginBottom: 6 }}>Request sent</div>
      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
        We'll be in touch to arrange the gift. Thank you for your generosity — this is exactly what the Healing Access Fund exists for.
      </div>
    </Card>
  );

  return (
    <Card style={{ border: `1.5px solid ${C.plum}50` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal }}>📖 Gift an AW book</div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16 }}>✕</button>
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
        Tell us who needs it and why. The Healing Access Fund covers the cost — we'll sort the rest.
      </div>
      {[
        { key: "recipient", label: "Who is this for?", placeholder: "Name or brief description of their situation…" },
        { key: "reason",    label: "Why do they need this book?", placeholder: "Their health situation, why they can't afford it…" },
      ].map(({ key, label, placeholder }) => (
        <div key={key} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.charcoal, marginBottom: 4 }}>{label}</div>
          <input
            value={form[key]}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            placeholder={placeholder}
            style={{
              width: "100%", border: `1px solid ${C.border}`, borderRadius: 10,
              padding: "8px 12px", fontSize: 13, fontFamily: "Georgia,serif",
              boxSizing: "border-box", color: C.charcoal,
            }}
          />
        </div>
      ))}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.charcoal, marginBottom: 4 }}>Which book?</div>
        <select
          value={form.book}
          onChange={e => setForm(f => ({ ...f, book: e.target.value }))}
          style={{
            width: "100%", border: `1px solid ${C.border}`, borderRadius: 10,
            padding: "8px 12px", fontSize: 13, fontFamily: "Georgia,serif",
            background: C.white, color: C.charcoal,
          }}
        >
          {BOOK_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <button
        onClick={handleSend}
        disabled={!form.recipient.trim() || !form.reason.trim()}
        style={{
          width: "100%", background: form.recipient.trim() && form.reason.trim() ? C.plum : C.border,
          color: C.white, border: "none", borderRadius: 30, padding: "10px",
          fontSize: 13, fontFamily: "Georgia,serif", fontWeight: 700, cursor: "pointer",
        }}
      >
        Send request →
      </button>
    </Card>
  );
}

export default function AW({ onNavigate }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Hero — genuine tribute */}
      <div style={{
        background: `linear-gradient(145deg,${C.sageDark},${C.leaf})`,
        borderRadius: 22, padding: 24, color: C.white,
      }}>
        <div style={{ fontSize: 48, marginBottom: 8, textAlign: "center" }}>🌿</div>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>
          Anthony William
        </div>
        <div style={{ fontSize: 12, opacity: 0.85, fontStyle: "italic", marginBottom: 16, textAlign: "center", lineHeight: 1.5 }}>
          Medical Medium · NYT #1 Bestselling Author<br />Originator of the Global Celery Juice Movement
        </div>
        <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 14, padding: "14px 16px", fontSize: 13.5, lineHeight: 1.8, fontFamily: "Georgia,serif", fontStyle: "italic" }}>
          "Healing is possible. You didn't create your illness, you are not to blame,
          and you have more capacity for change and wellbeing than you've been led to believe."
        </div>
        <div style={{ fontSize: 11, opacity: 0.75, marginTop: 8, textAlign: "right" }}>
          — Anthony William
        </div>
      </div>

      {/* What CelerySync is — open letter */}
      <Card style={{ background: C.sageLight, border: `1.5px solid ${C.sage}50` }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.sageDark, marginBottom: 10 }}>
          💚 A message from the CelerySync team
        </div>
        <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.85 }}>
          CelerySync was built by people whose lives have been changed by Anthony William's teachings —
          people who have seen loved ones transform on the Medical Medium path, who have bought books for others when they couldn't
          afford them, who have spent their own money on supplements for friends because they couldn't
          stand watching someone suffer when they knew there was a way forward.
        </div>
        <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.85, marginTop: 10 }}>
          This app exists for one reason: to help more people actually <em>follow</em> the protocols
          Anthony William has spent his life sharing. To be the companion that makes it easier for
          someone who is bedbound, exhausted, and overwhelmed to take the next small step. Every
          response this app gives says "read the book" and points to his exact teachings. We are
          not the source — <strong>he is</strong>.
        </div>
        <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.85, marginTop: 10 }}>
          We are entirely independent of Anthony William and have no affiliation with Medical Medium Inc.
          We deeply respect and attribute everything to his published works. Our mission is to get
          his books into more hands, his protocols into more lives, and his message of hope into
          more hearts.
        </div>
      </Card>

      {/* Pay It Forward Fund */}
      <div style={{
        background: `linear-gradient(135deg,${C.plum},#5c3f6b)`,
        borderRadius: 20, padding: 22, color: C.white,
      }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
          💜 The Healing Access Fund
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.8, marginBottom: 14, opacity: 0.95 }}>
          We know what it is to go without so someone else could have access to healing.
          We know the feeling of watching a person suffer while knowing there are answers,
          and not being able to afford to get those answers into their hands.
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.8, marginBottom: 14, opacity: 0.95 }}>
          That's why a meaningful portion of every CelerySync subscription goes into
          the <strong>Healing Access Fund</strong> — used to:
        </div>
        {[
          "Buy Anthony William's books for people who can't afford them",
          "Help cover foundational supplements (zinc, B12, lemon balm) for those in hardship",
          "Support carers who are financially stretched while looking after someone who is very unwell",
          "Sponsor access to CelerySync for people on no income who need this tool",
        ].map((item) => (
          <div key={item} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
            <span style={{ flexShrink: 0, fontSize: 14 }}>🌿</span>
            <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.95 }}>{item}</div>
          </div>
        ))}
        <div style={{
          background: "rgba(255,255,255,0.15)", borderRadius: 12,
          padding: "12px 14px", marginTop: 8, fontSize: 13, lineHeight: 1.7,
        }}>
          <strong>If you or someone you love needs support accessing healing resources</strong> — books,
          supplements, or a CelerySync subscription — contact us at{" "}
          <span style={{ textDecoration: "underline" }}>healing@celerysync.com</span>. No one gets
          turned away because of money.
        </div>
      </div>

      {/* How we support AW */}
      <Card>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 12 }}>
          📣 How CelerySync supports Anthony William
        </div>
        {[
          { emoji: "📚", title: "Every answer points to his books", desc: "The AI always says which Anthony William book to read and why. We are a referral engine for his work, not a replacement for it." },
          { emoji: "🚫", title: "We never reproduce his content", desc: "All teachings in this app are paraphrased in our own words and attributed to Anthony William. We never reproduce his text, and we always point users to his books for the full, authoritative detail." },
          { emoji: "💰", title: "Book sales go straight to his team", desc: "We link directly to medicalmedium.com for books — his team earns every commission. iHerb supplement commissions fund the Healing Access Fund." },
          { emoji: "🏷", title: "Clear attribution always", desc: "Every teaching in this app is explicitly attributed to Anthony William by name, with the specific book it comes from. He always gets the credit." },
          { emoji: "🌍", title: "We amplify his reach", desc: "Every subscriber who discovers a protocol through this app is a person who will buy more of his books, follow his social, and share his teachings with others." },
        ].map(({ emoji, title, desc }) => (
          <div key={title} style={{ display: "flex", gap: 12, padding: "11px 0", borderBottom: `1px solid ${C.border}`, alignItems: "flex-start" }}>
            <div style={{ fontSize: 22, flexShrink: 0 }}>{emoji}</div>
            <div>
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.charcoal, marginBottom: 2 }}>{title}</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{desc}</div>
            </div>
          </div>
        ))}
      </Card>

      {/* Books */}
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16, color: C.charcoal }}>
        📚 Get the Books — Read the Source
      </div>

      {/* Buy → Upload → AI flow banner */}
      <div style={{
        background: `linear-gradient(135deg, ${C.sageLight}, #f0f9f0)`,
        border: `1.5px solid ${C.sage}50`,
        borderRadius: 16, padding: "16px 18px",
      }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.sageDark, marginBottom: 10 }}>
          Buying his books
        </div>
        {[
          { n: "1", label: "Buy from Anthony William's website", desc: "All purchases go directly to his team — he chooses the retailers and earns from every sale." },
          { n: "2", label: "Read the book directly", desc: "His books contain complete protocols, exact guidance, and the full depth of his teachings — they are the authoritative source." },
          { n: "3", label: "Use Resources in this app", desc: "The Learn tab links directly to his official books, YouTube, and podcast so you can always access his official content." },
        ].map(({ n, label, desc }) => (
          <div key={n} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start" }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%", background: C.sage,
              color: C.white, fontSize: 11, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>{n}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.charcoal, fontFamily: "Georgia,serif" }}>{label}</div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{desc}</div>
            </div>
          </div>
        ))}
        <button
          onClick={() => onNavigate?.("learn")}
          style={{
            background: C.sage, color: C.white, border: "none",
            borderRadius: 30, padding: "8px 18px",
            fontSize: 12, fontFamily: "Georgia,serif", fontWeight: 700,
            cursor: "pointer", marginTop: 4,
          }}
        >
          Go to Learn →
        </button>
      </div>

      <div style={{ fontSize: 12, color: C.muted }}>
        Tap "Buy on medicalmedium.com" — his site uses Geni.us links that route you to your local store automatically, wherever you are in the world.
      </div>

      {BOOKS.map((b) => (
        <Card key={b.title}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ fontSize: 28, flexShrink: 0, marginTop: 2 }}>{b.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>
                {b.title}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>{b.desc}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a
                  href={MM_BOOKS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block", background: C.sageDark, color: C.white,
                    borderRadius: 30, padding: "6px 14px", fontSize: 12,
                    fontFamily: "Georgia,serif", fontWeight: 700, textDecoration: "none",
                  }}
                >
                  Buy on medicalmedium.com →
                </a>
                <button
                  onClick={() => onNavigate?.("learn")}
                  style={{
                    background: "transparent", color: C.sage,
                    border: `1.5px solid ${C.sage}`, borderRadius: 30,
                    padding: "6px 14px", fontSize: 12,
                    fontFamily: "Georgia,serif", fontWeight: 700, cursor: "pointer",
                  }}
                >
                  See in Learn →
                </button>
              </div>
            </div>
          </div>
        </Card>
      ))}

      {/* Follow AW */}
      <Card>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 12 }}>
          🌐 Follow Anthony William — Free Healing Content
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
          He shares freely and abundantly. Follow him everywhere. Share his content. The more people who find him, the more people can support their wellbeing.
        </div>
        {LINKS.map((l) => (
          <a
            key={l.label}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${C.border}`, textDecoration: "none" }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.charcoal }}>{l.label}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{l.desc}</div>
            </div>
            <div style={{ color: C.sage, fontSize: 20, flexShrink: 0 }}>›</div>
          </a>
        ))}
      </Card>

      {/* Sponsor someone */}
      <Card style={{ background: C.goldLight, border: `1.5px solid ${C.gold}50` }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 6 }}>
          🎁 Sponsor Someone's Healing
        </div>
        <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.7, marginBottom: 12 }}>
          Know someone who's very unwell and can't afford books or supplements? We'll help. Email us with their situation and we'll work out how to get them what they need — books, supplements, or a free CelerySync account.
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.gold }}>
          healing@celerysync.com
        </div>
      </Card>

      {/* ── YouTube videos ── */}
      <YouTubeSection />

      {/* ── Share your healing story ── */}
      <HealingStorySection />

      {/* ── Introduce someone ── */}
      <IntroduceSection />

      {/* ── Gift a book ── */}
      <GiftBookSection />

      {/* Legal disclaimer */}
      <div style={{ background: C.mist, borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 11, color: C.mid, lineHeight: 1.7 }}>
          <strong>Independent app notice:</strong> CelerySync is an independent companion tool and is not
          affiliated with, endorsed by, or in partnership with Anthony William or Medical Medium Inc.
          "Medical Medium" is a registered trademark of Anthony William, Inc. All teachings referenced
          in this app are attributed to Anthony William's published books. We encourage every user to
          purchase and read his books directly.
        </div>
      </div>

      <div style={{ background: C.mist, borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 11, color: C.mid, lineHeight: 1.7 }}>
          <strong>Book links:</strong> Book links go directly to medicalmedium.com — Anthony William's
          own website. His team earns from every sale. CelerySync receives no commission from book purchases.
          Supplement links to iHerb use an affiliate code; any commission earned goes to the Healing Access Fund.
        </div>
      </div>

      <div style={{ background: C.mist, borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 11, color: C.mid, lineHeight: 1.7 }}>
          <strong>Medical disclaimer:</strong> CelerySync is for educational and personal reference
          purposes only, based on Anthony William's published teachings. Nothing here constitutes
          medical advice. Always consult a licensed healthcare provider before changing your health
          routine.
        </div>
      </div>

    </div>
  );
}
