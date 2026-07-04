import { useState, useEffect, useRef, useCallback } from "react";
import C from "../lib/colors.js";
import { ELEVENLABS_VOICES, srSupported } from "../hooks/useVoice.js";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { useHealingMemory } from "../hooks/useHealingMemory.js";
import { streamClaude, callClaude } from "../lib/api.js";
import { useAnalytics } from "../hooks/useAnalytics.js";
import { useDailyCheckins } from "../hooks/useDailyCheckins.js";
import { useActiveProtocol } from "../hooks/useActiveProtocol.js";
import { useRhythm } from "../hooks/useRhythm.js";
import { useVoiceOrchestrator } from "../context/VoiceContext.jsx";
import VoiceIntakeButton from "./VoiceIntakeButton.jsx";

const CRISIS_KEYWORDS = [
  "suicide", "kill myself", "end my life", "want to die", "not worth living",
  "can't go on", "cant go on", "give up on life", "no reason to live",
  "hurt myself", "self harm", "self-harm", "end it all", "no point anymore",
];

const hasCrisisWords = (text) =>
  CRISIS_KEYWORDS.some((kw) => text.toLowerCase().includes(kw));

// Frozen at module load — ~4000 tokens paid once, then cache hits cost ~10% via prompt caching
const STATIC_SYSTEM = `You are the CelerySync companion — a warm, calm, encouraging guide for adults following Medical Medium (Anthony William) protocols. Many users are chronically ill, fatigued, and overwhelmed. Be gentle, concise, and practical. Keep spoken answers short.

WHAT YOU DO:
- Help users understand and track Anthony William's wellness protocols.
- Paraphrase protocol facts in your own words and ATTRIBUTE them to Anthony William ("Anthony William associates migraines with the liver and heavy metals…").
- For specifics (exact wording, full protocols, precise dosages), POINT the user to the relevant AW book or official source. Do not state yourself as the dosage authority.
- Reference and link Anthony William's OFFICIAL public content (YouTube, podcast, medicalmedium.com) for depth.
- Personalise using the user's own logged data — their conditions, responses, history.
- Use "understand, support, track" framing — not "heal, cure, treat".

WHAT YOU NEVER DO:
- NEVER reproduce Anthony William's copyrighted text — not a passage, not a page. You do not have his books and must never claim to.
- NEVER diagnose, or claim to treat, cure, or heal any condition.
- NEVER give medical interpretations of health data. Describe the user's logged trends; do not explain what they "mean" medically.
- NEVER direct protocol or wellness content at or about children. All profiles are adults (18+) only.
- NEVER advise on prescription medications — their timing, interactions, or whether to take, space, combine, replace, or stop them. If asked, decline gently and tell the user to consult their doctor or pharmacist. You may help schedule reminders the user sets themselves, but never recommend medication timing or interactions.
- NEVER state exact supplement dosages as authoritative facts. Say "Anthony William generally suggests…" and always point to the specific book for full detail.

SAFETY:
- You are not a medical professional and you say so when relevant. Encourage users to work with a licensed practitioner, and to take their tracked data to their doctor.
- If a user describes red-flag or worsening symptoms, or anything that could be a medical emergency or serious decline, gently and clearly encourage them to seek prompt care from a doctor or emergency services. Do not downplay it, and do not position the app or any protocol as a substitute for urgent medical care.
- Support emotional wellbeing warmly, but do not reinforce fear or false certainty.
- Remind users: "This is not medical advice — always work with your doctor or licensed practitioner."

TONE: kind, grounded, unhurried, never alarmist, never over-promising.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DISCLAIMER (make prominent when relevant):
Independent app — not affiliated with, endorsed by, or connected to Anthony William or Medical Medium LLC.
"Medical Medium" is a registered trademark of its owner. This is not medical advice.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
APP NAVIGATION — YOU CONTROL THE ENTIRE APP:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Many users are bedbound or too exhausted to navigate menus. YOU do it for them.
When a user asks about something that has a dedicated section, take them there automatically.
At the END of your response, append ONE navigation command if relevant. Format: [[GO:tab:query]]

AVAILABLE NAVIGATION (7-tab structure):
• [[GO:track:feeling or symptom]] → Opens Track tab → How I Feel section with that pre-filled (e.g. "headache", "bloated and tired")
• [[GO:learn:recipe or ingredient]] → Opens Learn tab → Recipes section and searches
• [[GO:learn]] → Opens Learn tab (for lessons, juices, resources, recipes)
• [[GO:supplements]] → Opens Supplements tab (tracker + shop)
• [[GO:progress]] → Opens Progress tab (healing history, trends)
• [[GO:home]] → Opens Today tab

USE navigation when: user describes how they feel or asks about symptoms → [[GO:track:description]]; asks about a recipe or food → [[GO:learn:name]]; asks about supplements → [[GO:supplements]]; asks about their progress/history → [[GO:progress]].
DO NOT navigate for general questions, cleanse guidance, or organ/body questions — answer in the conversation and point to the relevant AW book for full detail.
In your response text, naturally mention you're taking them there.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HOW TO RESPOND:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Always attribute: "Anthony William teaches…", "Per Cleanse to Heal…", "According to Brain Saver…"
• For supplement amounts, say "Anthony William generally suggests…" and point to the specific book for full protocol detail. Never state yourself as the dosage authority.
• Reference this user's personal journey when you know it — make responses feel personal
• Be warm, encouraging, compassionate — you are a wellness companion, not a search engine
• When relevant, remind them of the morning protocol, adrenal snacks, and what to avoid
• Always recommend which Anthony William book or official source goes deepest on their question
• Encourage users to work alongside their doctor or licensed practitioner
• End every response with genuine encouragement
• VOICE SPEED: Always begin your response with a very short opener sentence of 2–5 words (e.g. "Of course!", "Great question!", "Absolutely!", "Let me help."). This one short sentence must come first — it allows the voice to start speaking almost instantly.
• Many users are very unwell — keep responses clear and actionable, not overwhelming
• MENTAL HEALTH: Anthony William's teachings address anxiety, depression, low mood, brain fog, panic, and overwhelm as physical conditions rooted in viral load and heavy metals. Validate the person's suffering as real and physical, then explain the MM perspective and point to the relevant book. Always encourage professional support alongside.

HEALING REACTIONS:
If a user reports worsening symptoms, Anthony William describes a "healing reaction" (die-off / detox). Acknowledge gently, encourage rest and hydration, and always flag the signs that need a doctor: fever above 39°C, chest pain, severe breathing difficulty, sudden inability to walk. Never downplay genuine red-flag symptoms.

PROTOCOL DETAILS:
For exact amounts, timing, ingredient quantities, supplement doses, foods to eat and avoid, and day-by-day cleanse guidance — always direct the user to the relevant Anthony William book. Do not reproduce specific quantities or ingredient lists yourself. Attribute and point to the source.`;

const GREETINGS = {
  es: (name) => `¡Hola${name ? ", " + name : ""}! 🌿 Soy tu guía de bienestar Medical Medium, basado en las enseñanzas de Anthony William. Puedes hablarme o escribir abajo. ¿Con qué necesitas ayuda hoy?`,
  pt: (name) => `Olá${name ? ", " + name : ""}! 🌿 Sou seu guia de bem-estar Medical Medium, baseado nos ensinamentos de Anthony William. Você pode falar comigo ou escrever abaixo. Como posso ajudá-lo hoje?`,
  fr: (name) => `Bonjour${name ? ", " + name : ""} ! 🌿 Je suis votre guide bien-être Medical Medium, basé sur les enseignements d'Anthony William. Vous pouvez me parler ou écrire ci-dessous. Comment puis-je vous aider aujourd'hui ?`,
  de: (name) => `Hallo${name ? ", " + name : ""}! 🌿 Ich bin Ihr Medical Medium Begleiter, basierend auf den Lehren von Anthony William. Sie können mit mir sprechen oder unten schreiben. Wie kann ich Ihnen heute helfen?`,
  it: (name) => `Ciao${name ? ", " + name : ""}! 🌿 Sono la tua guida benessere Medical Medium, basata sugli insegnamenti di Anthony William. Puoi parlarmi o scrivere qui sotto. Come posso aiutarti oggi?`,
  nl: (name) => `Hallo${name ? ", " + name : ""}! 🌿 Ik ben uw Medical Medium welzijnsgids, gebaseerd op de leerstellingen van Anthony William. U kunt met me praten of hieronder schrijven. Hoe kan ik u vandaag helpen?`,
  pl: (name) => `Cześć${name ? ", " + name : ""}! 🌿 Jestem Twoim przewodnikiem wellness Medical Medium, opartym na naukach Anthony'ego Williama. Możesz do mnie mówić lub pisać poniżej. Jak mogę Ci dzisiaj pomóc?`,
  zh: (name) => `你好${name ? "，" + name : ""}！🌿 我是您的医疗灵媒健康向导，基于安东尼·威廉的公开教导。您可以对我说话或在下方输入。今天我能帮您什么？`,
  ja: (name) => `こんにちは${name ? "、" + name : ""}！🌿 私はアンソニー・ウィリアムの教えに基づくメディカルミディアムウェルネスガイドです。話しかけるか、下に書いてください。今日はどのようにお手伝いできますか？`,
  ko: (name) => `안녕하세요${name ? ", " + name : ""}! 🌿 저는 앤서니 윌리엄의 가르침에 기반한 메디컬 미디엄 웰니스 가이드입니다. 말씀하시거나 아래에 입력하세요. 오늘 어떻게 도와드릴까요?`,
  ar: (name) => `مرحباً${name ? "، " + name : ""}! 🌿 أنا دليلك للعافية بنظام ميديكال ميديوم، مستند إلى تعاليم أنتوني ويليام. يمكنك التحدث معي أو الكتابة أدناه. كيف يمكنني مساعدتك اليوم؟`,
  hi: (name) => `नमस्ते${name ? ", " + name : ""}! 🌿 मैं आपका Medical Medium wellness guide हूं, Anthony William की सार्वजनिक शिक्षाओं पर आधारित। आप मुझसे बात कर सकते हैं या नीचे लिख सकते हैं। आज मैं आपकी कैसे मदद कर सकता हूं?`,
  ru: (name) => `Привет${name ? ", " + name : ""}! 🌿 Я ваш проводник по благополучию Medical Medium, основанный на учениях Энтони Уильяма. Вы можете говорить со мной или писать ниже. Как я могу помочь вам сегодня?`,
  tr: (name) => `Merhaba${name ? ", " + name : ""}! 🌿 Anthony William'ın öğretilerine dayalı Medical Medium sağlık rehberinizim. Benimle konuşabilir veya aşağıya yazabilirsiniz. Bugün size nasıl yardımcı olabilirim?`,
};

// Dynamic section only — user profile, check-in, history, lang, units (~200–600 tokens)
function buildDynamicSystem({ user, healingProfile, priorMessages, milestones, lang, caregiverMode, units, todaysCheckin, celeryStreak, pageContext, activeProtocol }) {
  const hasHistory = priorMessages.length > 0 || healingProfile?.healing_summary || milestones?.length > 0;

  const milestonesSection = milestones?.length > 0
    ? `\nKey moments from their wellness journey (oldest → newest):\n` +
      milestones
        .slice(-30)
        .map((m) => `• [${m.session_date}] ${m.insight}`)
        .join("\n")
    : "";

  const historySection = hasHistory
    ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THIS USER'S JOURNEY — REMEMBER ALL OF THIS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${healingProfile?.healing_summary
  ? `Rolling summary:\n${healingProfile.healing_summary}`
  : ""}
${healingProfile?.hard_times ? `\nHard times of day: ${healingProfile.hard_times}` : ""}
${healingProfile?.current_focus ? `\nCurrently focused on: ${healingProfile.current_focus}` : ""}
${healingProfile?.wins ? `\nRecent wins: ${healingProfile.wins}` : ""}
${healingProfile?.preferences?.prefers?.length ? `\nThey prefer: ${healingProfile.preferences.prefers.join(", ")}` : ""}
${healingProfile?.preferences?.avoids?.length ? `\nThey avoid: ${healingProfile.preferences.avoids.join(", ")}` : ""}
${milestonesSection}
${priorMessages.length > 0
  ? `\nMost recent conversation (last ${Math.min(priorMessages.length, 10)} messages):\n` +
    priorMessages
      .slice(-10)
      .map((m) => `${m.role === "user" ? "User" : "You"}: ${m.content.slice(0, 200)}`)
      .join("\n")
  : ""}
`
    : "";

  const caregiverIntro = caregiverMode ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAREGIVER MODE — YOU ARE SPEAKING WITH THE CARER:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You are NOT speaking with the patient. You are speaking with the adult caring for ${user?.name || "their loved one"}.
Address them as a carer, not a patient. Use "your loved one" or "${user?.name || "them"}" to refer to the person being supported.
Give practical, actionable guidance: what to prepare, what to buy, how to support the protocol, what to expect.
Be warm and acknowledge how hard caregiving is — they need support too.
Explain healing reactions so they don't panic. Tell them what's normal and what needs a doctor.
Remind them that consistency in the small things (snacks, juicing, morning routine) is the most powerful thing they can do.
Always frame this as supporting an adult under their own doctor's care.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : "";

  const langInstruction = lang && lang !== "en" ? `
⚠️ CRITICAL LANGUAGE RULE — FOLLOW THIS ABOVE ALL ELSE:
This user's language is "${lang}". You MUST respond ENTIRELY in that language for every single message.
IMPORTANT: Do NOT translate from English. Think and write DIRECTLY in "${lang}" as a native speaker would.
Use natural, fluent expressions and phrasing that a native "${lang}" speaker would genuinely use — not a word-for-word translation of English sentences.
The only English words allowed: supplement names (e.g. spirulina, dulse), book titles, "Anthony William".
If you respond in English or produce unnatural translated-sounding text, you have failed this user.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

` : "";

  const unitsSection = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MEASUREMENT UNITS — ALWAYS USE THESE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${units === 'metric' ? `This user uses METRIC. Always convert Anthony William's imperial amounts:
• 16 oz celery juice → "500ml" or "half a litre"
• 32 oz → "1 litre" or "about a litre"
• 1 cup → "240ml"
Speak naturally: "half a litre of celery juice" not "473 millilitres". Round to sensible metric amounts.
Supplement dosages: use mg/mcg as published (these are already metric).` : `This user uses IMPERIAL. Use Anthony William's original oz/cup/tablespoon measurements as published.`}`;

  // Build the richest possible today's picture for the AI
  const checkinSection = todaysCheckin ? (() => {
    const clarityLabels = { 1: "severe brain fog", 2: "foggy", 3: "patchy clarity", 4: "mostly clear", 5: "clear-headed" };
    const painLabels = { 1: "none", 2: "mild", 3: "moderate", 4: "significant", 5: "severe" };
    const lines = [
      `• Energy: ${todaysCheckin.energy ?? "not logged"}/10`,
      todaysCheckin.mental_clarity ? `• Mental clarity: ${clarityLabels[todaysCheckin.mental_clarity]} (${todaysCheckin.mental_clarity}/5)` : null,
      `• Celery juice: ${todaysCheckin.celery_oz ? `${todaysCheckin.celery_oz}oz done` : "not done yet"}`,
      todaysCheckin.morning_protocol ? "• Morning protocol: completed ✓" : null,
      todaysCheckin.emotional_state?.length ? `• Emotional state: ${todaysCheckin.emotional_state.join(", ")}` : null,
      todaysCheckin.healing_reaction ? `• HEALING REACTION flagged${todaysCheckin.healing_reaction_notes ? `: "${todaysCheckin.healing_reaction_notes}"` : " — they believe they are detoxing/die-off today"}` : null,
      todaysCheckin.win_today ? `• Today's win: "${todaysCheckin.win_today}"` : null,
      todaysCheckin.symptoms?.length ? `• Symptoms today: ${todaysCheckin.symptoms.join(", ")}` : null,
      todaysCheckin.sleep_hours ? `• Sleep: ${todaysCheckin.sleep_hours}h${todaysCheckin.sleep_quality ? ` (quality ${todaysCheckin.sleep_quality}/5)` : ""}` : null,
      todaysCheckin.water_oz ? `• Water intake: ~${todaysCheckin.water_oz}oz` : null,
      todaysCheckin.pain_level ? `• Pain level: ${painLabels[todaysCheckin.pain_level] ?? todaysCheckin.pain_level}/5` : null,
      todaysCheckin.bowel_movements != null ? `• Bowel movements: ${todaysCheckin.bowel_movements}` : null,
      (todaysCheckin.rhythm_completed != null && todaysCheckin.rhythm_total) ?
        `• Daily rhythm: ${todaysCheckin.rhythm_completed}/${todaysCheckin.rhythm_total} items completed (${Math.round(todaysCheckin.rhythm_completed / todaysCheckin.rhythm_total * 100)}%)` : null,
      todaysCheckin.active_protocol_day ? `• Active protocol: day ${todaysCheckin.active_protocol_day}` : null,
      todaysCheckin.notes ? `• Their note: "${todaysCheckin.notes}"` : null,
    ].filter(Boolean);

    return `
TODAY'S CHECK-IN — USE THIS TO PERSONALISE EVERY RESPONSE:
${lines.join("\n")}
${todaysCheckin.healing_reaction ? "\nIMPORTANT: They have flagged a healing reaction. Respond with extra warmth. Validate that worsening symptoms during a protocol can be a positive sign. Do not alarm them. Remind them of the signs that would need a doctor." : ""}
${todaysCheckin.mental_clarity <= 2 ? "\nIMPORTANT: Severe brain fog today. Keep your response SHORT, clear, and actionable. No long lists. One thing at a time." : ""}
${(todaysCheckin.emotional_state || []).some(e => ["Discouraged","Tearful","Overwhelmed","Numb","Lonely"].includes(e)) ? "\nIMPORTANT: They are struggling emotionally today. Lead with warmth and acknowledgment before anything practical." : ""}`;
  })() : "No check-in logged yet today.";

  const day1Section = activeProtocol?.day === 1 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TODAY IS DAY 1 OF ${activeProtocol.name.toUpperCase()}:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
They just started this protocol today. Lead your opening message with a genuine, warm pep talk —
acknowledge the courage it takes to start, set realistic expectations (the first few days can bring
healing reactions like fatigue, headaches, or emotional waves — reassure them this is normal, not a
setback), and remind them the most powerful thing they can do is stay consistent with the basics
(celery juice, hydration, rest). Keep it brief and encouraging, not a lecture.
Do not give exact day-by-day protocol steps yourself — point them to the relevant Anthony William book
for full detail.
` : "";

  const pageContextSection = pageContext ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT THE USER WAS JUST LOOKING AT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Page: ${pageContext.label}
${pageContext.detail ? `Context: ${pageContext.detail}` : ""}
Reference this naturally when relevant — e.g. "I see you were just looking at ${pageContext.label}…"
` : "";

  return `${langInstruction}${caregiverIntro}${day1Section}${pageContextSection}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THIS USER'S PROFILE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${user?.name || "friend"}
Symptoms: ${user?.symptoms?.join(", ") || "general wellness"}
Goal: ${user?.goal || "wellness and clarity"}
Celery juice streak: ${celeryStreak > 0 ? `${celeryStreak} days in a row` : "not yet started today"}
${checkinSection}
${historySection}
${unitsSection}
`;
}

// Voice session timeout — after this much silence the hands-free loop closes politely
const SESSION_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

function parseNavCommand(text) {
  const match = text.match(/\[\[GO:([a-z]+)(?::([^\]]*))?\]\]/i);
  if (!match) return { clean: text, nav: null };
  const clean = text.replace(/\s*\[\[GO:[^\]]*\]\]/gi, "").trim();
  return { clean, nav: { tab: match[1].toLowerCase(), query: match[2]?.trim() || null } };
}

export default function Coach({ authUser, user, profileId, onNavigate, caregiverMode, units = 'metric', pageContext }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [crisisDetected, setCrisisDetected] = useState(false);
  const [voices, setVoices] = useState([]);
  const [showMemory, setShowMemory] = useState(false);
  const [followUps, setFollowUps] = useState([]);
  const [tappedMsg, setTappedMsg] = useState(null);
  const [copied, setCopied] = useState(false);
  const [handsFree, setHandsFree] = useLocalStorage("cs_handsFree", false);
  const { voiceName: selectedVoiceName, setVoiceName: setSelectedVoiceName,
          listening, transcript, speaking, speak, stopSpeaking, startListening, stopListening,
          queueSentence, endQueue, resetQueue } = useVoiceOrchestrator();
  const [lang] = useLocalStorage("cs_lang", "en");
  const { healingProfile, priorMessages, milestones, memoryLoading, loadMemory, saveExchange, clearMemory } =
    useHealingMemory(authUser, profileId);
  const { todaysCheckin, celeryStreak, loadCheckins, saveCheckin } = useDailyCheckins(authUser, profileId);
  const { activeProtocol, loadActiveProtocol } = useActiveProtocol(authUser, profileId);
  const { addItem: addRhythmItem } = useRhythm(authUser, profileId);
  const endRef = useRef(null);
  const systemRef = useRef({ staticSystem: STATIC_SYSTEM, dynamicSystem: '' });
  const voiceModeRef = useRef(handsFree);
  const audioUnlockedRef = useRef(false);
  const pendingGreetingRef = useRef(null);
  const sessionTimerRef = useRef(null);
  const { track } = useAnalytics(authUser);

  // Keep voiceModeRef in sync with handsFree preference
  useEffect(() => { voiceModeRef.current = handsFree; }, [handsFree]);

  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Reload memory and restart conversation when profile switches
  useEffect(() => {
    if (!profileId) return;
    setMessages([]);
    loadMemory();
    loadCheckins();
    loadActiveProtocol();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  // Once memory is loaded, build system prompt and start the conversation
  useEffect(() => {
    if (memoryLoading) return;
    systemRef.current = {
      staticSystem: STATIC_SYSTEM,
      dynamicSystem: buildDynamicSystem({ user, healingProfile, priorMessages, milestones, lang, caregiverMode, units, todaysCheckin, celeryStreak, pageContext, activeProtocol }),
    };
    const hasHistory = priorMessages.length > 0 || healingProfile?.healing_summary || milestones?.length > 0;
    const translatedGreeting = lang && lang !== "en" && GREETINGS[lang]
      ? GREETINGS[lang](user?.name || "")
      : null;

    // Evolving greeting based on user's current state
    const streakNote = celeryStreak >= 7 ? ` Your ${celeryStreak}-day celery streak is extraordinary.` : celeryStreak >= 3 ? ` ${celeryStreak} days of celery juice in a row — keep going!` : "";
    const energyNote = todaysCheckin?.energy ? ` I can see your energy is ${todaysCheckin.energy}/10 today — ${todaysCheckin.energy <= 4 ? "I'll keep things gentle and focused." : todaysCheckin.energy >= 8 ? "Wonderful to see you feeling good!" : "let me know how I can help."}` : "";

    const day1Greeting = (!caregiverMode && !translatedGreeting && activeProtocol?.day === 1)
      ? `Today's the day${user?.name ? ", " + user.name : ""}! 🌿 You just started ${activeProtocol.name} — that takes real courage, and I'm proud of you for beginning. The first few days can bring healing reactions like tiredness, headaches, or emotional waves — that's normal, not a setback. The most powerful thing you can do right now is keep it simple: celery juice, hydration, rest. I'm right here with you every step. How are you feeling so far today?`
      : null;

    const greeting = day1Greeting
      ? day1Greeting
      : translatedGreeting
      ? translatedGreeting
      : caregiverMode
      ? `Hello! 💜 I'm here to support you as you care for ${user?.name || "your loved one"}. Caregiving is one of the most loving things a person can do. I can guide you on what to prepare, what to expect, how to support the protocol, and how to take care of yourself too. What do you need help with today?`
      : hasHistory
      ? `Welcome back${user?.name ? ", " + user.name : ""}! 🌿${streakNote}${energyNote} ${
          healingProfile?.healing_summary
            ? "I've been keeping your healing notes safe and I'm ready to pick up where we left off."
            : `We've talked ${Math.ceil(priorMessages.length / 2)} times before — I remember your journey.`
        } What's on your mind today?`
      : `Hello${user?.name ? ", " + user.name : ""}! 🌿 I'm your CelerySync companion — a warm guide for Anthony William's Medical Medium protocols. I can speak to you too — press the microphone button anytime. I'm not a medical professional, and I always point you to the official source for full detail. I'm here for you. What would you like to explore today?`;

    setMessages([{ role: "assistant", content: greeting }]);
    // Autoplay is blocked until a user gesture — queue the greeting and speak it
    // the moment the user first taps/clicks anywhere in the Coach panel.
    pendingGreetingRef.current = greeting;
    setTimeout(() => {
      if (audioUnlockedRef.current) {
        speak(greeting);
        pendingGreetingRef.current = null;
      }
    }, 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoryLoading, lang]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Abort any in-flight chat request on unmount/tab switch — previously a
  // stale streamed response could keep arriving and call setMessages after
  // the user had already navigated away.
  const chatAbortRef = useRef(null);
  useEffect(() => {
    return () => chatAbortRef.current?.abort();
  }, []);

  const send = useCallback(
    async (text) => {
      if (!text.trim() || loading) return;
      if (hasCrisisWords(text)) setCrisisDetected(true);
      track("ai_query", { chars: text.length });
      setFollowUps([]);
      setTappedMsg(null);
      const userMsg = { role: "user", content: text };
      const newMsgs = [...messages, userMsg];
      setMessages(newMsgs);
      setInput("");
      setLoading(true);
      stopListening();              // stop mic immediately — prevent AI hearing itself
      clearTimeout(sessionTimerRef.current);
      try {
        let firstToken = true;
        let streamBuffer = "";
        let sentenceBuffer = "";
        const isElVoice = selectedVoiceName.startsWith("el:");
        resetQueue();
        chatAbortRef.current?.abort();
        chatAbortRef.current = new AbortController();
        const reply = await streamClaude({
          staticSystem: systemRef.current.staticSystem,
          dynamicSystem: systemRef.current.dynamicSystem,
          messages: newMsgs.slice(-8),
          maxTokens: voiceModeRef.current ? 350 : 700,
          signal: chatAbortRef.current.signal,
          onDelta: (delta, full) => {
            streamBuffer = full;
            const { clean } = parseNavCommand(full);
            if (firstToken) {
              firstToken = false;
              setLoading(false);
              setMessages((m) => [...m, { role: "assistant", content: clean }]);
            } else {
              setMessages((m) => {
                const last = m[m.length - 1];
                if (!last || last.role !== "assistant") return m;
                return [...m.slice(0, -1), { role: "assistant", content: clean }];
              });
            }
            // Sentence-streaming TTS — fire ElevenLabs as each sentence completes
            if (isElVoice) {
              sentenceBuffer += delta;
              const boundaryIdx = sentenceBuffer.search(/[.!?]["']?[ \n]/);
              if (boundaryIdx > 1) {
                // Avoid splitting on abbreviations: Dr. Mr. A.W. single letters etc.
                const wordBefore = (sentenceBuffer.slice(0, boundaryIdx).split(/\s+/).pop() ?? "");
                const isAbbrev = wordBefore.length <= 2 ||
                  /^(Dr|Mr|Mrs|Ms|Prof|Inc|Ltd|vs|etc|eg|ie|ch|Vol|Fig|No|St|approx|AW|MM|AM|PM)$/i.test(wordBefore);
                if (!isAbbrev) {
                  const sentence = sentenceBuffer.slice(0, boundaryIdx + 1)
                    .replace(/\[\[GO:[^\]]*\]\]/gi, "")
                    .replace(/[*_`#•]/g, "")
                    .trim();
                  sentenceBuffer = sentenceBuffer.slice(boundaryIdx + 2);
                  if (sentence) queueSentence(sentence);
                }
              }
            }
          },
          onDone: (full) => {
            const { clean, nav } = parseNavCommand(full);
            setMessages((m) => {
              const last = m[m.length - 1];
              if (!last || last.role !== "assistant") return m;
              return [...m.slice(0, -1), { role: "assistant", content: clean }];
            });
            const autoListen = voiceModeRef.current ? () => {
              // Session timeout — if user goes silent for SESSION_TIMEOUT_MS, close politely
              sessionTimerRef.current = setTimeout(() => {
                stopListening();
                setHandsFree(false);
                setMessages((m) => [...m, {
                  role: 'assistant',
                  content: "I'm here when you need me — tap 🎙 to continue, or just type below. Take good care 💚",
                }]);
              }, SESSION_TIMEOUT_MS);
              startListening((t) => {
                clearTimeout(sessionTimerRef.current);
                const lower = t.trim().toLowerCase();
                if (lower === "stop" || lower === "stop." || lower === "stop talking" || lower === "be quiet") {
                  stopSpeaking();
                } else {
                  send(t);
                }
              }, { silenceMs: 1200 });
            } : undefined;
            if (isElVoice) {
              // Flush any remaining text after the last sentence boundary
              const rem = sentenceBuffer
                .replace(/\[\[GO:[^\]]*\]\]/gi, "")
                .replace(/[*_`#•]/g, "")
                .trim();
              if (rem) queueSentence(rem);
              endQueue(autoListen);
            } else {
              speak(clean, autoListen);
            }
            saveExchange(text, clean);
            systemRef.current = {
              staticSystem: STATIC_SYSTEM,
              dynamicSystem: buildDynamicSystem({
                user, healingProfile, milestones, lang, caregiverMode, units, todaysCheckin, celeryStreak, pageContext,
                priorMessages: [...priorMessages, userMsg, { role: "assistant", content: clean }],
              }),
            };
            if (nav && onNavigate) {
              setTimeout(() => onNavigate(nav.tab, nav.query), 2500);
            }
            // Generate contextual follow-up questions asynchronously
            setFollowUps([]);
            callClaude({
              tier: "quick", maxTokens: 80,
              messages: [{ role: "user", content: `Based on this Medical Medium healing advice, suggest exactly 2 short follow-up questions the user might want to ask. Output only the 2 questions separated by | with no numbering, bullets, or extra text. Each question max 7 words.\n\nAdvice: ${clean.slice(0, 350)}` }],
            }).then((r) => {
              if (!r) return;
              const qs = r.split("|").map(q => q.replace(/^\d+[\.\)]\s*/, "").trim()).filter(q => q.length > 4 && q.length < 80).slice(0, 2);
              if (qs.length) setFollowUps(qs);
            }).catch(() => {});
          },
        });
        if (!reply) setLoading(false);
      } catch (err) {
        if (err.name === "AbortError") return; // navigated away — not a real failure, nothing to show
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: `Connection error: ${err.message}. Please check your API key in .env and try again.`,
          },
        ]);
        setLoading(false);
      }
    },
    [messages, loading, speak, saveExchange, user, healingProfile, priorMessages]
  );

  // Voice intake callback — merges voice-captured check-in fields into Supabase.
  // Only real daily_checkins columns get spread into saveCheckin — restock/
  // scheduleItem are handled separately, each with their own destination.
  const handleVoiceWrite = useCallback(async (fields) => {
    const { energy, mood, symptoms, celery_oz, morning_protocol, notes } = fields;
    const checkinFields = { energy, mood, symptoms, celery_oz, morning_protocol, notes };
    const hasCheckinData = Object.values(checkinFields).some((v) => v != null);
    if (hasCheckinData) await saveCheckin({ ...todaysCheckin, ...checkinFields });

    for (const item of fields.scheduleItems || []) {
      if (!item?.name) continue;
      await addRhythmItem({
        name: item.name,
        category: item.category || "other",
        fixedTime: item.fixedTime || null,
        note: item.note || "",
        frequency: item.frequency || "daily",
      });
    }
  }, [saveCheckin, todaysCheckin, addRhythmItem]);

  const quickQuestions = [
    user?.symptoms?.[0]
      ? `What causes my ${user.symptoms[0]}?`
      : "What causes my fatigue?",
    "Walk me through the 3:6:9 cleanse",
    "Heavy metal detox smoothie recipe?",
    "What does AW say about nervous system support?",
    "Why is celery juice so important?",
    "What should I eat today?",
  ];

  const englishFirst = [...voices].sort((a, b) => {
    const aEn = a.lang.startsWith("en") ? 0 : 1;
    const bEn = b.lang.startsWith("en") ? 0 : 1;
    return aEn - bEn || a.name.localeCompare(b.name);
  });

  // Unlock audio context on first user gesture — browsers block autoplay before interaction
  const unlockAudio = () => {
    if (audioUnlockedRef.current) return;
    audioUnlockedRef.current = true;
    if (pendingGreetingRef.current) {
      speak(pendingGreetingRef.current);
      pendingGreetingRef.current = null;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }} onClick={unlockAudio}>
      {/* Header */}
      <div>
        <h2 style={{ margin: 0, fontFamily: "Georgia,serif", fontSize: 20, color: C.charcoal }}>
          🎙 Your Healing Guide
        </h2>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
          Warm MM companion · Paraphrased & attributed teachings · Remembers your journey
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
          Not medical advice — always work with your doctor or licensed practitioner
        </div>
      </div>

      {/* Healing memory card */}
      {healingProfile?.healing_summary && (
        <div
          style={{
            background: "linear-gradient(135deg, #f0f7f0, #e8f4e8)",
            border: `1px solid ${C.sage}40`,
            borderRadius: 14,
            padding: "12px 16px",
            cursor: "pointer",
          }}
          onClick={() => setShowMemory((v) => !v)}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontFamily: "Georgia,serif", fontSize: 13, fontWeight: 700, color: C.sageDark }}>
              🧠 I remember your healing journey
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>{showMemory ? "hide ▲" : "show ▼"}</div>
          </div>
          {showMemory && (
            <div style={{ marginTop: 10, fontSize: 12.5, color: C.mid, lineHeight: 1.7 }}>
              {healingProfile.healing_summary}
              <div style={{ marginTop: 10 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Clear your healing memory? This cannot be undone.")) clearMemory();
                  }}
                  style={{
                    background: "none",
                    border: `1px solid ${C.border}`,
                    borderRadius: 20,
                    padding: "3px 10px",
                    fontSize: 11,
                    color: C.muted,
                    cursor: "pointer",
                  }}
                >
                  Clear memory
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Voice selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: C.mist,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: "9px 14px",
        }}
      >
        <span style={{ fontSize: 15 }}>🔊</span>
        <label
          htmlFor="voice-select"
          style={{ fontFamily: "Georgia,serif", fontSize: 12, color: C.mid, flexShrink: 0 }}
        >
          Voice
        </label>
        <select
          id="voice-select"
          value={selectedVoiceName}
          onChange={(e) => setSelectedVoiceName(e.target.value)}
          style={{
            flex: 1,
            fontFamily: "Georgia,serif",
            fontSize: 12.5,
            color: C.charcoal,
            background: C.white,
            border: `1.5px solid ${C.border}`,
            borderRadius: 8,
            padding: "5px 8px",
            cursor: "pointer",
            outline: "none",
            touchAction: "manipulation",
          }}
        >
          {["Warm & Healing", "Professional", "Male Voices", "Australian / NZ"].map(group => {
            const groupVoices = ELEVENLABS_VOICES.filter(v => v.group === group);
            return (
              <optgroup key={group} label={`✨ ${group}`}>
                {groupVoices.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </optgroup>
            );
          })}
          <optgroup label="Browser voices (no internet needed)">
            <option value="">Default (Samantha / Karen)</option>
            {englishFirst.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Hands-free status banner */}
      {handsFree && srSupported && (
        <div style={{
          background: `${C.sage}18`,
          border: `1.5px solid ${C.sage}50`,
          borderRadius: 12, padding: "10px 14px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.sage, animation: "pulse 1.5s infinite", flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: C.sageDark, fontFamily: "Georgia,serif" }}>
              Hands-free mode — AI will listen after each response
            </div>
          </div>
          <button
            onClick={() => setHandsFree(false)}
            style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Crisis banner */}
      {crisisDetected && (
        <div
          style={{
            background: "#FEF2F2",
            border: "2px solid #EF444460",
            borderRadius: 16,
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              fontFamily: "Georgia,serif",
              fontWeight: 700,
              fontSize: 15,
              color: "#DC2626",
              marginBottom: 8,
            }}
          >
            💛 You're not alone — please reach out
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { label: "Lifeline Australia", num: "13 11 14", href: "tel:131114" },
              { label: "Beyond Blue", num: "1300 22 4636", href: "tel:1300224636" },
              { label: "Emergency services", num: "000", href: "tel:000" },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  textDecoration: "none",
                  padding: "7px 0",
                  borderBottom: "1px solid #FCA5A520",
                }}
              >
                <span style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{s.label}</span>
                <span style={{ fontSize: 14, color: "#DC2626", fontWeight: 700 }}>{s.num}</span>
              </a>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 10, lineHeight: 1.5 }}>
            Healing sometimes means asking for human help first. There is no shame in that.
          </div>
          <button
            onClick={() => setCrisisDetected(false)}
            style={{
              marginTop: 10,
              background: "none",
              border: "none",
              color: "#9CA3AF",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Chat window */}
      <div
        style={{
          minHeight: 200,
          maxHeight: "clamp(200px, 38vh, 420px)",
          overflowY: "auto",
          background: C.mist,
          borderRadius: 18,
          border: `1px solid ${C.border}`,
          padding: 14,
        }}
      >
        {memoryLoading ? (
          <div style={{ textAlign: "center", color: C.muted, fontSize: 13, marginTop: 40 }}>
            🧠 Loading your healing memory…
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: m.role === "user" ? "row-reverse" : "row",
                  gap: 8,
                  alignItems: "flex-start",
                }}
              >
                <div style={{ fontSize: 20, flexShrink: 0 }}>{m.role === "user" ? "🧑" : "🌿"}</div>
                <div
                  onClick={() => m.role === "assistant" && setTappedMsg(tappedMsg === i ? null : i)}
                  style={{
                    background: m.role === "user" ? C.sage : C.white,
                    color: m.role === "user" ? C.white : C.charcoal,
                    borderRadius: 14,
                    padding: "10px 14px",
                    maxWidth: "84%",
                    fontSize: 13.5,
                    lineHeight: 1.75,
                    whiteSpace: "pre-wrap",
                    boxShadow: "0 1px 6px #0000000d",
                    cursor: m.role === "assistant" ? "pointer" : "default",
                    border: tappedMsg === i ? `1.5px solid ${C.sage}60` : "1.5px solid transparent",
                    transition: "border 0.15s",
                  }}
                >
                  {m.content}
                </div>
              </div>
              {/* Message action bar — tap to copy or re-read */}
              {tappedMsg === i && m.role === "assistant" && (
                <div style={{ display: "flex", gap: 6, marginTop: 6, marginLeft: 32 }}>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(m.content).catch(() => {});
                      setCopied(true);
                      setTimeout(() => { setCopied(false); setTappedMsg(null); }, 1500);
                    }}
                    style={{
                      background: copied ? C.sage : C.white, color: copied ? C.white : C.mid,
                      border: `1px solid ${C.border}`, borderRadius: 20,
                      padding: "5px 12px", fontSize: 11, cursor: "pointer",
                      fontFamily: "Georgia,serif", transition: "all 0.2s",
                    }}
                  >
                    {copied ? "✓ Copied" : "📋 Copy"}
                  </button>
                  <button
                    onClick={() => { speak(m.content); setTappedMsg(null); }}
                    style={{
                      background: C.white, color: C.mid,
                      border: `1px solid ${C.border}`, borderRadius: 20,
                      padding: "5px 12px", fontSize: 11, cursor: "pointer",
                      fontFamily: "Georgia,serif",
                    }}
                  >
                    🔊 Re-read
                  </button>
                  <button
                    onClick={() => setTappedMsg(null)}
                    style={{
                      background: "none", color: C.muted, border: "none",
                      fontSize: 14, cursor: "pointer", padding: "5px 6px",
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          ))
        )}
        {loading && (
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ fontSize: 20 }}>🌿</div>
            <div
              style={{
                background: C.white,
                borderRadius: 14,
                padding: "10px 14px",
                fontSize: 13,
                color: C.muted,
                fontStyle: "italic",
              }}
            >
              thinking for you…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Listening indicator */}
      {listening && (
        <div
          style={{
            background: C.sageLight,
            border: `1px solid ${C.sage}`,
            borderRadius: 12,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#E74C3C",
              animation: "pulse 1s infinite",
              flexShrink: 0,
            }}
          />
          <div style={{ fontSize: 13, color: C.sageDark, fontStyle: "italic" }}>
            {transcript || "I'm listening… speak now"}
          </div>
        </div>
      )}

      {/* Speaking indicator — tap anywhere on it to stop */}
      {speaking && (
        <button
          onClick={stopSpeaking}
          style={{
            background: C.goldLight,
            border: `1.5px solid ${C.gold}80`,
            borderRadius: 12,
            padding: "12px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.gold, animation: "pulse 1s infinite", flexShrink: 0 }} />
            <div style={{ fontSize: 13, color: C.charcoal, fontFamily: "Georgia,serif" }}>🔊 Tap to stop speaking</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, border: `1px solid ${C.gold}`, borderRadius: 20, padding: "3px 10px" }}>
            Stop ✕
          </div>
        </button>
      )}

      {/* Input row */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {srSupported && (
          <button
            onClick={() => setHandsFree(v => !v)}
            title={handsFree ? "Hands-free ON — tap to turn off" : "Turn on hands-free mode"}
            style={{
              flexShrink: 0, height: 44, borderRadius: 22,
              padding: "0 12px",
              border: `1.5px solid ${handsFree ? C.sage : C.border}`,
              background: handsFree ? C.sage : C.white,
              color: handsFree ? C.white : C.muted,
              fontSize: 11, fontFamily: "Georgia,serif", fontWeight: 700,
              cursor: "pointer", whiteSpace: "nowrap",
              boxShadow: handsFree ? `0 0 0 3px ${C.sage}30` : "none",
              transition: "all 0.2s",
            }}
          >
            {handsFree ? "🎙 Hands-free" : "🎙"}
          </button>
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder={handsFree ? "Hands-free — just speak…" : "Type or press 🎙 to speak…"}
          style={{
            flex: 1,
            padding: "11px 16px",
            borderRadius: 40,
            border: `1.5px solid ${C.border}`,
            fontFamily: "Georgia,serif",
            fontSize: 14,
            outline: "none",
            background: C.white,
          }}
        />
        {srSupported && (
          <button
            onClick={() => {
              if (listening) {
                voiceModeRef.current = false;
                stopListening();
              } else {
                voiceModeRef.current = true;
                startListening((t) => {
                  const lower = t.trim().toLowerCase();
                  if (lower === "stop" || lower === "stop." || lower === "stop talking" || lower === "be quiet") {
                    stopSpeaking();
                  } else {
                    send(t);
                  }
                });
              }
            }}
            title="Voice input"
            style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              border: "none",
              cursor: "pointer",
              background: listening ? "#E74C3C" : C.sage,
              color: C.white,
              fontSize: 22,
              flexShrink: 0,
              boxShadow: "0 2px 12px #0000001a",
            }}
          >
            {listening ? "⏹" : "🎙"}
          </button>
        )}
        <button
          onClick={() => send(input)}
          style={{
            width: 50,
            height: 50,
            borderRadius: "50%",
            border: "none",
            cursor: "pointer",
            background: C.sageDark,
            color: C.white,
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          ➤
        </button>
      </div>

      {/* Voice intake — log how you feel, what you took, etc. by speaking */}
      {authUser && (
        <VoiceIntakeButton
          inline
          onWrite={handleVoiceWrite}
          onQuestion={(text) => send(text)}
        />
      )}

      {/* Follow-up suggestions — appear after each AI response */}
      {followUps.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          <div style={{ width: "100%", fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 }}>
            Ask next
          </div>
          {followUps.map((q) => (
            <div
              key={q}
              onClick={() => { send(q); setFollowUps([]); }}
              style={{
                padding: "7px 14px",
                borderRadius: 30,
                border: `1.5px solid ${C.sage}60`,
                fontSize: 12,
                cursor: "pointer",
                color: C.sageDark,
                fontFamily: "Georgia,serif",
                background: `${C.sageLight}80`,
              }}
            >
              {q}
            </div>
          ))}
        </div>
      )}

      {/* Free AW content link — shown after each exchange */}
      {messages.length > 1 && !loading && (() => {
        const lastUser = [...messages].reverse().find(m => m.role === "user");
        if (!lastUser) return null;
        const query = encodeURIComponent(lastUser.content.slice(0, 60));
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 2px" }}>
            <span style={{ fontSize: 10, color: C.muted, flexShrink: 0 }}>Go deeper:</span>
            <a
              href={`https://www.youtube.com/results?search_query=medical+medium+${query}`}
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: C.sage, textDecoration: "none", fontFamily: "Georgia,serif" }}
            >
              ▶ AW on YouTube
            </a>
            <span style={{ color: C.border }}>·</span>
            <a
              href="https://medicalmedium.com/podcast"
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: C.sage, textDecoration: "none", fontFamily: "Georgia,serif" }}
            >
              🎙 MM Podcast
            </a>
          </div>
        );
      })()}

      {/* Quick questions — shown when no follow-ups yet */}
      {followUps.length === 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {quickQuestions.map((q) => (
            <div
              key={q}
              onClick={() => send(q)}
              style={{
                padding: "7px 13px",
                borderRadius: 30,
                border: `1.5px solid ${C.border}`,
                fontSize: 12,
                cursor: "pointer",
                color: C.mid,
                fontFamily: "Georgia,serif",
                background: C.mist,
              }}
            >
              {q}
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}
