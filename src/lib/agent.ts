"use client";
/**
 * Sebastian's task engine. A task is a list of steps. Safe steps (searching, drafting,
 * explaining) run by themselves. Critical steps (anything that adds, changes, sends, books
 * or pays) wait for the user to approve them.
 */
import { useStore, actions } from "./store";
import { uid } from "./util";
import { api } from "./api";
import { logActivity } from "./activity";
import { track } from "./analytics";

export type StepStatus = "pending" | "running" | "done" | "awaiting" | "rejected" | "failed";
export type Step = { id: string; label: string; tool: string; args: any; critical: boolean; why?: string; status: StepStatus; summary?: string; result?: any; error?: string };
export type TaskStatus = "running" | "awaiting" | "done" | "cancelled" | "failed";
export type Task = { id: string; title: string; request: string; source: "you" | "voice" | "sebastian"; status: TaskStatus; steps: Step[]; createdAt: string; updatedAt: string; qa?: { q: string; a: string }[] };
export type AgentMeta = { seen: string[]; lastBriefing?: string };

const EMPTY: Task[] = [];
export function useTasks(): Task[] { return useStore((s) => ((s.sessionId ? (s.data[s.sessionId] as any)?.tasks : null) as Task[]) || EMPTY); }
const all = (): Task[] => { const s = useStore.getState(); return ((s.sessionId ? (s.data[s.sessionId] as any)?.tasks : null) as Task[]) || []; };
const save = (fn: (t: Task[]) => Task[]) => useStore.getState().patch((d: any) => ({ ...d, tasks: fn(d.tasks || []).slice(0, 120) }));
const upd = (id: string, fn: (t: Task) => Task) => save((ts) => ts.map((t) => (t.id === id ? { ...fn(t), updatedAt: new Date().toISOString() } : t)));
export const getAgentMeta = (): AgentMeta => { const s = useStore.getState(); return ((s.sessionId ? (s.data[s.sessionId] as any)?.agent : null) as AgentMeta) || { seen: [] }; };
export const patchAgentMeta = (fn: (m: AgentMeta) => AgentMeta) => useStore.getState().patch((d: any) => ({ ...d, agent: fn({ seen: [], ...(d.agent || {}) }) }));

export const CRITICAL_TOOLS = new Set(["add_event", "reschedule_event", "add_routine", "send_email", "open_link", "confirm", "mark_sub_paid", "fill_form", "shop_search", "ask_user"]);
const listeners = new Set<(t: Task, s: Step) => void>();
/** Lets the app react when a task needs the user's approval (for a notification). */
export const onApprovalNeeded = (fn: (t: Task, s: Step) => void) => { listeners.add(fn); return () => listeners.delete(fn); };

function context() {
  const s = useStore.getState(); const d: any = s.sessionId ? s.data[s.sessionId] : null;
  const acc: any = s.accounts.find((a) => a.id === s.sessionId);
  const now = new Date();
  const upcoming = [...(d?.schedule || [])].filter((e: any) => new Date(e.start) >= new Date(now.getTime() - 3600e3)).sort((a: any, b: any) => a.start.localeCompare(b.start)).slice(0, 25)
    .map((e: any) => ({ id: e.id, title: e.title, kind: e.kind, start: e.start }));
  return { today: now.toISOString().slice(0, 10), weekday: now.toLocaleDateString("en-GB", { weekday: "long" }), time: now.toTimeString().slice(0, 5), timezone: acc?.timezone, name: acc?.firstName,
    upcoming, interests: d?.interests || [], routines: (d?.routines || []).map((r: any) => ({ kind: r.kind, title: r.kind === "medication" ? "medication" : r.title })) };
}

/** Plans a request into steps (or uses the steps given) and starts working on it. */
export async function startTask(request: string, source: Task["source"] = "you", preset?: { title: string; steps: Omit<Step, "id" | "status">[] }) {
  const id = uid("tk_");
  const now = new Date().toISOString();
  const task: Task = { id, title: preset?.title || "Planning…", request, source, status: "running", steps: [], createdAt: now, updatedAt: now };
  save((ts) => [task, ...ts]);
  let plan = preset;
  if (!plan) {
    const r = await api<any>("/api/agent/plan", { request, context: context() });
    if (!r.ok || !r.steps?.length) { upd(id, (t) => ({ ...t, title: request.slice(0, 60), status: "failed", steps: [{ id: uid("st_"), label: "Plan the task", tool: "info", args: {}, critical: false, status: "failed", error: r.error || "Sebastian couldn't plan this one." }] })); return id; }
    plan = { title: r.title, steps: r.steps };
  }
  upd(id, (t) => ({ ...t, title: plan!.title, steps: plan!.steps.map((s) => ({ ...s, id: uid("st_"), critical: s.critical || CRITICAL_TOOLS.has(s.tool), status: "pending" as const })) }));
  logActivity({ kind: "link", title: `Task started: ${plan.title}`, href: "/settings#activity" });
  track("start_task", { source, steps: plan.steps.length });
  await run(id);
  return id;
}

async function run(id: string) {
  for (;;) {
    const t = all().find((x) => x.id === id);
    if (!t || t.status === "cancelled") return;
    const step = t.steps.find((s) => s.status === "pending" || s.status === "running");
    if (!step) {
      const failed = t.steps.length > 0 && t.steps.every((s) => s.status === "failed");
      upd(id, (x) => ({ ...x, status: failed ? "failed" : "done" }));
      if (!failed) logActivity({ kind: "link", title: `Task finished: ${t.title}`, href: "/settings#activity" });
      return;
    }
    if (step.critical && step.status === "pending") {
      upd(id, (x) => ({ ...x, status: "awaiting", steps: x.steps.map((s) => (s.id === step.id ? { ...s, status: "awaiting" } : s)) }));
      listeners.forEach((fn) => fn(t, step));
      return; // waits for approve / reject
    }
    upd(id, (x) => ({ ...x, status: "running", steps: x.steps.map((s) => (s.id === step.id ? { ...s, status: "running" } : s)) }));
    const out: Out = await execute(step).catch((e): Out => ({ ok: false, error: String(e?.message || e) }));
    upd(id, (x) => ({ ...x, steps: x.steps.map((s) => (s.id === step.id ? { ...s, status: out.ok ? "done" : "failed", summary: out.summary, result: out.result, error: out.error } : s)) }));
  }
}

export async function approveStep(taskId: string, stepId: string, args?: any) {
  upd(taskId, (t) => ({ ...t, status: "running", steps: t.steps.map((s) => (s.id === stepId ? { ...s, status: "running", args: args ?? s.args } : s)) }));
  const step = all().find((t) => t.id === taskId)?.steps.find((s) => s.id === stepId);
  if (step) {
    const out: Out = await execute(step).catch((e): Out => ({ ok: false, error: String(e?.message || e) }));
    upd(taskId, (t) => ({ ...t, steps: t.steps.map((s) => (s.id === stepId ? { ...s, status: out.ok ? "done" : "failed", summary: out.summary, result: out.result, error: out.error } : s)) }));
    logActivity({ kind: "link", title: `Approved: ${step.label}`, href: "/settings#activity" });
  }
  await run(taskId);
}
/** The user's answer to an "Ask you" step. Sebastian then replans the rest of the task with it. */
export async function answerStep(taskId: string, stepId: string, answer: string) {
  const t0 = all().find((t) => t.id === taskId); const st = t0?.steps.find((s) => s.id === stepId);
  if (!t0 || !st) return;
  const qa = [...(t0.qa || []), { q: st.args?.question || st.label, a: answer }];
  upd(taskId, (t) => ({ ...t, qa, status: "running", steps: t.steps.map((s) => (s.id === stepId ? { ...s, status: "done", summary: `You said: ${answer}` } : s)) }));
  const t = all().find((x) => x.id === taskId)!;
  const progress = t.steps.filter((s) => s.status === "done").map((s) => `${s.label}${s.summary ? ` (${s.summary})` : ""}`);
  const r = await api<any>("/api/agent/plan", { request: t.request, context: context(), answers: qa, progress });
  if (r.ok && r.steps?.length) {
    upd(taskId, (x) => ({ ...x, steps: [...x.steps.filter((s) => s.status !== "pending"), ...r.steps.map((s: any) => ({ ...s, id: uid("st_"), critical: s.critical || CRITICAL_TOOLS.has(s.tool), status: "pending" as const }))] }));
  }
  await run(taskId);
}

export async function rejectStep(taskId: string, stepId: string) {
  upd(taskId, (t) => ({ ...t, steps: t.steps.map((s) => (s.id === stepId ? { ...s, status: "rejected", summary: "You chose not to do this." } : s)) }));
  await run(taskId);
}
export const cancelTask = (id: string) => upd(id, (t) => ({ ...t, status: "cancelled", steps: t.steps.map((s) => (["pending", "awaiting", "running"].includes(s.status) ? { ...s, status: "rejected" as const } : s)) }));
export const clearFinished = () => save((ts) => ts.filter((t) => t.status === "running" || t.status === "awaiting"));

/* ---------- What each step does ---------- */
async function here(): Promise<{ lat: number; lng: number } | null> {
  if (!navigator.geolocation) return null;
  return new Promise((res) => navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }), () => res(null), { timeout: 5000, maximumAge: 600000 }));
}
type Out = { ok: boolean; summary?: string; result?: any; error?: string };
const STORES: Record<string, (q: string) => string> = {
  google: (q) => `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(q)}`,
  amazon: (q) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}`,
  takealot: (q) => `https://www.takealot.com/all?qsearch=${encodeURIComponent(q)}`,
  ebay: (q) => `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}`,
  aliexpress: (q) => `https://www.aliexpress.com/w/wholesale-${encodeURIComponent(q.replace(/\s+/g, "-"))}.html`,
};
function shopUrls(q: string, stores?: string[]) {
  const list = (stores?.length ? stores : ["google", "takealot", "amazon"]).map((x) => String(x).toLowerCase()).filter((x) => STORES[x]).slice(0, 4);
  return (list.length ? list : ["google"]).map((x) => STORES[x](q || ""));
}
async function execute(s: Step): Promise<Out> {
  const a = s.args || {};
  switch (s.tool) {
    case "info": return { ok: true, summary: a.text || s.label };
    case "find_places": {
      const loc = a.near ? null : await here();
      const r = await api<any>("/api/places", { category: a.query, text: a.query, ...(a.near ? { where: a.near } : loc ? loc : { where: "Harare, Zimbabwe" }) });
      if (!r.ok) return { ok: false, error: r.error };
      const items = (r.results || []).slice(0, 5).map((p: any) => ({ name: p.name, detail: [p.rating ? `★ ${p.rating}` : "", p.address].filter(Boolean).join(" · "), url: p.mapsUrl }));
      return { ok: true, summary: `Found ${items.length} near ${r.where}.`, result: { items } };
    }
    case "search_stays": {
      const r = await api<any>("/api/booking", { type: "stays", dest: a.dest, checkin: a.checkin, checkout: a.checkout, adults: a.adults || 2, children: 0, rooms: 1 });
      if (!r.ok) return { ok: false, error: r.error };
      const items = (r.items || []).slice(0, 5).map((h: any) => ({ name: h.name, detail: [h.rating ? `★ ${h.rating}` : "", h.priceEstimate].filter(Boolean).join(" · "), url: h.link }));
      return { ok: true, summary: `${items.length} places to stay in ${a.dest}. Prices are estimates.`, result: { items } };
    }
    case "draft_email": {
      const acc: any = useStore.getState().accounts.find((x) => x.id === useStore.getState().sessionId);
      const r = await api<any>("/api/email", { mode: "draft", instruction: a.instruction, tone: a.tone || "Professional", sender: [acc?.firstName, acc?.surname].filter(Boolean).join(" ") });
      if (!r.ok) return { ok: false, error: r.error };
      return { ok: true, summary: `Drafted: ${r.draft?.subject}`, result: { subject: r.draft?.subject, body: r.draft?.body, to: a.to || r.draft?.toEmail || "", instruction: a.instruction } };
    }
    case "add_event": {
      const start = new Date(a.start);
      if (isNaN(start.getTime())) return { ok: false, error: "The date or time isn't clear." };
      const id = actions.addEvent({ kind: a.kind || "reminder", title: a.title, start: start.toISOString(), remindMinutes: a.remindMinutes ?? 30, notes: a.notes, source: { type: "manual", ref: `task:${uid("")}` } } as any);
      const { saveToGoogle } = await import("./gsync");
      const g = await saveToGoogle(id);
      return { ok: true, summary: `Added to your schedule${g.result === "added" ? " and Google Calendar" : ""}: ${a.title}, ${start.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.${g.result === "pending" ? " It will be saved to Google Calendar when you next reconnect it." : ""}` };
    }
    case "reschedule_event": {
      const start = new Date(a.newStart);
      if (!a.eventId || isNaN(start.getTime())) return { ok: false, error: "The new time isn't clear." };
      actions.updateEvent(a.eventId, { start: start.toISOString(), notified: false } as any);
      const { saveToGoogle } = await import("./gsync");
      const g = await saveToGoogle(a.eventId);
      return { ok: true, summary: `${g.result === "moved" || g.result === "added" ? "Moved (and updated in Google Calendar) to " : "Moved to "}${start.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.` };
    }
    case "add_routine": {
      const { addRoutine } = await import("./routines");
      addRoutine(a);
      return { ok: true, summary: `Reminder set up: ${a.title}.` };
    }
    case "send_email": {
      const q = new URLSearchParams({ instruction: a.instruction || a.subject || "" });
      window.location.href = `/email?${q.toString()}`;
      return { ok: true, summary: "Opened in Email for you to check and send." };
    }
    case "fill_form":
    case "shop_search": {
      const { sendToCompanion, companionReady } = await import("./companion");
      const urls: string[] = s.tool === "fill_form" ? [a.url] : shopUrls(a.query, a.stores);
      if (!urls.every((u) => /^https:\/\//.test(u || ""))) return { ok: false, error: "Only secure (https) websites can be opened." };
      const t = all().find((x) => x.steps.some((y) => y.id === s.id));
      const brief = [t?.request, ...(t?.qa || []).map((q) => `${q.q} ${q.a}`)].filter(Boolean).join(" · ").slice(0, 600);
      if (companionReady()) {
        urls.forEach((url) => sendToCompanion({ type: "open", url, mode: s.tool === "fill_form" ? "fill" : "shop", brief, query: a.query }));
        return { ok: true, summary: s.tool === "fill_form" ? `Opened ${new URL(urls[0]).hostname} and filled your basic details (shown in gold). Check them and submit it yourself. Tap the bow tie on that page to talk to Sebastian.` : `Opened ${urls.length} store search${urls.length > 1 ? "es" : ""}. Tap the bow tie on any page to talk it through with Sebastian. You complete any purchase yourself.` };
      }
      urls.forEach((url) => window.open(url, "_blank", "noopener"));
      return { ok: true, summary: `Opened ${urls.map((u) => new URL(u).hostname).join(", ")}. Switch on Sebastian Companion (in Your apps) and Sebastian can fill forms and talk you through pages there.` };
    }
    case "open_link": {
      if (!/^https:\/\//.test(a.url || "")) return { ok: false, error: "Only secure (https) websites can be opened." };
      window.open(a.url, "_blank", "noopener");
      return { ok: true, summary: `Opened ${new URL(a.url).hostname}. Finish there; Sebastian never enters passwords or card details.` };
    }
    case "confirm": return { ok: true, summary: a.done || "Confirmed." };
    case "ask_user": return { ok: true, summary: "Answered." };
    case "mark_sub_paid": {
      const { markPaid } = await import("./subscriptions");
      const next = markPaid(a.id);
      return next ? { ok: true, summary: `Payment recorded in Finance. Next one due ${new Date(`${next}T09:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.` } : { ok: false, error: "That subscription wasn't found." };
    }
    default: return { ok: false, error: `Sebastian can't do "${s.tool}" yet.` };
  }
}
