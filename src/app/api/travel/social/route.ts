export const runtime = "nodejs";

// Instagram: real posts for a destination's hashtag (needs an Instagram business account and Meta approval).
// TikTok: plays a TikTok link the user pastes (TikTok offers no search to apps).
const cache = new Map<string, { at: number; items: any[] }>();
const slug = (s: string) => s.split(",")[0].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

async function instagram(dest: string) {
  const tag = slug(dest) || "travel";
  const openUrl = `https://www.instagram.com/explore/tags/${tag}/`;
  const ig = process.env.INSTAGRAM_BUSINESS_ID, token = process.env.INSTAGRAM_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
  const v = process.env.META_GRAPH_VERSION || "v21.0";
  if (!ig || !token) return { ok: false, code: "not_configured", tag, openUrl };
  // Instagram allows 30 different hashtags a week, so results are kept for 12 hours.
  const hit = cache.get(tag);
  if (hit && Date.now() - hit.at < 12 * 3600e3) return { ok: true, tag, openUrl, items: hit.items };
  try {
    const s = await fetch(`https://graph.facebook.com/${v}/ig_hashtag_search?user_id=${ig}&q=${encodeURIComponent(tag)}&access_token=${token}`).then((r) => r.json());
    const id = s?.data?.[0]?.id;
    if (!id) return { ok: false, code: s?.error ? "error" : "none", error: s?.error?.message, tag, openUrl };
    const m = await fetch(`https://graph.facebook.com/${v}/${id}/top_media?user_id=${ig}&fields=id,media_type,media_url,permalink,caption,timestamp&limit=30&access_token=${token}`).then((r) => r.json());
    const items = (m?.data || []).filter((x: any) => x.media_url && x.permalink && (x.media_type === "IMAGE" || x.media_type === "VIDEO")).slice(0, 18)
      .map((x: any) => ({ id: x.id, type: x.media_type, url: x.media_url, permalink: x.permalink, caption: String(x.caption || "").slice(0, 140) }));
    cache.set(tag, { at: Date.now(), items });
    return { ok: true, tag, openUrl, items };
  } catch (e: any) { return { ok: false, code: "error", error: e?.message, tag, openUrl }; }
}

async function tiktok(link: string) {
  let u: URL;
  try { u = new URL(link); } catch { return { ok: false, error: "That isn't a link." }; }
  if (!/(^|\.)tiktok\.com$/.test(u.hostname)) return { ok: false, error: "Please paste a link from tiktok.com." };
  const r = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(u.toString())}`).then((x) => (x.ok ? x.json() : null)).catch(() => null);
  const id = r?.embed_product_id || u.pathname.match(/\/video\/(\d+)/)?.[1];
  if (!id) return { ok: false, error: "That TikTok couldn't be found. Check the link is to a public video." };
  return { ok: true, id: String(id), title: r?.title || "TikTok video", author: r?.author_name || "", thumb: r?.thumbnail_url || "", url: u.toString() };
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const platform = q.get("platform");
  if (platform === "instagram") return Response.json(await instagram(q.get("dest") || ""));
  if (platform === "tiktok") return Response.json(await tiktok(q.get("url") || ""));
  return Response.json({ ok: false, error: "Unknown platform." }, { status: 400 });
}
