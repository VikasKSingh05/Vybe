/**
 * VYBE service worker.
 *
 * Registered by components/ServiceWorkerRegistrar.tsx via
 * `new URL("../lib/service-worker.js", import.meta.url)` with
 * `scope: "/"` and `updateViaCache: "none"` (Next.js PWA guide pattern).
 *
 * Strategy map (GET, same-origin only — everything else passes through):
 *  - Navigations            network-first  -> cached page copy (offline reload)
 *  - /_next/static/*        cache-first    (immutable hashed assets)
 *  - /api/music/discover    network-first  -> last good response (offline vibe tiles)
 *  - /api/music/song/<id>   network-first  -> last good response (recent tracks)
 *  - everything else        passthrough    (search API fails fast into its own
 *                                            error UI; SSE streams and POSTs are
 *                                            never intercepted; audio streams are
 *                                            cross-origin CDN URLs)
 *
 * Updates are passive: a new worker installs and waits; the page shows a
 * "refresh to update" toast. We never call skipWaiting ourselves.
 */

const VERSION = "v1";
const PAGES_CACHE = `vybe-pages-${VERSION}`;
const STATIC_CACHE = `vybe-static-${VERSION}`;
const API_CACHE = `vybe-api-${VERSION}`;
const BG_CACHE = `vybe-bg-${VERSION}`;
const CACHES = [PAGES_CACHE, STATIC_CACHE, API_CACHE, BG_CACHE];

const BACKGROUND_IMAGES = [
  "/backgrounds/fields.jpg",
  "/backgrounds/bg-phonk.jpg",
  "/backgrounds/lofi.png",
  "/backgrounds/bolly.jpg",
  "/backgrounds/mountains.jpg",
  "/backgrounds/chill.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(BG_CACHE).then((cache) => cache.addAll(BACKGROUND_IMAGES)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("vybe-") && !CACHES.includes(name))
          .map((name) => caches.delete(name)),
      );
      // Take control of open pages immediately so repeat visits benefit even
      // if they loaded before this worker was registered.
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/");
}

function isResolvableApi(url) {
  return (
    url.pathname === "/api/music/discover" ||
    url.pathname.startsWith("/api/music/song/")
  );
}

/** Range requests and media fetches must never be intercepted. */
function isMediaLike(request) {
  return (
    request.headers.has("range") ||
    request.destination === "audio" ||
    request.destination === "video"
  );
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh && fresh.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, fresh.clone());
  }
  return fresh;
}

async function networkFirst(request, cacheName) {
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;
  if (isMediaLike(request)) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Search stays live-only on purpose: results are unbounded, and a stale
  // fallback would look broken rather than helpful.
  if (url.pathname.startsWith("/api/music/search")) return;

  // Background images: cache-first (precached during install)
  if (url.pathname.startsWith("/backgrounds/")) {
    event.respondWith(cacheFirst(request, BG_CACHE));
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    if (!isResolvableApi(url)) return;
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, PAGES_CACHE).catch(() =>
        caches.match("/"),
      ),
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  }
});
