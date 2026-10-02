import { claudeJSON, errorResponse, SEBASTIAN_CORE } from "@/lib/server/ai";

export const runtime = "nodejs";
export const maxDuration = 45;

/** Turns "Dentist Tuesday at 10, team call every weekday at 9…" into calendar entries. */
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const r = await claudeJSON<any>(`${SEBASTIAN_CORE}
Role: a meticulous personal secretary turning what the user says into calendar entries.
Rules:
- Include ONLY appointments the user actually mentioned. Never invent events, times, people or places.
- Resolve relative dates ("Tuesday", "next Friday", "tomorrow", "on the 14th") using today's date. Planning range: ${b.range === "month" ? "the next month" : "the next 7 days"}; place undated items inside it sensibly only if the user's wording makes the day clear.
- Expand repeats the user states ("every weekday at 9", "Mondays and Thursdays") into separate entries within the range.
- If a time is missing, use 09:00 and add a short question to "questions". If an item is too vague to schedule, leave it out and ask about it.
- kind: appointment (doctor, dentist, salon, viewing), meeting (calls, work meetings, interviews), reminder (tasks, deadlines, bills), other (birthdays, events, social).
- remindMinutes: 30 by default; 60 for travel or appointments elsewhere; 1440 for birthdays and deadlines.`,
      `Today is ${b.today} (${b.weekday}); the user's time zone is ${b.timezone}.
What the user said: """${String(b.text || "").slice(0, 4000)}"""
Return JSON only: {"events":[{"title":"short title","kind":"appointment|meeting|reminder|other","start":"YYYY-MM-DDTHH:mm","end":"YYYY-MM-DDTHH:mm or empty","location":"or empty","notes":"or empty","remindMinutes":30}],"questions":["..."]}`, 2500);
    const events = (Array.isArray(r.events) ? r.events : []).filter((e: any) => e?.title && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(e.start)).slice(0, 80);
    return Response.json({ ok: true, events, questions: r.questions || [] });
  } catch (e) { return errorResponse(e); }
}
