import { useState } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import SupplementTracker from "./SupplementTracker.jsx";

const IHERB_CODE = "CELERYSYNC";
function iherbUrl(path) {
  return `https://www.iherb.com/${path}?rcode=${IHERB_CODE}`;
}

const SUPPLEMENTS = [
  { name: "Zinc Sulfate Liquid",             emoji: "⚡", path: "pr/vimergy-usda-organic-zinc-sulfate-liquid/ihb-00229",       desc: "AW's #1 recommended zinc form — liquid sulfate absorbs best, antiviral, immune-rebuilding." },
  { name: "Vitamin B12 (Adenosylcobalamin)", emoji: "🔴", path: "pr/vimergy-usda-organic-b12/ihb-00152",                       desc: "The most bioavailable B12 — adenosylcobalamin. Rebuilds the nervous system and adrenals." },
  { name: "Lemon Balm",                      emoji: "🍋", path: "pr/vimergy-organic-lemon-balm/ihb-00176",                     desc: "Antiviral, deeply calming, thyroid-supporting. One of AW's most recommended herbs." },
  { name: "Cat's Claw",                      emoji: "🌿", path: "pr/vimergy-organic-cat-s-claw/ihb-00158",                     desc: "Powerful antiviral — key for Epstein-Barr virus, Lyme, and mystery illness protocols." },
  { name: "L-Lysine",                        emoji: "🛡", path: "pr/vimergy-l-lysine/ihb-00180",                               desc: "Antiviral amino acid that suppresses EBV replication. Foundational for almost every viral condition." },
  { name: "Spirulina",                       emoji: "🔵", path: "pr/vimergy-usda-organic-spirulina-powder/ihb-00218",          desc: "Heavy metal detox, brain food, deep nutrition. One of the 5 HMDS ingredients." },
  { name: "Barley Grass Juice Powder",       emoji: "🟢", path: "pr/vimergy-organic-barley-grass-juice-powder/ihb-00154",      desc: "Draws heavy metals from the intestinal tract — essential HMDS ingredient." },
  { name: "Wild Blueberry Powder",           emoji: "🫐", path: "pr/vimergy-wild-blueberry-powder/ihb-00228",                  desc: "The most powerful brain food on earth per AW. Restores neurons, removes heavy metals." },
  { name: "Magnesium Glycinate",             emoji: "💤", path: "pr/doctor-s-best-high-absorption-magnesium/ihb-00112",        desc: "The most calming magnesium — sleep, anxiety, heart palpitations, muscle cramps." },
  { name: "Vitamin C",                       emoji: "🍊", path: "pr/vimergy-micro-c-immune-power/ihb-00223",                   desc: "AW's preferred Micro-C form — rebuilds the immune system and fights viral load." },
];

const SUB_TABS = [
  { id: "tracker", label: "📋 Today's" },
  { id: "shop",    label: "💊 Shop"    },
];

export default function Supplements({ authUser, user, profileId }) {
  const [sub, setSub] = useState("tracker");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Sub-tab pills */}
      <div style={{ display: "flex", gap: 8 }}>
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 30,
              border: `2px solid ${sub === t.id ? C.sage : C.border}`,
              background: sub === t.id ? C.sageLight : "transparent",
              color: sub === t.id ? C.sageDark : C.mid,
              fontFamily: "Georgia,serif",
              fontWeight: sub === t.id ? 700 : 400,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === "tracker" && (
        <SupplementTracker authUser={authUser} user={user} profileId={profileId} />
      )}

      {sub === "shop" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 18, color: C.charcoal }}>
              💊 Anthony William's Supplements
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.6 }}>
              These are the Vimergy and top-quality brands Anthony William recommends. Shop via iHerb — commissions support the Healing Access Fund.
            </div>
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
                      display: "inline-block", background: "#16a34a", color: "#fff",
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

          <div style={{ background: C.mist, borderRadius: 12, padding: "12px 14px", fontSize: 11, color: C.mid, lineHeight: 1.7 }}>
            Supplement links use an affiliate code — commissions go to the Healing Access Fund. For precise dosages and complete protocols, refer to Anthony William's books.
          </div>
        </div>
      )}
    </div>
  );
}
