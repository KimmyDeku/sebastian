"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { onApprovalNeeded, startTask, getAgentMeta, patchAgentMeta } from "@/lib/agent";
import { allRoutines, occurrences, type Routine } from "@/lib/routines";
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

function checkClashes() {
  const { d } = state(); if (!d) return;
  const now = Date.now(), horizon = now + 14 * 86400e3;
  const evs = (d.schedule || []).filter((e: any) => { const t = new Date(e.start).getTime(); return t > now && t < horizon && !["trip", "booking"].includes(e.kind); })
    .map((e: any) => ({ ...e, s: new Date(e.start).getTime(), e: e.end ? new Date(e.end).getTime() : new Date(e.start).getTime() + 3600e3 })).sort((a: any, b: any) => a.s - b.s);
  for (let i = 0; i + 1 < evs.length; i++) {
    const a = evs[i], b = evs[i + 1];
    if (b.s >= a.e || b.e - b.s > 12 * 3600e3) continue;
    const key = `clash:${a.id}:${b.id}:${a.start}:${b.start}`;
    if (seen(key)) continue;
    mark(key);
    // the next free slot after the first event, on the same day
    let next = a.e; for (const e of evs) if (e.id !== b.id && e.s < next + (b.e - b.s) && e.e > next) next = e.e;
    const nd = new Date(next); const local = new Date(nd.getTime() - nd.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const when = (t: number) => new Date(t).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    alert("Two of your plans overlap. I've suggested a fix in Tasks.");
    startTask("schedule clash", "sebastian", { title: `Clash: ${a.title} and ${b.title}`, steps: [
      { label: `${a.title} (${when(a.s)}) overlaps ${b.title} (${when(b.s)})`, tool: "info", args: { text: `"${a.title}" and "${b.title}" overlap on ${new Date(a.s).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}. I suggest moving "${b.title}" to straight after, at ${nd.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}. You can choose another time below.` }, critical: false },
      { label: `Move ${b.title} to ${when(next)}`, tool: "reschedule_event", args: { eventId: b.id, newStart: local, title: b.title }, critical: true, why: "Please also let anyone involved know about the new time." } ] });
  }
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
    };
    const watch = () => { try { checkClashes(); briefing(); } catch {} };
    const a = setInterval(tick, 30000), b = setInterval(watch, 10 * 60000);
    const first = setTimeout(watch, 15000);
    tick();
    if (new URLSearchParams(window.location.search).get("tasks") === "1") setTimeout(() => window.dispatchEvent(new Event("sebastian-open-tasks")), 800);
    return () => { clearInterval(a); clearInterval(b); clearTimeout(first); };
  }, [session]);
  return null;
}
