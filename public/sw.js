// Minimal service worker: enables "install to home screen" (PWA) and provides a
// simple network-first pass-through. It intentionally does not aggressively
// cache, so users always get fresh package data.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Let the browser handle everything normally (network-first).
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
