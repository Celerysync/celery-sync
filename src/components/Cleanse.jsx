import { useState, useEffect } from "react";
import C from "../lib/colors.js";
import { useVoice } from "../hooks/useVoice.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { Tag, Card, Btn } from "./ui.jsx";
import { CLEANSES_SUMMARY, ORIGINAL_369 } from "../data/cleanses.js";
import { AVOID_ALL } from "../data/avoidList.js";

export default function Cleanse({ navQuery }) {
  const [sel, setSel] = useState(null);
  const [activeDay, setActiveDay] = useState(null);
  const [started, setStarted] = useLocalStorage("cs_started_cleanses", {});
  const { speak, speaking, stopSpeaking } = useVoice();

  useEffect(() => {
    if (!navQuery) return;
    const q = navQuery.toLowerCase();
    const match = CLEANSES_SUMMARY.find(c => c.name.toLowerCase().includes(q) || q.includes(c.name.toLowerCase().split(" ")[0]));
    if (match) setSel(match.name);
  }, [navQuery]);

  if (sel === "Original 3:6:9") {
    const days = Object.keys(ORIGINAL_369);
    const day = activeDay || days[0];
    const d = ORIGINAL_369[day];

    const readIt = () =>
      speak(
        `${day}. ${d.theme}. Upon waking: ${d.uponWaking}. Morning: ${d.morning}. ${
          d.lunch ? "Lunch: " + d.lunch + "." : ""
        } ${d.dinner ? "Dinner: " + d.dinner + "." : ""} ${
          d.allDay ? "Throughout the day: " + d.allDay : ""
        } Tips: ${d.tips?.join(". ")}`
      );

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <button
          onClick={() => { setSel(null); setActiveDay(null); }}
          style={{
            background: "none",
            border: "none",
            color: C.sage,
            cursor: "pointer",
            fontFamily: "Georgia,serif",
            fontSize: 14,
            padding: 0,
            textAlign: "left",
          }}
        >
          ← All Cleanses
        </button>

        <div
          style={{
            background: `linear-gradient(135deg,${C.sage},${C.sageDark})`,
            borderRadius: 18,
            padding: 20,
            color: C.white,
          }}
        >
          <div style={{ fontSize: 32 }}>🌿</div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 22, marginTop: 6 }}>
            Original 3:6:9 Cleanse
          </div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
            9 days · Cleanse to Heal Chapter 10 · Anthony William
          </div>
          {!started["Original 3:6:9"] ? (
            <button
              onClick={() =>
                setStarted((s) => ({
                  ...s,
                  "Original 3:6:9": new Date().toISOString().split("T")[0],
                }))
              }
              style={{
                marginTop: 12,
                background: "rgba(255,255,255,0.25)",
                color: C.white,
                border: "2px solid rgba(255,255,255,0.5)",
                borderRadius: 30,
                padding: "8px 18px",
                fontFamily: "Georgia,serif",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Start This Cleanse
            </button>
          ) : (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
              ✅ Started {started["Original 3:6:9"]}
            </div>
          )}
        </div>

        {/* Day tabs */}
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            paddingBottom: 4,
            scrollbarWidth: "none",
          }}
        >
          {days.map((d) => (
            <div
              key={d}
              onClick={() => setActiveDay(d)}
              style={{
                flexShrink: 0,
                padding: "8px 14px",
                borderRadius: 30,
                fontSize: 12,
                cursor: "pointer",
                border: `2px solid ${(activeDay || days[0]) === d ? C.sage : C.border}`,
                background: (activeDay || days[0]) === d ? C.sageLight : "transparent",
                color: (activeDay || days[0]) === d ? C.sageDark : C.muted,
                fontFamily: "Georgia,serif",
                fontWeight: 700,
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day detail */}
        <Card>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16, color: C.sage }}>
              {day}
            </div>
            <Btn small onClick={speaking ? stopSpeaking : readIt} color={C.sage}>
              {speaking ? "⏹ Stop" : "🔊 Listen"}
            </Btn>
          </div>
          <div
            style={{
              background: C.sageLight,
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: 13,
              color: C.sageDark,
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            {d.theme}
          </div>
          {[
            ["🌅 Upon Waking", d.uponWaking],
            ["☀️ Morning", d.morning],
            ["🕐 Mid-Morning", d.midMorning],
            ["🥗 Lunch", d.lunch],
            ["🍎 Mid-Afternoon", d.midAfternoon],
            ["🌆 Dinner", d.dinner],
            ["📅 All Day", d.allDay],
            ["🌇 Early Evening", d.earlyEvening],
            ["🌙 Evening", d.evening],
          ]
            .filter(([, v]) => v)
            .map(([label, val]) => (
              <div key={label} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 3 }}>
                  {label}
                </div>
                <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.6 }}>{val}</div>
              </div>
            ))}
          {d.tips && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.charcoal, marginBottom: 8 }}>
                📋 Guidelines
              </div>
              {d.tips.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 8, padding: "5px 0", fontSize: 13, color: C.mid }}>
                  <span style={{ color: C.sage, fontWeight: 700 }}>•</span>
                  {t}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Avoid all */}
        <Card>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 8 }}>
            🚫 Avoid All 9 Days
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {AVOID_ALL.map((a) => (
              <Tag key={a} color={C.terracotta}>{a}</Tag>
            ))}
          </div>
        </Card>

        <Card style={{ background: C.goldLight, border: `1px solid ${C.gold}40` }}>
          <div style={{ fontSize: 12, color: C.mid, lineHeight: 1.6 }}>
            📚 Full protocol in <strong>Cleanse to Heal</strong> by Anthony William, Chapter 10.
            Buy the book for complete recipes, adaptations, and guidance.
          </div>
          <a
            href="https://www.amazon.com/dp/1401957587"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-block", marginTop: 8, color: C.gold, fontWeight: 700, fontSize: 12 }}
          >
            Get Cleanse to Heal →
          </a>
        </Card>
      </div>
    );
  }

  // Generic cleanse detail view (non-Original 3:6:9)
  if (sel) {
    const cleanse = CLEANSES_SUMMARY.find((c) => c.name === sel);
    const CLEANSE_GUIDANCE = {
      "Simplified 3:6:9": {
        overview: "The Simplified 3:6:9 delivers approximately 70% of the healing power of the Original, without the strict raw food requirements. Perfect for beginners, people who can't fast, or those with busy schedules.",
        days1to3: "Morning: 16oz lemon water → 16oz celery juice → HMDS. During day: reduce dietary fat by half. Focus on fruits, vegetables, leafy greens. Allowed: millet, oats, and a small amount of healthy fat at dinner.",
        days4to6: "Morning: lemon water → celery juice → Liver Rescue Smoothie. No radical fat. Continue fruit and vegetable focus. Steamed asparagus and salad for lunch/dinner.",
        days7to9: "Day 7–8: Same as Days 4–6. Day 9: light and largely liquid — fresh fruit juices and blended fruits.",
        tips: ["Millet and oats are allowed unlike in the Original", "You can include steamed potato and root vegetables throughout", "One serving of animal protein at dinner is acceptable Days 1–3", "Still eliminate eggs, dairy, gluten, corn, soy, pork, canola oil, MSG, alcohol, vinegar"],
      },
      "Advanced 3:6:9": {
        overview: "The most powerful cleanse. All-raw, zero added fat. Only for those who have successfully completed the Original or Simplified 3:6:9 at least once. Do not start here.",
        days1to3: "Morning protocol. All meals 100% raw: salads, fruits, mono eating. No cooked food. No fat at all — not even avocado, nuts, seeds, or olive oil.",
        days4to6: "Morning: lemon water → celery juice → Advanced Liver Rescue Smoothie. 100% raw mono fruit or salads only. Zero fat. Asparagus and leafy greens.",
        days7to9: "Day 7–8: raw foods only. Day 9: entirely liquid — celery juice, lemon water, freshly pressed juices, blended melon. No solid food.",
        tips: ["Do NOT start here — complete Original or Simplified first", "Zero fat throughout — this is what makes it Advanced", "The healing power comes from giving the liver complete rest from fat processing", "Have medical support if you have any underlying conditions"],
      },
      "Heavy Metal Detox": {
        overview: "Not a time-limited cleanse — this is a daily practice. The Heavy Metal Detox Smoothie (Big 5) pulls heavy metals from the brain, tissues, and organs and safely escorts them out of the body.",
        days1to3: "Every morning after lemon water and celery juice: your Heavy Metal Detox Smoothie containing ALL FIVE ingredients. All five must be present — each plays a specific step in the extraction.",
        days4to6: "Continue daily. The process takes months, not days. After 3–6 months of daily HMDS, you will notice cognitive improvements, reduced brain fog, and increased energy.",
        days7to9: "Ongoing. Anthony William recommends making the HMDS a lifelong daily practice once started.",
        tips: [
          "Wild blueberries: draws metals out of brain tissue. Must be WILD — cultivated don't work",
          "Spirulina: captures metals drawn out by blueberries and carries them to the gut",
          "Barley grass juice powder: further draws metals into the intestinal tract",
          "Cilantro/coriander: crosses the blood-brain barrier to remove deeper metals",
          "Atlantic dulse: final net — grabs metals and exits the body",
          "ALL FIVE must be in every smoothie — missing one breaks the chain",
        ],
      },
      "Anti-Bug Cleanse": {
        overview: "Remove all foods that feed pathogens (viruses, bacteria, fungi) from your diet for 2–4 weeks, or adopt permanently. This creates a hostile environment for pathogens and allows the immune system to win.",
        days1to3: "Remove immediately: eggs, dairy, gluten, corn, soy, pork, canola oil, alcohol, MSG, natural flavours, citric acid, vinegar, fermented foods, nutritional yeast, artificial sweeteners.",
        days4to6: "Add: celery juice daily, wild blueberries daily, leafy greens with every meal. Increase lemon water. Reduce dietary fat significantly.",
        days7to9: "Optional additions: Cat's claw 2 dropperfuls twice daily (powerfully antiviral), zinc sulfate liquid 1 tsp twice daily, lemon balm 4 dropperfuls twice daily.",
        tips: ["Many people adopt this as their permanent eating template", "The longer you maintain it, the more pathogens die off and the better you feel", "Healing reactions are common in weeks 1–2 — push through gently", "Reference: Cleanse to Heal by Anthony William"],
      },
      "Morning Cleanse": {
        overview: "The foundational daily practice for all Medical Medium followers. This sequence, done every morning on an empty stomach, is the single most powerful thing you can do for your health.",
        days1to3: "Day 1–forever: 16oz lemon water on waking → wait 15–30 min → 16oz celery juice → wait 15–30 min → Heavy Metal Detox Smoothie (if doing the full protocol).",
        days4to6: "Your morning is protected time. No fat before the HMDS. No coffee, tea, or supplements before lemon water and celery juice.",
        days7to9: "Refine and simplify. The morning protocol should become as automatic as brushing your teeth.",
        tips: ["Lemon water alkalises and prepares the liver", "Celery juice on an empty stomach is where its healing powers are maximised — this timing is non-negotiable", "HMDS after celery juice targets heavy metals daily", "Fat before noon interrupts the liver's morning cleansing window"],
      },
      "Liver Rescue Morning": {
        overview: "A targeted liver flush protocol used during Liver Rescue or any time you want to give your liver 3–4 days of extra focused support. Simple but powerful.",
        days1to3: "Upon waking: 32oz lemon water. Wait 20–30 minutes. Drink 32oz fresh orange juice. Wait 20–30 minutes. Drink 16oz celery juice. This is the full Liver Rescue Morning sequence.",
        days4to6: "Continue for 3–4 consecutive mornings. The orange juice floods the liver with glucose and vitamin C while the lemon water and celery juice cleanse and restore.",
        days7to9: "After 4 days, you can return to the standard morning protocol (lemon water → celery juice) or the full HMDS protocol.",
        tips: ["Use fresh-squeezed orange juice only — not store-bought", "The orange juice is key — it feeds the liver cells directly", "This can be done as a standalone protocol or as a liver focus period", "Reference: Liver Rescue by Anthony William"],
      },
      "Mono Eating Cleanse": {
        overview: "Eat only one healing food at a time — usually for a whole meal or a whole day. This gives the digestive system complete rest, as it only has to produce enzymes for one food type at once.",
        days1to3: "Day 1–7: choose one mono food per meal or per day: apples only, bananas only, papaya only, mango only, or watermelon only.",
        days4to6: "Continue mono eating. Some people find it easiest to eat one fruit for a full day. Others eat mono per meal. Both work.",
        days7to9: "Anthony William recommends this for anyone with severe digestive issues, food poisoning recovery, or those who want the deepest digestive rest.",
        tips: ["Apples are the most healing mono food — pectin binds toxins and removes them", "Banana and dates together are excellent for adrenal support", "This cleanse is surprisingly satisfying — hunger is often reduced", "Reference: Cleanse to Heal by Anthony William"],
      },
    };
    const guidance = CLEANSE_GUIDANCE[sel];

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <button
          onClick={() => { setSel(null); setActiveDay(null); }}
          style={{ background: "none", border: "none", color: C.sage, cursor: "pointer", fontFamily: "Georgia,serif", fontSize: 14, padding: 0, textAlign: "left" }}
        >
          ← All Cleanses
        </button>

        <div style={{
          background: `linear-gradient(135deg,${cleanse.color},${cleanse.color}cc)`,
          borderRadius: 18, padding: 20, color: "#fff",
        }}>
          <div style={{ fontSize: 36 }}>{cleanse.emoji}</div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 22, marginTop: 6 }}>{cleanse.name}</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
            {cleanse.days > 0 ? `${cleanse.days} days` : "Daily practice"} · Cleanse to Heal · Anthony William
          </div>
          {!started[sel] ? (
            <button
              onClick={() => setStarted((s) => ({ ...s, [sel]: new Date().toISOString().split("T")[0] }))}
              style={{
                marginTop: 12, background: "rgba(255,255,255,0.25)", color: "#fff",
                border: "2px solid rgba(255,255,255,0.5)", borderRadius: 30, padding: "8px 18px",
                fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}
            >
              Start This Cleanse
            </button>
          ) : (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>✅ Started {started[sel]}</div>
          )}
        </div>

        {/* Best for */}
        <Card style={{ border: `1.5px solid ${cleanse.color}40` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: cleanse.color, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>
            Best For
          </div>
          <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.7 }}>{cleanse.best}</div>
        </Card>

        {guidance && (
          <>
            <Card>
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 8 }}>Overview</div>
              <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.75 }}>{guidance.overview}</div>
            </Card>

            {cleanse.days > 0 && (
              <>
                {[["Days 1–3", guidance.days1to3], ["Days 4–6", guidance.days4to6], ["Days 7–9", guidance.days7to9]].map(([label, content]) => content && (
                  <Card key={label}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.sage, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.75 }}>{content}</div>
                  </Card>
                ))}
              </>
            )}

            {guidance.tips && (
              <Card>
                <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 8 }}>📋 Key Guidelines</div>
                {guidance.tips.map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, padding: "5px 0", borderBottom: `1px solid ${C.border}40`, fontSize: 13, color: C.mid, lineHeight: 1.6 }}>
                    <span style={{ color: C.sage, fontWeight: 700, flexShrink: 0 }}>•</span>
                    {t}
                  </div>
                ))}
              </Card>
            )}
          </>
        )}

        <Card>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 8 }}>
            🚫 Avoid All {cleanse.days > 0 ? `${cleanse.days} Days` : "While Cleansing"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {AVOID_ALL.map((a) => (
              <Tag key={a} color={C.terracotta}>{a}</Tag>
            ))}
          </div>
        </Card>

        <Card style={{ background: C.goldLight, border: `1px solid ${C.gold}40` }}>
          <div style={{ fontSize: 12, color: C.mid, lineHeight: 1.6 }}>
            📚 Full protocol in <strong>Cleanse to Heal</strong> by Anthony William. The book contains complete recipes, adaptations, and Q&A for every cleanse.
          </div>
          <a href="https://www.amazon.com/dp/1401957587" target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-block", marginTop: 8, color: C.gold, fontWeight: 700, fontSize: 12 }}>
            Get Cleanse to Heal →
          </a>
        </Card>
      </div>
    );
  }

  // Cleanse list view
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 style={{ margin: 0, fontFamily: "Georgia,serif", fontSize: 22, color: C.charcoal }}>
        🌿 Healing Cleanses
      </h2>
      <Card style={{ background: C.sageLight, border: `1px solid ${C.sage}40` }}>
        <div style={{ fontSize: 12, color: C.sageDark, lineHeight: 1.6 }}>
          📖 Cleanse information is paraphrased from Anthony William's publicly shared teachings and attributed to him. This is not medical advice — always work with your healthcare provider. For complete protocols and in-depth detail, see his books in the <strong>Resources</strong> tab.
        </div>
      </Card>
      {CLEANSES_SUMMARY.map((c) => (
        <Card
          key={c.name}
          onClick={() => setSel(c.name)}
          style={{ border: started[c.name] ? `2px solid ${c.color}` : undefined }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 28 }}>{c.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.charcoal }}>
                {c.name}
              </div>
              <div style={{ fontSize: 11, color: C.muted }}>
                {c.days > 0 ? `${c.days} days` : "Daily practice"}
              </div>
              <div style={{ fontSize: 12, color: C.mid, marginTop: 3, lineHeight: 1.4 }}>
                {c.desc}
              </div>
              <div style={{ fontSize: 11, color: c.color, fontWeight: 700, marginTop: 4 }}>
                Best for: {c.best.substring(0, 60)}...
              </div>
            </div>
            {started[c.name] && <Tag color={c.color}>Active</Tag>}
            <div style={{ color: C.sage, fontSize: 20, flexShrink: 0 }}>›</div>
          </div>
        </Card>
      ))}
    </div>
  );
}
