const CACHE_VERSION = "rossa-offline-v1";
const TILE_CACHE = "rossa-map-tiles-v1";
const IMAGE_CACHE = "rossa-images-v1";

const APP_SHELL = [
  "/",
  "/index.html",
  "/favicon.svg",
  "/manifest.webmanifest",
  "/icons.svg",
  "/img1.JPG",
  "/img2.jpg",
  "/offline-image.svg",
  "/offline-tile.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                ![CACHE_VERSION, TILE_CACHE, IMAGE_CACHE].includes(key)
            )
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

const cacheFirst = async (request, cacheName, fallbackUrl) => {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok || response.type === "opaque") {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const fallback = await caches.match(fallbackUrl);
    if (fallback) {
      return fallback;
    }
    return new Response("", { status: 503, statusText: "Offline" });
  }
};

const networkFirst = async (request) => {
  const cache = await caches.open(CACHE_VERSION);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || cache.match("/index.html");
  }
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (url.hostname.endsWith("tile.openstreetmap.org")) {
    event.respondWith(cacheFirst(request, TILE_CACHE, "/offline-tile.svg"));
    return;
  }

  if (request.destination === "image") {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, "/offline-image.svg"));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
  }
});
