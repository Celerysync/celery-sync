import C, { alpha } from "../lib/colors.js";
import { Card } from "./ui.jsx";
import { computeThenAndNow } from "../lib/progressStats.js";

const fmt = (dateStr) =>
  new Date(dateStr + "T12:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" });

// Direction is shown as a neutral mark, never colour-coded. Green-for-up
// encodes a judgement, and the judgement inverts between metrics — more
// energy reads as good, more pain does not. Describing the move is
// descriptive; scoring it is interpretation.
const MARK = { up: "↑", down: "↓", same: "≈" };

function Row({ title, then, now, direction, sub }) {
  return (
    <div style={{ padding: "11px 0", borderBottom: `1px solid ${alpha(C.border, "60")}` }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.charcoal }}>
          {title}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexShrink: 0 }}>
          <span style={{ fontFamily: "Georgia,serif", fontSize: 14, color: C.muted }}>{then}</span>
          <span style={{ fontSize: 12, color: C.muted }}>→</span>
          <span style={{ fontFamily: "Georgia,serif", fontSize: 16, fontWeight: 700, color: C.charcoal }}>{now}</span>
          <span style={{ fontSize: 13, color: C.mid, width: 14, textAlign: "center" }}>{MARK[direction]}</span>
        </div>
      </div>
      {sub && <div style={{ fontSize: 10.5, color: C.muted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

export default function ThenAndNow({ checkins }) {
  const data = computeThenAndNow(checkins);

  // Returns null until there is genuinely enough logged history to compare.
  // A confident-looking comparison drawn from a handful of days would be
  // worse than showing nothing.
  if (!data) return null;

  return (
    <Card>
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal }}>
          Then and now
        </div>
        {/* "earliest", not "first" — the caller passes a bounded range (the
            monthly view fetches 180 days), so for someone with longer history
            this is the start of that range, not the day they joined. The exact
            dates are printed below so there is no ambiguity either way. */}
        <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, marginTop: 2 }}>
          what you logged · earliest {data.windowDays} days vs most recent {data.windowDays}
        </div>
        <div style={{ fontSize: 11, color: C.mid, marginTop: 6 }}>
          {fmt(data.then.start)} – {fmt(data.then.end)}
          <span style={{ color: C.muted }}>  vs  </span>
          {fmt(data.now.start)} – {fmt(data.now.end)}
        </div>
      </div>

      <div style={{ marginTop: 6 }}>
        {data.metrics.map((m) => (
          <Row
            key={m.key}
            title={m.label}
            then={`${m.then.avg}${m.unit || ""}`}
            now={`${m.now.avg}${m.unit || ""}`}
            direction={m.direction}
            sub={`averages of ${m.then.n} and ${m.now.n} logged days`}
          />
        ))}

        {data.symptoms.map((s) => (
          <Row
            key={s.name}
            title={s.name}
            then={`${s.then.count}/${s.then.of}`}
            now={`${s.now.count}/${s.now.of}`}
            direction={s.direction}
            sub="days you logged it"
          />
        ))}
      </div>

      <div style={{ fontSize: 10.5, color: C.muted, lineHeight: 1.6, marginTop: 12 }}>
        These are averages of what you logged yourself. They don't say why anything
        changed, and they aren't a medical assessment — bring them to your doctor if
        they're useful.
      </div>
    </Card>
  );
}
