"use client";
/**
 * The daily briefing: at the time the user chooses, Sebastian gathers follow-ups, today's plans,
 * payments due and what they care about, then writes (and reads aloud) the highlights of the day.
 */
import { useStore } from "./store";
import { allItems, findClashes, refreshGoogle } from "./clash";
import { allSubs, money } from "./subscriptions";
import { refreshRecs } from "./recommend";

export type BriefingSettings = { enabled: boolean; time: string; days: "every" | "weekdays"; asked?: boolean };
export type Briefing = { date: string; at: string; greeting: string; narration: string; focus: string[]; sections: { title: string; items: { text: string; href?: string }[] }[] };
const DEFAULTS: BriefingSettings = { enabled: false, time: "07:30", days: "every" };

const d0 = () => { const s = useStore.getState(); return s.sessionId ? (s.data[s.sessionId] as any) : null; };
export function useBriefingSettings(): BriefingSettings { return useStore((s) => ({ ...DEFAULTS, ...((s.sessionId ? (s.data[s.sessionId] as any)?.briefingSettings : null) || {}) })); }
export const briefingSettings = (): BriefingSettings => ({ ...DEFAULTS, ...(d0()?.briefingSettings || {}) });
export const setBriefingSettings = (p: Partial<BriefingSettings>) => useStore.getState().patch((d: any) => ({ ...d, briefingSettings: { ...DEFAULTS, ...(d.briefingSettings || {}), ...p } }));
const EMPTY: Briefing | null = null;
export function useBriefing(): Briefing | null { return useStore((s) => ((s.sessionId ? (s.data[s.sessionId] as any)?.briefing : null) as Briefing) || EMPTY); }
export const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** The next time the briefing is due (null when it's switched off). */
export function nextBriefing(s = briefingSettings(), from = new Date()): Date | null {
  if (!s.enabled) return null;
  const [h, m] = s.time.split(":").map(Number);
  for (let i = 0; i < 8; i++) {
    const t = new Date(from); t.setDate(t.getDate() + i); t.setHours(h || 0, m || 0, 0, 0);
    if (t <= from) continue;
    if (s.days === "weekdays" && (t.getDay() === 0 || t.getDay() === 6)) continue;
    return t;
  }
  return null;
}
/** Push job for the next briefing (an id and a time only). */
export function briefingJob() { const t = nextBriefing(); return t ? [{ id: `brief_${localDate(t).replace(/-/g, "")}`, fireAt: t.toISOString() }] : []; }

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/** Gathers everything worth knowing today. */
async function gather() {
  const d = d0(); if (!d) return null;
  await refreshGoogle().catch(() => null);
  const now = new Date(), endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);
  const today = allItems().filter((i) => new Date(i.end) >= now && new Date(i.start) <= endOfDay).map((i) => `${fmtTime(i.start)} ${i.title}${i.source === "google" ? " (Google Calendar)" : ""}`);
  const clashes = findClashes(2).map((c) => `${c.a.title} and ${c.b.title} overlap at ${fmtTime(c.b.start)}`);
  const followUps = (d.email?.followUps || []).filter((f: any) => f.status === "waiting").map((f: any) => `${new Date(f.due) <= now ? "Due" : "Waiting"}: reply from ${f.toName || f.to} about "${f.subject}"`);
  const applications = (d.routines || []).filter((r: any) => r.active && r.kind === "application" && r.date && r.date <= localDate(new Date(now.getTime() + 2 * 86400e3))).map((r: any) => `Follow up on ${r.title}`);
  const waiting = (d.tasks || []).filter((t: any) => t.status === "awaiting").map((t: any) => `Waiting for your approval: ${t.title}`);
  const in7 = localDate(new Date(now.getTime() + 7 * 86400e3));
  const payments = allSubs().filter((s) => s.active && s.nextDue <= in7).map((s) => `${s.name}, ${money(s.amount, s.currency)}, due ${new Date(`${s.nextDue}T09:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}`);
  // What they care about: news from their sources that matches their interests, and Sebastian's picks.
  const interests: string[] = d.interests || [];
  let news: { title: string; link: string; source: string; match?: boolean }[] = [];
  try {
    const r = await fetch("/api/news", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sources: d.news?.sources || ["bbc", "zbc"], categories: Array.from(new Set([...(d.news?.categories || ["top"]), "business", "technology"])) }) }).then((x) => x.json());
    const words = interests.flatMap((i) => i.toLowerCase().split(/\W+/).filter((w) => w.length >= 4 && !["jobs", "near", "with", "from", "about"].includes(w)));
    news = (r.items || []).slice(0, 60).map((n: any) => ({ title: n.title, link: n.link, source: n.sourceName, match: words.some((w) => n.title.toLowerCase().includes(w)) }));
    news = [...news.filter((n) => n.match), ...news.filter((n) => !n.match)].slice(0, 6);
  } catch {}
  await refreshRecs().catch(() => false);
  const picks = ((d0()?.recs?.items) || []).slice(0, 3).map((r: any) => `${r.title}: ${r.why}`);
  return { today, clashes, followUps: [...followUps, ...applications], waiting, payments, news, picks, interests };
}

/** Builds today's briefing (and saves it). */
export async function buildBriefing(): Promise<Briefing | null> {
  const g = await gather(); if (!g) return null;
  const s = useStore.getState(); const acc: any = s.accounts.find((a) => a.id === s.sessionId); const d = d0();
  const r = await fetch("/api/briefing", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...g, news: g.news.map((n) => `${n.title} (${n.source})${n.match ? " [matches their interests]" : ""}`), name: acc?.firstName, address: d?.prefs?.useTitle === false ? acc?.firstName : acc?.gender === "male" ? "Master " + (acc?.firstName || "") : "Lady " + (acc?.firstName || ""),
      now: new Date().toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) }) }).then((x) => x.json()).catch(() => ({ ok: false }));
  const sections = [
    { title: "Today", items: g.today.map((t) => ({ text: t, href: "/schedule?tab=calendar" })) },
    { title: "Clashes", items: g.clashes.map((t) => ({ text: t, href: "/schedule?tab=calendar" })) },
    { title: "Follow-ups", items: g.followUps.map((t) => ({ text: t, href: "/email" })) },
    { title: "Waiting for you", items: g.waiting.map((t) => ({ text: t, href: "/?tasks=1" })) },
    { title: "Payments this week", items: g.payments.map((t) => ({ text: t, href: "/finance?tab=subs" })) },
    { title: "News for you", items: g.news.map((n) => ({ text: `${n.title} (${n.source})`, href: n.link })) },
    { title: "Picked for you", items: g.picks.map((t) => ({ text: t, href: "/for-you" })) },
  ].filter((x) => x.items.length);
  const b: Briefing = { date: localDate(), at: new Date().toISOString(), greeting: r.greeting || "Good day.", narration: r.narration || "Your briefing is ready below.", focus: Array.isArray(r.focus) ? r.focus.slice(0, 3) : [], sections };
  useStore.getState().patch((x: any) => ({ ...x, briefing: b }));
  return b;
}
