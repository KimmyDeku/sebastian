"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { onApprovalNeeded, startTask, getAgentMeta, patchAgentMeta } from "@/lib/agent";
import { allRoutines, occurrences, type Routine } from "@/lib/routines";
import { allSubs, money } from "@/lib/subscriptions";
import { refreshRecs } from "@/lib/recommend";
import { refreshGoogle, findClashes, type Clash } from "@/lib/clash";
import { briefingSettings, buildBriefing, localDate } from "@/lib/briefing";
import { alertPhrase } from "@/lib/alertPhrase";
import { playChime } from "@/lib/sound";
import { pushNotify } from "@/lib/notify";
import { pushEndpoint } from "@/lib/push";
import { useSpeaker } from "@/lib/voice";

// Sebastian's voice, borrowed from the component below so alerts can speak.
let say: ((t: string) => void) | null = null;
import { toast } from "../ui/Toast";

const state = () => { const s = useStore.getState(); const d: any = s.sessionId ? s.data[s.sessionId] : null; const acc: any = s.accounts.find((a) => a.id === s.sessionId); return { d, acc }; };
const seen = (key: string) => getAgentMeta().seen.includes(key);
const mark = (key: string) => patchAgentMeta((m) => ({ ...m, seen: [key, ...m.seen.filter((k) => k !== key)].slice(0, 400) }));

/** The discreet alert: a chime, Sebastian's phrase (never the details), and a notification when push is off. */
function alert(visible: string) {
  const { d, acc } = state();
  if (!d || d.prefs?.notifications === false) return;
  const line = alertPhrase(acc, d.prefs?.useTitle !== false);
  try { playChime(); } catch {}
  if (d.prefs?.voiceAlerts !== false) { try { say?.(line); } catch {} }
  toast.info(visible);
  if (!pushEndpoint() || document.visibilityState !== "visible") pushNotify("Sebastian", line, { tag: "sebastian-task", url: "/?tasks=1" });
}

function fireRoutine(r: Routine, when: "due" | "soon") {
  const pay = r.link ? [{ label: `Open ${new URL(r.link).hostname} to pay`, tool: "open_link", args: { url: r.link }, critical: true, why: "You complete the payment yourself; Sebastian never enters card details." }]
                     : [{ label: "Mark as paid", tool: "confirm", args: { done: "Marked as paid." }, critical: true }];
  if (r.kind === "water") return alert("Time for a glass of water.");
  if (r.kind === "move") return alert("Time to stand up, stretch and move for a few minutes.");
  alert(r.kind === "medication" ? "It's time for your medication." : when === "soon" ? `Coming up soon: ${r.title}.` : `Reminder: ${r.title}.`);
  if (r.kind === "medication") return startTask(r.title, "sebastian", { title: `Medication: ${r.title}`, steps: [
    { label: "Time for your medication", tool: "info", args: { text: `It's time for ${r.title}${r.note ? ` (${r.note})` : ""}. If you have any questions about your medicine, please ask your doctor or pharmacist.` }, critical: false },
    { label: "Confirm you've taken it", tool: "confirm", args: { done: "Marked as taken." }, critical: true } ] });
  if (r.kind === "bill" || r.kind === "subscription" || r.kind === "insurance") return startTask(r.title, "sebastian", { title: `${when === "soon" ? "Due soon" : "Due today"}: ${r.title}`, steps: [
    { label: `${r.title}${r.amount ? `, ${r.amount}` : ""} is ${when === "soon" ? (r.kind === "insurance" ? "due in two weeks" : "due in three days") : "due today"}`, tool: "info", args: { text: `${r.title}${r.amount ? ` (${r.amount})` : ""} is ${when === "soon" ? "coming up" : "due today"}.${r.note ? ` ${r.note}` : ""}` }, critical: false }, ...pay ] });
  if (r.kind === "application") return startTask(r.title, "sebastian", { title: `Follow up: ${r.title}`, steps: [
    { label: `Draft a polite follow-up about ${r.title}`, tool: "draft_email", args: { instruction: `A short, polite follow-up email asking about the status of my application for ${r.title}.${r.note ? ` Details: ${r.note}` : ""}` }, critical: false },
    { label: "Open it in Email for you to check and send", tool: "send_email", args: { instruction: `A short, polite follow-up email asking about the status of my application for ${r.title}.` }, critical: true } ] });
  if (r.kind === "custom") return;
}

/** Clashes across Sebastian's schedule and Google Calendar: Sebastian says so and offers to move one. */
const waiting: Clash[] = [];
async function checkClashes() {
  const { d } = state(); if (!d) return;
  await refreshGoogle().catch(() => null);
  for (const c of findClashes(14)) {
    if (seen(c.key)) continue;
    mark(c.key);
    if (document.visibilityState === "visible") window.dispatchEvent(new CustomEvent("sebastian-clash", { detail: c }));
    else { waiting.push(c); alert("Two of your plans overlap."); }
  }
}
if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  while (waiting.length) window.dispatchEvent(new CustomEvent("sebastian-clash", { detail: waiting.shift() }));
});

/** On (or after) each due date, a task to pay and then record the payment, both waiting for approval. */
function checkSubscriptions() {
  const today = new Date().toISOString().slice(0, 10);
  for (const s of allSubs()) {
    if (!s.active || s.nextDue > today) continue;
    const key = `sub:${s.id}:${s.nextDue}`;
    if (seen(key)) continue;
    mark(key);
    alert(`Payment due: ${s.name}.`);
    startTask(s.name, "sebastian", { title: `Payment due: ${s.name}`, steps: [
      { label: `${s.name}: ${money(s.amount, s.currency)} is due${s.nextDue < today ? " (overdue)" : " today"}`, tool: "info", args: { text: `${s.name} (${money(s.amount, s.currency)}) was due on ${new Date(`${s.nextDue}T09:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.` }, critical: false },
      ...(s.payLink ? [{ label: `Open ${new URL(s.payLink).hostname} to pay`, tool: "open_link", args: { url: s.payLink }, critical: true, why: "You complete the payment yourself; Sebastian never enters card details." }] : []),
      { label: `Record the payment of ${money(s.amount, s.currency)}`, tool: "mark_sub_paid", args: { id: s.id }, critical: true, why: "Adds it to your Finance expenses and schedules the next reminder." },
    ] });
  }
}

/** The daily briefing: at the chosen time (or within three hours of it), Sebastian prepares it and says so. */
let briefingBusy = false;
async function dailyBriefing() {
  const s = briefingSettings(); if (!s.enabled || briefingBusy) return;
  const now = new Date(); const today = localDate(now);
  if (s.days === "weekdays" && (now.getDay() === 0 || now.getDay() === 6)) return;
  const [h, m] = s.time.split(":").map(Number); const due = new Date(now); due.setHours(h || 0, m || 0, 0, 0);
  if (now < due || now.getTime() - due.getTime() > 3 * 3600e3 || (getAgentMeta() as any).lastBriefing2 === today) return;
  patchAgentMeta((x) => ({ ...x, lastBriefing2: today } as any));
  briefingBusy = true;
  try {
    const b = await buildBriefing();
    if (!b) return;
    if (document.visibilityState === "visible") { alert("Your daily briefing is ready."); window.dispatchEvent(new Event("sebastian-briefing-ready")); }
    else pushNotify("Sebastian", "Your daily briefing is ready.", { tag: "sebastian-briefing", url: "/briefing?play=1" });
  } finally { briefingBusy = false; }
}

/** Each evening from 18:00: fresh suggestions, and a gentle note that they're ready. */
async function suggestions() {
  const now = new Date(); const today = now.toISOString().slice(0, 10);
  if (now.getHours() < 18 || (getAgentMeta() as any).lastSuggest === today) return;
  patchAgentMeta((m) => ({ ...m, lastSuggest: today } as any));
  if (await refreshRecs(true)) alert("I've found a few things you might enjoy. Have a look in For you.");
}

function briefing() {
  const { d } = state(); if (!d) return;
  const now = new Date(); const today = now.toISOString().slice(0, 10);
  if (now.getHours() < 7 || getAgentMeta().lastBriefing === today) return;
  patchAgentMeta((m) => ({ ...m, lastBriefing: today }));
  const day = 86400e3, t = now.getTime();
  const evs = (d.schedule || []).map((e: any) => ({ ...e, s: new Date(e.start).getTime() }));
  const week = evs.filter((e: any) => e.s > t && e.s < t + 7 * day).sort((a: any, b: any) => a.s - b.s);
  const later = evs.filter((e: any) => e.s >= t + 7 * day && e.s < t + 31 * day).sort((a: any, b: any) => a.s - b.s);
  if (!week.length && !later.length) return;
  const fmt = (e: any) => `${new Date(e.s).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}: ${e.title}`;
  startTask("daily look-ahead", "sebastian", { title: "Your week ahead", steps: [
    ...(week.length ? [{ label: `${week.length} thing${week.length > 1 ? "s" : ""} in the next 7 days`, tool: "info", args: { text: week.slice(0, 8).map(fmt).join("\n") }, critical: false }] : []),
    ...(later.length ? [{ label: `Coming up later this month, to prepare for`, tool: "info", args: { text: later.slice(0, 6).map(fmt).join("\n") }, critical: false }] : []),
  ] });
}

/** Sebastian keeps watch: routines, clashes and a daily look-ahead, and asks for approval when needed. */
export function AgentEngine() {
  const session = useStore((s) => s.sessionId);
  const schedule = useStore((s) => (s.sessionId ? (s.data[s.sessionId] as any)?.schedule : null));
  useEffect(() => { if (!schedule) return; const t = setTimeout(() => { checkClashes().catch(() => {}); }, 3000); return () => clearTimeout(t); }, [schedule]);
  const voiceName = useStore((s) => (s.sessionId ? (s.data[s.sessionId] as any)?.prefs?.voiceName : undefined));
  const { speak } = useSpeaker();
  useEffect(() => { say = (t) => speak(t, voiceName); return () => { say = null; }; }, [speak, voiceName]);
  useEffect(() => { const off = onApprovalNeeded((t, s) => { if (t.source !== "sebastian") alert(`Sebastian needs your approval: ${s.label}`); }); return () => { off(); }; }, []);
  useEffect(() => {
    if (!session) return;
    const KEY = "sebastian-routines-last";
    const tick = () => {
      const last = Number(localStorage.getItem(KEY) || 0) || Date.now() - 60000;
      const now = Date.now();
      localStorage.setItem(KEY, String(now));
      if (now - last > 6 * 3600e3) return; // don't replay a backlog after a long absence
      for (const r of allRoutines()) for (const o of occurrences(r, new Date(last), new Date(now))) fireRoutine(r, o.when);
      dailyBriefing().catch(() => {});
    };
    const watch = () => { try { checkClashes(); checkSubscriptions(); briefing(); suggestions(); } catch {} };
    const a = setInterval(tick, 30000), b = setInterval(watch, 10 * 60000);
    const first = setTimeout(watch, 15000);
    tick();
    if (new URLSearchParams(window.location.search).get("tasks") === "1") setTimeout(() => window.dispatchEvent(new Event("sebastian-open-tasks")), 800);
    return () => { clearInterval(a); clearInterval(b); clearTimeout(first); };
  }, [session]);
  return null;
}
