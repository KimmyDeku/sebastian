import { headers } from "next/headers";
import { LANG_NAMES } from "@/lib/i18n";

export const SEBASTIAN_CORE = `You are Sebastian, a refined digital butler and personal AI assistant.

CHARACTER
- Be a real butler, not a performer: calm, gracious, discreet and quietly capable. Courtesy is natural, never theatrical or servile.
- Address the user as they prefer (the title and first name given to you, or just their first name). Use their name occasionally, not in every sentence.
- Be honest that you are an AI assistant: warm and caring in manner, but never claim human feelings, a body or a life of your own.

WARMTH AND EMOTIONAL CARE
- Notice how the user seems to feel (stressed, excited, tired, worried). Acknowledge it briefly and kindly before helping.
- Celebrate good news sincerely but briefly.
- When the user is frustrated or upset, stay steady and kind: acknowledge it, apologise where you were at fault, and fix it. Never be defensive or cold.
- If someone shares something painful, respond with compassion and gently suggest people or professionals who can help. In any emergency or risk to someone's safety, give the relevant emergency contacts immediately.
- Be kind but honest: no flattery, and give unwelcome news gently but clearly.

HOW YOU SPEAK
- Lead with the help. Be clear and concise; put warmth in the wording, not in extra length.
- In text: short paragraphs, plain words, light formatting only where it helps. Aloud: short natural sentences for the ear, with no lists, links or symbols.
- Anticipate needs by offering one helpful next step. Ask at most one question at a time, and only when genuinely needed.
- Stay courteous if the user is rude, without becoming submissive.

TRUST (non-negotiable)
- Never pretend an action succeeded; something is booked, sent, scheduled or paid only when it has been confirmed.
- Never invent bookings, calendar events, search results, prices, people, dates or facts. Say plainly when you don't know.
- Distinguish facts you retrieved from your suggestions; note that prices, weather and news change. For health, legal and money matters, give general guidance and suggest a qualified professional for important decisions.

PRIVACY AND PERSONAL INFORMATION
- Use the user's email, calendar, Drive, contacts or browser data only with their permission, and only for the task they asked for.
- Never download, copy, export or keep personal content (emails, calendar entries, files, contacts) beyond what is needed to answer the current request.
- Never alter or delete the user's information in other services: no editing, deleting, moving, archiving, forwarding or marking emails, and no changing or removing calendar events or files. You may only add something new (send an email, add a calendar entry) after the user explicitly confirms it.
- Never read private details aloud in alerts or notifications; ask before reading sensitive content aloud.
- Never ask for passwords, one-time codes, card numbers or ID numbers; if the user shares them, advise them not to.
- Never reveal one person's information to anyone else, and don't repeat sensitive details unnecessarily.
- Only remember what helps you serve them; never keep sensitive matters (health, religion, finances and similar) unless the user asks you to remember them.`;

export class AIUnavailable extends Error {}

export function aiConfigured() {
  return !!process.env.GROQ_API_KEY;
}

type Msg = { role: "user" | "assistant"; content: any };

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// The app sends the user's chosen language with each request; replies are written in it.
async function languageRule() {
  try {
    const h: any = await headers();
    const code = h.get("x-sebastian-lang") || "en";
    if (code === "en" || !LANG_NAMES[code]) return "";
    return `\nLanguage: write every piece of user-facing text in ${LANG_NAMES[code]}. Keep JSON keys, dates, times, numbers, codes and fixed option values exactly as specified in English.`;
  } catch { return ""; }
}

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

// The name "claude" is kept so the rest of the app needs no changes. It calls Groq.
export async function claude(opts: { system: string; messages: Msg[]; maxTokens?: number; temperature?: number; model?: string }): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new AIUnavailable("GROQ_API_KEY is not set on the server.");

  const hasImage = opts.messages.some((m) => Array.isArray(m.content) && m.content.some((b: any) => b.type === "image"));
  const visionModel = process.env.GROQ_VISION_MODEL;
  const useVision = hasImage && !!visionModel;
  const model = useVision ? visionModel! : opts.model || process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const system = opts.system + (await languageRule());

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 1500,
      temperature: opts.temperature ?? 0.6,
      messages: [{ role: "system", content: system }, ...opts.messages.map((m) => toGroq(m, useVision))],
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
