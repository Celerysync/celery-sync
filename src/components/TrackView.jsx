import { useState, useEffect } from "react";
import C from "../lib/colors.js";
import Journal from "./Journal.jsx";
import Symptom from "./Symptom.jsx";

const SUB_TABS = [
  { id: "checkin", label: "📋 Check In" },
  { id: "feelings", label: "💚 How I Feel" },
];

export default function TrackView({ authUser, user, profileId, navQuery, onPageContext }) {
  const [sub, setSub] = useState("checkin");

  // Auto-switch to feelings sub-tab when Coach navigates here with a symptom query
  useEffect(() => {
    if (navQuery) setSub("feelings");
  }, [navQuery]);

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

      {sub === "checkin" && (
        <Journal authUser={authUser} user={user} profileId={profileId} />
      )}

      {sub === "feelings" && (
        <Symptom user={user} navQuery={navQuery} onPageContext={onPageContext} />
      )}
    </div>
  );
}
