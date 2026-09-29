import { claudeJSON, errorResponse, SEBASTIAN_CORE } from "@/lib/server/ai";
import { TASKS, missingSlots, taskCatalog } from "@/lib/agentTasks";

export const runtime = "nodejs";
export const maxDuration = 45;

const clean = (o: any) => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v != null && v !== "" && !/^(unknown|null|n\/a)$/i.test(String(v))));

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const c = b.context || {};

    // After a task has run: turn the results into a short spoken summary.
    if (b.mode === "summarise") {
      const r = await claudeJSON<{ say: string }>(
        `${SEBASTIAN_CORE}\nYou are speaking aloud to ${c.address || "the user"}. Write for the ear: short sentences, no lists, no markdown, no links.`,
        `Task: ${TASKS[b.task]?.label || b.task}. Details: ${JSON.stringify(b.slots)}.
Results: ${JSON.stringify(b.results).slice(0, 6000)}
Summarise the most useful findings in at most four short sentences, naming the top options and why they stand out. If prices appear, say they are estimates to confirm with the provider. End with one brief offer of a next step.
Return {"say": "..."}`, 600);
      return Response.json({ ok: true, say: r.say });
    }

    // Autopilot: fill in the fields of a form from what the user says, one question at a time.
    if (b.mode === "fill") {
      const fields: { key: string; label: string; ask: string; hint?: string; required?: boolean; options?: string[] }[] = b.fields || [];
      const values = b.values || {};
      const empty = (v: any) => v == null || v === "" || (Array.isArray(v) && !v.length);
      const convo = (b.messages || []).slice(-12).map((m: any) => `${m.role === "user" ? "User" : "Sebastian"}: ${m.content}`).join("\n");
      const r = await claudeJSON<any>(
        `${SEBASTIAN_CORE}
You are Sebastian's Autopilot, filling in the "${b.title || "form"}" for ${c.address || "the user"} by voice. Today is ${c.today} (${c.weekday}).
Fields, in order (key: label; format; * = required):
${fields.map((f) => `- ${f.key}${f.required ? "*" : ""}: ${f.label}${f.hint ? `; ${f.hint}` : ""}${f.options ? `; choose exactly one of: ${f.options.join(" | ")}` : ""}`).join("\n")}
Rules:
- From the user's latest reply, extract every field value you can (people often give several at once). Dates as YYYY-MM-DD using today's date, times as HH:mm, numbers as numbers, and option fields exactly as listed.
- If the user says "skip" or "leave it", don't fill that field; move on.
- Then ask for the next empty field in the order above, in one short, warm sentence for the ear. No lists or markdown.
- When all required fields are filled, set "done" to true and say a brief closing line.
Return JSON only: {"values": {only fields you filled or changed}, "say": "...", "done": true|false}`,
        `Current values: ${JSON.stringify(values)}\nConversation:\n${convo}`, 600);
      const merged = { ...values, ...clean(r.values) };
      const missing = fields.filter((f) => f.required && empty(merged[f.key]));
      let say = String(r.say || "").trim();
      const done = missing.length === 0;
      if (!done && r.done) say = missing[0].ask;
      if (!say) say = done ? "That's everything filled in." : missing[0].ask;
      return Response.json({ ok: true, values: clean(r.values), say, done, missing: missing.map((m) => m.key) });
    }

    // A conversation turn: understand the request, gather details, decide what happens next.
    const prev = b.state || {};
    const convo = (b.messages || []).map((m: any) => `${m.role === "user" ? "User" : "Sebastian"}: ${m.content}`).join("\n");
    const r = await claudeJSON<any>(
      `${SEBASTIAN_CORE}
You are Sebastian in hands-free voice mode, speaking aloud to ${c.address || "the user"}. Today is ${c.today} (${c.weekday}); local time ${c.time}; time zone ${c.timezone}.
Your job: understand what the user wants, choose the matching task, gather the details it needs through natural conversation, then hand it over to be carried out.
Tasks (key: label — slots; * = required):
${taskCatalog()}
Rules:
- Read the whole conversation and fill every slot you can. Convert relative dates ("next Friday", "in two weeks") to YYYY-MM-DD using today's date, and times to 24-hour.
- Ask for ONE missing required detail at a time (two only when naturally paired, such as dates). Keep "say" to one or two short, warm sentences for the ear: no lists, markdown or emojis.
- If the user says "you choose" or "any", pick a sensible value yourself.
- If the user changes their mind or starts something new, switch task and carry over relevant details.
- status: "ask" while required details are missing; "ready" when everything is known (briefly say what you're about to do); "answer" for a general question you answer directly (task "question"); "confirm" for tasks that change data or place calls — state the full details and ask "Shall I go ahead?".
- Never claim to have booked, paid, called or saved anything.
Return JSON only: {"task": "<task key or question>", "slots": {...}, "status": "ask|ready|answer|confirm", "say": "..."}`,
      `Current task: ${prev.task || "none"}. Known details: ${JSON.stringify(prev.slots || {})}.\nConversation so far:\n${convo}`, 700);

    const task = TASKS[r.task] ? r.task : r.task === "question" ? "question" : prev.task && TASKS[prev.task] ? prev.task : "question";
    const slots = task === prev.task ? { ...(prev.slots || {}), ...clean(r.slots) } : clean(r.slots);
    let status = String(r.status || "ask");
    let say = String(r.say || "").trim();

    // Double-check the model: never run a task with required details missing.
    if (task === "question") status = "answer";
    else {
      const missing = missingSlots(task, slots);
      if (missing.length) { if (status !== "ask") say = missing[0].ask; status = "ask"; }
      else if (TASKS[task].confirm) { status = "confirm"; if (!/\?\s*$/.test(say)) say = `${say} Shall I go ahead?`.trim(); }
      else if (status !== "ask") status = "ready";
    }
    if (!say) say = "I'm sorry, could you say that once more?";
    return Response.json({ ok: true, task, slots, status, say, missing: task === "question" ? [] : missingSlots(task, slots).map((m) => m.key) });
  } catch (e) { return errorResponse(e); }
}
