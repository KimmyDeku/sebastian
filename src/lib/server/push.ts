import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

/** Server side of push notifications: subscriptions and due reminders are kept in Supabase. */
export function pushReady() {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
let configured = false;
export function push() {
  if (!configured) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:support@example.com", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
    configured = true;
  }
  return webpush;
}
export function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}
// Only real browser push services are accepted, so the server never posts to other addresses.
const PUSH_HOSTS = [/(^|\.)fcm\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/, /(^|\.)push\.hicloud\.com$/];
export function validEndpoint(endpoint: string) {
  try { const u = new URL(endpoint); return u.protocol === "https:" && PUSH_HOSTS.some((r) => r.test(u.hostname)); } catch { return false; }
}
