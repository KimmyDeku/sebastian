"use client";
// Phone browsers (especially Android) only show notifications through a service worker.
let reg: ServiceWorkerRegistration | null = null;

export async function ensureServiceWorker() {
  if (reg || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return reg;
  // Sebastian's own worker lives at /sebastian/, so Pushify can have the site root (/pushify.js).
  try { reg = await navigator.serviceWorker.register("/sw.js", { scope: "/sebastian/" }); } catch { reg = null; }
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

/**
 * One-time move: earlier versions registered Sebastian's worker at the site root, where Pushify
 * now lives. Remove that old registration and, if this device had push switched on, quietly
 * subscribe again under /sebastian/ (no new permission prompt: permission was already given).
 */
export async function moveServiceWorker(resubscribe: () => Promise<unknown>) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    if (localStorage.getItem("sebastian-sw-moved") === "1") return;
    const regs = await navigator.serviceWorker.getRegistrations();
    let hadPush = false;
    for (const r of regs) {
      const script = r.active?.scriptURL || r.waiting?.scriptURL || r.installing?.scriptURL || "";
      if (script.endsWith("/sw.js") && new URL(r.scope).pathname === "/") {
        const sub = await r.pushManager.getSubscription().catch(() => null);
        if (sub) { hadPush = true; await sub.unsubscribe().catch(() => {}); }
        await r.unregister().catch(() => {});
      }
    }
    localStorage.setItem("sebastian-sw-moved", "1");
    if (hadPush && typeof Notification !== "undefined" && Notification.permission === "granted") {
      localStorage.removeItem("sebastian-push-endpoint");
      await resubscribe().catch(() => {});
    }
  } catch {}
}
