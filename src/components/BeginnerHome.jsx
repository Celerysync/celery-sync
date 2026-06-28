import { useState, useMemo } from "react";
import C from "../lib/colors.js";

function getDayInfo() {
  const start = localStorage.getItem("cs_journey_start");
  if (!start) return { day: 1, week: 1 };
  const days = Math.floor((Date.now() - new Date(start).getTime()) / 86400000);
  return { day: Math.max(days + 1, 1), week: Math.floor(days / 7) + 1 };
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

const HMDS_INGREDIENTS = [
  { emoji: "🫐", item: "2 cups wild blueberries (frozen is fine)" },
  { emoji: "🍌", item: "1 banana" },
  { emoji: "🧄", item: "2 tsp Atlantic dulse" },
  { emoji: "🌿", item: "2 cups fresh or frozen barberries, raspberries, or blueberries" },
  { emoji: "🍊", item: "1 orange, juiced" },
  { emoji: "🪱", item: "½ cup fresh cilantro (coriander)" },
  { emoji: "🌊", item: "1 cup water" },
];

export default function BeginnerHome({ user, onGraduate, onNavigate }) {
  const { day, week } = useMemo(getDayInfo, []);
  const todayKey = getTodayKey();
  const checkKey = `cs_beginner_check_${todayKey}`;
  const [checks, setChecks] = useState(() => {
    try { return JSON.parse(localStorage.getItem(checkKey) || "{}"); } catch { return {}; }
  });
  const [showDiscovery, setShowDiscovery] = useState(false);

  const toggle = (item) => {
    const next = { ...checks, [item]: !checks[item] };
    setChecks(next);
    localStorage.setItem(checkKey, JSON.stringify(next));
  };

  const discoveryText = localStorage.getItem("cs_discovery_result") || "";

  const CheckItem = ({ id, emoji, title, desc, time }) => {
    const done = !!checks[id];
    return (
      <div
        onClick={() => toggle(id)}
        style={{
          display: "flex", alignItems: "flex-start", gap: 14,
          padding: "14px 16px", borderRadius: 16, cursor: "pointer",
          background: done ? C.sageLight : C.mist,
          border: `2px solid ${done ? C.sageDark : C.border}`,
          transition: "all 0.2s ease", marginBottom: 10,
        }}
      >
        <div style={{
          width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
          background: done ? C.sageDark : "#fff",
          border: `2px solid ${done ? C.sageDark : C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, marginTop: 1,
        }}>
          {done ? "✓" : ""}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 20 }}>{emoji}</span>
            <span style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: done ? C.sageDark : C.charcoal, textDecoration: done ? "line-through" : "none", opacity: done ? 0.8 : 1 }}>
              {title}
            </span>
          </div>
          {time && <div style={{ fontSize: 11, color: C.sage, fontWeight: 700, marginBottom: 3, letterSpacing: 0.3 }}>{time}</div>}
          <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>{desc}</div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Journey header */}
      <div style={{
        background: `linear-gradient(135deg,${C.sageDark},${C.leaf})`,
        borderRadius: 20, padding: "20px 22px", color: "#fff",
      }}>
        <div style={{ fontSize: 11, letterSpacing: 0.6, opacity: 0.75, textTransform: "uppercase", marginBottom: 4 }}>
          Your healing journey
        </div>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 26, lineHeight: 1.2, marginBottom: 6 }}>
          Week {week} · Day {day}
        </div>
        <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.6 }}>
          {week === 1
            ? "Building the foundation. Two things — that's all."
            : week === 2
            ? "Week 2: Time to add the Heavy Metal Detox Smoothie."
            : week === 3
            ? "Week 3: You're ready to look at your specific protocols."
            : `Week ${week}: You've been healing for ${day} days. Keep going.`}
        </div>

        {/* Week progress */}
        <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
          {["Morning Protocol", "HMDS", "Your Protocols", "Full App"].map((label, i) => {
            const done = week > i + 1;
            const active = week === i + 1;
            return (
              <div key={label} style={{ flex: 1, textAlign: "center" }}>
                <div style={{
                  height: 4, borderRadius: 10,
                  background: done ? "#fff" : active ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)",
                  marginBottom: 4,
                }} />
                <div style={{ fontSize: 8.5, opacity: active ? 1 : 0.5, lineHeight: 1.2 }}>{label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Today's protocol */}
      <div style={{ background: "#fff", borderRadius: 20, padding: "18px 18px" }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 17, color: C.charcoal, marginBottom: 4 }}>
          Today's morning protocol
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>
          Do these in order, on an empty stomach, before anything else.
        </div>

        <CheckItem
          id="lemon"
          emoji="🍋"
          title="Lemon water"
          time="First thing — before getting up"
          desc="Half a lemon in 500ml of water. Drink it before coffee, before food, before brushing your teeth. This wakes your liver."
        />
        {onNavigate && (
          <button onClick={() => onNavigate("learn")} style={{ background: "none", border: "none", color: C.sage, fontSize: 12, cursor: "pointer", padding: "0 0 8px 32px", textAlign: "left", fontFamily: "Georgia,serif" }}>
            📖 Why does this work? →
          </button>
        )}

        <CheckItem
          id="celery"
          emoji="🥬"
          title="Fresh celery juice"
          time="30 minutes after lemon water"
          desc="500ml of pure celery — nothing added. Juice it fresh. This is the one thing Anthony William says changes everything."
        />
        {onNavigate && (
          <button onClick={() => onNavigate("learn")} style={{ background: "none", border: "none", color: C.sage, fontSize: 12, cursor: "pointer", padding: "0 0 8px 32px", textAlign: "left", fontFamily: "Georgia,serif" }}>
            📖 Why does this work? →
          </button>
        )}

        {week >= 2 && (
          <>
            <CheckItem
              id="hmds"
              emoji="🫐"
              title="Heavy Metal Detox Smoothie"
              time="As breakfast, after celery juice"
              desc="Five ingredients that work together to draw heavy metals out of your brain and body. See ingredients below."
            />
            {onNavigate && (
              <button onClick={() => onNavigate("learn")} style={{ background: "none", border: "none", color: C.sage, fontSize: 12, cursor: "pointer", padding: "0 0 8px 32px", textAlign: "left", fontFamily: "Georgia,serif" }}>
                📖 Why does this work? →
              </button>
            )}
          </>
        )}

        {week < 2 && (
          <div style={{
            background: "#f8f8f8", borderRadius: 12, padding: "12px 14px",
            fontSize: 12, color: C.muted, lineHeight: 1.6, marginTop: 4,
          }}>
            🗓 Next week you'll add Anthony William's Heavy Metal Detox Smoothie — five ingredients that work together to pull metals from your brain and body.
          </div>
        )}
      </div>

      {/* HMDS ingredients (Week 2+) */}
      {week >= 2 && (
        <div style={{ background: "#fff", borderRadius: 20, padding: "18px 18px" }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16, color: C.charcoal, marginBottom: 4 }}>
            Heavy Metal Detox Smoothie
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
            Blend all together. Anthony William says these five ingredients work together synergistically — don't skip any.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {HMDS_INGREDIENTS.map(({ emoji, item }) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: C.mid }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{emoji}</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Week 3+: Protocols CTA */}
      {week >= 3 && (
        <div style={{
          background: C.sageLight, border: `1.5px solid ${C.sage}60`,
          borderRadius: 20, padding: "18px 18px",
        }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16, color: C.sageDark, marginBottom: 6 }}>
            You're ready to explore more 🌿
          </div>
          <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.65, marginBottom: 14 }}>
            After 3 weeks of your morning protocol you've built the foundation. Now it's time to look at what's specifically happening in your body — and what Anthony William says about it.
          </div>
          <div style={{ fontSize: 13, color: C.sageDark, fontWeight: 700 }}>
            → Tap the <strong>Symptoms</strong> tab to begin your deep dive
          </div>
        </div>
      )}

      {/* Discovery summary */}
      {discoveryText && (
        <div style={{ background: "#fff", borderRadius: 20, padding: "18px 18px" }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16, color: C.charcoal, marginBottom: 10 }}>
            Your discovery
          </div>
          <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
            {showDiscovery ? discoveryText : discoveryText.slice(0, 280) + (discoveryText.length > 280 ? "…" : "")}
          </div>
          {discoveryText.length > 280 && (
            <button
              onClick={() => setShowDiscovery(v => !v)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: C.sageDark, fontFamily: "Georgia,serif", fontWeight: 700,
                fontSize: 13, padding: "8px 0 0", textDecoration: "underline",
              }}
            >
              {showDiscovery ? "Show less" : "Read full discovery"}
            </button>
          )}
        </div>
      )}

      {/* Graduate / full app link */}
      <div style={{
        background: "#fff", borderRadius: 20, padding: "18px 18px",
        border: `1.5px dashed ${C.border}`,
      }}>
        <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal, marginBottom: 6 }}>
          Ready for the full app?
        </div>
        <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.65, marginBottom: 14 }}>
          When you're ready to explore all of Anthony William's protocols, your personal healing plan, cleanse guides, and AI coaching — switch to the full experience any time.
        </div>
        <button
          onClick={onGraduate}
          style={{
            background: C.charcoal, color: "#fff", border: "none",
            borderRadius: 30, padding: "11px 22px",
            fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13.5,
            cursor: "pointer",
          }}
        >
          Switch to full app →
        </button>
      </div>

      <div style={{ fontSize: 11, color: C.muted, textAlign: "center", lineHeight: 1.6, paddingBottom: 4 }}>
        🌿 Independent app · Inspired by Anthony William's Medical Medium teachings<br />
        Not affiliated with or endorsed by Medical Medium LLC
      </div>
    </div>
  );
}
