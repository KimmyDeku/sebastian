import type { ScheduleEvent } from "./types";

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function eventEnd(e: ScheduleEvent) {
  return e.end ? new Date(e.end) : new Date(new Date(e.start).getTime() + (e.kind === "trip" || e.kind === "booking" ? 0 : 60 * 60000));
}

/** Opens Google Calendar with the event pre-filled. The user confirms the save in Google. */
export function googleCalendarUrl(e: ScheduleEvent) {
  const start = new Date(e.start);
  let end = eventEnd(e);
  const allDay = e.kind === "trip" || e.kind === "booking";
  const dates = allDay
    ? `${e.start.slice(0, 10).replace(/-/g, "")}/${(e.end || e.start).slice(0, 10).replace(/-/g, "")}`
    : `${stamp(start)}/${stamp(end)}`;
  const p = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates, details: [e.notes, "Added via Sebastian"].filter(Boolean).join("\n\n") });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** .ics file for phone calendars (iOS/Android import). */
export function downloadICS(events: ScheduleEvent[], filename = "sebastian-schedule.ics") {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Sebastian AI//EN", "CALSCALE:GREGORIAN"];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.id}@sebastian.ai`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(new Date(e.start))}`, `DTEND:${stamp(eventEnd(e))}`,
      `SUMMARY:${e.title.replace(/[,;]/g, " ")}`, `DESCRIPTION:${(e.notes || "").replace(/\n/g, "\\n").replace(/[,;]/g, " ")}`);
    if (e.remindMinutes != null) lines.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Reminder", `TRIGGER:-PT${e.remindMinutes}M`, "END:VALARM");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export const REMIND_OPTIONS = [
  { label: "At the time", value: 0 },
  { label: "15 min before", value: 15 },
  { label: "1 hour before", value: 60 },
  { label: "1 day before", value: 1440 },
];
