import { useState, useEffect, useCallback } from "react";

import { VAPID_PUBLIC_KEY } from '../lib/env.js'

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

export function useWebPush(authUser) {
  const [permission, setPermission] = useState(Notification.permission);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [supported] = useState(
    () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
  );

  useEffect(() => {
    if (!supported || !authUser) return;
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    }).catch(() => {});
  }, [supported, authUser]);

  const subscribe = useCallback(async (morningStartHour = 6) => {
    if (!supported || !authUser || !VAPID_PUBLIC_KEY) return;
    setLoading(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") throw new Error("Permission denied");

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: authUser.id,
          subscription: sub.toJSON(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          morningStartHour,
        }),
      });
      setSubscribed(true);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, [supported, authUser]);

  const updateMorningTime = useCallback(async (morningStartHour) => {
    if (!authUser) return;
    await fetch("/api/notifications/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: authUser.id, morningStartHour }),
    });
  }, [authUser]);

  const unsubscribe = useCallback(async () => {
    if (!supported || !authUser) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await fetch("/api/notifications/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: authUser.id, endpoint: sub.endpoint }),
        });
      }
      setSubscribed(false);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, [supported, authUser]);

  return { supported, permission, subscribed, loading, error, subscribe, unsubscribe, updateMorningTime };
}
