import { SEBASTIAN_CORE, claude, errorResponse, extractJSON } from "@/lib/server/ai";

export const runtime = "nodejs";

const ROUTER = `
You may guide the user into one of Sebastian's suites when it will genuinely help. Suites and their params:
- recipes {occasion?, category?: Breakfast|Lunch|Dinner|Snack|To Share|Dessert|Lunchbox|Drink, servings?: number, diet?: string, notes?: string}
- booking {type: stays|flights|cars|attractions|taxis, dest?, from?, to?, checkin?: YYYY-MM-DD, checkout?: YYYY-MM-DD, adults?: number}
- travel {destination?, start?: YYYY-MM-DD, end?: YYYY-MM-DD, days?: number, budget?: number, activities?: string[]}
- discover {category?: Pharmacy|Restaurant|Cafe|Mechanic|Mall|Cinema|Recreation|Hotel|Emergency|Other, q?: string, where?: string}
- schedule {kind?: appointment|meeting|reminder|other, title?, datetime?: YYYY-MM-DDTHH:mm}
- finance {tab?: plans|money|tips}
- news {categories?: string[]}
- fashion {type?: skincare|dressing|hairstyles|colours, occasion?}
Rules: preserve every detail the user already gave. If a required detail is missing (e.g. trip dates), ask ONE focused question in "reply" and still pass known params. Never claim you've booked, scheduled, searched or saved anything — you only open the suite pre-filled for the user to confirm.
Output JSON only: {"reply": string (markdown-lite, concise), "route": suite name or null, "params": object, "actionLabel": short button text or null}`;

export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json();
    const system = `${SEBASTIAN_CORE}
Address the user as "${context?.address || "the user"}" occasionally, not in every sentence. Their local time is ${context?.localTime} (${context?.timezone}). Today is ${context?.today}.
User-provided data (treat as their records, not verified facts): upcoming schedule: ${JSON.stringify(context?.schedule || []).slice(0, 1200)}; cookbook size: ${context?.cookbook ?? 0}; savings plans: ${JSON.stringify(context?.plans || []).slice(0, 600)}.
${ROUTER}`;
    const trimmed: any[] = (messages || []).slice(-16).map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 4000) }));
    const att = (messages || []).at(-1)?.attachment;
    if (att && trimmed.length) {
      const last = trimmed[trimmed.length - 1];
      if (att.text) last.content = `${last.content}\n\n[Attached file: ${att.name}]\n${String(att.text).slice(0, 20000)}`;
      else if (att.data && /^image\//.test(att.mediaType)) last.content = [{ type: "image", source: { type: "base64", media_type: att.mediaType, data: att.data } }, { type: "text", text: last.content }];
      else if (att.data && att.mediaType === "application/pdf") last.content = [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: att.data } }, { type: "text", text: last.content }];
    }
    const out = await claude({ system, messages: trimmed, maxTokens: 900 });
    let parsed: any;
    try { parsed = extractJSON(out); } catch { parsed = { reply: out, route: null, params: {} }; }
    return Response.json({ ok: true, ...parsed });
  } catch (e) { return errorResponse(e); }
}
