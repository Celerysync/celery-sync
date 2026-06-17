import C from "../lib/colors.js";
import { Card } from "./ui.jsx";

const AMAZON_TAG = "celerysync-20";
const IHERB_CODE = "CELERYSYNC";

function amazonUrl(asin) {
  return `https://www.amazon.com/dp/${asin}?tag=${AMAZON_TAG}`;
}
function iherbUrl(path) {
  return `https://www.iherb.com/${path}?rcode=${IHERB_CODE}`;
}

const BOOKS = [
  { title: "Medical Medium",          emoji: "📗", asin: "1401962874", desc: "Where it all began — the foundation of everything Anthony William teaches about chronic illness." },
  { title: "Life-Changing Foods",     emoji: "🍇", asin: "1401948000", desc: "50 healing foods with their spiritual and physical healing properties — a beautiful, essential read." },
  { title: "Thyroid Healing",         emoji: "🦋", asin: "1401948367", desc: "The truth behind Hashimoto's, Graves', hypothyroidism, and thyroid nodules. Life-changing for millions." },
  { title: "Liver Rescue",            emoji: "🍋", asin: "1401954596", desc: "The liver is behind almost everything — skin, weight, mystery symptoms, mood. This book is extraordinary." },
  { title: "Celery Juice",            emoji: "🥬", asin: "1401958540", desc: "Everything about the global celery juice movement Anthony William started. Simple, profound, healing." },
  { title: "Cleanse to Heal",         emoji: "✨", asin: "1401957587", desc: "The master protocol guide — the 3:6:9 cleanse, every variation, and protocols for 200+ conditions." },
  { title: "Brain Saver",             emoji: "🧠", asin: "1401971318", desc: "Answers to brain inflammation, anxiety, depression, and every neurological condition." },
  { title: "Brain Saver Protocols",   emoji: "💊", asin: "1401971334", desc: "300+ symptoms with exact supplement dosages — the most clinical and detailed book in the series." },
];

const SUPPLEMENTS = [
  { name: "Zinc Sulfate Liquid",            emoji: "⚡", path: "pr/vimergy-usda-organic-zinc-sulfate-liquid/ihb-00229",       desc: "AW's #1 recommended zinc form — liquid sulfate absorbs best, antiviral, immune-rebuilding." },
  { name: "Vitamin B12 (Adenosylcobalamin)",emoji: "🔴", path: "pr/vimergy-usda-organic-b12/ihb-00152",                       desc: "The most bioavailable B12 — adenosylcobalamin. Rebuilds the nervous system and adrenals." },
  { name: "Lemon Balm",                     emoji: "🍋", path: "pr/vimergy-organic-lemon-balm/ihb-00176",                     desc: "Antiviral, deeply calming, thyroid-supporting. One of AW's most recommended herbs." },
  { name: "Cat's Claw",                     emoji: "🌿", path: "pr/vimergy-organic-cat-s-claw/ihb-00158",                     desc: "Powerful antiviral — key for Epstein-Barr virus, Lyme, and mystery illness protocols." },
  { name: "L-Lysine",                       emoji: "🛡", path: "pr/vimergy-l-lysine/ihb-00180",                               desc: "Antiviral amino acid that suppresses EBV replication. Foundational for almost every viral condition." },
  { name: "Spirulina",                      emoji: "🔵", path: "pr/vimergy-usda-organic-spirulina-powder/ihb-00218",          desc: "Heavy metal detox, brain food, deep nutrition. One of the 5 HMDS ingredients." },
  { name: "Barley Grass Juice Powder",      emoji: "🟢", path: "pr/vimergy-organic-barley-grass-juice-powder/ihb-00154",      desc: "Draws heavy metals from the intestinal tract — essential HMDS ingredient." },
  { name: "Wild Blueberry Powder",          emoji: "🫐", path: "pr/vimergy-wild-blueberry-powder/ihb-00228",                  desc: "The most powerful brain food on earth per AW. Restores neurons, removes heavy metals." },
  { name: "Magnesium Glycinate",            emoji: "💤", path: "pr/doctor-s-best-high-absorption-magnesium/ihb-00112",        desc: "The most calming magnesium — sleep, anxiety, heart palpitations, muscle cramps." },
  { name: "Vitamin C",                      emoji: "🍊", path: "pr/vimergy-micro-c-immune-power/ihb-00223",                   desc: "AW's preferred Micro-C form — rebuilds the immune system and fights viral load." },
];

const LINKS = [
  { label: "🌿 medicalmedium.com",     url: "https://medicalmedium.com",                                        desc: "Free articles, healing reports, podcast episodes, live stream archive" },
  { label: "▶️ YouTube",               url: "https://youtube.com/@MedicalMedium",                              desc: "Hundreds of free healing videos — subscribe and share with everyone you know" },
  { label: "📸 Instagram",             url: "https://instagram.com/medicalmedium",                             desc: "Daily healing tips, recipes, and community" },
  { label: "🎙 Podcast",               url: "https://medicalmedium.com/medical-medium-podcast",                desc: "Free episodes — deep dives on conditions, foods, supplements, and healing" },
  { label: "📘 Facebook",              url: "https://facebook.com/medicalmedium",                              desc: "Community groups and daily posts" },
];

export default function AW() {
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
          and you have more ability to heal than any doctor has told you."
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
          people who have seen loved ones healed, who have bought books for others when they couldn't
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
          { emoji: "🚫", title: "We never reproduce his content", desc: "Users bring their own purchased books. We don't copy, paste, or paraphrase his text. The Bring Your Own Books model is our core principle." },
          { emoji: "💰", title: "Affiliate revenue goes to healing", desc: "Amazon and iHerb affiliate commissions from this page are used to fund the Healing Access Fund — buying books for people who can't afford them." },
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
      <div style={{ fontSize: 12, color: C.muted, marginTop: -8 }}>
        The most important thing you can do is own his books. Every answer in this app points back to them.
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
              <a
                href={amazonUrl(b.asin)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block", background: C.sage, color: C.white,
                  borderRadius: 30, padding: "6px 14px", fontSize: 12,
                  fontFamily: "Georgia,serif", fontWeight: 700, textDecoration: "none",
                }}
              >
                Get on Amazon →
              </a>
            </div>
          </div>
        </Card>
      ))}

      {/* Supplements */}
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16, color: C.charcoal }}>
        💊 Anthony William's Recommended Supplements
      </div>
      <div style={{ fontSize: 12, color: C.muted, marginTop: -8 }}>
        These are the Vimergy and top-quality brands Anthony William recommends. Shop via iHerb — commissions support the Healing Access Fund.
      </div>
      {SUPPLEMENTS.map((s) => (
        <Card key={s.name}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{s.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.charcoal }}>
                {s.name}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>{s.desc}</div>
              <a
                href={iherbUrl(s.path)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block", background: "#16a34a", color: C.white,
                  borderRadius: 30, padding: "6px 14px", fontSize: 12,
                  fontFamily: "Georgia,serif", fontWeight: 700, textDecoration: "none",
                }}
              >
                Shop on iHerb →
              </a>
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
          He shares freely and abundantly. Follow him everywhere. Share his content. The more people who find him, the more people heal.
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
          <strong>Affiliate disclosure:</strong> Book and supplement links use affiliate codes. Any
          commission earned goes directly to the Healing Access Fund — used to purchase books and
          supplements for people in financial hardship. We do not profit personally from these links.
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
