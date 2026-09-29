import * as cheerio from "cheerio";
import { fetchJSON } from "./http";

// Wikivoyage's "Respect" sections: the free, openly licensed travel guide (CC BY-SA).
const API = "https://en.wikivoyage.org/w/api.php";
const HEADERS = { "user-agent": "SebastianAI/1.0 (travel concierge; contact via app)" };

async function respectSection(page: string) {
  const s = await fetchJSON(`${API}?action=parse&page=${encodeURIComponent(page)}&prop=sections&format=json&redirects=1`, { headers: HEADERS }, 8000);
  const sections: any[] = s?.parse?.sections || [];
  const sec = sections.find((x) => /^respect$/i.test(String(x.line).trim())) || sections.find((x) => /etiquette|respect|culture/i.test(String(x.line)));
  if (!sec) return null;
  const t = await fetchJSON(`${API}?action=parse&page=${encodeURIComponent(page)}&section=${sec.index}&prop=text&format=json&redirects=1&disabletoc=1`, { headers: HEADERS }, 8000);
  const html = t?.parse?.text?.["*"] || "";
  const $ = cheerio.load(html);
  $(".mw-editsection, sup, .noprint, table").remove();
  const text = $.root().text().replace(/\[edit\]/g, "").replace(/\s+/g, " ").trim();
  if (text.length < 120) return null;
  const title = s?.parse?.title || page;
  return { text: text.slice(0, 7000), title, url: `https://en.wikivoyage.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}` };
}

/** Finds local etiquette guidance for a destination: the city page first, then the country. */
export async function findEtiquette(destination: string, country?: string) {
  const parts = destination.split(",").map((s) => s.trim()).filter(Boolean);
  const candidates = [...new Set([parts[0], country, parts[parts.length - 1]].filter(Boolean) as string[])];
  for (const page of candidates) {
    try { const r = await respectSection(page); if (r) return r; } catch {}
  }
  return null;
}
