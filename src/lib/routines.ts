"use client";
// Routines and reminders: water, movement, medication, bills, subscriptions, insurance and follow-ups.
import { useStore } from "./store";
import { uid } from "./util";

export type RoutineKind = "water" | "move" | "medication" | "bill" | "subscription" | "insurance" | "application" | "custom";
export type Routine = { id: string; kind: RoutineKind; title: string; active: boolean; times?: string[]; everyMinutes?: number; from?: string; to?: string; dayOfMonth?: number; date?: string; amount?: string; link?: string; note?: string; createdAt: string };
export const KIND_LABEL: Record<RoutineKind, string> = { water: "Drink water", move: "Move and stretch", medication: "Medication", bill: "Bill (for example ZESA)", subscription: "Subscription", insurance: "Insurance renewal", application: "Application follow-up", custom: "Other reminder" };

const EMPTY: Routine[] = [];
export function useRoutines(): Routine[] { return useStore((s) => ((s.sessionId ? (s.data[s.sessionId] as any)?.routines : null) as Routine[]) || EMPTY); }
export const allRoutines = (): Routine[] => { const s = useStore.getState(); return ((s.sessionId ? (s.data[s.sessionId] as any)?.routines : null) as Routine[]) || []; };
const save = (fn: (r: Routine[]) => Routine[]) => useStore.getState().patch((d: any) => ({ ...d, routines: fn(d.routines || []) }));
export function addRoutine(r: Partial<Routine> & { kind: RoutineKind; title: string }) {
  const item: Routine = { active: true, createdAt: new Date().toISOString(), ...r, id: uid("rt_") } as Routine;
  save((x) => [item, ...x]);
  return item.id;
}
export const updateRoutine = (id: string, p: Partial<Routine>) => save((x) => x.map((r) => (r.id === id ? { ...r, ...p } : r)));
export const deleteRoutine = (id: string) => save((x) => x.filter((r) => r.id !== id));

const at = (day: Date, hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); const d = new Date(day); d.setHours(h || 0, m || 0, 0, 0); return d; };
const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

/** When a routine's reminders fall between two moments. */
export function occurrences(r: Routine, from: Date, to: Date): { at: Date; when: "due" | "soon" }[] {
  if (!r.active) return [];
  const out: { at: Date; when: "due" | "soon" }[] = [];
  const day = new Date(from); day.setHours(0, 0, 0, 0);
  for (let i = 0; i < 4 && day <= to; i++, day.setDate(day.getDate() + 1)) {
    const add = (d: Date, when: "due" | "soon" = "due") => { if (d > from && d <= to) out.push({ at: d, when }); };
    if (r.kind === "water" || r.kind === "move") {
      const every = Math.max(15, r.everyMinutes || (r.kind === "water" ? 120 : 60));
      const start = at(day, r.from || "08:00"), end = at(day, r.to || "18:00");
      for (let t = new Date(start.getTime() + every * 60000); t <= end; t = new Date(t.getTime() + every * 60000)) add(t);
    } else if (r.kind === "medication" || r.kind === "custom") {
      (r.times || ["08:00"]).forEach((hm) => add(at(day, hm)));
    } else if (r.kind === "bill" || r.kind === "subscription") {
      const due = Math.min(r.dayOfMonth || 1, daysIn(day.getFullYear(), day.getMonth()));
      if (day.getDate() === due) add(at(day, "09:00"));
      const soon = new Date(day); soon.setDate(soon.getDate() + 3);
      if (soon.getDate() === Math.min(r.dayOfMonth || 1, daysIn(soon.getFullYear(), soon.getMonth()))) add(at(day, "09:00"), "soon");
    } else if (r.kind === "insurance" && r.date) {
      const [, mm, dd] = r.date.split("-").map(Number);
      if (day.getMonth() + 1 === mm && day.getDate() === dd) add(at(day, "09:00"));
      const soon = new Date(day); soon.setDate(soon.getDate() + 14);
      if (soon.getMonth() + 1 === mm && soon.getDate() === dd) add(at(day, "09:00"), "soon");
    } else if (r.kind === "application" && r.date) {
      if (day.toISOString().slice(0, 10) === r.date || `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}` === r.date) add(at(day, "09:00"));
    }
  }
  return out;
}

/** Push reminder times for the next two days (ids and times only, never titles). */
export function routineJobs(rs: Routine[]) {
  const now = new Date(), end = new Date(now.getTime() + 48 * 3600e3);
  return rs.flatMap((r) => occurrences(r, now, end).map((o) => ({ id: `r_${r.id}_${o.at.getTime()}`.slice(0, 80), fireAt: o.at.toISOString() }))).slice(0, 150);
}
