"use client";
/**
 * Keeps Sebastian's own events saved in Google Calendar (when the user has switched it on):
 * new events are added, moved events are moved, and anything that couldn't be saved yet
 * (for example while Google's one-hour pass had expired) is saved as soon as it's possible.
 */
import { useStore, actions } from "./store";
import { addToGoogleCalendar, moveGoogleEvent, googleCalendarReady } from "./gcal";

export type GoogleSave = "added" | "moved" | "pending" | "off" | "failed";
const state = () => { const s = useStore.getState(); const d: any = s.sessionId ? s.data[s.sessionId] : null; const acc: any = s.accounts.find((a) => a.id === s.sessionId); return { d, tz: acc?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone }; };
export const googleSyncOn = () => !!state().d?.email?.allowCalendar;

/** Saves one of Sebastian's events to Google Calendar (adding it, or moving the copy that's there). */
export async function saveToGoogle(eventId: string): Promise<{ result: GoogleSave; error?: string }> {
  const { d, tz } = state();
  const e = (d?.schedule || []).find((x: any) => x.id === eventId);
  if (!e || !googleSyncOn()) return { result: "off" };
  if (!googleCalendarReady()) { actions.updateEvent(e.id, { gcalPending: true } as any); return { result: "pending" }; }
  const start = new Date(e.start), length = e.end ? new Date(e.end).getTime() - start.getTime() : 3600e3;
  try {
    if (e.gcalId) {
      try { await moveGoogleEvent(e.gcalId, start, length, tz); actions.updateEvent(e.id, { gcalPending: false } as any); return { result: "moved" }; }
      catch (err: any) { if (err?.code !== "not-found") throw err; } // deleted in Google: add it again below
    }
    const gid = await addToGoogleCalendar(e, tz);
    actions.updateEvent(e.id, { gcalId: gid, gcalPending: false } as any);
    return { result: "added" };
  } catch (err: any) {
    if (err?.code === "reconnect") { actions.updateEvent(e.id, { gcalPending: true } as any); return { result: "pending" }; }
    actions.updateEvent(e.id, { gcalPending: true } as any);
    return { result: "failed", error: err?.message };
  }
}

/** Saves everything that's waiting (call after reconnecting Google Calendar). */
export async function flushPendingToGoogle() {
  if (!googleSyncOn() || !googleCalendarReady()) return 0;
  const pending = (state().d?.schedule || []).filter((e: any) => e.gcalPending);
  let n = 0;
  for (const e of pending) { const r = await saveToGoogle(e.id); if (r.result === "added" || r.result === "moved") n++; }
  return n;
}
export const pendingGoogleCount = () => (state().d?.schedule || []).filter((e: any) => e.gcalPending).length;
