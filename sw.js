const CACHE_NAME = "macgame-v14";
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

// Install: cache all assets and skip waiting to activate immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches and take control of all clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => 
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
      .then(() => {
        // Notify all clients that a new version is active
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: "SW_UPDATED", version: CACHE_NAME });
          });
        });
      })
  );
});

// Fetch: stale-while-revalidate for better UX
// Serve cached content immediately, then update cache in background
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // For navigation requests, try network first with cache fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the fresh response
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match("index.html"))
    );
    return;
  }

  // For other requests: stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Start fetching fresh version in background
      const fetchPromise = fetch(event.request)
        .then((response) => {
          // Only cache valid responses
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);

      // Return cached immediately if available, otherwise wait for network
      return cached || fetchPromise;
    })
  );
});

// Listen for skip waiting message from client
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
