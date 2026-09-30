import { SEBASTIAN_CORE, claude, errorResponse, extractJSON } from "@/lib/server/ai";
import { codeComplete, codeReady } from "@/lib/server/code";

export const runtime = "nodejs";
export const maxDuration = 60;

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
- email {instruction?: the user's full request about writing, replying to, reading or finding emails, in their words}
Rules: preserve every detail the user already gave. If a required detail is missing (e.g. trip dates), ask ONE focused question in "reply" and still pass known params. Never claim you've booked, scheduled, searched, sent or saved anything; emails are only drafted, and sending always needs the user's confirmation on the Email page — you only open the suite pre-filled for the user to confirm.
Output JSON only: {"reply": string (markdown-lite, concise), "route": suite name or null, "params": object, "actionLabel": short button text or null}`;

// Coding answers are plain Markdown (not JSON), so code never gets mangled.
const CODER = `${SEBASTIAN_CORE}
Role: a senior software engineer and patient teacher.
Format every answer in Markdown:
- Begin with one or two sentences explaining the approach.
- Put ALL code inside fenced code blocks, with the language after the opening fence, for example \`\`\`cpp or \`\`\`python. Never write code outside a code block.
- Give complete, runnable code with brief comments. Add a short "###" heading before each code block, such as "### C++ example".
- Where helpful, add a worked example showing sample input and the resulting output, and a short explanation of how the code works.
- Mention assumptions (language version, compiler, libraries) and keep the explanation concise.
Do not answer in JSON.`;

const LANGS = /c\+\+|c#|\.net\b|\b(python|javascript|typescript|java|kotlin|golang|php|html|css|sql|mysql|postgres(ql)?|bash|powershell|dart|flutter|matlab|vba|excel formula|node\.?js|next\.?js|react(\.?js| native| component| app| hook)|vue(\.?js)?|angular|django|flask|laravel|spring boot|arduino|assembly|haskell|scala|perl|lua|solidity|c language|in c\b)/i;
const ACTIONS = /\b(write|show|give|generate|create|fix|explain|debug|optimi[sz]e|refactor|convert|review)\b[^.?!\n]{0,50}\b(code|program|script|function|algorithm|query|regex|class|method|loop|snippet)\b/i;
const TERMS = /\b(source code|pseudo-?code|compile (error)?|compiler|syntax error|stack ?trace|traceback|segmentation fault|null pointer|recursion|recursive function|for loop|while loop|big-?o|data structure|linked list|binary search|regex|regular expression|api endpoint|json schema|unit test|git (commit|merge|rebase)|npm install|pip install)\b/i;

function isCoding(messages: any[]) {
  const last = String(messages.at(-1)?.content || "");
  if (/```/.test(last) || LANGS.test(last) || ACTIONS.test(last) || TERMS.test(last)) return true;
  // Follow-ups in a coding conversation ("now make it use an array") stay with the coding model.
  const recent = messages.slice(-4, -1).filter((m: any) => m.role === "assistant").map((m: any) => String(m.content));
  return recent.some((c: string) => c.includes("```")) && last.length < 400;
}

export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json();
    const trimmed: any[] = (messages || []).slice(-16).map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 8000) }));
    const att = (messages || []).at(-1)?.attachment;
    if (att && trimmed.length) {
      const last = trimmed[trimmed.length - 1];
      if (att.text) last.content = `${last.content}\n\n[Attached file: ${att.name}]\n${String(att.text).slice(0, 20000)}`;
      else if (att.data && /^image\//.test(att.mediaType)) last.content = [{ type: "image", source: { type: "base64", media_type: att.mediaType, data: att.data } }, { type: "text", text: last.content }];
      else if (att.data && att.mediaType === "application/pdf") last.content = [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: att.data } }, { type: "text", text: last.content }];
    }

    if (isCoding(messages || [])) {
      // Coding questions go to the coding AI (Groq by default) and their usage is recorded in Settings.
      if (codeReady() && !att) {
        try {
          const r = await codeComplete(CODER, trimmed, "Chat");
          return Response.json({ ok: true, reply: r.reply.trim(), route: null, params: {}, mode: "code", codingUsage: r.codingUsage });
        } catch { /* fall back to Groq below */ }
      }
      const out = await claude({ system: CODER, messages: trimmed, maxTokens: 4000, temperature: 0.2, model: process.env.GROQ_CODE_MODEL || undefined });
      return Response.json({ ok: true, reply: out.trim(), route: null, params: {}, mode: "code" });
    }

    const system = `${SEBASTIAN_CORE}
Address the user as "${context?.address || "the user"}" occasionally, not in every sentence. Their local time is ${context?.localTime} (${context?.timezone}). Today is ${context?.today}.
User-provided data (treat as their records, not verified facts): upcoming schedule: ${JSON.stringify(context?.schedule || []).slice(0, 1200)}; cookbook size: ${context?.cookbook ?? 0}; savings plans: ${JSON.stringify(context?.plans || []).slice(0, 600)}.
${ROUTER}`;
    const out = await claude({ system, messages: trimmed, maxTokens: 900 });
    let parsed: any;
    try { parsed = extractJSON(out); } catch { parsed = { reply: out, route: null, params: {} }; }
    return Response.json({ ok: true, ...parsed });
  } catch (e) { return errorResponse(e); }
}
