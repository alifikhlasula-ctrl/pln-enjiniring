// ═══════════════════════════════════════════════════════════════════════
// InternHub PWA Service Worker — Unified (Caching + FCM)
// This single file handles BOTH PWA offline caching AND Firebase Cloud Messaging.
// Firebase requires the messaging SW to be importScripted here at scope /.
// ═══════════════════════════════════════════════════════════════════════

// ── Firebase Messaging (MUST be at top before any self.addEventListener) ──
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD3jThuR0fGtm2OAyAqlmS_X3owP1JPXIY",
  authDomain: "internhub-plne.firebaseapp.com",
  projectId: "internhub-plne",
  storageBucket: "internhub-plne.firebasestorage.app",
  messagingSenderId: "365936458573",
  appId: "1:365936458573:web:35d1d33bf286de2955d504"
});

const messaging = firebase.messaging();

// Handle background push messages (when tab is hidden or app is closed)
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Background push received:', payload);
  const title = payload.notification?.title || 'InternHub PLN Enjiniring';
  const options = {
    body: payload.notification?.body || '',
    icon: '/icons/icon.svg',
    badge: '/icons/icon.svg',
    data: payload.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };
  self.registration.showNotification(title, options);
});

// ── PWA Caching ─────────────────────────────────────────────────────────
const CACHE_NAME = 'internhub-cache-v2';
const OFFLINE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon.svg',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache specific API routes for offline viewing
  if (
    url.pathname.startsWith('/api/intern-dashboard') ||
    url.pathname.startsWith('/api/attendance') ||
    url.pathname.startsWith('/api/reports')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Stale-while-revalidate for static assets, network-first for HTML
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request)
        .then((network) => {
          if (event.request.method === 'GET' && network.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, network.clone()));
          }
          return network;
        })
        .catch(() => {});
      return cached || fetched;
    })
  );
});

// ── Notification Click Handler ──────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
