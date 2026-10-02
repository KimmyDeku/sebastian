"use client";
/**
 * Time spent in Sebastian: only active time is counted (the app is on screen and the user
 * has tapped, typed or scrolled in the last 90 seconds). Kept per day, per section and per hour.
 */
import { useStore } from "./store";

export type UsageDay = { total: number; sections: Record<string, number>; hours: Record<string, number> };
export type Usage = { days: Record<string, UsageDay> };
const EMPTY: Usage = { days: {} };
const TICK = 15; // seconds
const IDLE = 90_000;

export const SECTION_NAMES: Record<string, string> = {
  home: "Home", chat: "Chat", recipes: "Recipes", booking: "Booking", travel: "Travel", discover: "Discover", schedule: "Schedule",
  finance: "Finance", fashion: "Fashion", news: "News", email: "Email", notebook: "Notebook", settings: "Settings", history: "History", other: "Other",
};
export function sectionOf(path: string) {
  const p = path.split("?")[0].split("/").filter(Boolean)[0] || "home";
  return SECTION_NAMES[p] ? p : "other";
}
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function useUsage(): Usage {
  return useStore((s) => ((s.sessionId ? (s.data[s.sessionId] as any)?.usage : null) as Usage) || EMPTY);
}
export const clearUsage = () => useStore.getState().patch((d: any) => ({ ...d, usage: { days: {} } }));

let started = false;
export function startUsageTracking() {
  if (started || typeof window === "undefined") return;
  started = true;
  let lastInput = Date.now();
  let pending: Record<string, { total: number; sections: Record<string, number>; hours: Record<string, number> }> = {};
  const touch = () => { lastInput = Date.now(); };
  ["pointerdown", "keydown", "scroll", "touchstart", "wheel"].forEach((e) => window.addEventListener(e, touch, { passive: true, capture: true }));

  const flush = () => {
    const keys = Object.keys(pending);
    if (!keys.length) return;
    const s = useStore.getState();
    const d: any = s.sessionId ? s.data[s.sessionId] : null;
    if (!d || d.prefs?.activityHistory === false) { pending = {}; return; }
    const add = pending; pending = {};
    s.patch((x: any) => {
      const days: Record<string, UsageDay> = { ...(x.usage?.days || {}) };
      for (const k of Object.keys(add)) {
        const cur = days[k] || { total: 0, sections: {}, hours: {} };
        const a = add[k];
        const sections = { ...cur.sections }; Object.entries(a.sections).forEach(([sec, v]) => (sections[sec] = (sections[sec] || 0) + v));
        const hours = { ...cur.hours }; Object.entries(a.hours).forEach(([h, v]) => (hours[h] = (hours[h] || 0) + v));
        days[k] = { total: cur.total + a.total, sections, hours };
      }
      // Keep the last 90 days.
      const keep = Object.keys(days).sort().slice(-90);
      return { ...x, usage: { days: Object.fromEntries(keep.map((k) => [k, days[k]])) } };
    });
  };

  setInterval(() => {
    if (document.visibilityState !== "visible" || Date.now() - lastInput > IDLE) return;
    const now = new Date();
    const k = dayKey(now), sec = sectionOf(window.location.pathname), h = String(now.getHours());
    const p = (pending[k] ||= { total: 0, sections: {}, hours: {} });
    p.total += TICK; p.sections[sec] = (p.sections[sec] || 0) + TICK; p.hours[h] = (p.hours[h] || 0) + TICK;
  }, TICK * 1000);
  setInterval(flush, 60_000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
  window.addEventListener("pagehide", flush);
}

/* ---------- Summaries ---------- */
export function fmtDuration(sec: number) {
  if (sec < 60) return sec > 0 ? "under a minute" : "0 min";
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
export function summarise(u: Usage, days = 7) {
  const out: { key: string; label: string; total: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = dayKey(d);
    out.push({ key: k, label: i === 0 ? "Today" : d.toLocaleDateString("en-GB", { weekday: "short" }), total: u.days[k]?.total || 0 });
  }
  const keys = new Set(out.map((x) => x.key));
  const sections: Record<string, number> = {}, hours: Record<string, number> = {};
  Object.entries(u.days).forEach(([k, d]) => {
    if (!keys.has(k)) return;
    Object.entries(d.sections).forEach(([s, v]) => (sections[s] = (sections[s] || 0) + v));
    Object.entries(d.hours || {}).forEach(([h, v]) => (hours[h] = (hours[h] || 0) + v));
  });
  const total = out.reduce((s, x) => s + x.total, 0);
  const activeDays = out.filter((x) => x.total > 0).length;
  const topSections = Object.entries(sections).sort((a, b) => b[1] - a[1]);
  const peak = Object.entries(hours).sort((a, b) => b[1] - a[1])[0];
  const partOf = (h: number) => (h < 5 ? "late at night" : h < 12 ? "in the morning" : h < 17 ? "in the afternoon" : h < 21 ? "in the evening" : "at night");
  return { perDay: out, total, today: out[out.length - 1].total, activeDays, average: activeDays ? total / activeDays : 0, topSections, peakHour: peak ? Number(peak[0]) : null, peakText: peak ? partOf(Number(peak[0])) : "" };
}
