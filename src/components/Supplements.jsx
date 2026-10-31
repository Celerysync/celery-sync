import { useState } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import SupplementTracker from "./SupplementTracker.jsx";
import { useUserSupplements } from "../hooks/useUserSupplements.js";

const IHERB_CODE = "CELERYSYNC";

// The shop only ever offers links for supplements the person added
// themselves. It used to show a hand-picked list (mostly Vimergy, matching
// Anthony William's protocols) — the app suggesting what to take, which the
// compliance rails don't allow however neutral the descriptions. iHerb's
// search keeps the affiliate code without the app choosing products.
function iherbSearchUrl(name) {
  return `https://www.iherb.com/search?kw=${encodeURIComponent(name)}&rcode=${IHERB_CODE}`;
}

const SUB_TABS = [
  { id: "tracker", label: "📋 Today's" },
  { id: "shop",    label: "🛒 Restock" },
];

export default function Supplements({ authUser, user, profileId }) {
  const [sub, setSub] = useState("tracker");
  const { supplements } = useUserSupplements(profileId);
  const names = [...new Set((supplements || []).map((x) => x.name?.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));

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
              🛒 Restock your supplements
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.6 }}>
              Quick links to find the supplements you've added, on iHerb. We don't suggest products — your list is your own.
            </div>
          </div>

          {names.length === 0 ? (
            <Card>
              <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.6 }}>
                Add your supplements under <strong>Today's</strong> and they'll appear here with a restock link.
              </div>
            </Card>
          ) : names.map((name) => (
            <Card key={name}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal }}>{name}</div>
                <a
                  href={iherbSearchUrl(name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: "#16a34a", color: "#fff", borderRadius: 30, padding: "7px 14px",
                    fontSize: 12, fontFamily: "Georgia,serif", fontWeight: 700, textDecoration: "none", flexShrink: 0,
                  }}
                >
                  Find on iHerb →
                </a>
              </div>
            </Card>
          ))}

          <div style={{ background: C.mist, borderRadius: 12, padding: "12px 14px", fontSize: 11, color: C.mid, lineHeight: 1.7 }}>
            Links use an affiliate code — commissions go to the Healing Access Fund. This isn't a recommendation of any product, and it isn't medical advice — always work with your doctor or pharmacist.
          </div>
        </div>
      )}
    </div>
  );
}
