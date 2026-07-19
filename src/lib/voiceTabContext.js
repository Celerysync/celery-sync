// Shared "what is this tab" copy for the voice assistant's system context —
// used by the Hume EVI session (injected as context on connect / tab change)
// and previously duplicated ad hoc inside GlobalVoice.jsx's Q&A prompt.
export const TAB_CONTEXT = {
  home:        "The user is on the Today/Home tab — daily protocol, morning routine, supplement checklist, healing streak.",
  companion:   "The user is on the Companion tab — their AI healing companion for conversation, protocol guidance, and questions.",
  track:       "The user is on the Track tab — logging daily check-in (energy, mood, celery juice, symptoms) or exploring how they feel with support from Anthony William's teachings.",
  progress:    "The user is on the Progress tab — reviewing their healing progress, energy trends, celery juice streaks, and supplement history.",
  supplements: "The user is on the Supplements tab — tracking today's supplements or shopping for Anthony William's recommended Vimergy supplements via iHerb.",
  learn:       "The user is on the Learn tab — reading plain-English explanations of Medical Medium protocols, condition explainers, recipes, juices, and resources from Anthony William's public teachings.",
  settings:    "The user is on the Settings tab — subscription, reminders, profiles, carer management, and account details.",
};

// The assistant has no delete tools ON PURPOSE — a misheard sentence must
// never be able to wipe the user's data. Instead of dead-ending ("I can't do
// that"), it should know the manual paths and guide the user there. Injected
// into the Hume EVI session context and the Coach text prompt alike.
export const APP_DELETE_HOWTO =
  "You can add and tick things off, but you can NEVER delete or clear the user's data — you have no delete tools, deliberately, so nothing can be wiped by a misheard sentence. When the user asks to remove or clear something, don't just decline: warmly explain exactly where to do it themselves. To remove a supplement: Supplements tab, tap the small ✕ next to the supplement. To stop a running program: Home tab, Daily Rhythm card, tap Edit, open Programs, tap 'End program early'. To delete a saved program or day template: same Programs screen, tap the ✕ on it twice to confirm. To remove a daily rhythm item: Home tab, Daily Rhythm card, tap Edit, then the ✕ next to the item. Offer to take them to the right tab.";
