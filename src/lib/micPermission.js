// A blocked microphone is the most likely reason the companion fails to
// start, and the browser's own wording ("Permission denied") tells a tired
// user nothing about what to do. The fix is different on every platform, so
// the guidance has to be too.

export const isIOS = () =>
  typeof navigator !== "undefined" &&
  /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  !window.MSStream;

export const isAndroid = () =>
  typeof navigator !== "undefined" && /Android/.test(navigator.userAgent);

export const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);

// The Hume SDK surfaces the underlying getUserMedia rejection, but it may be
// wrapped, so match on shape rather than identity.
export function isMicPermissionError(err) {
  if (!err) return false;
  const name = err.name || "";
  const msg = String(err.message || err).toLowerCase();
  return (
    name === "NotAllowedError" ||
    name === "SecurityError" ||
    msg.includes("permission denied") ||
    msg.includes("not allowed") ||
    msg.includes("permission dismissed")
  );
}

// Returns actionable, platform-specific steps — or null when the error is
// something else and the raw message is more useful than a guess.
export function micHelp(err) {
  if (!isMicPermissionError(err)) return null;

  if (isIOS()) {
    return {
      title: "CelerySync needs your microphone",
      // iOS does not persist mic permission for home-screen web apps, so this
      // is expected on each launch rather than a sign anything is broken.
      // Saying so stops it reading as a fault in the app.
      steps: isStandalone()
        ? [
            "Tap the green button again and choose Allow.",
            "iPhone asks each time you reopen the app — that's an Apple limitation, not a problem with CelerySync.",
            "You can always type to the companion instead.",
          ]
        : [
            "Tap the green button again and choose Allow.",
            "If you don't see a prompt: tap aA in the address bar → Website Settings → Microphone → Allow.",
          ],
    };
  }

  if (isAndroid()) {
    return {
      title: "Microphone is blocked",
      steps: [
        "Open Settings → Apps → CelerySync → Permissions → Microphone → Allow.",
        "Also check Chrome: open celerysync.com, tap the icon left of the address bar → Permissions → Microphone → Allow.",
        "Then reopen CelerySync. You only need to do this once.",
      ],
    };
  }

  return {
    title: "Microphone is blocked",
    steps: [
      "Click the camera/microphone icon in your browser's address bar and allow access.",
      "Then tap Start talking again.",
      "You only need to do this once for this browser.",
    ],
  };
}
