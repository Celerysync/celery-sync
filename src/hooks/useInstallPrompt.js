import { useState, useEffect, useCallback } from "react";

// Installing to the home screen is not cosmetic: on iOS, web push does not
// work at all from a Safari tab — only from an installed app. So "can this
// user receive reminders?" depends on this. Chrome fires beforeinstallprompt
// (captured in index.html before React mounts); iOS never does, so there we
// fall back to telling the user the manual steps.

function detectStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function detectIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

export function useInstallPrompt() {
  const [installed, setInstalled] = useState(detectStandalone);
  const [canPrompt, setCanPrompt] = useState(() => !!window.__csInstallPrompt);
  const isIOS = detectIOS();

  useEffect(() => {
    const onAvailable = () => setCanPrompt(true);
    const onInstalled = () => {
      setCanPrompt(false);
      setInstalled(true);
    };
    window.addEventListener("cs-install-available", onAvailable);
    window.addEventListener("cs-installed", onInstalled);

    // display-mode flips without a reload when the user opens the installed app
    const mq = window.matchMedia?.("(display-mode: standalone)");
    const onModeChange = (e) => setInstalled(e.matches);
    mq?.addEventListener?.("change", onModeChange);

    return () => {
      window.removeEventListener("cs-install-available", onAvailable);
      window.removeEventListener("cs-installed", onInstalled);
      mq?.removeEventListener?.("change", onModeChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const evt = window.__csInstallPrompt;
    if (!evt) return false;
    evt.prompt();
    const { outcome } = await evt.userChoice.catch(() => ({ outcome: "dismissed" }));
    if (outcome === "accepted") {
      window.__csInstallPrompt = null;
      setCanPrompt(false);
      return true;
    }
    return false;
  }, []);

  // Only worth nagging about when we can actually do something: a real prompt
  // on Chrome, or printed steps on iOS where install is the only route to push.
  const shouldOfferInstall = !installed && (canPrompt || isIOS);

  return { installed, canPrompt, isIOS, promptInstall, shouldOfferInstall };
}
