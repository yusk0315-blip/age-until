/* Simple PWA Service Worker for GitHub Pages (cache-first) */
const CACHE_NAME = "age-until-pwa-v1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./offline.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? Promise.resolve() : caches.delete(k))))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET
  if (req.method !== "GET") return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Try cache first
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;

      try {
        const fresh = await fetch(req);
        // Cache successful same-origin responses
        if (fresh && fresh.ok && new URL(req.url).origin === self.location.origin) {
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch (e) {
        // Offline fallback for navigations
        if (req.mode === "navigate") {
          const offline = await cache.match("./offline.html");
          if (offline) return offline;
        }
        // As last resort, return cached root if present
        const root = await cache.match("./");
        if (root) return root;
        throw e;
      }
    })()
  );
});
