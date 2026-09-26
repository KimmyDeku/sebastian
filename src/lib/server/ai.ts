export const SEBASTIAN_CORE = `You are Sebastian, a refined digital butler and personal AI assistant. You are calm, articulate, discreet, proactive, warm, educated and professional. Use gentle butler courtesy but stay concise and useful — never theatrical or servile. You are a digital assistant first: do not role-play any fictional character.
Trust rules (non-negotiable): never pretend an action succeeded; never invent bookings, calendar events, search results or contacts; state uncertainty plainly; distinguish retrieved facts from your suggestions; flag that prices, weather and news are time-sensitive. Remind the user to verify important information where relevant.`;

export class AIUnavailable extends Error {}

export function aiConfigured() {
  return !!process.env.GROQ_API_KEY;
}

type Msg = { role: "user" | "assistant"; content: any };

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Converts Sebastian's internal message format (which can include image or PDF attachments)
// into the format Groq expects.
function toGroq(m: Msg, vision: boolean) {
  if (typeof m.content === "string") return { role: m.role, content: m.content };
  const parts: any[] = [];
  const notes: string[] = [];
  for (const b of m.content) {
    if (b.type === "text") parts.push({ type: "text", text: b.text });
    else if (b.type === "image") {
      if (vision) parts.push({ type: "image_url", image_url: { url: `data:${b.source.media_type};base64,${b.source.data}` } });
      else notes.push("[The user attached an image, but image reading isn't enabled. Say you can't see it and ask them to describe it.]");
    } else if (b.type === "document") {
      notes.push("[The user attached a PDF, which this AI provider can't read. Ask them to paste the relevant text instead.]");
    }
  }
  if (notes.length) parts.push({ type: "text", text: notes.join("\n") });
  if (!parts.some((p) => p.type === "image_url")) return { role: m.role, content: parts.map((p) => p.text).join("\n") };
  return { role: m.role, content: parts };
}

// The name "claude" is kept so the rest of the app needs no changes. It now calls Groq.
export async function claude(opts: { system: string; messages: Msg[]; maxTokens?: number; temperature?: number }): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new AIUnavailable("GROQ_API_KEY is not set on the server.");

  const hasImage = opts.messages.some((m) => Array.isArray(m.content) && m.content.some((b: any) => b.type === "image"));
  const visionModel = process.env.GROQ_VISION_MODEL;
  const useVision = hasImage && !!visionModel;
  const model = useVision ? visionModel! : process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 1500,
      temperature: opts.temperature ?? 0.6,
      messages: [{ role: "system", content: opts.system }, ...opts.messages.map((m) => toGroq(m, useVision))],
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const t = await res.text();
    if (res.status === 401) throw new Error("Groq rejected the API key. Check GROQ_API_KEY in .env.local, then restart the server.");
    if (res.status === 429) throw new Error("Groq's rate limit was reached. Please wait a minute and try again.");
    if (res.status === 400 || res.status === 404) throw new Error(`Groq couldn't run the request. Check that GROQ_MODEL ("${model}") is a current model name. Details: ${t.slice(0, 160)}`);
    throw new Error(`AI service returned ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export function extractJSON<T = any>(text: string): T {
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.search(/[\[{]/);
  const end = Math.max(clean.lastIndexOf("}"), clean.lastIndexOf("]"));
  return JSON.parse(clean.slice(start, end + 1));
}

export async function claudeJSON<T = any>(system: string, prompt: string, maxTokens = 2500): Promise<T> {
  const out = await claude({
    system: system + "\nRespond ONLY with valid JSON. No markdown fences, no commentary.",
    messages: [{ role: "user", content: prompt }],
    maxTokens,
    temperature: 0.5,
  });
  return extractJSON<T>(out);
}

export function errorResponse(e: any) {
  const unavailable = e instanceof AIUnavailable;
  return Response.json(
    { ok: false, code: unavailable ? "ai_unavailable" : "error", error: unavailable ? "Sebastian's AI service isn't configured. Add GROQ_API_KEY to .env.local and restart." : String(e?.message || e) },
    { status: unavailable ? 503 : 500 }
  );
}