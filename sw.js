const CACHE_NAME = "personal-dashboard-v1";
const APP_SHELL = [
  "/",
  "/index.html",
  "/dashboard.html",
  "/finance.html",
  "/learning-plan.html",
  "/manifest.webmanifest",
  "/assets/pwa.js",
  "/assets/offline-store.js",
  "/assets/supabase.js",
  "/assets/product-access.js",
  "/assets/auth.js",
  "/assets/dashboard.js",
  "/assets/finance.js",
  "/assets/plan-session.js",
  "/assets/plan-sync.js",
  "/assets/weekly-cycles.js",
  "/icons/app-icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      }).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return await cache.match(request) || await cache.match("/index.html");
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
