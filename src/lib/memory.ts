"use client";
/**
 * Sebastian's memory: a compact profile of the user, learned in the background from their
 * chats, activity, schedule, recipes, trips and settings, and given to Sebastian at the start
 * of every conversation so a new chat never means starting from zero.
 * Users can see, edit and clear it in Settings, under Memory.
 */
import { useStore } from "./store";
import { uid } from "./util";
import { summarise, SECTION_NAMES } from "./usage";

export type MemoryFact = { id: string; text: string; category: string; pinned?: boolean };
export type Memory = { summary: string; style: string; facts: MemoryFact[]; updatedAt: string; basis: number };
const EMPTY: Memory = { summary: "", style: "", facts: [], updatedAt: "", basis: 0 };

export function useMemory(): Memory {
  return useStore((s) => ((s.sessionId ? (s.data[s.sessionId] as any)?.memory : null) as Memory) || EMPTY);
}
const current = (): Memory => { const s = useStore.getState(); return ((s.sessionId ? (s.data[s.sessionId] as any)?.memory : null) as Memory) || EMPTY; };
export const patchMemory = (fn: (m: Memory) => Memory) => useStore.getState().patch((d: any) => ({ ...d, memory: fn({ ...EMPTY, ...(d.memory || {}) }) }));
export const addPinned = (text: string, category = "preferences") => patchMemory((m) => ({ ...m, facts: [{ id: uid("mf_"), text: text.trim(), category, pinned: true }, ...m.facts] }));
export const forgetFact = (id: string) => patchMemory((m) => ({ ...m, facts: m.facts.filter((f) => f.id !== id) }));
export const forgetAll = () => useStore.getState().patch((d: any) => ({ ...d, memory: { ...EMPTY, updatedAt: new Date().toISOString(), basis: activityCount(d) } }));

const cut = (s: any, n: number) => { const t = String(s ?? "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };

/** A rough measure of how much the user has done, to decide when to learn again. */
export function activityCount(d: any) {
  const msgs = (d.chats || []).reduce((n: number, c: any) => n + (c.messages || []).filter((m: any) => m.role === "user").length, 0);
  return msgs + (d.activity || []).length + Math.floor((Object.values(d.usage?.days || {}) as any[]).reduce((n: number, x: any) => n + (x.total || 0), 0) / 1800) + (d.schedule || []).length + (d.cookbook || []).length + (d.trips || []).length + (d.places || []).length;
}

/** Everything Sebastian learns from, condensed. Email contents and money amounts are left out. */
export function buildSignals(): string | null {
  const s = useStore.getState();
  const d: any = s.sessionId ? s.data[s.sessionId] : null;
  const acc: any = s.accounts.find((a) => a.id === s.sessionId);
  if (!d || !acc) return null;
  const age = acc.dob ? Math.floor((Date.now() - new Date(acc.dob).getTime()) / 3.15576e10) : null;
  const lines: string[] = [];
  lines.push(`PROFILE: ${acc.firstName} ${acc.surname}; ${age ? `age ${age}; ` : ""}time zone ${acc.timezone}; prefers ${d.prefs?.useTitle ? `the title ${acc.gender === "male" ? "Lord" : "Lady"}` : "no title"}; plan ${d.prefs?.plan || "silver"}; ${d.prefs?.voiceReplies ? "likes spoken replies" : "reads replies"}.`);
  try { const l = localStorage.getItem("sebastian-lang"); if (l && l !== "en") lines.push(`LANGUAGE: uses Sebastian in ${l}.`); } catch {}
  const chats = [...(d.chats || [])].sort((a: any, b: any) => String(b.updatedAt).localeCompare(a.updatedAt)).slice(0, 14);
  if (chats.length) lines.push("RECENT CONVERSATIONS (what the user said):", ...chats.map((c: any) => `- "${cut(c.title, 60)}" (${String(c.updatedAt).slice(0, 10)}): ${(c.messages || []).filter((m: any) => m.role === "user").slice(-4).map((m: any) => cut(m.content, 160)).join(" | ")}`));
  const act = (d.activity || []).slice(0, 70);
  if (act.length) lines.push("RECENT ACTIVITY:", ...act.map((a: any) => `- ${String(a.at).slice(0, 10)} ${a.kind}: ${cut(a.title, 90)}`));
  const sched = [...(d.schedule || [])].sort((a: any, b: any) => String(b.start).localeCompare(a.start)).slice(0, 25);
  if (sched.length) lines.push("SCHEDULE:", ...sched.map((e: any) => `- ${String(e.start).slice(0, 16).replace("T", " ")} ${e.kind}: ${cut(e.title, 70)}`));
  if ((d.cookbook || []).length) lines.push(`SAVED RECIPES: ${(d.cookbook || []).slice(0, 20).map((r: any) => cut(r.title, 40)).join("; ")}`);
  if ((d.trips || []).length) lines.push(`TRIPS: ${(d.trips || []).slice(0, 10).map((t: any) => `${t.destination} (${t.start}, ${t.travellers} travellers, budget ${t.budget}, ${(t.activities || []).join("/")})`).join("; ")}`);
  // Time spent: where and when they use Sebastian (last 30 days).
  if (d.usage?.days && Object.keys(d.usage.days).length) {
    const u = summarise(d.usage, 30);
    const mins = (x: number) => Math.round(x / 60);
    lines.push(`TIME IN THE APP (30 days): ${mins(u.total)} min over ${u.activeDays} days; most used: ${u.topSections.slice(0, 5).map(([k, v]) => `${SECTION_NAMES[k] || k} ${mins(v)} min`).join(", ")}${u.peakText ? `; usually active ${u.peakText}` : ""}.`);
  }
  const dna = Object.entries(d.tripDNA?.activities || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 6).map((x) => x[0]);
  const dnaPlaces = Object.entries(d.tripDNA?.destinations || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map((x) => x[0]);
  const budgets: number[] = d.tripDNA?.budgets || [];
  if (dna.length || dnaPlaces.length) lines.push(`TRIP DNA: interests ${dna.join(", ") || "—"}; favourite destinations ${dnaPlaces.join(", ") || "—"}${budgets.length ? `; typical trip budget about ${Math.round(budgets.reduce((a, b) => a + b, 0) / budgets.length)}` : ""}`);
  if ((d.places || []).length) lines.push(`SAVED PLACES: ${(d.places || []).slice(0, 15).map((p: any) => `${cut(p.name, 30)} (${p.category})`).join("; ")}`);
  if ((d.plans || []).length) lines.push(`SAVINGS GOALS: ${(d.plans || []).slice(0, 6).map((p: any) => cut(p.name || p.goal, 40)).join("; ")}`);
  if (d.news?.sources?.length) lines.push(`NEWS: follows ${(d.news.sources || []).join(", ")}; topics ${(d.news.categories || []).join(", ")}`);
  const nb = d.notebook || {};
  if ((nb.tutor || []).length) lines.push(`STUDYING: ${nb.tutor.map((t: any) => `${t.subject} (${t.level}; ${t.topics?.[0] || ""})`).join("; ")}`);
  if ((nb.langs || []).length) lines.push(`LEARNING LANGUAGES: ${nb.langs.map((l: any) => `${l.language} (${l.level}, ${l.lessons} lessons)`).join("; ")}`);
  if ((nb.notebooks || []).length) lines.push(`RESEARCH NOTEBOOKS: ${nb.notebooks.slice(0, 8).map((n: any) => cut(n.title, 40)).join("; ")}`);
  if ((nb.codeChats || []).length) lines.push(`CODING: ${nb.codeChats.slice(0, 8).map((c: any) => `${c.language}: ${cut(c.title, 50)}`).join("; ")}`);
  const text = lines.join("\n");
  return text.length > 11000 ? text.slice(0, 11000) : text;
}

/** What goes to Sebastian at the start of each conversation. */
export function memoryForPrompt(): string {
  const s = useStore.getState();
  const d: any = s.sessionId ? s.data[s.sessionId] : null;
  if (!d) return "";
  const m = current();
  const learning = d.prefs?.learning !== false;
  const facts = m.facts.filter((f) => learning || f.pinned);
  const recent = learning ? [...(d.chats || [])].sort((a: any, b: any) => String(b.updatedAt).localeCompare(a.updatedAt)).slice(0, 5).map((c: any) => `${cut(c.title, 60)} (${String(c.updatedAt).slice(0, 10)})`) : [];
  const parts = [
    learning && m.summary ? `Who they are: ${m.summary}` : "",
    learning && m.style ? `How they like you to communicate: ${m.style}` : "",
    facts.length ? `What you know:\n${facts.slice(0, 40).map((f) => `- ${f.text}`).join("\n")}` : "",
    recent.length ? `Recent conversations: ${recent.join("; ")}` : "",
  ].filter(Boolean);
  return parts.join("\n").slice(0, 5000);
}

/** Learns again when there's enough new activity (or it's been a while). Runs quietly in the background. */
let running = false;
export async function refreshMemory(force = false) {
  if (running || (typeof navigator !== "undefined" && !navigator.onLine)) return false;
  const s = useStore.getState();
  const d: any = s.sessionId ? s.data[s.sessionId] : null;
  if (!d || d.prefs?.learning === false) return false;
  const m = current();
  const count = activityCount(d);
  const age = m.updatedAt ? Date.now() - new Date(m.updatedAt).getTime() : Infinity;
  if (!force && count < 3) return false;
  if (!force && count - (m.basis || 0) < 8 && age < 12 * 3600e3) return false;
  const signals = buildSignals();
  if (!signals) return false;
  running = true;
  try {
    const r = await fetch("/api/memory", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ signals, previous: { summary: m.summary, style: m.style, facts: m.facts.filter((f) => !f.pinned).map((f) => ({ text: f.text, category: f.category })) }, pinned: m.facts.filter((f) => f.pinned).map((f) => f.text) }) });
    const j = await r.json();
    if (!j.ok) return false;
    patchMemory((cur) => ({
      summary: String(j.summary || ""), style: String(j.style || ""), updatedAt: new Date().toISOString(), basis: count,
      facts: [...cur.facts.filter((f) => f.pinned), ...(j.facts || []).map((f: any) => ({ id: uid("mf_"), text: String(f.text), category: String(f.category || "preferences") }))].slice(0, 60),
    }));
    return true;
  } catch { return false; } finally { running = false; }
}
