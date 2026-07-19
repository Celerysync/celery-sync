import { useState, useEffect } from "react";
import C from "../lib/colors.js";
import { Card } from "./ui.jsx";


const TAB_LABELS = {
  home: "Today", coach: "AI Guide", journal: "Journal", recipes: "Recipes",
  cleanses: "Cleanses", symptoms: "Symptoms", knowledge: "Resources",
  body: "The Body", community: "Circles", practice: "Practice",
  aw: "Support AW", account: "Account",
};

const CIRCLE_LABELS = {
  thyroid: "🦋 Thyroid", liver: "🍊 Liver", brain: "🧠 Brain",
  fatigue: "⚡ Fatigue", autoimmune: "🛡 Autoimmune", heavymetal: "🫐 Heavy Metal",
  mentalhealth: "💜 Mental Health", womens: "🌸 Women's", digestive: "🌿 Digestive",
  general: "🌱 General",
};

function StatCard({ value, label, color = C.leaf, bg = C.sageLight }) {
  return (
    <div style={{ flex: "1 0 80px", textAlign: "center", padding: "12px 8px", background: bg, borderRadius: 14 }}>
      <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "Georgia,serif", color }}>{value}</div>
      <div style={{ fontSize: 10, color: C.mid, marginTop: 3, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

function BarRow({ label, value, max, color = C.sage }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <div style={{ fontSize: 12, color: C.charcoal }}>{label}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color }}>{value}</div>
      </div>
      <div style={{ height: 6, background: C.mist, borderRadius: 3 }}>
        <div style={{ height: 6, width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

export default function AdminDashboard({ authUser }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authUser?.id) return;
    fetch(`/api/analytics/admin/${authUser.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) throw new Error(d.error); setData(d); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [authUser?.id]);

  const latestDigest = data?.latestDigest;

  if (loading) return (
    <div style={{ textAlign: "center", padding: 48, color: C.muted, fontFamily: "Georgia,serif" }}>
      🌿 Loading dashboard…
    </div>
  );

  if (error) return (
    <div style={{ padding: 24, color: C.terracotta, fontSize: 13 }}>Error: {error}</div>
  );

  if (!data) return null;

  const totalSubs = (data.subscriptions?.healer || 0) + (data.subscriptions?.practitioner || 0);
  const maxTabCount = data.topTabs?.[0]?.[1] || 1;
  const maxCircleCount = data.topCircles?.[0]?.[1] || 1;

  const EVENT_LABELS = {
    checkin_saved: "Check-ins saved",
    ai_query: "AI coaching queries",
    tab_view: "Tab views",
    circle_joined: "Circles joined",
    circle_post_created: "Posts created",
    wearable_connected: "Wearables connected",
    protocol_generated: "Practitioner protocols",
    book_added: "Videos saved",
    subscription_started: "New subscriptions",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg,${C.charcoal},#2d4a2d)`,
        borderRadius: 22, padding: "20px 22px", color: C.white,
      }}>
        <div style={{ fontSize: 11, opacity: 0.6, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
          Admin Dashboard
        </div>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 20 }}>CelerySync Overview</div>
        <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>Last 7 days · Live data from Supabase</div>
      </div>


      {/* Key stats */}
      <Card>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 12 }}>
          👥 Users
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <StatCard value={data.users.total} label="Total profiles" color={C.leaf} bg={C.sageLight} />
          <StatCard value={data.users.onTrial ?? "—"} label="On free trial" color={C.gold} bg={C.goldLight} />
          <StatCard value={data.users.paid ?? "—"} label="Paid subscribers" color={C.sageDark} bg={C.sageLight} />
          <StatCard value={`${data.users.conversionRate ?? "0.0"}%`} label="Conversion rate" color={C.plum} bg={C.plumLight} />
          <StatCard value={data.users.activeWeek} label="Active this week" color={C.sage} bg="#f0fdf4" />
        </div>
      </Card>

      {/* Revenue */}
      <Card style={{ background: C.goldLight, border: `1.5px solid ${C.gold}40` }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 12 }}>
          💰 Revenue
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <StatCard value={totalSubs} label="Active subscribers" color={C.gold} bg="rgba(255,255,255,0.6)" />
          <StatCard value={data.subscriptions?.healer || 0} label="Healer ($9.97)" color={C.sage} bg="rgba(255,255,255,0.6)" />
          <StatCard value={data.subscriptions?.practitioner || 0} label="Practitioner ($49)" color={C.plum} bg="rgba(255,255,255,0.6)" />
          <StatCard value={`$${data.revenue?.monthly}`} label="Est. monthly rev." color={C.gold} bg="rgba(255,255,255,0.6)" />
        </div>
      </Card>

      {/* Activity */}
      <Card>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 12 }}>
          📈 Activity (last 7 days)
        </div>
        <StatCard value={data.checkinsThisWeek} label="Daily check-ins logged" color={C.plum} bg={C.plumLight} />
        <div style={{ marginTop: 14 }}>
          {Object.entries(data.events7d || {})
            .filter(([k]) => EVENT_LABELS[k])
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => (
              <BarRow
                key={type}
                label={EVENT_LABELS[type] || type}
                value={count}
                max={Math.max(...Object.values(data.events7d))}
                color={C.sage}
              />
            ))}
          {Object.keys(data.events7d || {}).length === 0 && (
            <div style={{ fontSize: 12, color: C.muted }}>No events tracked yet — analytics will populate as users engage.</div>
          )}
        </div>
      </Card>

      {/* Top tabs */}
      {data.topTabs?.length > 0 && (
        <Card>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 12 }}>
            🗂 Most-Used Features (7d)
          </div>
          {data.topTabs.map(([tab, count]) => (
            <BarRow key={tab} label={TAB_LABELS[tab] || tab} value={count} max={maxTabCount} color={C.leaf} />
          ))}
        </Card>
      )}

      {/* Top circles */}
      {data.topCircles?.length > 0 && (
        <Card>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 12 }}>
            💚 Healing Circles (30d joins)
          </div>
          {data.topCircles.map(([id, count]) => (
            <BarRow key={id} label={CIRCLE_LABELS[id] || id} value={count} max={maxCircleCount} color={C.plum} />
          ))}
        </Card>
      )}

      {/* Weekly AI digest */}
      {latestDigest && (
        <Card style={{ background: C.goldLight, border: `1.5px solid ${C.gold}40` }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 6 }}>
            ✨ Weekly AI Digest
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
            Generated {new Date(latestDigest.generatedAt).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.7, fontStyle: "italic" }}>{latestDigest.digest}</div>
        </Card>
      )}

      {/* Healing Access Fund note */}
      <Card style={{ background: `linear-gradient(135deg,${C.plum},#5c3f6b)`, border: "none" }}>
        <div style={{ color: C.white }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
            💜 Healing Access Fund
          </div>
          <div style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.6, marginBottom: 10 }}>
            Estimated monthly revenue: <strong>${data.revenue?.monthly}</strong>
          </div>
          <div style={{ fontSize: 11, opacity: 0.75, lineHeight: 1.6 }}>
            Remember to allocate a generous portion to buying MM books and supplements for people who can't afford them. Contact healing@celerysync.com requests come here.
          </div>
        </div>
      </Card>

      <div style={{ fontSize: 11, color: C.muted, textAlign: "center" }}>
        This dashboard is only visible to allij@live.com.au
      </div>
    </div>
  );
}
