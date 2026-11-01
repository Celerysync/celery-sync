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
  companion:
    "The user is on the Companion tab — talking or typing with you, or in the 'How I feel' section where they describe how they're feeling and get a warm, descriptive reflection.",
  progress:
    "The user is on the Progress tab — their streaks, trends over time, check-in history, weekly summaries, and the report they can share with their GP.",
  settings:
    "The user is on the Settings tab — companion voice, reminders, profiles, carers, their plan, and official Anthony William sources (books, website, podcast, recipes).",
};

export const SECTIONS = {
  home: {
    rhythm: "their daily rhythm list",
    checkin: "today's check-in",
    supplements: "today's supplements (manage & restock links)",
  },
  companion: {
    talk: "the conversation with you",
    feelings: "'How I feel' — describe how they're feeling",
  },
  progress: {
    streaks: "streaks and adherence",
    history: "check-in history and trends",
    reports: "weekly/monthly summaries and the GP report",
  },
  settings: {
    voice: "companion voice and voice minutes",
    reminders: "reminders and notifications",
    profiles: "profiles",
    carers: "carers",
    sources: "official Anthony William sources (books, website, podcast, recipes)",
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
  recipes: "settings:sources",
  juices: "settings:sources",
  knowledge: "settings:sources",
  resources: "settings:sources",
  aw: "settings:sources",
  coach: "companion",
  reports: "progress:reports",
  account: "settings",
  carers: "settings:carers",
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
  "Rhythm items: log_rhythm_item adds one (call it once for EACH item the user names; a time = HH:MM 24-hour sets its daily reminder; the same name again updates that item instead of copying it). update_rhythm_item renames it or changes its times (several reminders a day = several times; times: [] removes the reminder), frequency, note or category. remove_rhythm_item removes one. restore_rhythm_item brings back a removed one — use it when they say undo or bring it back.",
  "Templates and programs: save_day_template saves their rhythm as it is now; load_day_template swaps their rhythm for a saved one; list_saved_rhythms tells you what they have; save_program records a multi-day program they read to you from their own book; start_program and end_program run one.",
  "How they feel: when they tell you their mood, energy, clarity or symptoms, save it for them with log_checkin and tell them it's saved — they don't need to tap the check-in. Energy is 1-10 (exhausted 2, struggling 4, okay 6, good 8, great 10). Ask before saving only if it's unclear they meant today.",
  "Supplements: add_supplement and remove_supplement (only ever the amount the user tells you from their own bottle or book — never suggest one).",
  "Reports and people: share_report emails their health summary (kind doctor) or wellness log (kind progress) as a PDF to someone they name, e.g. their GP — always spell the email address back to them; you can also just take them to it with switch_tab('progress:reports'). invite_carer invites someone to see their progress. update_preferences renames you or turns the morning check-in / evening reflection on or off.",
  "Only say something is added, changed or removed AFTER the tool returns saved: true — never before, and never for an item you didn't call a tool for. When they list several things, do them one by one, then confirm them together.",
  "Removing, replacing or ending anything: the tool will first answer needs_confirmation — ask the exact question it gives you, and only call again with confirmed: true if they clearly say yes. If you're not sure you heard them right, ask again. Never pass confirmed: true without hearing a yes in this conversation.",
  "Removed items are kept in their history and can always be brought back, so reassure them nothing is lost.",
].join(" ");
