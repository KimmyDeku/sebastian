import { openaiCode, openaiReady } from "@/lib/server/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `You are Sebastian's coding assistant: a senior software engineer and patient teacher.
Answer in Markdown. Start with one or two sentences explaining the approach. Put ALL code in fenced code blocks with the language name after the opening fence (for example \`\`\`python). Give complete, runnable code with brief comments, then a short explanation of how it works and how to run it. Mention assumptions such as versions or libraries.`;

export async function POST(req: Request) {
  if (!openaiReady()) return Response.json({ ok: false, code: "not_configured", error: "Coding needs an OpenAI API key. Add OPENAI_API_KEY to .env.local (and to Vercel), then restart." }, { status: 503 });
  const b = await req.json();
  try {
    const r = await openaiCode(SYSTEM + (b.language ? `\nPreferred language: ${b.language}.` : ""), b.messages || [], "Notebook coding");
    return Response.json({ ok: true, ...r });
  } catch (e: any) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 502 });
  }
}
