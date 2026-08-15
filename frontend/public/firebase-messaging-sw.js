importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase web configuration is public client configuration, supplied by the
// page during service-worker registration. Firebase Admin credentials never
// belong in this file.
let firebaseConfig = {};
try {
  const rawConfig = new URL(self.location.href).searchParams.get('config');
  firebaseConfig = rawConfig ? JSON.parse(decodeURIComponent(rawConfig)) : {};
} catch {
  firebaseConfig = {};
}

// Only initialize if we have a valid configuration
if (firebaseConfig.messagingSenderId && firebaseConfig.projectId) {
  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const notificationTitle = payload.notification?.title || 'Notification';
      const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/logo.png',
        data: {
          url: new URL(payload.data?.link || '/dashboard/notifications', self.location.origin).href,
        },
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  } catch (error) {
    console.warn('[firebase-messaging-sw.js] Failed to initialize Firebase:', error);
  }
} else {
  console.warn('[firebase-messaging-sw.js] Firebase configuration is incomplete. Background messaging is disabled.');
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/dashboard/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
