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
