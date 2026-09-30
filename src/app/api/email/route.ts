import { claudeJSON, errorResponse, SEBASTIAN_CORE } from "@/lib/server/ai";

export const runtime = "nodejs";
export const maxDuration = 45;

const WRITER = `${SEBASTIAN_CORE}
Role: an expert business-email writer.
Rules for every email:
- Subject: specific and informative.
- Greeting: "Dear Mr./Ms./Dr. [Surname]," or "Dear [Full Name]," or "Dear [Team]," for formal mail; "Hello [Name]," for friendly-professional. Never casual greetings such as "Hey!" unless the user asks.
- Body: state the purpose clearly, give the needed context logically, concise paragraphs, no repetition, clear call to action with any deadline the user gave, correct grammar, respectful tone, little jargon.
- Closing: "Kind regards," / "Best regards," / "Sincerely," / "Thank you," then the sender's name on the next line.
- NEVER invent facts, prices, dates, times, attachments, agreements, names, meetings or promises the user did not give. If something important is missing, write a neutral placeholder like [date] and add a short question to "missing".
- Default tone is professional and courteous unless a tone is specified.
- "sensitive" is true if the email involves money or payment details, contracts, legal matters, personal data, passwords, credentials or confidential documents.
- Suggest a follow-up (3 or 5 days) for proposals, job or other applications, meeting or partnership requests, important client mail, invoices, interviews, approvals or anything awaiting confirmation.`;

const OUT = `Return JSON only: {"toName":"recipient name or empty","toEmail":"only if the user gave an address, else empty","cc":["addresses the user gave"],"subject":"...","body":"the full email text: greeting, paragraphs, closing and sender name, separated by blank lines","tone":"the tone used","missing":["short questions about information the user must supply"],"sensitive":false,"sensitiveReason":"","followUp":{"suggest":false,"days":3,"reason":"why a follow-up helps, or empty"}}`;

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const sender = String(b.sender || "").trim() || "[Your name]";
    if (b.mode === "draft") {
      const r = await claudeJSON<any>(WRITER, `Sender's name: ${sender}. Requested tone: ${b.tone || "professional and courteous"}.
The user's instruction: """${String(b.instruction).slice(0, 4000)}"""
${b.answers ? `The user's answers to earlier questions: """${String(b.answers).slice(0, 2000)}"""` : ""}
${b.current ? `Revise this existing draft to reflect the instruction and answers:\n"""${String(b.current).slice(0, 6000)}"""` : ""}
${OUT}`, 1800);
      return Response.json({ ok: true, draft: r });
    }
    if (b.mode === "reply") {
      const r = await claudeJSON<any>(WRITER, `Sender's name: ${sender}. Tone: ${b.tone || "professional and courteous"}.
Write a reply to this email from ${b.original?.from} (subject "${b.original?.subject}"):
"""${String(b.original?.body || "").slice(0, 6000)}"""
What the user wants to say: """${String(b.instruction || "").slice(0, 2000)}"""
Keep the subject as "Re: " plus the original subject. ${OUT}`, 1500);
      return Response.json({ ok: true, draft: r });
    }
    if (b.mode === "followup") {
      const r = await claudeJSON<any>(WRITER, `Sender's name: ${sender}. Write a short, polite follow-up to an email sent ${b.days} days ago to ${b.toName || b.to} with the subject "${b.subject}", which hasn't had a reply. Don't be pushy; restate the request briefly and offer to help.
${b.original ? `The original email:\n"""${String(b.original).slice(0, 4000)}"""` : ""}
Subject should be "Re: ${b.subject}". ${OUT}`, 1200);
      return Response.json({ ok: true, draft: r });
    }
    if (b.mode === "triage") {
      const r = await claudeJSON<any>(`${SEBASTIAN_CORE}\nYou triage an inbox. Work only from the metadata and snippets given; don't guess beyond them.`,
        `Emails (JSON): ${JSON.stringify((b.messages || []).slice(0, 20)).slice(0, 9000)}
Return {"overview":"one sentence, e.g. You have 7 emails today; 3 appear to need your attention.","items":[{"id":"...","category":"Important|Urgent|Work|Finance|Meetings|Applications|Personal|Follow-ups|Newsletters|Other","attention":true,"summary":"one sentence","action":"Reply requested|Decision needed|Payment due|No response required|For information"}]}`, 2200);
      return Response.json({ ok: true, ...r });
    }
    if (b.mode === "summarize") {
      const r = await claudeJSON<any>(`${SEBASTIAN_CORE}\nSummarise emails faithfully. Never add facts.`,
        `Email from ${b.from}, subject "${b.subject}":\n"""${String(b.body).slice(0, 9000)}"""\nReturn {"summary":"2 to 4 sentences","actions":["specific things the reader is asked to do, if any"],"needsReply":true}`, 800);
      return Response.json({ ok: true, ...r });
    }
    return Response.json({ ok: false, error: "Unknown request." }, { status: 400 });
  } catch (e) { return errorResponse(e); }
}
