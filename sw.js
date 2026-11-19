const CACHE_NAME = "personal-dashboard-v2";
const APP_SHELL = [
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
      .then(async cache => {
        await cache.addAll(APP_SHELL);
        try {
          await cache.add("https://esm.sh/@supabase/supabase-js@2");
        } catch {}
      })
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
  if (request.method !== "GET") return;

  const isAppAsset = url.origin === self.location.origin;
  const isSupabaseModule = url.hostname === "esm.sh";
  if (!isAppAsset && !isSupabaseModule) return;

  if (isAppAsset && request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        return response;
      }).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return await cache.match(request) || await cache.match(url.pathname) || await cache.match("/index.html");
      })
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(request);
      try {
        const response = await fetch(request);
        if (response && (response.ok || response.type === "opaque")) {
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        if (cached) return cached;
        throw new Error("This resource is not available offline.");
      }
    })
  );
});
