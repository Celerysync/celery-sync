import { useState, useMemo } from "react";
import C from "../lib/colors.js";
import { callClaude } from "../lib/api.js";

const KIDS_COLORS = {
  bg: "#FFF8E7",
  primary: "#FF8C42",
  secondary: "#6BBF59",
  accent: "#7EC8E3",
  purple: "#C77DFF",
  pink: "#FF6B9D",
  text: "#2D2D2D",
  card: "#FFFFFF",
  border: "#FFE0B2",
};

const AGE_GROUPS = [
  { id: "little", label: "Little Healers", age: "Ages 4–7", emoji: "🌱" },
  { id: "middle", label: "Healing Kids", age: "Ages 8–12", emoji: "🌿" },
  { id: "teen", label: "Teen Healers", age: "Ages 13–17", emoji: "🌳" },
];

const ACTIVITIES = [
  {
    id: "morning",
    emoji: "🌅",
    title: "Morning Protocol Game",
    desc: "Put your morning healing routine in order!",
    color: KIDS_COLORS.primary,
    items: [
      { id: "a", text: "🍋 Lemon water", order: 1 },
      { id: "b", text: "🥬 Celery juice", order: 2 },
      { id: "c", text: "🍌 Heavy Metal Detox Smoothie", order: 3 },
    ],
  },
  {
    id: "foods",
    emoji: "🥦",
    title: "Healing Foods Match",
    desc: "Which foods help you heal? Tap the good ones!",
    color: KIDS_COLORS.secondary,
    good: ["Wild blueberries 🫐", "Celery 🥬", "Lemon 🍋", "Banana 🍌", "Cucumber 🥒", "Apples 🍎", "Dates 🫙", "Papaya 🍈"],
    bad: ["Dairy 🧀", "Eggs 🥚", "Gluten 🍞", "Corn 🌽"],
  },
  {
    id: "quiz",
    emoji: "🧠",
    title: "Healing Quiz",
    desc: "How much do you know about your body?",
    color: KIDS_COLORS.accent,
    questions: [
      { q: "What should you drink first thing in the morning?", options: ["Cola", "Lemon water", "Milk", "Orange juice"], answer: 1 },
      { q: "How long should you fast between celery juice and breakfast?", options: ["5 minutes", "15–30 minutes", "2 hours", "No wait needed"], answer: 1 },
      { q: "Which berry is best for healing the brain?", options: ["Strawberry", "Raspberry", "Wild blueberry", "Grape"], answer: 2 },
      { q: "What does the Heavy Metal Detox Smoothie help remove?", options: ["Sugar", "Heavy metals from your body", "Bad bacteria", "Viruses only"], answer: 1 },
      { q: "Why is celery juice special?", options: ["It tastes great", "It has sodium cluster salts that kill bad bugs", "It makes you tall", "It has lots of protein"], answer: 1 },
    ],
  },
];

function MorningGameActivity({ onBack }) {
  const [order, setOrder] = useState([]);
  const items = ACTIVITIES[0].items;
  const allPlaced = order.length === items.length;
  const correct = allPlaced && order.every((id, i) => items.find(x => x.id === id)?.order === i + 1);

  const toggle = (id) => {
    if (order.includes(id)) {
      setOrder(order.filter(x => x !== id));
    } else {
      setOrder([...order, id]);
    }
  };

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 14, color: KIDS_COLORS.primary, cursor: "pointer", marginBottom: 12, padding: 0 }}>
        ← Back
      </button>
      <div style={{ fontFamily: "Georgia,serif", fontSize: 18, fontWeight: 700, color: KIDS_COLORS.text, marginBottom: 6 }}>
        🌅 Morning Protocol Game
      </div>
      <div style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>
        Tap the steps in the right order — what do you drink first?
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {items.map((item) => {
          const pos = order.indexOf(item.id) + 1;
          const placed = pos > 0;
          return (
            <button
              key={item.id}
              onClick={() => toggle(item.id)}
              style={{
                padding: "14px 18px",
                borderRadius: 16,
                border: `2px solid ${placed ? KIDS_COLORS.primary : KIDS_COLORS.border}`,
                background: placed ? KIDS_COLORS.primary + "20" : KIDS_COLORS.card,
                display: "flex", alignItems: "center", gap: 12,
                cursor: "pointer", touchAction: "manipulation", textAlign: "left",
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: placed ? KIDS_COLORS.primary : "#eee",
                color: placed ? "#fff" : "#999",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 16, flexShrink: 0,
              }}>
                {placed ? pos : "?"}
              </div>
              <div style={{ fontSize: 16 }}>{item.text}</div>
            </button>
          );
        })}
      </div>
      {allPlaced && (
        <div style={{
          padding: 18, borderRadius: 16,
          background: correct ? "#E8F5E9" : "#FFEBEE",
          border: `2px solid ${correct ? KIDS_COLORS.secondary : "#EF9A9A"}`,
          textAlign: "center",
        }}>
          {correct ? (
            <>
              <div style={{ fontSize: 36 }}>🎉</div>
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16, color: "#2E7D32", marginTop: 8 }}>
                Perfect! You know the morning protocol!
              </div>
              <div style={{ fontSize: 13, color: "#4CAF50", marginTop: 6 }}>
                Lemon water → Celery juice → Heavy Metal Detox Smoothie. This order matters!
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 36 }}>🌱</div>
              <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 16, color: "#C62828", marginTop: 8 }}>
                Not quite! Try again 💪
              </div>
              <button onClick={() => setOrder([])} style={{ marginTop: 10, padding: "8px 20px", background: KIDS_COLORS.primary, color: "#fff", border: "none", borderRadius: 20, cursor: "pointer", fontFamily: "Georgia,serif" }}>
                Try Again
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function HealingFoodsActivity({ onBack }) {
  const { good, bad } = ACTIVITIES[1];
  const allFoods = useMemo(() => [...good.map(f => ({ text: f, isGood: true })), ...bad.map(f => ({ text: f, isGood: false }))].sort(() => Math.random() - 0.5), []);
  const [tapped, setTapped] = useState({});
  const [revealed, setRevealed] = useState(false);

  const toggle = (f) => {
    if (revealed) return;
    setTapped(t => ({ ...t, [f]: !t[f] }));
  };

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 14, color: KIDS_COLORS.primary, cursor: "pointer", marginBottom: 12, padding: 0 }}>
        ← Back
      </button>
      <div style={{ fontFamily: "Georgia,serif", fontSize: 18, fontWeight: 700, color: KIDS_COLORS.text, marginBottom: 6 }}>
        🥦 Healing Foods Match
      </div>
      <div style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
        Tap all the foods that help you heal!
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        {allFoods.map(({ text, isGood }) => {
          const selected = tapped[text];
          const showResult = revealed;
          let bg = selected ? KIDS_COLORS.secondary + "30" : KIDS_COLORS.bg;
          let border = selected ? KIDS_COLORS.secondary : KIDS_COLORS.border;
          if (showResult) {
            bg = isGood ? "#E8F5E9" : "#FFEBEE";
            border = isGood ? KIDS_COLORS.secondary : "#EF5350";
          }
          return (
            <button
              key={text}
              onClick={() => toggle(text)}
              style={{
                padding: "10px 14px", borderRadius: 30,
                border: `2px solid ${border}`, background: bg,
                cursor: revealed ? "default" : "pointer",
                fontSize: 14, touchAction: "manipulation",
              }}
            >
              {showResult && (isGood ? "✅ " : "❌ ")}{text}
            </button>
          );
        })}
      </div>
      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          style={{ width: "100%", padding: "12px", background: KIDS_COLORS.secondary, color: "#fff", border: "none", borderRadius: 30, fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
        >
          Show Answers!
        </button>
      ) : (
        <div style={{ padding: 14, borderRadius: 14, background: "#E8F5E9", border: `1px solid ${KIDS_COLORS.secondary}40` }}>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 14, color: "#2E7D32" }}>
            Green = healing foods · Red = avoid these
          </div>
          <div style={{ fontSize: 12, color: "#4CAF50", marginTop: 4 }}>
            Dairy, eggs, gluten and corn feed the bugs and viruses that make us feel sick. The healing foods help our body fight them!
          </div>
        </div>
      )}
    </div>
  );
}

function QuizActivity({ onBack }) {
  const questions = ACTIVITIES[2].questions;
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[current];

  const answer = (i) => {
    if (selected !== null) return;
    setSelected(i);
    if (i === q.answer) setScore(s => s + 1);
    setTimeout(() => {
      if (current + 1 >= questions.length) {
        setDone(true);
      } else {
        setCurrent(c => c + 1);
        setSelected(null);
      }
    }, 1200);
  };

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div>
        <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 14, color: KIDS_COLORS.primary, cursor: "pointer", marginBottom: 12, padding: 0 }}>
          ← Back
        </button>
        <div style={{ textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 56 }}>{pct >= 80 ? "🏆" : pct >= 60 ? "🌟" : "🌱"}</div>
          <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 22, color: KIDS_COLORS.text, marginTop: 12 }}>
            {score} out of {questions.length}!
          </div>
          <div style={{ fontSize: 14, color: "#666", marginTop: 8 }}>
            {pct >= 80 ? "You're a healing expert! Anthony William would be proud." : pct >= 60 ? "Great job! Keep learning and you'll be a healing master." : "Every healer starts somewhere. Try again and you'll do even better!"}
          </div>
          <button
            onClick={() => { setCurrent(0); setSelected(null); setScore(0); setDone(false); }}
            style={{ marginTop: 20, padding: "12px 28px", background: KIDS_COLORS.accent, color: "#fff", border: "none", borderRadius: 30, fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 14, color: KIDS_COLORS.primary, cursor: "pointer", marginBottom: 12, padding: 0 }}>
        ← Back
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontFamily: "Georgia,serif", fontSize: 18, fontWeight: 700, color: KIDS_COLORS.text }}>
          🧠 Healing Quiz
        </div>
        <div style={{ fontSize: 13, color: "#666" }}>{current + 1} / {questions.length}</div>
      </div>
      <div style={{ height: 6, background: "#eee", borderRadius: 3, marginBottom: 20 }}>
        <div style={{ height: 6, width: `${((current) / questions.length) * 100}%`, background: KIDS_COLORS.accent, borderRadius: 3, transition: "width 0.3s" }} />
      </div>
      <div style={{ fontFamily: "Georgia,serif", fontSize: 16, color: KIDS_COLORS.text, marginBottom: 20, lineHeight: 1.5 }}>
        {q.q}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {q.options.map((opt, i) => {
          let bg = KIDS_COLORS.card;
          let border = KIDS_COLORS.border;
          let color = KIDS_COLORS.text;
          if (selected !== null) {
            if (i === q.answer) { bg = "#E8F5E9"; border = KIDS_COLORS.secondary; color = "#2E7D32"; }
            else if (i === selected) { bg = "#FFEBEE"; border = "#EF5350"; color = "#C62828"; }
          }
          return (
            <button
              key={i}
              onClick={() => answer(i)}
              style={{
                padding: "14px 18px", borderRadius: 14,
                border: `2px solid ${border}`, background: bg,
                cursor: selected !== null ? "default" : "pointer",
                textAlign: "left", fontSize: 14, color, fontFamily: "Georgia,serif",
                touchAction: "manipulation",
              }}
            >
              {selected !== null && i === q.answer ? "✅ " : selected !== null && i === selected ? "❌ " : ""}{opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AskGuide({ ageGroup }) {
  const [input, setInput] = useState("");
  const [reply, setReply] = useState(null);
  const [loading, setLoading] = useState(false);

  const ageLabel = ageGroup === "little" ? "age 4-7" : ageGroup === "middle" ? "age 8-12" : "age 13-17";

  const ask = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setReply(null);
    try {
      const response = await callClaude({
        tier: "quick",
        system: `You are a kind, fun children's health guide for Medical Medium healing. You're talking to a child ${ageLabel}.
Use simple, age-appropriate language. Be warm, encouraging and use emojis.
Explain Anthony William's healing teachings in a way kids can understand — use food analogies, fun comparisons, and simple words.
Never use medical jargon. Keep answers short (3-5 sentences max).
Never say anything scary. Always end with something encouraging.
Topics: celery juice, healing foods, why we avoid eggs/dairy/gluten, morning protocol, heavy metal detox smoothie, how our body heals.`,
        messages: [{ role: "user", content: input }],
        maxTokens: 200,
      });
      setReply(response);
    } catch (e) {
      setReply("Oops! Something went wrong. Ask a grown-up to help 💚");
    }
    setLoading(false);
    setInput("");
  };

  return (
    <div style={{ background: KIDS_COLORS.bg, borderRadius: 18, padding: 16, border: `2px solid ${KIDS_COLORS.border}` }}>
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: 15, color: KIDS_COLORS.text, marginBottom: 8 }}>
        🌿 Ask the Healing Guide
      </div>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>Ask anything about healing foods, why we drink celery juice, or how our body gets better!</div>
      {reply && (
        <div style={{ background: "#fff", borderRadius: 14, padding: "12px 14px", marginBottom: 12, fontSize: 14, lineHeight: 1.7, color: KIDS_COLORS.text, border: `1px solid ${KIDS_COLORS.border}` }}>
          🌿 {reply}
        </div>
      )}
      {loading && (
        <div style={{ fontSize: 14, color: KIDS_COLORS.secondary, marginBottom: 12, fontStyle: "italic" }}>
          🌱 Thinking of the best answer for you…
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && ask()}
          placeholder="Type your question here…"
          style={{
            flex: 1, padding: "10px 14px", borderRadius: 30,
            border: `1.5px solid ${KIDS_COLORS.border}`, fontFamily: "Georgia,serif", fontSize: 14,
            outline: "none", background: "#fff",
          }}
        />
        <button
          onClick={ask}
          disabled={loading}
          style={{
            width: 44, height: 44, borderRadius: "50%", border: "none",
            background: KIDS_COLORS.secondary, color: "#fff", fontSize: 18,
            cursor: loading ? "default" : "pointer", touchAction: "manipulation", flexShrink: 0,
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

export default function KidsCorner({ parentProfile }) {
  const [ageGroup, setAgeGroup] = useState(null);
  const [activity, setActivity] = useState(null);

  if (!ageGroup) {
    return (
      <div style={{ background: KIDS_COLORS.bg, minHeight: "100%", fontFamily: "Georgia,serif" }}>
        <div style={{ textAlign: "center", padding: "24px 0 16px" }}>
          <div style={{ fontSize: 52 }}>🌈</div>
          <h2 style={{ margin: "8px 0 4px", fontSize: 24, color: KIDS_COLORS.text }}>Kids Corner</h2>
          <div style={{ fontSize: 14, color: "#888", marginBottom: 24 }}>
            Learn about healing in a fun way!
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "0 4px" }}>
          {AGE_GROUPS.map(g => (
            <button
              key={g.id}
              onClick={() => setAgeGroup(g.id)}
              style={{
                padding: "20px 22px", borderRadius: 20,
                border: `2.5px solid ${KIDS_COLORS.border}`,
                background: KIDS_COLORS.card, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 16,
                touchAction: "manipulation", textAlign: "left",
              }}
            >
              <div style={{ fontSize: 36, flexShrink: 0 }}>{g.emoji}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17, color: KIDS_COLORS.text }}>{g.label}</div>
                <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{g.age}</div>
              </div>
              <div style={{ marginLeft: "auto", fontSize: 20, color: "#ccc" }}>›</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const group = AGE_GROUPS.find(g => g.id === ageGroup);

  if (activity === "morning") return <div style={{ background: KIDS_COLORS.bg, minHeight: "100%", padding: "8px 4px" }}><MorningGameActivity onBack={() => setActivity(null)} /></div>;
  if (activity === "foods") return <div style={{ background: KIDS_COLORS.bg, minHeight: "100%", padding: "8px 4px" }}><HealingFoodsActivity onBack={() => setActivity(null)} /></div>;
  if (activity === "quiz") return <div style={{ background: KIDS_COLORS.bg, minHeight: "100%", padding: "8px 4px" }}><QuizActivity onBack={() => setActivity(null)} /></div>;

  const isLittle = ageGroup === "little";

  return (
    <div style={{ background: KIDS_COLORS.bg, minHeight: "100%", fontFamily: "Georgia,serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <button onClick={() => setAgeGroup(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: 0 }}>←</button>
        <div>
          <div style={{ fontWeight: 700, fontSize: 20, color: KIDS_COLORS.text }}>{group.emoji} {group.label}</div>
          <div style={{ fontSize: 12, color: "#888" }}>{group.age}</div>
        </div>
      </div>

      {/* Welcome card */}
      <div style={{
        background: `linear-gradient(135deg, ${KIDS_COLORS.secondary}, #4CAF50)`,
        borderRadius: 20, padding: "18px 20px", marginBottom: 20, color: "#fff", textAlign: "center",
      }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🌿</div>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>
          {isLittle ? "Hello little healer!" : "Welcome, healer!"}
        </div>
        <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.5 }}>
          {isLittle
            ? "Healing means eating good foods and taking care of our body so we feel strong and happy!"
            : "Your body knows how to heal — these activities will help you understand how to support it with Anthony William's teachings."}
        </div>
      </div>

      {/* Activities */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        {[
          { id: "morning", emoji: "🌅", title: "Morning Protocol Game", desc: isLittle ? "What do we drink first? Let's find out!" : "Put the morning healing routine in the right order", color: KIDS_COLORS.primary },
          { id: "foods", emoji: "🥦", title: "Healing Foods Match", desc: isLittle ? "Which foods make us feel great?" : "Learn which foods heal and which ones to avoid", color: KIDS_COLORS.secondary },
          { id: "quiz", emoji: "🧠", title: "Healing Quiz", desc: isLittle ? "Fun questions about staying healthy!" : "Test your Medical Medium knowledge", color: KIDS_COLORS.accent },
        ].map(act => (
          <button
            key={act.id}
            onClick={() => setActivity(act.id)}
            style={{
              padding: "16px 18px", borderRadius: 18,
              border: `2px solid ${act.color}40`,
              background: act.color + "15",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
              touchAction: "manipulation", textAlign: "left",
            }}
          >
            <div style={{ fontSize: 32, flexShrink: 0 }}>{act.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: KIDS_COLORS.text }}>{act.title}</div>
              <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>{act.desc}</div>
            </div>
            <div style={{ fontSize: 20, color: act.color }}>›</div>
          </button>
        ))}
      </div>

      {/* Healing tip for today */}
      <div style={{ background: KIDS_COLORS.purple + "15", border: `1.5px solid ${KIDS_COLORS.purple}40`, borderRadius: 16, padding: "14px 16px", marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: KIDS_COLORS.purple, marginBottom: 6 }}>
          💜 {isLittle ? "Did you know?" : "Healing fact of the day"}
        </div>
        <div style={{ fontSize: 13, color: KIDS_COLORS.text, lineHeight: 1.6 }}>
          {isLittle
            ? "Celery juice is like a superpower drink! It has special things called sodium cluster salts that help fight the bugs that make us feel sick. Anthony William says it's the most healing drink we can have!"
            : "Wild blueberries are Anthony William's #1 brain food. They bind to heavy metals in your brain and help draw them out — kind of like a magnet for the things that don't belong there. That's why they're in the Heavy Metal Detox Smoothie!"}
        </div>
      </div>

      {/* AI Guide for kids */}
      <AskGuide ageGroup={ageGroup} />
    </div>
  );
}
