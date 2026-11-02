"use client";
// Coding requests made in chat, and what they used (shown in Settings, under Coding usage).
import { useStore } from "./store";

export type UsageEntry = { at: string; model: string; input: number; output: number; cost?: number; where: string; provider?: string };
const EMPTY: UsageEntry[] = [];
export function useCodingUsage(): UsageEntry[] { return useStore((s) => ((s.sessionId ? (s.data[s.sessionId] as any)?.codingUsage : null) as UsageEntry[]) || EMPTY); }
export function recordCodingUsage(u: Omit<UsageEntry, "at"> & { at?: string }) {
  useStore.getState().patch((d: any) => ({ ...d, codingUsage: [...(d.codingUsage || []), { ...u, at: u.at || new Date().toISOString() }].slice(-500) }));
}
export const clearCodingUsage = () => useStore.getState().patch((d: any) => ({ ...d, codingUsage: [] }));
