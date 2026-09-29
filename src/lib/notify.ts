"use client";
// Phone browsers (especially Android) only show notifications through a service worker.
let reg: ServiceWorkerRegistration | null = null;

export async function ensureServiceWorker() {
  if (reg || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return reg;
  try { reg = await navigator.serviceWorker.register("/sw.js"); } catch { reg = null; }
  return reg;
}

/** Shows a system notification if the user has allowed them. Never put private details in `body`. */
export async function pushNotify(title: string, body: string, opts: { tag?: string; url?: string } = {}) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  const options: NotificationOptions = { body, icon: "/favicon.svg", badge: "/favicon.svg", tag: opts.tag, data: { url: opts.url || "/" } };
  try {
    const r = await ensureServiceWorker();
    if (r) { await r.showNotification(title, options); return true; }
  } catch {}
  try { new Notification(title, options); return true; } catch { return false; }
}
