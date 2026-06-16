import C from "../lib/colors.js";
import { Card } from "./ui.jsx";

// ─── AFFILIATE IDs — swap these for your real IDs ───────────────────
// Amazon Associates: create account at affiliate-program.amazon.com
const AMAZON_TAG = "celerysync-20"; // ← replace with your Associates tag

// iHerb: create account at iherb.com/partnership
const IHERB_CODE = "CELERYSYNC"; // ← replace with your iHerb referral code
// ─────────────────────────────────────────────────────────────────────

function amazonUrl(asin) {
  return `https://www.amazon.com/dp/${asin}?tag=${AMAZON_TAG}`;
}
function iherbUrl(path) {
  return `https://www.iherb.com/${path}?rcode=${IHERB_CODE}`;
}

const BOOKS = [
  { title: "Cleanse to Heal", emoji: "✨", asin: "1401957587", desc: "The master cleanse guide — 3:6:9, mono eating, and 200+ conditions with exact dosages" },
  { title: "Brain Saver Protocols", emoji: "💊", asin: "1401971334", desc: "300+ symptoms with exact supplement dosages — the clinical companion" },
  { title: "Brain Saver", emoji: "🧠", asin: "1401971318", desc: "Answers to brain inflammation, anxiety, depression, and neurological conditions" },
  { title: "Liver Rescue", emoji: "🍋", asin: "1401954596", desc: "The most important organ for modern healing — why the liver is behind everything" },
  { title: "Thyroid Healing", emoji: "🦋", asin: "1401948367", desc: "The truth behind Hashimoto's, Graves', hypothyroidism, and thyroid nodules" },
  { title: "Medical Medium", emoji: "📗", asin: "1401962874", desc: "Where it all began — the foundation of everything Anthony William teaches" },
  { title: "Life-Changing Foods", emoji: "🍇", asin: "1401948000", desc: "50 healing foods with spiritual and physical healing properties explained" },
  { title: "Celery Juice", emoji: "🥬", asin: "1401958540", desc: "Everything about the global celery juice movement and how to do it right" },
];

const SUPPLEMENTS = [
  { name: "Zinc Sulfate Liquid", emoji: "⚡", path: "pr/vimergy-usda-organic-zinc-sulfate-liquid/ihb-00229", desc: "Anthony William's #1 recommended zinc form — liquid sulfate absorbs best" },
  { name: "Vitamin B12 (Adenosylcobalamin)", emoji: "🔴", path: "pr/vimergy-usda-organic-b12/ihb-00152", desc: "The most bioavailable B12 form per AW — adenosylcobalamin, not cyanocobalamin" },
  { name: "Lemon Balm", emoji: "🍋", path: "pr/vimergy-organic-lemon-balm/ihb-00176", desc: "Antiviral, calming, thyroid-supporting — one of AW's most recommended herbs" },
  { name: "Cat's Claw", emoji: "🌿", path: "pr/vimergy-organic-cat-s-claw/ihb-00158", desc: "Powerful antiviral and antibacterial — key for EBV and Lyme protocols" },
  { name: "L-Lysine", emoji: "🛡", path: "pr/vimergy-l-lysine/ihb-00180", desc: "Antiviral amino acid — suppresses EBV replication, foundational for viral conditions" },
  { name: "Spirulina", emoji: "🔵", path: "pr/vimergy-usda-organic-spirulina-powder/ihb-00218", desc: "Heavy metal detox, brain food, protein — one of the 5 HMDS ingredients" },
  { name: "Barley Grass Juice Powder", emoji: "🟢", path: "pr/vimergy-organic-barley-grass-juice-powder/ihb-00154", desc: "Draws heavy metals out of the intestinal tract — key HMDS ingredient" },
  { name: "Magnesium Glycinate", emoji: "💤", path: "pr/doctor-s-best-high-absorption-magnesium/ihb-00112", desc: "The most calming magnesium form — sleep, anxiety, heart palpitations, muscle cramps" },
];

const LINKS = [
  { label: "🌿 medicalmedium.com", url: "https://medicalmedium.com", desc: "Free articles, reports, podcast, live streams" },
  { label: "▶️ YouTube — Subscribe!", url: "https://youtube.com/@MedicalMedium", desc: "Hundreds of free healing videos" },
  { label: "📸 Instagram", url: "https://instagram.com/medicalmedium", desc: "Daily healing tips and recipes" },
  { label: "🎙 Podcast", url: "https://medicalmedium.com/medical-medium-podcast", desc: "Free episodes — deep healing dives" },
];

export default function AW() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Hero */}
      <div style={{
        background: `linear-gradient(145deg,${C.sageDark},${C.leaf})`,
        borderRadius: 22, padding: 24, color: C.white, textAlign: "center",
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🌿</div>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          Anthony William
        </div>
        <div style={{ fontSize: 13, opacity: 0.85, fontStyle: "italic", marginBottom: 12, lineHeight: 1.5 }}>
          Medical Medium · NYT #1 Bestselling Author · Originator of the Global Celery Juice Movement
        </div>
        <div style={{ background: "rgba(255,255,255,0.12)", borderRadius: 14, padding: "12px 16px", fontSize: 13, lineHeight: 1.7, textAlign: "left" }}>
          CelerySync supports Anthony William's mission. We encourage every user to buy his books,
          watch his videos, and support his work directly. This is a companion tool — not a
          replacement for his books.
        </div>
      </div>

      {/* Disclaimer */}
      <Card style={{ background: C.goldLight, border: `1.5px solid ${C.gold}60` }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 6 }}>
          📣 Important
        </div>
        <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.7 }}>
          CelerySync is an <strong>independent companion app</strong>, not affiliated with Anthony
          William or Medical Medium Inc. All knowledge is attributed to Anthony William's published
          works. "Medical Medium" is a registered trademark of Anthony William, Inc.
        </div>
      </Card>

      {/* Books */}
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16, color: C.charcoal }}>
        📚 Get the Books — Read the Source
      </div>
      {BOOKS.map((b) => (
        <Card key={b.title} style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>{b.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>
              {b.title}
            </div>
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 8, lineHeight: 1.4 }}>{b.desc}</div>
            <a
              href={amazonUrl(b.asin)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block", background: C.sage, color: C.white,
                borderRadius: 30, padding: "5px 12px", fontSize: 11,
                fontFamily: "Georgia,serif", fontWeight: 700, textDecoration: "none",
              }}
            >
              Get on Amazon →
            </a>
          </div>
        </Card>
      ))}

      {/* Supplements */}
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16, color: C.charcoal }}>
        💊 Anthony William Recommended Supplements
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: -8 }}>
        These are Vimergy and top brands recommended by Anthony William — shop via iHerb
      </div>
      {SUPPLEMENTS.map((s) => (
        <Card key={s.name} style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ fontSize: 26, flexShrink: 0 }}>{s.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.charcoal }}>
              {s.name}
            </div>
            <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 8, lineHeight: 1.4 }}>{s.desc}</div>
            <a
              href={iherbUrl(s.path)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block", background: "#16a34a", color: C.white,
                borderRadius: 30, padding: "5px 12px", fontSize: 11,
                fontFamily: "Georgia,serif", fontWeight: 700, textDecoration: "none",
              }}
            >
              Shop on iHerb →
            </a>
          </div>
        </Card>
      ))}

      {/* Links */}
      <Card>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 12 }}>
          🌐 Follow Anthony William
        </div>
        {LINKS.map((l) => (
          <a
            key={l.label}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: `1px solid ${C.border}`, textDecoration: "none" }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.charcoal }}>{l.label}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{l.desc}</div>
            </div>
            <div style={{ color: C.sage, fontSize: 18 }}>›</div>
          </a>
        ))}
      </Card>

      {/* Affiliate disclosure */}
      <div style={{ background: C.mist, borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 11, color: C.mid, lineHeight: 1.7 }}>
          💰 <strong>Affiliate disclosure:</strong> Links to Amazon and iHerb above use affiliate codes.
          CelerySync may earn a small commission at no extra cost to you — this helps keep the app funded
          and the subscription price low. We only recommend products Anthony William himself endorses.
        </div>
      </div>

      {/* Medical disclaimer */}
      <div style={{ background: C.mist, borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 11, color: C.mid, lineHeight: 1.7 }}>
          ⚠️ <strong>Medical Disclaimer:</strong> CelerySync is based on Medical Medium teachings
          by Anthony William and is for educational and personal reference purposes only. Nothing
          here constitutes medical advice. Always consult a licensed healthcare provider before
          changing your health routine.
        </div>
      </div>
    </div>
  );
}
