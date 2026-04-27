// firebase-messaging-sw.js
// CRITICAL: This file MUST exist at /public/firebase-messaging-sw.js for FCM to work.
// Firebase SDK automatically registers this service worker for push notifications.
// Public Firebase keys are intentionally hardcoded here — env vars are NOT available in SW scope.

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

// Handle background push messages (when app tab is closed or in background)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message', payload);
  const title = payload.notification?.title || 'InternHub PLN Enjiniring';
  const options = {
    body: payload.notification?.body || '',
    icon: '/icons/icon.svg',
    badge: '/icons/icon.svg',
    data: payload.data,
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };
  self.registration.showNotification(title, options);
});

// Handle notification click — redirect to URL from payload
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
