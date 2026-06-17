// CelerySync Service Worker — handles push notifications

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "CelerySync", body: event.data.text() };
  }

  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    tag: data.tag || "celerysync",
    renotify: true,
    requireInteraction: false,
    data: { url: data.url || "/" },
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(data.title || "CelerySync", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
