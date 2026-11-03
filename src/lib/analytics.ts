"use client";
/**
 * Google Analytics 4 with Consent Mode ("advanced"): it loads for everyone. Until a visitor
 * allows analytics, Google receives only anonymous, cookie-free signals (no identifiers stored),
 * which it uses to model overall behaviour. After "Allow", normal analytics cookies are used.
 * No personal details are ever sent: only which parts of Sebastian are used and anonymous actions.
 */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";
const KEY = "sebastian-analytics-consent";
export type Consent = "granted" | "denied" | null;
declare global { interface Window { dataLayer: any[]; gtag?: (...args: any[]) => void } }

export const getConsent = (): Consent => { try { const v = localStorage.getItem(KEY); return v === "granted" || v === "denied" ? v : null; } catch { return null; } };
let loaded = false;

export function loadGA() {
  if (loaded || !GA_ID || typeof window === "undefined") return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("consent", "default", { analytics_storage: getConsent() === "granted" ? "granted" : "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", wait_for_update: 500 });
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { anonymize_ip: true });
  const s = document.createElement("script");
  s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(s);
}

export function setConsent(v: "granted" | "denied") {
  try { localStorage.setItem(KEY, v); } catch {}
  loadGA();
  window.gtag?.("consent", "update", { analytics_storage: v });
  window.dispatchEvent(new Event("sebastian-consent"));
}

/** Sends an anonymous event (cookie-free until the visitor allows analytics). Never pass names, emails or anything people typed. */
export function track(name: string, params: Record<string, string | number | boolean | undefined> = {}) {
  if (!window.gtag) return;
  window.gtag("event", name, params);
}
/** A random account id (not an email or name), so Analytics can recognise returning users across devices. */
export function identify(userId: string, props: Record<string, string> = {}) {
  if (getConsent() !== "granted" || !window.gtag) return;
  window.gtag("set", { user_id: userId });
  if (Object.keys(props).length) window.gtag("set", "user_properties", props);
}
