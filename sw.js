const CACHE_NAME = "personal-dashboard-v11";
const CACHE_PREFIX = "personal-dashboard-";
const APP_SHELL = [
  "/",
  "/dashboard",
  "/finance",
  "/learning-plan",
  "/games",
  "/assets/games.js",\n  "/assets/categories-game.js",
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
  "/icons/app-icon.svg",
  "/offline"
];

function getNavigationCacheKey(url) {
  let pathname = url.pathname || "/";
  if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);

  const routeAliases = {
    "/": "/",
    "/index.html": "/",
    "/dashboard": "/dashboard",
    "/dashboard.html": "/dashboard",
    "/finance": "/finance",
    "/finance.html": "/finance",
    "/learning-plan": "/learning-plan",
    "/learning-plan.html": "/learning-plan",
    "/games": "/games",
    "/games.html": "/games",
    "/offline": "/offline",
    "/offline.html": "/offline"
  };

  const canonicalUrl = new URL(url.href);
  canonicalUrl.pathname = routeAliases[pathname] || pathname;
  return canonicalUrl;
}

async function getCachedNavigation(cache, pageKey) {
  return await cache.match(pageKey, { ignoreSearch: true });
}

async function getOfflineFallback(cache) {
  return await cache.match("/offline");
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    for (const path of APP_SHELL) {
      try {
        const response = await fetch(path, { cache: "reload" });
        if (response.ok) {
          await cache.put(new Request(new URL(path, self.location.origin)), response);
        } else {
          console.warn("App shell resource was not cached:", path, response.status);
        }
      } catch (error) {
        console.warn("App shell resource could not be cached:", path, error);
      }
    }

    try {
      const supabaseModule = "https://esm.sh/@supabase/supabase-js@2";
      const response = await fetch(supabaseModule);
      if (response.ok) await cache.put(supabaseModule, response);
    } catch (error) {
      console.warn("Supabase module will be cached on first successful use:", error);
    }

    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET") return;

  const isAppAsset = url.origin === self.location.origin;
  const isSupabaseModule = url.hostname === "esm.sh";
  if (!isAppAsset && !isSupabaseModule) return;

  if (isAppAsset && request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const pageKey = getNavigationCacheKey(url);

      if (pageKey.pathname !== url.pathname) {
        return Response.redirect(pageKey.href, 302);
      }

      try {
        const navigationRequest = new Request(pageKey.href, {
          method: "GET",
          headers: request.headers,
          credentials: "same-origin",
          redirect: "follow"
        });
        const response = await fetch(navigationRequest);

        if (response.ok) {
          try {
            await cache.put(pageKey, response.clone());
          } catch (cacheError) {
            console.warn("Navigation response could not be cached:", pageKey.pathname, cacheError);
          }
          return response;
        }

        const cachedPage = await getCachedNavigation(cache, pageKey);
        if (cachedPage) return cachedPage;

        if (response.status >= 500) {
          const offlinePage = await getOfflineFallback(cache);
          if (offlinePage) return offlinePage;
        }

        return response;
      } catch {
        const cachedPage = await getCachedNavigation(cache, pageKey);
        if (cachedPage) return cachedPage;

        const offlinePage = await getOfflineFallback(cache);
        if (offlinePage) return offlinePage;

        return new Response(
          "<!doctype html><html lang='ar' dir='rtl'><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>غير متصل</title><body style='font-family:Tahoma;padding:32px;background:#07101f;color:#eef4ff'><h2>الصفحة دي مش محفوظة على الجهاز</h2><p>افتحها مرة واحدة بالإنترنت وبعدها هتقدر تستخدمها بدون اتصال.</p><a href='/' style='color:#9bc4ff'>الصفحة الرئيسية</a></body></html>",
          { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 }
        );
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    try {
      const response = await fetch(request);
      if (response && (response.ok || response.type === "opaque")) {
        try {
          await cache.put(request, response.clone());
        } catch (cacheError) {
          console.warn("Resource could not be cached:", request.url, cacheError);
        }
      }
      return response;
    } catch {
      if (cached) return cached;
      throw new Error("This resource is not available offline.");
    }
  })());
});
