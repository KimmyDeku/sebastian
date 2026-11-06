"use client";
/** Email notifications: reminders scheduled on Sebastian's server, and finds sent straight away. */
import { useStore } from "./store";
import { api } from "./api";
import { allRoutines, occurrences } from "./routines";
import { briefingSettings, nextBriefing, localDate } from "./briefing";

export type EmailPrefs = { enabled: boolean; reminders: boolean; briefing: boolean; finds: boolean; needs: boolean };
const DEFAULTS: EmailPrefs = { enabled: true, reminders: true, briefing: true, finds: true, needs: true };
export function useEmailPrefs(): EmailPrefs { return useStore((s) => ({ ...DEFAULTS, ...((s.sessionId ? (s.data[s.sessionId] as any)?.emailNotify : null) || {}) })); }
export const emailPrefs = (): EmailPrefs => { const s = useStore.getState(); return { ...DEFAULTS, ...((s.sessionId ? (s.data[s.sessionId] as any)?.emailNotify : null) || {}) }; };
export const setEmailPrefs = (p: Partial<EmailPrefs>) => useStore.getState().patch((d: any) => ({ ...d, emailNotify: { ...DEFAULTS, ...(d.emailNotify || {}), ...p } }));

type Body = { title: string; intro?: string; lines?: string[]; url?: string; button?: string };
const when = (d: Date) => d.toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/** Upcoming reminder emails, worked out from the schedule, routines and the daily briefing. */
function buildJobs() {
  const p = emailPrefs(); if (!p.enabled) return [];
  const s = useStore.getState(); const d: any = s.sessionId ? s.data[s.sessionId] : null; if (!d) return [];
  const now = Date.now(), until = now + 14 * 86400e3;
  const jobs: { id: string; fireAt: string; kind: string; subject: string; body: Body }[] = [];
  if (p.reminders) {
    for (const e of d.schedule || []) {
      if (e.remindMinutes == null || e.remindMinutes < 0) continue;
      const start = new Date(e.start); const fire = start.getTime() - e.remindMinutes * 60000;
      if (fire < now - 60000 || fire > until) continue;
      const soon = e.remindMinutes >= 1440 ? `in ${Math.round(e.remindMinutes / 1440)} day${e.remindMinutes >= 2880 ? "s" : ""}` : e.remindMinutes >= 60 ? `in ${Math.round(e.remindMinutes / 60)} hour${e.remindMinutes >= 120 ? "s" : ""}` : e.remindMinutes > 0 ? `in ${e.remindMinutes} minutes` : "now";
      jobs.push({ id: `ev_${e.id}_${start.getTime()}`, fireAt: new Date(fire).toISOString(), kind: "reminder", subject: `Reminder: ${e.title} (${soon})`,
        body: { title: e.title, intro: `${when(start)}${e.location ? `, at ${e.location}` : ""}.`, lines: e.notes ? [String(e.notes).slice(0, 300)] : [], url: "/schedule?tab=calendar", button: "Open your calendar" } });
    }
    for (const r of allRoutines()) {
      if (r.kind === "water" || r.kind === "move") continue; // push only, so the inbox isn't flooded
      for (const o of occurrences(r, new Date(now), new Date(now + 2 * 86400e3))) {
        const subject = r.kind === "medication" ? `Time for your medication: ${r.title}` : r.kind === "application" ? `Follow up: ${r.title}` : o.when === "soon" ? `Coming up: ${r.title}` : `Due today: ${r.title}`;
        jobs.push({ id: `rt_${r.id}_${o.at.getTime()}`, fireAt: o.at.toISOString(), kind: "routine", subject,
          body: { title: subject, intro: r.kind === "medication" ? "A gentle reminder from Sebastian. For questions about your medicine, please ask your doctor or pharmacist." : `${r.amount ? `${r.amount}. ` : ""}${r.note || ""}`.trim() || undefined, url: r.link || "/schedule", button: r.link ? "Open the payment page" : "Open Sebastian" } });
      }
    }
  }
  if (p.briefing) { const t = nextBriefing(briefingSettings()); if (t) jobs.push({ id: `brief_${localDate(t)}`, fireAt: t.toISOString(), kind: "briefing", subject: "Your daily briefing is ready", body: { title: "Good morning. Your daily briefing is ready.", intro: "Your follow-ups, today's plans, payments due and the news you care about, gathered by Sebastian.", url: "/briefing?play=1", button: "Hear your briefing" } }); }
  return jobs.sort((a, b) => a.fireAt.localeCompare(b.fireAt)).slice(0, 300);
}

/** Keeps the server's list of upcoming reminder emails up to date (only when something changed). */
export async function syncEmailJobs() {
  const jobs = buildJobs();
  const sig = JSON.stringify(jobs.map((j) => [j.id, j.fireAt, j.subject]));
  try { if (localStorage.getItem("sebastian-email-sync") === sig) return; } catch {}
  const r = await api<any>("/api/notify/sync", { jobs });
  if (r.ok) { try { localStorage.setItem("sebastian-email-sync", sig); } catch {} }
  return r;
}

/** Sends an email straight away (if that kind is switched on). `key` stops the same email going twice. */
export async function emailNow(kind: "briefing" | "finds" | "needs" | "test", key: string, subject: string, body: Body, replaces?: string) {
  const p = emailPrefs();
  if (kind !== "test" && (!p.enabled || !p[kind])) return { ok: false, skipped: true };
  return api<any>("/api/notify/send", { kind, key: kind === "test" ? `test_${Date.now()}` : key, subject, body, replaces });
}
