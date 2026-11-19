/* LumePDF Service Worker — Cache offline para PWA */
const CACHE_NAME = 'lumepdf-v1.0.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './juntar.html',
  './dividir.html',
  './organizar.html',
  './comprimir.html',
  './rodar.html',
  './numerar.html',
  './jpg-para-pdf.html',
  './pdf-para-word.html',
  './word-para-pdf.html',
  './pdf-para-excel.html',
  './excel-para-pdf.html',
  './pdf-para-powerpoint.html',
  './powerpoint-para-pdf.html',
  './pdf-para-jpg.html',
  './marca-dagua.html',
  './reparar.html',
  './css/estilo.css',
  './js/comum.js',
  './js/ferramenta.js',
  './js/organizar.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// CDN libraries that need to be cached for offline
const CDN_LIBS = [
  'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
  'https://cdn.jsdelivr.net/npm/jszip@3.10.2/dist/jszip.min.js',
  'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js',
  'https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      // Also cache CDN libs (best effort)
      return caches.open(CACHE_NAME + '-cdn').then((cache) => {
        console.log('[SW] Caching CDN libraries');
        return Promise.allSettled(
          CDN_LIBS.map((url) =>
            fetch(url, { mode: 'no-cors' })
              .then((resp) => cache.put(url, resp))
              .catch(() => console.log('[SW] Failed to cache:', url))
          )
        );
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== CACHE_NAME + '-cdn')
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: network-first for HTML, cache-first for static
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension, etc.
  if (!url.protocol.startsWith('http')) return;

  // HTML pages: network-first (always try to get fresh version)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets (CSS, JS, images): cache-first
  if (STATIC_ASSETS.some((asset) => request.url.endsWith(asset.replace('./', '')))) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // CDN libraries: cache-first
  if (CDN_LIBS.some((lib) => request.url.startsWith(lib))) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME + '-cdn').then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Everything else: network-first
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Background sync for future enhancements
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-files') {
    event.waitUntil(syncFiles());
  }
});

async function syncFiles() {
  // Placeholder for future background sync
  console.log('[SW] Background sync triggered');
}

// Push notifications (future)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icon-192.png',
      badge: './icon-192.png',
    });
  }
});

console.log('[SW] LumePDF Service Worker loaded');