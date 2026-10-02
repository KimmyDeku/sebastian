"use client";
import { useStore } from "./store";

export type Unfinished = { id: string; title: string; url?: string; note?: string; source: "browser" | "tab"; at: string; status: "open" | "done"; snoozeUntil?: string };
export type Companion = { allowed: boolean | null; lastSeen?: string; version?: string; items: Unfinished[]; openTabs: { title: string; url: string }[]; openTabsAt?: string };
const EMPTY: Companion = { allowed: null, items: [], openTabs: [] };

export function useCompanion(): Companion {
  return useStore((s) => ((s.sessionId ? (s.data[s.sessionId] as any)?.companion : null) as Companion) || EMPTY);
}
export const patchCompanion = (fn: (c: Companion) => Companion) => useStore.getState().patch((d: any) => ({ ...d, companion: fn({ ...EMPTY, ...(d.companion || {}) }) }));
export const openUnfinished = (c: Companion) => c.items.filter((i) => i.status === "open" && (!i.snoozeUntil || new Date(i.snoozeUntil).getTime() <= Date.now()));
