// Minimal app-shell cache - just enough for "Add to Home Screen" / Lighthouse
// installability. No offline sophistication by design.
//
// Network-first, not cache-first: this app's content (the KB, transcripts)
// must always be current, and a cache-first shell silently masks new
// deploys behind a stale cached "/" - bump CACHE_NAME on any strategy
// change so the activate handler purges old caches for returning visitors.
const CACHE_NAME = "aiza-shell-v2";
const APP_SHELL = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // Never cache API calls - transcription/results must always be live.
  if (event.request.url.includes("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
