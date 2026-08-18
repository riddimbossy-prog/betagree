/* Betagree service worker — cache the desk, sync the board when the line returns. */
const VERSION = "betagree-sw-v8";
const SHELL = `${VERSION}-shell`;
const DATA = `${VERSION}-data`;
const MEDIA = `${VERSION}-media`;

const PRECACHE = [
  "/data/slate.json",
  "/data/streaks.json",
  "/data/trends.json",
  "/data/league-rates.json",
  "/favicon.svg",
  "/brand/betagree-lockup.png",
];

const BOARD_URLS = [
  "/data/slate.json",
  "/data/streaks.json",
  "/data/trends.json",
  "/data/form.json",
  "/data/form-preview.json",
  "/data/picks.json",
  "/data/odds.json",
  "/data/scores.json",
  "/data/ledger.json",
  "/data/league-rates.json",
  "/api/scores",
  "/api/slate",
  "/api/streaks",
  "/api/trends",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      await Promise.all(
        PRECACHE.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "no-cache" });
            if (res.ok) await cache.put(url, res);
          } catch {
            /* first visit can miss a file */
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") void self.skipWaiting();
  if (event.data?.type === "SYNC_NOW") {
    event.waitUntil(syncBoard());
  }
});

async function syncBoard() {
  const cache = await caches.open(DATA);
  let ok = 0;
  let failed = 0;
  await Promise.all(
    BOARD_URLS.map(async (url) => {
      try {
        const res = await fetch(url, { cache: "no-cache" });
        if (res.ok) {
          await cache.put(url, res.clone());
          ok += 1;
        } else {
          failed += 1;
        }
      } catch {
        failed += 1;
      }
    }),
  );
  if (ok === 0) throw new Error("board sync failed");
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of windows) {
    client.postMessage({ type: "BOARD_SYNCED", ok, failed });
  }
  return { ok, failed };
}

self.addEventListener("sync", (event) => {
  if (event.tag === "betagree-board") event.waitUntil(syncBoard());
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "betagree-board") event.waitUntil(syncBoard());
});

function keep(res) {
  return Boolean(res) && (res.ok || res.type === "opaque");
}

async function put(cacheName, request, response) {
  if (!keep(response)) return;
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
  const keys = await cache.keys();
  if (keys.length > 480) await cache.delete(keys[0]);
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  await put(cacheName, request, res);
  return res;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const fresh = fetch(request)
    .then(async (res) => {
      await put(cacheName, request, res);
      return res;
    })
    .catch(() => hit);
  return hit || fresh;
}

async function networkFirst(request, cacheName) {
  try {
    const res = await fetch(request);
    await put(cacheName, request, res);
    return res;
  } catch (err) {
    const hit = await caches.match(request);
    if (hit) return hit;
    throw err;
  }
}

function passthrough(url) {
  const path = url.pathname;
  if (path.startsWith("/@") || path.startsWith("/src/") || path.startsWith("/node_modules/")) return true;
  if (path.startsWith("/__grok/") || path === "/sw.js") return true;
  if (path.endsWith(".tsx") || path.endsWith(".ts") || path.endsWith(".mjs")) return true;
  if (url.searchParams.has("t") || url.searchParams.has("v")) return true;
  return false;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const accept = request.headers.get("accept") || "";
  if (request.mode === "navigate" || accept.includes("text/html")) return;
  if (passthrough(url)) return;

  if (url.origin === self.location.origin) {
    if (url.pathname === "/crests/index.json") {
      event.respondWith(networkFirst(request, DATA));
      return;
    }
    if (url.pathname.startsWith("/data/")) {
      event.respondWith(staleWhileRevalidate(request, DATA));
      return;
    }
    if (url.pathname.startsWith("/api/scores")) {
      event.respondWith(networkFirst(request, DATA));
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      event.respondWith(networkFirst(request, DATA));
      return;
    }
    if (url.pathname.startsWith("/crests/")) {
      event.respondWith(cacheFirst(request, MEDIA));
      return;
    }
    if (
      url.pathname.startsWith("/brand/") ||
      url.pathname.startsWith("/logo") ||
      url.pathname === "/favicon.svg"
    ) {
      event.respondWith(cacheFirst(request, SHELL));
    }
    return;
  }

  if (
    url.hostname === "img.sofascore.com" ||
    url.hostname === "a.espncdn.com" ||
    url.hostname === "fonts.gstatic.com" ||
    url.hostname === "fonts.googleapis.com"
  ) {
    event.respondWith(cacheFirst(request, MEDIA));
  }
});
