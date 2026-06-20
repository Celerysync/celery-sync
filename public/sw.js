// CelerySync Service Worker — push notifications + offline app shell cache

const CACHE_NAME = "celerysync-shell-v1";
const OFFLINE_URL = "/offline.html";

// App shell: index.html + offline fallback. JS/CSS are content-hashed by Vite
// and cached at runtime via the fetch handler below.
const PRECACHE_URLS = ["/", OFFLINE_URL];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Don't intercept API or push requests
  if (url.pathname.startsWith("/api/")) return;
  if (request.method !== "GET") return;

  // For navigation (HTML page requests): try network first, fall back to cached /
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match("/");
        return cached || caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // For JS/CSS/images (Vite hashed assets): cache-first
  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.match(/\.(js|css|png|svg|woff2?|ico)$/)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(request, clone));
            }
            return res;
          })
      )
    );
    return;
  }
});

// ── Push notifications ──────────────────────────────────────────────────────

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
    icon: "/icons/icon-192.svg",
    badge: "/icons/icon-192.svg",
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
