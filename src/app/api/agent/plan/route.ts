import { claudeJSON, errorResponse, SEBASTIAN_CORE } from "@/lib/server/ai";
export const runtime = "nodejs";
export const maxDuration = 45;

const TOOLS = `Tools you can use (and nothing else):
- info {text}: explain, summarise or advise in 1-4 short sentences. Use for guidance, limitations and next steps.
- find_places {query, near?}: search nearby places (for example "mechanic", "hospital", "restaurants for friends", "pharmacy"). near is an area or city if the user named one.
- search_stays {dest, checkin?, checkout?, adults?}: places to stay. Dates as YYYY-MM-DD.
- draft_email {instruction, to?, tone?}: write an email draft (follow-ups, client replies, professional emails).
CRITICAL tools (always "critical": true; the user approves first):
- add_event {title, start, kind, remindMinutes, notes?}: add to the schedule. start "YYYY-MM-DDTHH:mm" local time. kind: appointment|meeting|reminder|other.
- reschedule_event {eventId, newStart, title}: move an existing event (use ids from the context) to "YYYY-MM-DDTHH:mm".
- add_routine {kind, title, times?, everyMinutes?, dayOfMonth?, date?, link?, note?}: a repeating reminder. kind: water|move|medication|bill|subscription|insurance|application|custom. times like ["08:00","20:00"]; dayOfMonth for monthly bills; date "YYYY-MM-DD" for insurance renewal or an application follow-up.
- send_email {instruction}: open the drafted email in Sebastian's Email page for the user to check and send.
- open_link {url, label}: open an official https website or payment page so the user can finish there (pay a ZESA bill, order food, sign up). Only well-known official sites.`;

const RULES = `You are Sebastian's planner. Turn the user's request into a short plan of steps (at most 7).
- Prepare everything you can with the safe tools first, then put every final action (adding, changing, sending, booking, buying, paying, submitting, signing up) in CRITICAL steps so the user approves it.
- Never ask for, store or enter passwords, PINs, one-time codes or card numbers. For payments, deliveries, groceries and utility bills, prepare the details and use open_link to the official site or app so the user completes and pays there.
- Health: you may set medication, water and movement reminders, but never give dosing or treatment advice; suggest a doctor or pharmacist. Legal or mental-health questions: give clear general information and point to a qualified professional. If someone may be in danger or crisis, the first step is info with emergency help (Zimbabwe emergency 999, ambulance 994) and encouragement to reach someone now.
- Be honest about limits: Sebastian can't read WhatsApp, can't book or pay on other sites by itself, and has no live price or fuel data yet; say so in an info step and offer the best alternative (for prices, suggest official sources such as ZERA for fuel).
- Use the context (today, upcoming schedule with ids, routines). Resolve dates like "next Friday" from today. Don't invent facts, prices, people or events.
- Label each step in plain words from Sebastian's point of view, e.g. "Find mechanics near Avondale", "Add the dentist on Tuesday at 10:00".`;

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const r = await claudeJSON<any>(`${SEBASTIAN_CORE}\n\n${RULES}\n\n${TOOLS}`,
      `Context: ${JSON.stringify(b.context || {}).slice(0, 5000)}
Request: """${String(b.request || "").slice(0, 2000)}"""
Return JSON only: {"title":"short task title","steps":[{"label":"...","tool":"one of the tools","args":{},"critical":false,"why":"one short reason, for critical steps"}]}`, 1800);
    const CRIT = new Set(["add_event", "reschedule_event", "add_routine", "send_email", "open_link"]);
    const ALLOWED = new Set(["info", "find_places", "search_stays", "draft_email", ...CRIT]);
    const steps = (Array.isArray(r.steps) ? r.steps : []).filter((s: any) => s && ALLOWED.has(s.tool) && s.label).slice(0, 7)
      .map((s: any) => ({ label: String(s.label).slice(0, 140), tool: s.tool, args: s.args || {}, critical: CRIT.has(s.tool) || !!s.critical, why: s.why ? String(s.why).slice(0, 200) : undefined }));
    return Response.json({ ok: !!steps.length, title: String(r.title || "Your request").slice(0, 80), steps, error: steps.length ? undefined : "Sebastian couldn't plan this one. Try saying it another way." });
  } catch (e) { return errorResponse(e); }
}
