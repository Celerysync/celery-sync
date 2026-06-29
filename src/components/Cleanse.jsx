import { useState, useEffect } from "react";
import C from "../lib/colors.js";
import { useVoice } from "../hooks/useVoice.js";
import { useVoicePrefs } from "../context/VoiceContext.jsx";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { Tag, Card, Btn } from "./ui.jsx";
import { CLEANSES_SUMMARY } from "../data/cleanses.js";
import { AVOID_ALL } from "../data/avoidList.js";
import { supabase } from "../lib/supabase.js";
import { RECIPES } from "../data/recipes.js";

// Recipe IDs relevant to each cleanse
const CLEANSE_RECIPES = {
  "Original 3:6:9": [
    "lemon-water", "celery-juice", "liver-rescue-smoothie", "hmds",
    "cleanse-apple-cucumber-juice", "cleanse-day9-asparagus",
    "asparagus-lemon", "steamed-asparagus-brussels", "asparagus-soup",
    "raw-zucchini-tomato", "liver-rescue-salad", "watermelon-juice",
    "cucumber-juice", "sweet-potato-spinach",
  ],
  "Simplified 3:6:9": [
    "lemon-water", "celery-juice", "liver-rescue-smoothie", "hmds",
    "asparagus-lemon", "potato-leek-soup", "sweet-potato-mash",
    "baked-potato-broccoli", "steamed-asparagus-brussels", "lentil-soup",
  ],
  "Advanced 3:6:9": [
    "lemon-water", "celery-juice", "liver-rescue-smoothie",
    "watermelon-juice", "cucumber-juice", "melon-plate",
    "cleanse-day9-asparagus", "cleanse-apple-cucumber-juice", "steamed-asparagus-brussels",
  ],
  "Heavy Metal Detox": [
    "hmds", "wild-blueberry-bowl", "celery-juice",
    "spirulina-lemon-shot", "apple-spinach-smoothie",
    "banana-date-smoothie", "mineral-broth",
  ],
  "Anti-Bug Cleanse": [
    "celery-juice", "lemon-water", "thyme-antiviral-tea",
    "cat-claw-tea", "lemon-balm-lemon-tea", "lemon-balm-tea",
    "healing-herb-salad", "spinach-soup", "mineral-broth",
  ],
  "Morning Cleanse": [
    "lemon-water", "celery-juice", "hmds",
    "orange-juice-morning", "wild-blueberry-bowl", "banana-date-smoothie",
  ],
  "Liver Rescue Morning": [
    "orange-juice-morning", "lemon-water", "celery-juice",
    "liver-rescue-smoothie", "liver-rescue-salad",
    "cherry-banana-liver-smoothie", "artichoke-lemon", "mango-papaya-bowl",
  ],
  "Mono Eating Cleanse": [
    "melon-plate", "papaya-bowl", "papaya-mango-smoothie",
    "mango-banana-bowl", "watermelon-juice", "apple-celery",
    "mango-slices-snack", "baked-apple-cinnamon",
  ],
};

function RecipeMini({ recipe }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      border: `1.5px solid ${open ? C.sage : C.border}`,
      borderRadius: 14, overflow: "hidden",
      background: C.white, transition: "border-color 0.2s",
    }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", cursor: "pointer" }}
      >
        <span style={{ fontSize: 20, flexShrink: 0 }}>{recipe.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.charcoal }}>{recipe.name}</div>
          <div style={{ fontSize: 11, color: C.muted }}>⏱ {recipe.prepTime} min</div>
        </div>
        <span style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{ padding: "0 12px 12px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, color: C.sage, fontWeight: 600, margin: "10px 0 6px", fontFamily: "Georgia,serif" }}>
            📚 {recipe.book}
          </div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 12, color: C.charcoal, marginBottom: 6 }}>Ingredients</div>
          {recipe.ingredients.map((ing, i) => (
            <div key={i} style={{ display: "flex", gap: 6, padding: "3px 0", fontSize: 12.5, color: C.charcoal }}>
              <span style={{ color: C.sage, flexShrink: 0 }}>•</span>{ing}
            </div>
          ))}
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 12, color: C.charcoal, margin: "10px 0 6px" }}>Method</div>
          {recipe.steps.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 8, padding: "4px 0", fontSize: 12.5, color: C.charcoal, lineHeight: 1.5 }}>
              <span style={{
                flexShrink: 0, width: 18, height: 18, background: C.sage, color: C.white,
                borderRadius: "50%", fontSize: 10, display: "flex", alignItems: "center",
                justifyContent: "center", fontWeight: 700, marginTop: 1,
              }}>{i + 1}</span>
              {step}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CleanseRecipes({ cleanseName }) {
  const ids = CLEANSE_RECIPES[cleanseName] || [];
  const recipes = ids.map(id => RECIPES.find(r => r.id === id)).filter(Boolean);
  if (recipes.length === 0) return null;
  return (
    <Card>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 4 }}>
        🍽 Recipes for this cleanse
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>
        Tap any recipe to see ingredients and method
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {recipes.map(r => <RecipeMini key={r.id} recipe={r} />)}
      </div>
    </Card>
  );
}

export default function Cleanse({ navQuery, authUser, profileId, onPageContext }) {
  const [sel, setSel] = useState(null);
  const [started, setStarted] = useLocalStorage("cs_started_cleanses", {});
  const [startMsg, setStartMsg] = useState(null);
  const { voiceName } = useVoicePrefs();
  const { speak, speaking, stopSpeaking } = useVoice(voiceName);

  const startCleanse = async (cleanseName, totalDays) => {
    const today = new Date().toISOString().split("T")[0];
    setStarted(s => ({ ...s, [cleanseName]: today }));
    setStartMsg("Cleanse started and recorded in your reports!");
    setTimeout(() => setStartMsg(null), 3500);

    if (profileId) {
      const programId = `cleanse-${cleanseName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      const endDate = totalDays > 0
        ? new Date(Date.now() + totalDays * 86400000).toISOString().split("T")[0]
        : null;
      await supabase.from("active_protocols").insert({
        profile_id: profileId,
        program_id: programId,
        program_name: cleanseName,
        start_date: today,
        end_date: endDate,
        total_days: totalDays > 0 ? totalDays : 999,
      });
      if (totalDays > 0) {
        await supabase.from("daily_checkins").upsert({
          profile_id: profileId,
          date: today,
          active_protocol_day: 1,
        }, { onConflict: "profile_id,date" });
      }
    }
    onPageContext?.({
      tab: "cleanses",
      label: `Cleanse started: ${cleanseName}`,
      detail: `User just started the ${cleanseName}${totalDays > 0 ? ` (${totalDays} days)` : " (ongoing practice)"}. Day 1.`,
    });
  };

  useEffect(() => {
    if (!navQuery) return;
    const q = navQuery.toLowerCase();
    const match = CLEANSES_SUMMARY.find(c => c.name.toLowerCase().includes(q) || q.includes(c.name.toLowerCase().split(" ")[0]));
    if (match) { setSel(match.name); onPageContext?.({ tab: "cleanses", label: match.name, detail: match.desc }); }
  }, [navQuery]);

  const CLEANSE_WHY = {
    "Original 3:6:9": {
      why: "The liver works on a natural 9-day cycle. Anthony William teaches that strategically reducing dietary fat over these 9 days gives the liver its first real rest in years — allowing it to purge stored pathogens, heavy metals, and toxic debris it has been holding. Most chronic illness, per AW, originates in an overburdened liver.",
      when: "Best when you're feeling stuck, fatigued, or when symptoms have plateaued. Many people do it quarterly. Do not do while pregnant or breastfeeding. Ideal to do with a support person.",
    },
    "Simplified 3:6:9": {
      why: "Same liver-restoration principle as the Original but with cooked food allowed and no all-liquid day. It delivers ~70% of the healing power and is far more sustainable for people who are working, parenting, or new to cleansing.",
      when: "Your first cleanse, or anytime life doesn't allow for strict raw eating. Also excellent for those with extreme fatigue who need food for stability.",
    },
    "Advanced 3:6:9": {
      why: "Zero fat — not even avocado or coconut — gives the liver complete rest from fat processing. The healing acceleration is significant. Per AW, this is where deep chronic conditions begin to genuinely shift after months of preparation.",
      when: "Only after completing the Original or Simplified at least once. Not for beginners. Have medical support in place first.",
    },
    "Heavy Metal Detox": {
      why: "Anthony William teaches that heavy metals — mercury, lead, aluminium, arsenic, copper — accumulate in brain tissue and are the root cause of neurological symptoms including anxiety, depression, brain fog, ADHD, Parkinson's, and OCD. The Big 5 ingredients work together as a chain — you cannot substitute or skip any.",
      when: "Daily, indefinitely. The longer you do it the deeper the metals it reaches. Expect increased brain fog in the first 2–4 weeks as metals move — this is normal and means it's working.",
    },
    "Anti-Bug Cleanse": {
      why: "Pathogens — EBV, streptococcus, HHV-6, shingles virus — feed on specific foods, primarily eggs and dairy. Removing these starves the pathogens while increasing antivirals creates a hostile environment for viruses. Per AW, most mystery illness is undiscovered viral illness.",
      when: "Any time you want to accelerate healing, especially during a viral flare, after illness, or when you're not seeing results from the morning protocol alone.",
    },
    "Morning Cleanse": {
      why: "The liver does its deepest cleaning from 1am to 9am. Anthony William teaches that the morning protocol supercharges this natural window — lemon water wakes the liver, celery juice floods it with sodium cluster salts that dissolve pathogens, and the HMDS targets heavy metals while the liver is still in cleaning mode.",
      when: "Every single morning, forever. This is not a 30-day programme — it's a lifelong practice. Even just lemon water + celery juice without the HMDS is enormously beneficial.",
    },
    "Liver Rescue Morning": {
      why: "The liver stores glucose and uses it to fuel nightly cleaning. Orange juice floods the liver with the specific glucose and vitamin C it needs to restore its cleaning capacity. Combined with lemon water and celery juice, this gives the liver an extraordinary amount of support in a short window.",
      when: "3–4 consecutive mornings during a liver focus period, during the 3:6:9 phase 2, or any time you want targeted liver support. Also excellent after a period of stress, alcohol, or processed food.",
    },
    "Mono Eating Cleanse": {
      why: "Digesting multiple different foods simultaneously requires the pancreas to produce a complex blend of enzymes. Eating just one food at a time gives the entire digestive system complete rest, freeing enormous amounts of energy for healing and detox. Per AW, apples are the most healing mono food.",
      when: "During recovery from food poisoning, during a detox reaction, after hospitalisation, or any time digestion is severely compromised. Can be done for one meal, one day, or several days.",
    },
  };

  if (sel === "Original 3:6:9") {
    const startDate = started["Original 3:6:9"];
    const daysElapsed = startDate
      ? Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000)
      : null;
    const dayNumber = daysElapsed !== null ? Math.min(daysElapsed + 1, 9) : null;
    const done = daysElapsed !== null && daysElapsed >= 9;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <button
          onClick={() => setSel(null)}
          style={{
            background: "none", border: "none", color: C.sage,
            cursor: "pointer", fontFamily: "Georgia,serif",
            fontSize: 14, padding: 0, textAlign: "left",
          }}
        >
          ← All Cleanses
        </button>

        <div style={{
          background: `linear-gradient(135deg,${C.sage},${C.sageDark})`,
          borderRadius: 18, padding: 20, color: C.white,
        }}>
          <div style={{ fontSize: 32 }}>🌿</div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 22, marginTop: 6 }}>
            Original 3:6:9 Cleanse
          </div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
            9 days · Cleanse to Heal Chapter 10 · Anthony William
          </div>
          {!startDate ? (
            <button
              onClick={() => startCleanse("Original 3:6:9", 9)}
              style={{
                marginTop: 12, background: "rgba(255,255,255,0.25)", color: C.white,
                border: "2px solid rgba(255,255,255,0.5)", borderRadius: 30,
                padding: "8px 18px", fontFamily: "Georgia,serif", fontWeight: 700,
                fontSize: 13, cursor: "pointer",
              }}
            >
              Start This Cleanse
            </button>
          ) : (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
              ✅ Started {startDate}
            </div>
          )}
          {startMsg && (
            <div style={{ marginTop: 8, fontSize: 12, background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 12px" }}>
              {startMsg}
            </div>
          )}
        </div>

        {/* Day counter */}
        {startDate && !done && (
          <Card>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 22, color: C.sage, marginBottom: 6 }}>
              Day {dayNumber} of 9
            </div>
            <div style={{ background: C.border, borderRadius: 8, height: 8, overflow: "hidden", marginBottom: 8 }}>
              <div style={{
                background: C.sage, height: "100%", borderRadius: 8,
                width: `${(dayNumber / 9) * 100}%`, transition: "width 0.4s",
              }} />
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>Started {startDate}</div>
          </Card>
        )}
        {done && (
          <Card style={{ background: C.sageLight, border: `1.5px solid ${C.sage}` }}>
            <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: C.sageDark }}>
              ✅ 9-day cleanse complete
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Started {startDate}</div>
          </Card>
        )}

        {/* Protocol link-out */}
        <Card>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: C.charcoal, marginBottom: 8 }}>
            📚 Day-by-day protocol
          </div>
          <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.7, marginBottom: 10 }}>
            For what to eat and do on each of the 9 days — meals, timings, and guidelines — refer to <em>Cleanse to Heal</em> by Anthony William (Chapter 10) or visit his official website.
          </div>
          <a
            href="https://www.medicalmedium.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block", background: C.sage, color: "#fff",
              padding: "8px 16px", borderRadius: 20, fontSize: 12,
              fontFamily: "Georgia,serif", fontWeight: 700, textDecoration: "none",
            }}
          >
            Visit medicalmedium.com →
          </a>
        </Card>

        <CleanseRecipes cleanseName="Original 3:6:9" />

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

        <Card style={{ background: "#fff8f0", border: "1px solid #f59e0b30" }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: "#b45309", marginBottom: 6 }}>
            💛 Why this cleanse matters
          </div>
          <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.75 }}>
            {CLEANSE_WHY["Original 3:6:9"].why}
          </div>
        </Card>

        <Card style={{ background: C.sageLight, border: `1px solid ${C.sage}30` }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.sageDark, marginBottom: 6 }}>
            📅 When to do it
          </div>
          <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.75 }}>
            {CLEANSE_WHY["Original 3:6:9"].when}
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
          onClick={() => setSel(null)}
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
              onClick={() => startCleanse(sel, cleanse.days)}
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
          {startMsg && (
            <div style={{ marginTop: 8, fontSize: 12, background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 12px" }}>
              {startMsg}
            </div>
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

        <CleanseRecipes cleanseName={sel} />

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

        {CLEANSE_WHY[sel] && (
          <>
            <Card style={{ background: "#fff8f0", border: "1px solid #f59e0b30" }}>
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: "#b45309", marginBottom: 6 }}>
                💛 Why this cleanse matters
              </div>
              <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.75 }}>
                {CLEANSE_WHY[sel].why}
              </div>
            </Card>
            <Card style={{ background: C.sageLight, border: `1px solid ${C.sage}30` }}>
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 13, color: C.sageDark, marginBottom: 6 }}>
                📅 When to do it
              </div>
              <div style={{ fontSize: 13, color: C.charcoal, lineHeight: 1.75 }}>
                {CLEANSE_WHY[sel].when}
              </div>
            </Card>
          </>
        )}

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
          onClick={() => { setSel(c.name); onPageContext?.({ tab: "cleanses", label: c.name, detail: c.desc + " " + (CLEANSE_WHY[c.name]?.why || "") }); }}
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
