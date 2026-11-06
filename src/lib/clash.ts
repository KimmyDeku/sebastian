"use client";
// Clashes across Sebastian's schedule and Google Calendar, and moving an event to fix one.
import { useEffect, useState } from "react";
import { useStore, actions } from "./store";
import { listGoogleEvents, moveGoogleEvent, googleCalendarReady, type CalItem } from "./gcal";
import { saveToGoogle, type GoogleSave } from "./gsync";

const HOUR = 3600e3;
let google: { items: CalItem[]; at: number } | null = null;
const subs = new Set<() => void>();

/** Google Calendar events for the next six weeks (refreshed at most every 10 minutes). */
export async function refreshGoogle(force = false) {
  if (!googleCalendarReady()) return null;
  if (!force && google && Date.now() - google.at < 10 * 60000) return google.items;
  const from = new Date(); from.setDate(from.getDate() - 31);
  const to = new Date(); to.setDate(to.getDate() + 42);
  const items = await listGoogleEvents(from, to).catch(() => null);
  if (items) { google = { items, at: Date.now() }; subs.forEach((f) => f()); }
  return items;
}
export const googleItems = () => google?.items || [];

/** Everything on the calendar: Sebastian's own events plus Google Calendar's. */
export function allItems(): CalItem[] {
  const s = useStore.getState(); const d: any = s.sessionId ? s.data[s.sessionId] : null;
  const mine: CalItem[] = (d?.schedule || []).filter((e: any) => !["trip"].includes(e.kind)).map((e: any) => ({
    id: e.id, title: e.title, start: e.start, end: e.end || new Date(new Date(e.start).getTime() + HOUR).toISOString(), source: "sebastian" as const, gcalId: e.gcalId, location: e.location }));
  const linked = new Set(mine.map((m) => m.gcalId).filter(Boolean));
  return [...mine, ...googleItems().filter((g) => !linked.has(g.gcalId))].sort((a, b) => a.start.localeCompare(b.start));
}
export function useCalendarItems() {
  const schedule = useStore((s) => (s.sessionId ? (s.data[s.sessionId] as any)?.schedule : null));
  const [, tick] = useState(0);
  useEffect(() => { const f = () => tick((n) => n + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return allItems();
}

export type Clash = { a: CalItem; b: CalItem; key: string };
/** Overlapping events between now and `days` from now (events longer than 12 hours are ignored). */
export function findClashes(days = 14): Clash[] {
  const now = Date.now(), until = now + days * 86400e3;
  const list = allItems().map((x) => ({ x, s: new Date(x.start).getTime(), e: new Date(x.end).getTime() }))
    .filter((y) => y.s > now && y.s < until && y.e - y.s <= 12 * HOUR).sort((p, q) => p.s - q.s);
  const out: Clash[] = [];
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length && list[j].s < list[i].e; j++) {
    const a = list[i].x, b = list[j].x;
    out.push({ a, b, key: `clash:${a.id}@${a.start}|${b.id}@${b.start}` });
  }
  return out;
}

/** Moves an event (in Sebastian, in Google Calendar, or both when they're linked). */
/** Moves an event. Sebastian's own events are also saved to Google Calendar (added or moved there). */
export async function moveItem(item: CalItem, start: Date): Promise<GoogleSave | "google"> {
  const length = new Date(item.end).getTime() - new Date(item.start).getTime();
  const s = useStore.getState(); const acc: any = s.accounts.find((a) => a.id === s.sessionId);
  const tz = acc?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (item.source === "sebastian") {
    actions.updateEvent(item.id, { start: start.toISOString(), end: new Date(start.getTime() + length).toISOString(), notified: false } as any);
    const r = await saveToGoogle(item.id);
    if (r.result === "added" || r.result === "moved") await refreshGoogle(true).catch(() => null);
    return r.result;
  } else {
    if (!item.gcalId) throw new Error("That event can't be moved.");
    await moveGoogleEvent(item.gcalId, start, length, tz);
    await refreshGoogle(true);
    return "google";
  }
}

export const when = (iso: string | Date) => new Date(iso).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
export const timeOf = (iso: string | Date) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
