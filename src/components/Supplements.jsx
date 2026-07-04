import { useState } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import SupplementTracker from "./SupplementTracker.jsx";

const IHERB_CODE = "CELERYSYNC";
function iherbUrl(path) {
  return `https://www.iherb.com/${path}?rcode=${IHERB_CODE}`;
}

// Factual, general-wellness descriptions only — no named-condition or
// treatment claims, no third-party endorsement framing. See LEGAL_CONSTRAINTS.md.
const SUPPLEMENTS = [
  { name: "Zinc Sulfate Liquid",             emoji: "⚡", path: "pr/vimergy-usda-organic-zinc-sulfate-liquid/ihb-00229",       desc: "Zinc in a liquid form. Zinc is involved in normal immune function." },
  { name: "Vitamin B12 (Adenosylcobalamin)", emoji: "🔴", path: "pr/vimergy-usda-organic-b12/ihb-00152",                       desc: "A bioavailable form of B12. Supports normal nervous system function and energy metabolism." },
  { name: "Lemon Balm",                      emoji: "🍋", path: "pr/vimergy-organic-lemon-balm/ihb-00176",                     desc: "An herbal supplement, sometimes used for general calm." },
  { name: "Cat's Claw",                      emoji: "🌿", path: "pr/vimergy-organic-cat-s-claw/ihb-00158",                     desc: "An herbal supplement used in general wellness routines." },
  { name: "L-Lysine",                        emoji: "🛡", path: "pr/vimergy-l-lysine/ihb-00180",                               desc: "An amino acid supplement." },
  { name: "Spirulina",                       emoji: "🔵", path: "pr/vimergy-usda-organic-spirulina-powder/ihb-00218",          desc: "A blue-green algae — a source of plant protein and general nutrients." },
  { name: "Barley Grass Juice Powder",       emoji: "🟢", path: "pr/vimergy-organic-barley-grass-juice-powder/ihb-00154",      desc: "A green juice powder — a source of chlorophyll and general nutrients." },
  { name: "Wild Blueberry Powder",           emoji: "🫐", path: "pr/vimergy-wild-blueberry-powder/ihb-00228",                  desc: "A concentrated fruit powder — a source of antioxidants." },
  { name: "Magnesium Glycinate",             emoji: "💤", path: "pr/doctor-s-best-high-absorption-magnesium/ihb-00112",        desc: "A well-absorbed form of magnesium. Involved in normal muscle function." },
  { name: "Vitamin C",                       emoji: "🍊", path: "pr/vimergy-micro-c-immune-power/ihb-00223",                   desc: "A bioavailable form of vitamin C. Supports normal immune function." },
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
              💊 General Wellness Supplements
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.6 }}>
              A few commonly used general wellness supplements, available via iHerb. Commissions from purchases support the Healing Access Fund.
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
            Supplement links use an affiliate code — commissions go to the Healing Access Fund. This is general supplement information, not medical advice — always work with your doctor. For dosage and protocol guidance, refer to Anthony William's official books.
          </div>
        </div>
      )}
    </div>
  );
}
