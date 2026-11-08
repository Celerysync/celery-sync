import { useEffect, useState } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { supabase } from "../lib/supabase.js";
import { describeRhythmChange, describeRhythmChangeSource } from "../lib/rhythmChanges.js";

const SHOW_FIRST = 5;
const FETCH_LIMIT = 100;

function fmtDay(iso) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

// "What I changed in my rhythm" — a plain diary read from rhythm_item_changes.
// Descriptive only: no link is drawn between a change and how anyone felt.
export default function RhythmChanges({ profileId }) {
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    supabase
      .from("rhythm_item_changes")
      .select("id, item_name, change_type, changed_fields, before, source, occurred_at")
      .eq("profile_id", profileId)
      .order("occurred_at", { ascending: false })
      .limit(FETCH_LIMIT)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setFailed(true);
        else setRows(data || []);
      });
    return () => { cancelled = true; };
  }, [profileId]);

  if (failed) {
    return <Card><div style={{ fontSize: 13, color: C.muted }}>Your rhythm changes couldn't load just now.</div></Card>;
  }
  // Still loading, or nothing changed yet: don't add noise to the page.
  if (!profileId || !rows?.length) return null;

  const visible = showAll ? rows : rows.slice(0, SHOW_FIRST);

  return (
    <Card>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 4 }}>
        Changes to your rhythm
      </div>
      <div style={{ fontSize: 13.5, color: C.muted, marginBottom: 12 }}>
        What you added, changed or removed, and when.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {visible.map((row) => {
          const source = describeRhythmChangeSource(row.source);
          return (
            <div key={row.id}>
              <div style={{ fontSize: 14, color: C.charcoal }}>{describeRhythmChange(row)}</div>
              <div style={{ fontSize: 13.5, color: C.muted, marginTop: 1 }}>
                {fmtDay(row.occurred_at)}{source ? ` · ${source}` : ""}
              </div>
            </div>
          );
        })}
      </div>
      {rows.length > SHOW_FIRST && (
        <button
          onClick={() => setShowAll((v) => !v)}
          style={{
            marginTop: 12, background: "none", border: "none", padding: "8px 0", cursor: "pointer",
            color: C.sageDark, fontFamily: "Georgia,serif", fontSize: 14, fontWeight: 700,
          }}
        >
          {showAll ? "Show fewer" : `Show all ${rows.length}`}
        </button>
      )}
    </Card>
  );
}
