// Minimal app-shell service worker. It never touches /api/* or non-GET
// requests, so model replies and credentials are never cached.
const CACHE = "openbot-shell-v4";
const SHELL = ["/", "/openbot-icon.svg"];

self.addEventListener("install", (event) => {
  // No skipWaiting here: an updated worker waits until the page, after the
  // user agrees (see the SKIP_WAITING message below), so a reload never swaps
  // the build under an open chat.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/")));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    // Hashed, immutable build assets: cache-first so the shell can hydrate offline.
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  if (SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request)),
    );
  }
});
