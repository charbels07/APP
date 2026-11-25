/*
 * Notifications outside the app (the 12:00 reminder, a new idea to vote on).
 * This worker only shows what the server sent and opens the app when the notification is touched.
 * It keeps no copy of the app or of any data, and never opens an address found in a message.
 */
self.addEventListener('install', function () {
  self.skipWaiting();
});
self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
  var d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch (e) {
    d = {};
  }
  var text = function (v, max) {
    return typeof v === 'string' ? v.slice(0, max) : '';
  };
  event.waitUntil(
    self.registration.showNotification(text(d.title, 120) || 'Daleth AAC', {
      body: text(d.body, 300),
      tag: text(d.tag, 40) || 'daleth',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      dir: 'auto',
    }),
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if ('focus' in list[i]) return list[i].focus();
      }
      return self.clients.openWindow('/');
    }),
  );
});
