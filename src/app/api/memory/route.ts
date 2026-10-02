import { claudeJSON, errorResponse } from "@/lib/server/ai";

export const runtime = "nodejs";
export const maxDuration = 45;

const RULES = `You maintain the memory of Sebastian, a personal assistant, about one user: a short, accurate profile that helps Sebastian personalise help in every future conversation.
Rules:
- Use only evidence in the activity given. Don't guess or embellish. Prefer patterns (things seen more than once) over one-off events.
- Merge with the previous memory: keep what is still supported, update what changed, and drop anything contradicted or clearly out of date (for example past one-off plans).
- Keep each fact short and useful for helping them, e.g. "Vegetarian; avoids mushrooms", "Plans trips around beaches and food, usually for two", "Prefers concise replies", "Studying quadratic equations at high-school level".
- NEVER infer or record sensitive characteristics: health or medical conditions, religion, ethnicity, sexual orientation, political views, trade-union membership, or criminal matters. Record something from these areas only if the user explicitly stated it as a preference they want remembered, such as a dietary requirement.
- Never record passwords, codes, account or card numbers, ID numbers, exact amounts of money, or private details about other people beyond a first name and relationship the user mentioned.
- The pinned facts were written by the user: treat them as true, don't repeat them in your facts, and don't contradict them.
- At most 30 facts.`;

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const r = await claudeJSON<any>(RULES,
      `PREVIOUS MEMORY: ${JSON.stringify(b.previous || {}).slice(0, 5000)}
PINNED BY THE USER: ${JSON.stringify(b.pinned || []).slice(0, 1500)}
THE USER'S ACTIVITY:
${String(b.signals || "").slice(0, 11000)}
Return JSON only: {"summary":"3 to 5 sentences: who the user is, what they're working on, and how Sebastian can help them best","style":"one sentence on how they like Sebastian to communicate, or empty","facts":[{"text":"...","category":"identity|preferences|routines|goals|interests|work|study|travel|food|communication|people"}]}`, 2200);
    const facts = (Array.isArray(r.facts) ? r.facts : []).filter((f: any) => f && typeof f.text === "string" && f.text.trim()).slice(0, 30);
    return Response.json({ ok: true, summary: r.summary || "", style: r.style || "", facts });
  } catch (e) { return errorResponse(e); }
}
