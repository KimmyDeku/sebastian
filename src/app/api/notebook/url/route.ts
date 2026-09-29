import * as cheerio from "cheerio";
import { fetchText } from "@/lib/server/http";
export const runtime = "nodejs";

/** Reads the main text of a web page so it can be added as a research source. */
export async function POST(req: Request) {
  const { url } = await req.json();
  let u: URL;
  try { u = new URL(String(url)); if (!/^https?:$/.test(u.protocol)) throw 0; } catch { return Response.json({ ok: false, error: "That doesn't look like a web address." }, { status: 400 }); }
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname)) return Response.json({ ok: false, error: "That address isn't allowed." }, { status: 400 });
  try {
    const $ = cheerio.load(await fetchText(u.toString(), 10000));
    $("script, style, noscript, nav, header, footer, aside, form, iframe, svg").remove();
    const title = ($("meta[property='og:title']").attr("content") || $("title").first().text() || u.hostname).trim();
    const main = $("article").text() || $("main").text() || $("body").text();
    const text = main.replace(/\s+/g, " ").trim().slice(0, 60000);
    if (text.length < 200) return Response.json({ ok: false, error: "I couldn't read enough text from that page. Try copying the text in instead." }, { status: 422 });
    return Response.json({ ok: true, title, text, url: u.toString() });
  } catch {
    return Response.json({ ok: false, error: "That page couldn't be opened. Some sites block this; try copying the text in instead." }, { status: 502 });
  }
}
