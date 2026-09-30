"use client";
import { useStore, emptyData } from "./store";
import { uid } from "./util";

/* ---------- Notebook data (kept with the rest of the user's data) ---------- */
export type Source = { id: string; title: string; text: string; url?: string; addedAt: string; driveId?: string; size?: number; offloaded?: boolean };
export type NoteMsg = { role: "user" | "assistant"; content: string };
export type PastChat = { id: string; at: string; chat: NoteMsg[] };
export type Notebook = { id: string; title: string; sources: Source[]; chat: NoteMsg[]; history?: PastChat[]; createdAt: string; updatedAt: string; driveDocId?: string; driveUrl?: string; syncedAt?: string };
export type CodeChat = { id: string; title: string; language: string; messages: NoteMsg[]; createdAt: string; updatedAt: string };
export type QuizResult = { id: string; topic: string; score: number; total: number; weak: string[]; at: string };
export type TutorSubject = { id: string; subject: string; level: string; topics: string[]; chat: NoteMsg[]; history?: PastChat[]; quizzes: QuizResult[]; createdAt: string };
export type Assignment = { id: string; subject: string; title: string; brief: string; due: string; length: string; plan: any | null; feedback: any | null; createdAt: string };
export type LangState = { language: string; level: string; xp: number; streak: number; lastDay: string; lessons: number; history: { at: string; correct: number; total: number; topic: string }[] };
export type UsageEntry = { at: string; model: string; input: number; output: number; cost?: number; where: string; provider?: string };
export type DriveState = { connected: boolean; email?: string; folderId?: string; sourcesFolderId?: string; offload?: boolean };
export type NotebookData = { drive?: DriveState; notebooks: Notebook[]; tutor: TutorSubject[]; assignments: Assignment[]; langs: LangState[]; codeChat: NoteMsg[]; codeChats: CodeChat[]; codingUsage: UsageEntry[] };

const EMPTY: NotebookData = { notebooks: [], tutor: [], assignments: [], langs: [], codeChat: [], codeChats: [], codingUsage: [] };

// Same stored object -> same result, so React doesn't re-render needlessly.
const filled = new WeakMap<object, NotebookData>();
export function useNotebook(): NotebookData {
  return useStore((s) => {
    const n: any = s.sessionId ? (s.data[s.sessionId] as any)?.notebook : null;
    if (!n) return EMPTY;
    let v = filled.get(n);
    if (!v) { v = { ...EMPTY, ...n } as NotebookData; filled.set(n, v); }
    return v;
  });
}

export function patchNotebook(fn: (n: NotebookData) => NotebookData) {
  useStore.getState().patch((d: any) => ({ ...d, notebook: fn({ ...EMPTY, ...(d.notebook || {}) }) }));
}

/** Called automatically whenever a coding request reports its usage. */
export function recordCodingUsage(u: Omit<UsageEntry, "at"> & { at?: string }) {
  patchNotebook((n) => ({ ...n, codingUsage: [...n.codingUsage, { ...u, at: u.at || new Date().toISOString() }].slice(-500) }));
}

export const newId = (p: string) => uid(p);
export { emptyData };

/** Keeps a finished conversation in the history list and starts a clean one. */
export function archive(chat: NoteMsg[], history: PastChat[] = []): PastChat[] {
  return chat.length ? [{ id: newId("pc_"), at: new Date().toISOString(), chat }, ...history].slice(0, 20) : history;
}
