"use client";
import { useStore, emptyData } from "./store";
import { uid } from "./util";

/* ---------- Notebook data (kept with the rest of the user's data) ---------- */
export type Source = { id: string; title: string; text: string; url?: string; addedAt: string };
export type NoteMsg = { role: "user" | "assistant"; content: string };
export type Notebook = { id: string; title: string; sources: Source[]; chat: NoteMsg[]; createdAt: string; updatedAt: string };
export type QuizResult = { id: string; topic: string; score: number; total: number; weak: string[]; at: string };
export type TutorSubject = { id: string; subject: string; level: string; topics: string[]; chat: NoteMsg[]; quizzes: QuizResult[]; createdAt: string };
export type Assignment = { id: string; subject: string; title: string; brief: string; due: string; length: string; plan: any | null; feedback: any | null; createdAt: string };
export type LangState = { language: string; level: string; xp: number; streak: number; lastDay: string; lessons: number; history: { at: string; correct: number; total: number; topic: string }[] };
export type UsageEntry = { at: string; model: string; input: number; output: number; cost?: number; where: string };
export type NotebookData = { notebooks: Notebook[]; tutor: TutorSubject[]; assignments: Assignment[]; langs: LangState[]; codeChat: NoteMsg[]; codingUsage: UsageEntry[] };

const EMPTY: NotebookData = { notebooks: [], tutor: [], assignments: [], langs: [], codeChat: [], codingUsage: [] };

export function useNotebook(): NotebookData {
  return useStore((s) => {
    const d: any = s.sessionId ? s.data[s.sessionId] : null;
    return (d?.notebook as NotebookData) || EMPTY;
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
