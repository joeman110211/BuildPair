const CACHE_NAME = 'buildpair-static-v7';
const APP_SHELL = ['/', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of APP_SHELL) {
        try {
          const response = await fetch(url, { cache: 'no-cache' });
          if (response.ok) await cache.put(url, response.clone());
        } catch {
          // Installation should still complete if the network briefly drops.
        }
      }
    }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

async function networkFirst(request) {
  try {
    // Revalidate against production rather than trusting Chrome's HTTP cache.
    // This keeps browser/PWA navigation on the same deployed JS as the website.
    const response = await fetch(request, { cache: 'no-cache' });
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request).catch(() => caches.match('/')));
    return;
  }

  const isStaticAsset = url.pathname.startsWith('/_expo/') || url.pathname === '/manifest.webmanifest';
  if (!isStaticAsset) return;

  event.respondWith(networkFirst(request));
});
