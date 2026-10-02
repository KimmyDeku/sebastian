"use client";
// Push notifications for reminders, delivered even when Sebastian is closed.
import { ensureServiceWorker } from "./notify";
import type { ScheduleEvent } from "./types";

const KEY = "sebastian-push-endpoint";
export const pushKey = () => process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
export const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
export const pushEndpoint = () => { try { return localStorage.getItem(KEY); } catch { return null; } };

function b64ToBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Asks for permission (from a tap), subscribes this device and tells Sebastian's server. */
export async function enablePush(phrase: string) {
  if (!pushSupported()) throw new Error("This browser can't receive push notifications. On an iPhone, add Sebastian to your home screen first.");
  if (!pushKey()) throw new Error("Push notifications aren't set up on this server yet (NEXT_PUBLIC_VAPID_PUBLIC_KEY).");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Notifications are blocked for this site. Allow them in your browser's site settings.");
  const reg = await ensureServiceWorker();
  if (!reg) throw new Error("Notifications need a secure (https) address.");
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(pushKey()) }));
  const r = await fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON(), phrase }) }).then((x) => x.json()).catch(() => ({ ok: false, error: "Couldn't reach Sebastian's server." }));
  if (!r.ok) throw new Error(r.error || "Push notifications couldn't be switched on.");
  localStorage.setItem(KEY, sub.endpoint);
  return sub.endpoint;
}

export async function disablePush() {
  const endpoint = pushEndpoint();
  try { const reg = await ensureServiceWorker(); const sub = await reg?.pushManager.getSubscription(); await sub?.unsubscribe(); } catch {}
  if (endpoint) await fetch("/api/push/subscribe", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint }) }).catch(() => {});
  localStorage.removeItem(KEY);
}

export async function testPush() {
  const endpoint = pushEndpoint();
  if (!endpoint) throw new Error("Push notifications aren't switched on for this device.");
  const r = await fetch("/api/push/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint }) }).then((x) => x.json());
  if (!r.ok) throw new Error(r.error || "The test notification couldn't be sent.");
}

/** Reminder times for upcoming events (ids and times only). */
export function jobsFor(events: ScheduleEvent[]) {
  const now = Date.now();
  return events.filter((e) => e.remindMinutes != null && !e.notified).map((e) => ({ id: e.id, fireAt: new Date(new Date(e.start).getTime() - (e.remindMinutes || 0) * 60000).toISOString() }))
    .filter((j) => new Date(j.fireAt).getTime() > now - 60000);
}

let last = "";
export async function syncPush(events: ScheduleEvent[], enabled: boolean) {
  const endpoint = pushEndpoint();
  if (!endpoint) return;
  const jobs = enabled ? jobsFor(events) : [];
  const sig = JSON.stringify(jobs);
  if (sig === last) return;
  last = sig;
  const r = await fetch("/api/push/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint, jobs }) }).then((x) => x.json()).catch(() => null);
  if (r?.code === "unknown_device") localStorage.removeItem(KEY);
}
