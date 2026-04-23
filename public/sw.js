const CACHE_NAME = 'internhub-cache-v1';
const OFFLINE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon.svg',
];

// Install Event: Cache essential URLs
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS);
    })
  );
});

// Activate Event: Cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Network first, fallback to cache for specific API routes (Attendance, Reports)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache specific API routes for offline viewing (Intern Dashboard, Attendance Logs, Reports)
  if (url.pathname.startsWith('/api/intern-dashboard') || url.pathname.startsWith('/api/attendance') || url.pathname.startsWith('/api/reports')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If response is OK, cache a copy
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // If network fails, serve from cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // Default behavior for other requests: Stale-While-Revalidate for static assets, Network-First for HTML
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (event.request.method === 'GET' && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
        }
        return networkResponse;
      }).catch(() => {
        // If offline and not in cache, let it fail or return a custom offline page
      });
      return cachedResponse || fetchPromise;
    })
  );
});

// Push Notification Event Listener (To be implemented fully later with Firebase)
self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const payload = event.data.json();
      const title = payload.notification?.title || 'Notifikasi InternHub';
      const options = {
        body: payload.notification?.body || '',
        icon: '/icons/icon.svg',
        badge: '/icons/icon.svg',
        data: payload.data,
      };
      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      // Fallback for plain text push
      event.waitUntil(self.registration.showNotification('InternHub PLNE', { body: event.data.text(), icon: '/icons/icon.svg' }));
    }
  }
});

// Notification Click Event Listener
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
