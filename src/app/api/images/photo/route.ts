export const runtime = "nodejs";

/**
 * A real photo for a few words (for example "hotel reception check in"), as a redirect to the image,
 * so it can be used directly in <img src="/api/images/photo?q=...">.
 * Pexels when PEXELS_API_KEY is set (free to use, no credit needed); otherwise Openverse, limited to
 * public-domain photos (CC0 and Public Domain Mark), which also need no credit. Results are cached.
 */
const cache = new Map<string, { url: string; at: number }>();

async function pexels(q: string) {
  const key = process.env.PEXELS_API_KEY; if (!key) return null;
  const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=3&orientation=square`, { headers: { Authorization: key }, signal: AbortSignal.timeout(6000) });
  if (!r.ok) return null;
  const j = await r.json();
  return j.photos?.[0]?.src?.medium || j.photos?.[0]?.src?.small || null;
}
async function openverse(q: string) {
  const r = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license=cc0,pdm&page_size=8&mature=false&extension=jpg`, { headers: { "user-agent": "SebastianAI/1.0" }, signal: AbortSignal.timeout(7000) });
  if (!r.ok) return null;
  const j = await r.json();
  const hit = (j.results || []).find((x: any) => x.thumbnail || x.url);
  return hit ? hit.thumbnail || hit.url : null;
}

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 80);
  if (!q) return new Response("Missing q", { status: 400 });
  const hit = cache.get(q);
  let url = hit && Date.now() - hit.at < 7 * 86400e3 ? hit.url : null;
  if (!url) {
    for (const f of [pexels, openverse]) { try { url = await f(q); } catch { url = null; } if (url) break; }
    if (url) { cache.set(q, { url, at: Date.now() }); if (cache.size > 500) cache.clear(); }
  }
  if (!url) return new Response("No photo found", { status: 404, headers: { "cache-control": "public, max-age=3600" } });
  return new Response(null, { status: 302, headers: { location: url, "cache-control": "public, max-age=604800, s-maxage=604800" } });
}
