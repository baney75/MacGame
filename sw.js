const CACHE_NAME = "macgame-v10";
const ASSETS = [
  ".",
  "index.html",
  "styles.css",
  "game.js",
  "manifest.json",
  "sprites/mac_idle.png",
  "sprites/mac_idle_blink.png",
  "sprites/mac_run_1.png",
  "sprites/mac_run_2.png",
  "sprites/mac_run_3.png",
  "sprites/mac_run_4.png",
  "sprites/mac_jump_1.png",
  "sprites/mac_jump_2.png",
  "sprites/mac_jump_3.png",
  "sprites/mac_attack_1.png",
  "sprites/mac_attack_2.png",
  "sprites/mac_hurt.png",
  "sprites/mac_victory.png",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      caches.match("index.html").then((cached) => cached || fetch(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => {
          // Return cached response if available, otherwise return a basic offline response
          if (cached) return cached;
          return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
        });
    })
  );
});
