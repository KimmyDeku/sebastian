import { claudeJSON, errorResponse } from "@/lib/server/ai";
export const runtime = "nodejs";

/** Turns a spoken date and time ("Friday at 3", "next Tuesday morning") into "YYYY-MM-DDTHH:mm". */
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const r = await claudeJSON<any>(`You convert a spoken date and time into a local date-time. Reply with JSON only.
Rules: resolve relative words from "now". If no time is given, use the original time given. "Morning" is 09:00, "afternoon" 14:00, "evening" 18:00.
If the words don't contain a date or time at all, return {"start":null}.`,
      `Now (local): ${String(b.now || "").slice(0, 25)} (${String(b.weekday || "").slice(0, 12)}).
Original time of the event: ${String(b.original || "").slice(0, 25)}.
The user said: """${String(b.text || "").slice(0, 200)}"""
Return {"start":"YYYY-MM-DDTHH:mm"} or {"start":null}.`, 120);
    const ok = typeof r.start === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(r.start);
    return Response.json({ ok, start: ok ? r.start : null });
  } catch (e) { return errorResponse(e); }
}
