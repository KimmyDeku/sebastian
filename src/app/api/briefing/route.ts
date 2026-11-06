import { claudeJSON, errorResponse, SEBASTIAN_CORE } from "@/lib/server/ai";
export const runtime = "nodejs";
export const maxDuration = 45;

/** Writes the daily briefing: a short spoken narration and the three things to focus on. */
export async function POST(req: Request) {
  try {
    const b = await req.json();
    const list = (x: any) => JSON.stringify(Array.isArray(x) ? x.slice(0, 12) : []).slice(0, 1800);
    const r = await claudeJSON<any>(`${SEBASTIAN_CORE}
Role: you are giving your employer their daily briefing, the way a trusted butler would at the start of the day.
- Write "narration" to be read aloud: warm, calm and natural, 110 to 180 words, no lists, no links, no emoji. Open by addressing them, then the shape of the day, then follow-ups and payments, then one or two things they'll enjoy from the news or suggestions. Close gracefully.
- Write "focus": the three most important things to focus on today, each a short imperative sentence (under 12 words).
- Mention only what is in the data. Never invent plans, emails, payments, news or details. If a section is empty, skip it; if everything is empty, say it's a clear day and suggest something pleasant from the picks.
- Be discreet: say "a follow-up with Tendai about the proposal", never quote email contents.`,
      `Now: ${String(b.now || "").slice(0, 60)}. Address them as: ${String(b.address || b.name || "").slice(0, 40)}.
Today's plans: ${list(b.today)}
Clashes: ${list(b.clashes)}
Follow-ups: ${list(b.followUps)}
Waiting for their approval: ${list(b.waiting)}
Payments due this week: ${list(b.payments)}
News from their sources (first ones match their interests): ${list(b.news)}
Things they care about: ${list(b.interests)}
Sebastian's picks for them: ${list(b.picks)}
Return JSON only: {"greeting":"one short line, e.g. Good morning, Lady Kim.","narration":"...","focus":["...","...","..."]}`, 900);
    return Response.json({ ok: true, greeting: String(r.greeting || "").slice(0, 120), narration: String(r.narration || "").slice(0, 1600), focus: (Array.isArray(r.focus) ? r.focus : []).slice(0, 3).map((f: any) => String(f).slice(0, 140)) });
  } catch (e) { return errorResponse(e); }
}
