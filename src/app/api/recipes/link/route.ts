import * as cheerio from "cheerio";
import { fetchJSON, fetchText } from "@/lib/server/http";
import { claudeJSON, errorResponse, SEBASTIAN_CORE } from "@/lib/server/ai";
import { parseRecipePage, RECIPE_WHITELIST } from "@/lib/server/recipes";
import { normalizeRecipe } from "@/lib/util";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { url, servings = 2, diet = "", notes = "" } = await req.json();
    let u: URL;
    try { u = new URL(url); } catch { return Response.json({ ok: false, error: "That doesn't look like a valid link." }, { status: 400 }); }
    const host = u.hostname.replace("www.", "");

    if (RECIPE_WHITELIST.some((w) => host.endsWith(w))) {
      const r = await parseRecipePage(url);
      if (r) return Response.json({ ok: true, recipe: r });
    }
    let meta = { title: "", author: "", description: "", platform: "" };
    if (/youtube\.com|youtu\.be/.test(host)) {
      const o = await fetchJSON(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`);
      meta = { title: o.title, author: o.author_name, description: "", platform: "YouTube" };
    } else if (/tiktok\.com/.test(host)) {
      const o = await fetchJSON(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
      meta = { title: o.title, author: o.author_name, description: "", platform: "TikTok" };
    } else if (/instagram\.com/.test(host)) {
      try {
        const $ = cheerio.load(await fetchText(url));
        meta = { title: $('meta[property="og:title"]').attr("content") || "", author: "", description: $('meta[property="og:description"]').attr("content") || "", platform: "Instagram" };
      } catch { meta.platform = "Instagram"; }
    } else {
      return Response.json({ ok: false, error: "Please paste a TikTok, YouTube or Instagram recipe link (or a link from Allrecipes, Food Network or A Couple Cooks)." }, { status: 400 });
    }
    if (!meta.title && !meta.description) return Response.json({ ok: false, error: `I couldn't read that ${meta.platform} post — it may be private.` }, { status: 422 });

    const r = await claudeJSON<any>(`${SEBASTIAN_CORE}\nRole: chef (20+ yrs) and dietician (10+ yrs).`,
      `A user shared a ${meta.platform} video titled/captioned: "${meta.title} ${meta.description}" by ${meta.author}. Reconstruct the most likely recipe for ${servings} servings. Respect: ${diet || "no restrictions"}. Notes: ${notes || "none"}.
Return {"title","summary","baseServings":${servings},"totalTime","ingredients":[...],"steps":[...],"tags":[...]}`);
    return Response.json({ ok: true, recipe: { ...r, id: "l_" + Date.now().toString(36), source: `${meta.platform}, interpreted by Sebastian`, url, generated: true } });
  } catch (e) { return errorResponse(e); }
}
