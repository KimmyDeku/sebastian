"use client";
// Adds Sebastian's schedule to Google Calendar (with the user's permission). Each event gets
// a pop-up reminder and an email reminder, so it also reaches the user's Gmail.
import { gmailToken } from "./gmail";
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
