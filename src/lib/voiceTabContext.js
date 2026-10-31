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

// The assistant has no delete tools ON PURPOSE — a misheard sentence must
// never be able to wipe the user's data. Instead of dead-ending ("I can't do
// that"), it should know the manual paths and guide the user there. Injected
// into the Hume EVI session context and the Coach text prompt alike.
export const APP_DELETE_HOWTO =
  "You can add and tick things off, but you can NEVER delete or clear the user's data — you have no delete tools, deliberately, so nothing can be wiped by a misheard sentence. When the user asks to remove or clear something, don't just decline: warmly explain exactly where to do it themselves. To remove a supplement: Today tab, Supplements card, tap 'Manage', then the small ✕ next to the supplement. To stop a running program: Today tab, Daily Rhythm card, tap Edit, open Programs, tap 'End program early'. To delete a saved program or day template: same Programs screen, tap the ✕ on it twice to confirm. To remove a daily rhythm item: Today tab, Daily Rhythm card, tap Edit, then the ✕ next to the item. Offer to take them there.";
