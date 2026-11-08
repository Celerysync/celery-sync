// The one map of the app. The bottom nav, the voice companion (Hume
// switch_tab + session context), the text companion's [[GO:...]] links and
// old saved tab ids all resolve through here, so the companion always knows
// exactly where things live and can take the user there from any screen.
//
// A destination is "tab" or "tab:section" — e.g. "home:supplements",
// "companion:feelings". Sections are anchors inside a tab (an element with
// id="section-<name>"), or a sub-view the tab itself switches to.

export const TAB_CONTEXT = {
  home:
    "The user is on the Today tab — their own daily rhythm (things they tick off), today's check-in (energy, clarity, mood, symptoms), their supplements for today, water, and their streak.",
  kitchen:
    "The user is on the Kitchen tab — their OWN library of juices, smoothies, meals, snacks and drinks that they typed, pasted or told you. Each recipe has their ingredients, steps, notes and maybe their own photo; they can open cook mode, or add one to their daily rhythm.",
  companion:
    "The user is on the Companion tab — talking or typing with you, or in the 'How I feel' section where they describe how they're feeling and get a warm, descriptive reflection.",
  progress:
    "The user is on the Progress tab — their streaks, trends over time, check-in history, weekly summaries, and the report they can share with their GP.",
  settings:
    "The user is on the Settings tab — reminders, companion voice, profiles, display (dark mode, text size), carers, their plan, preferences, wearables, help, official Anthony William sources, and account (sign out, delete).",
};

export const SECTIONS = {
  home: {
    rhythm: "their daily rhythm list",
    checkin: "today's check-in",
    supplements: "today's supplements (manage & restock links)",
  },
  kitchen: {
    juice: "their juices",
    smoothie: "their smoothies",
    meal: "their meals",
    snack: "their snacks",
    drink: "their drinks",
    other: "their other recipes",
  },
  companion: {
    talk: "the conversation with you",
    feelings: "'How I feel' — describe how they're feeling",
  },
  progress: {
    streaks: "streaks and adherence",
    history: "check-in history and trends",
    reports: "weekly/monthly summaries and the GP report",
    letters: "anniversary letters",
  },
  settings: {
    reminders: "reminders and notifications",
    voice: "companion voice and voice minutes",
    profiles: "profiles (who you're looking after)",
    display: "dark mode and text size",
    carers: "carers and caregiver mode",
    plan: "their plan, billing and cancelling",
    preferences: "language, units, and what the companion remembers",
    devices: "connecting a wearable",
    sources: "official Anthony William sources (books, website, podcast, recipes)",
    help: "tips, the welcome tour, and official sources",
    account: "sign out, Terms and Privacy, delete account",
  },
};

// Where every retired tab id now lives — saved localStorage values, older
// Hume tool configs and the text companion may still say these.
const LEGACY_DESTINATIONS = {
  track: "progress:history",
  journal: "progress:history",
  symptoms: "companion:feelings",
  feelings: "companion:feelings",
  supplements: "home:supplements",
  learn: "settings:sources",
  recipes: "kitchen",
  juices: "kitchen:juice",
  smoothies: "kitchen:smoothie",
  meals: "kitchen:meal",
  knowledge: "settings:sources",
  resources: "settings:sources",
  aw: "settings:sources",
  coach: "companion",
  reports: "progress:reports",
  account: "settings:account",
  carers: "settings:carers",
  billing: "settings:plan",
  subscription: "settings:plan",
  dark: "settings:display",
  wearable: "settings:devices",
  letters: "progress:letters",
  practice: "settings",
  today: "home",
  cleanses: "home",
  body: "home",
  community: "home",
};

// "track" → { tab: "progress", section: "history" }; unknown → null.
export function resolveDestination(raw, section) {
  const [head, inlineSection] = String(raw || "").trim().toLowerCase().split(":");
  const mapped = TAB_CONTEXT[head] ? head : LEGACY_DESTINATIONS[head];
  if (!mapped) return null;
  const [tab, legacySection] = mapped.split(":");
  const wanted = String(section || inlineSection || legacySection || "").trim().toLowerCase();
  return { tab, section: SECTIONS[tab]?.[wanted] ? wanted : null };
}

// One line per destination, for prompts.
export function destinationsForPrompt() {
  return Object.entries(SECTIONS)
    .map(([tab, secs]) => `${tab}: ${Object.entries(secs).map(([k, v]) => `${tab}:${k} (${v})`).join(", ")}`)
    .join("\n");
}

// Text chat (Coach) has no tools that change data, so when the user asks it
// to remove or change something it points them to the voice companion, which
// can (with a spoken yes first — see useVoiceTools), or to the manual path.
export const APP_DELETE_HOWTO =
  "In this text chat you can't change the user's rhythm or supplements yourself. When they ask to remove or change something, warmly tell them the voice companion can do it for them — tap the round 🎙 and just say it (it always asks them to confirm before removing anything, and removed items can be brought back) — or show them where to do it themselves. To remove a supplement: Today tab, Supplements card, tap 'Manage', then the small ✕ next to the supplement. To stop a running program: Today tab, Daily Rhythm card, tap Edit, open Programs, tap 'End program early'. To delete a saved program or day template: same Programs screen, tap the ✕ on it twice to confirm. To remove a daily rhythm item: Today tab, Daily Rhythm card, tap Edit, then the ✕ next to the item. Offer to take them there.";

// The voice companion CAN do all of it, by voice — these are the rules that
// keep that safe. Sent with every voice session.
export const VOICE_ACTION_RULES = [
  "You can run the user's whole app for them by voice — many users are bedridden or too exhausted to tap, so do it FOR them rather than sending them to a screen.",
  "Timing from another step: for 'my celery juice 30 minutes after lemon water' pass after_item ('lemon water') and after_minutes (30); for 'a snack every 90 minutes after celery juice until 6pm' pass after_item, every_minutes (90) and until ('18:00'). Use these with log_rhythm_item or update_rhythm_item. The reminder comes once they tick that step.",
  "Rhythm items: log_rhythm_item adds one (call it once for EACH item the user names; a time = HH:MM 24-hour sets its daily reminder; the same name again updates that item instead of copying it). update_rhythm_item renames it or changes its times (several reminders a day = several times; times: [] removes the reminder), frequency, note or category. remove_rhythm_item removes one. restore_rhythm_item brings back a removed one — use it when they say undo or bring it back.",
  "Templates and programs: save_day_template saves their rhythm as it is now; load_day_template swaps their rhythm for a saved one; list_saved_rhythms tells you what they have; save_program records a multi-day program they read to you from their own book; start_program and end_program run one (end_program with finished: true when they say they've finished it, so it's recorded as finished rather than ended early; then start_program if they're moving on to another). save_program never overwrites: if the name exists, ask whether to update it or save under a new name. After you tick something with mark_activity, use next_up to mention gently what comes next (and program day, if one is running) — no pressure, and never suggest anything that isn't on their list. When starting, ask if anything from their everyday routine should pause during it (it's their choice; most keep the basics) and pass those names as pause. When one has just finished and they want to go again, call start_program with another_round: true.",
  "How they feel: when they tell you their mood, energy, clarity or symptoms, save it for them with log_checkin and tell them it's saved — they don't need to tap the check-in. Energy is 1-10 (exhausted 2, struggling 4, okay 6, good 8, great 10). Ask before saving only if it's unclear they meant today.",
  "Supplements taken with a step ('B12 and zinc with my smoothie'): add_supplement with with_item set to that step, once per supplement; it also links one they already have. After you tick that step, the result says what's usually taken with it: ask, and tick those only if they say yes.",
  "Supplements: add_supplement and remove_supplement (only ever the amount the user tells you from their own bottle or book — never suggest one). When they say they took one, tick it with mark_activity, the same as a rhythm item; get_today_status lists which supplements are ticked today. Never tell them to take one, skip one, or that they're missing one — only record what they say.",
  "Their Kitchen (their own recipes): when they tell you a recipe, sort what they said into name, kind (juice, smoothie, meal, snack, drink, other), ingredients (one per entry, their amounts and words) and steps (in their order) and call save_recipe. Use ONLY what they said — never add, complete, correct or suggest an ingredient, amount or step, and never offer recipes of your own or from anywhere else. save_recipe first answers with a read-back: read it to them, and save (confirmed: true) only on a yes. It never overwrites: if the name exists, ask whether to change that one (update_recipe) or use another name. find_recipe reads one of theirs out, lists them, or finds which of THEIR recipes use an ingredient. link_recipe makes a step in their everyday rhythm open a recipe (📖 on Today); program steps are linked on the screen. delete_recipe needs a yes.",
  "Reports and people: share_report emails their health summary (kind doctor) or wellness log (kind progress) as a PDF to someone they name, e.g. their GP — always spell the email address back to them; you can also just take them to it with switch_tab('progress:reports'). invite_carer invites someone to see their progress. update_preferences renames you or turns the morning check-in / evening reflection on or off.",
  "Only say something is added, changed or removed AFTER the tool returns saved: true — never before, and never for an item you didn't call a tool for. When they list several things, do them one by one, then confirm them together.",
  "Removing, replacing or ending anything: the tool will first answer needs_confirmation — ask the exact question it gives you, and only call again with confirmed: true if they clearly say yes. If you're not sure you heard them right, ask again. Never pass confirmed: true without hearing a yes in this conversation.",
  "Removed items are kept in their history and can always be brought back, so reassure them nothing is lost.",
].join(" ");

// Emergency and crisis numbers for where the user actually is, worked out
// from the device's time zone. Without this the companion guessed and gave
// Australian users the UK's 999 and Samaritans. Most users are in Australia,
// so that's the fallback when the zone is unknown.
const SAFETY_NUMBERS = {
  AU: "The user is in Australia. Emergency: 000. Crisis support, 24/7: Lifeline 13 11 14 (or text 0477 13 11 14). For Aboriginal and Torres Strait Islander people: 13YARN 13 92 76.",
  NZ: "The user is in New Zealand. Emergency: 111. Crisis support, 24/7: call or text 1737.",
  GB: "The user is in the UK. Emergency: 999. Crisis support, 24/7: Samaritans 116 123.",
  IE: "The user is in Ireland. Emergency: 112 or 999. Crisis support, 24/7: Samaritans 116 123.",
  US: "The user is in the United States. Emergency: 911. Crisis support, 24/7: call or text 988.",
  CA: "The user is in Canada. Emergency: 911. Crisis support, 24/7: call or text 988.",
};
function countryForTimeZone(tz) {
  return tz.startsWith("Australia/") ? "AU"
    : tz === "Pacific/Auckland" || tz === "Pacific/Chatham" ? "NZ"
    : tz === "Europe/London" ? "GB"
    : tz === "Europe/Dublin" ? "IE"
    : /^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina)/.test(tz) ? "CA"
    : tz.startsWith("America/") || tz.startsWith("US/") || tz === "Pacific/Honolulu" ? "US"
    : tz ? null : "AU";
}

const deviceTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "";

// The same numbers for screens. Empty when the zone isn't one we have numbers
// for: better to say "your local emergency number" than show the wrong country's.
const CRISIS_CONTACTS = {
  AU: [["Lifeline", "13 11 14"], ["Beyond Blue", "1300 22 4636"], ["Emergency", "000"]],
  NZ: [["Crisis support", "1737"], ["Emergency", "111"]],
  GB: [["Samaritans", "116 123"], ["Emergency", "999"]],
  IE: [["Samaritans", "116 123"], ["Emergency", "112"]],
  US: [["Crisis line", "988"], ["Emergency", "911"]],
  CA: [["Crisis line", "988"], ["Emergency", "911"]],
};

export function crisisContacts(timeZone = deviceTimeZone()) {
  return (CRISIS_CONTACTS[countryForTimeZone(timeZone)] || []).map(([label, num]) => ({
    label, num, href: `tel:${num.replace(/\s/g, "")}`,
  }));
}

export function safetyNumbersLine(timeZone = deviceTimeZone()) {
  const tz = timeZone;
  const country = countryForTimeZone(tz);
  return (country ? SAFETY_NUMBERS[country] : `The user's time zone is ${tz}; if they need help urgently, ask where they are and point them to their local emergency number.`) +
    " Only ever give these numbers — never numbers from another country.";
}
