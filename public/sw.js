// Sebastian's service worker: shows notifications (including push notifications sent while
// Sebastian is closed) and opens the app when one is tapped.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data && e.data.text() }; }
  const title = d.title || "Sebastian";
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || "You have a notification that requires your attention.",
    icon: "/icons/icon-192.png", badge: "/icons/icon-192.png",
    tag: d.tag || "sebastian", renotify: true, vibrate: [120, 60, 120],
    data: { url: d.url || "/schedule?alert=1" },
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ("focus" in c) { c.focus(); if ("navigate" in c) c.navigate(url).catch(() => {}); return; } }
      return self.clients.openWindow(url);
    })
  );
});
