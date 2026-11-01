// What the user does by TAPPING while a voice call is live (ticking
// something off, saving a check-in, changing their rhythm). The voice
// companion listens for these and folds them into the live session, so it
// never talks as if a tap hadn't happened. Voice tools don't announce —
// the companion already knows what it did itself.

export const APP_ACTIVITY_EVENT = "cs:app-activity";

// text reads after "the user …", e.g. `ticked off "Celery juice"`.
export function announceActivity(text) {
  if (text) window.dispatchEvent(new CustomEvent(APP_ACTIVITY_EVENT, { detail: { text } }));
}
