import { claudeJSON } from "@/lib/server/ai";
import { LANG_NAMES } from "@/lib/i18n";

export const runtime = "nodejs";
export const maxDuration = 45;

const NOTES: Record<string, string> = {
  sn: " (chiShona as spoken in Zimbabwe)",
  nd: " (isiNdebele, the Northern Ndebele spoken in Zimbabwe)",
  zh: " using Simplified Chinese characters",
  pt: " (European Portuguese)",
};

export async function POST(req: Request) {
  const { lang, texts } = await req.json();
  const name = LANG_NAMES[lang];
  if (!name || lang === "en" || !Array.isArray(texts)) return Response.json({ ok: false, error: "Unsupported language." }, { status: 400 });
  const list = texts.slice(0, 60).map((t: any) => String(t).slice(0, 1500));
  try {
    const out = await claudeJSON<{ t: string[] }>(
      `You are a professional translator for Sebastian, a premium personal-assistant app with the manner of a refined butler. Translate user-interface text into natural, polite ${name}${NOTES[lang] || ""}.
Rules: keep the meaning and courteous tone; keep brand and product names unchanged (Sebastian, Booking.com, Agoda, Tripadvisor, Google, WhatsApp, TikTok, YouTube, Instagram, Pinterest, Groq, Supabase, ElevenLabs); keep numbers, prices, currency symbols, emoji, dates and punctuation; translate "Lord" and "Lady" as respectful honorifics; if a string is already in ${name}, return it unchanged. Translate each string independently.`,
      `Translate each item. Return {"t": [...]} containing exactly ${list.length} strings in the same order.\n${JSON.stringify(list)}`, 4000);
    const t = Array.isArray(out?.t) && out.t.length === list.length ? out.t.map((x: any, i: number) => (typeof x === "string" && x.trim() ? x : list[i])) : null;
    if (!t) return Response.json({ ok: false, error: "The translation came back incomplete." }, { status: 502 });
    return Response.json({ ok: true, texts: t });
  } catch (e: any) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 502 });
  }
}
