"use client";
// Adds Sebastian's schedule to Google Calendar (with the user's permission). Each event gets
// a pop-up reminder and an email reminder, so it also reaches the user's Gmail.
import { gmailToken, forgetGmail } from "./gmail";
import type { ScheduleEvent } from "./types";

const API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export async function addToGoogleCalendar(e: ScheduleEvent, timeZone: string): Promise<string> {
  const token = await gmailToken("calendar");
  const start = new Date(e.start);
  const end = e.end ? new Date(e.end) : new Date(start.getTime() + 60 * 60000);
  const minutes = e.remindMinutes ?? 30;
  const body = {
    summary: e.title,
    location: e.location || undefined,
    description: `${e.notes ? e.notes + "\n\n" : ""}Scheduled by Sebastian.`,
    start: { dateTime: start.toISOString(), timeZone },
    end: { dateTime: end.toISOString(), timeZone },
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes }, { method: "email", minutes: Math.max(minutes, 30) }] },
    source: { title: "Sebastian", url: `${window.location.origin}/schedule` },
  };
  const r = await fetch(`${API}?sendUpdates=none`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error?.message || `Google Calendar returned ${r.status}`);
  return j.id as string;
}

export async function removeFromGoogleCalendar(id: string) {
  try { const token = await gmailToken("calendar"); await fetch(`${API}/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }); } catch {}
}

/* ---------- Reading and moving (for clash checks and rescheduling) ---------- */
import { hasGmailToken } from "./gmail";
export type CalItem = { id: string; title: string; start: string; end: string; source: "sebastian" | "google"; gcalId?: string; location?: string;
  /** Google events: whether the user may change the time, who organised it, and its Google Calendar page. */
  canEdit?: boolean; organizer?: string; organizerEmail?: string; link?: string };

/** Whether Sebastian can read Google Calendar right now (a Google pass lasts about an hour). */
export const googleCalendarReady = () => hasGmailToken("calendar");

/** Google Calendar events in a period (timed events only; Sebastian's own copies are left out). */
export async function listGoogleEvents(from: Date, to: Date): Promise<CalItem[] | null> {
  if (!googleCalendarReady()) return null;
  const token = await gmailToken("calendar");
  const q = new URLSearchParams({ timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: "true", orderBy: "startTime", maxResults: "150" });
  const r = await fetch(`${API}?${q}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const j = await r.json();
  return (j.items || [])
    .filter((e: any) => e.status !== "cancelled" && e.start?.dateTime && e.source?.title !== "Sebastian")
    .map((e: any) => ({ id: `g_${e.id}`, gcalId: e.id, title: e.summary || "Busy", start: new Date(e.start.dateTime).toISOString(), end: new Date(e.end?.dateTime || e.start.dateTime).toISOString(), source: "google" as const, location: e.location,
      canEdit: e.organizer?.self === true || e.guestsCanModify === true || (!e.organizer && e.creator?.self === true),
      organizer: e.organizer?.displayName || e.organizer?.email, organizerEmail: e.organizer?.self ? undefined : e.organizer?.email, link: e.htmlLink }));
}

/** Moves a Google Calendar event to a new start, keeping its length. */
export class CalendarMoveError extends Error { constructor(msg: string, public code: "reconnect" | "not-yours" | "not-found" | "other") { super(msg); } }

/** Moves a Google Calendar event to a new start, keeping its length. Explains clearly when Google says no. */
export async function moveGoogleEvent(gcalId: string, start: Date, lengthMs: number, timeZone: string) {
  if (!googleCalendarReady()) throw new CalendarMoveError("Google Calendar needs you to reconnect before I can move this.", "reconnect");
  const token = await gmailToken("calendar");
  const end = new Date(start.getTime() + Math.max(15 * 60000, lengthMs));
  const r = await fetch(`${API}/${encodeURIComponent(gcalId)}?sendUpdates=none`, { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ start: { dateTime: start.toISOString(), timeZone }, end: { dateTime: end.toISOString(), timeZone } }) });
  if (r.ok) return;
  const j = await r.json().catch(() => ({}));
  const why = String(j?.error?.message || "");
  if (r.status === 401) { forgetGmail("calendar"); throw new CalendarMoveError("Google Calendar needs you to reconnect before I can move this.", "reconnect"); }
  if (r.status === 403) throw new CalendarMoveError("Google won't let me change this one: you're a guest, so only the organiser can change its time.", "not-yours");
  if (r.status === 404 || r.status === 410) throw new CalendarMoveError("I can't find that event in your main Google Calendar any more. It may have been moved, deleted, or belong to a shared calendar.", "not-found");
  throw new CalendarMoveError(`Google Calendar said: ${why || `error ${r.status}`}.`, "other");
}
