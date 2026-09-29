import { fetchJSON } from "@/lib/server/http";
export const runtime = "nodejs";

// Real photos of a dish: Pexels when PEXELS_API_KEY is set, otherwise Openverse (openly licensed, no key needed).
async function pexels(q: string) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  const r = await fetchJSON(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=3&orientation=landscape`, { headers: { Authorization: key } }, 6000);
  const p = r.photos?.[0];
  return p ? { url: p.src?.large || p.src?.medium, credit: `Photo: ${p.photographer} on Pexels`, link: p.url } : null;
}
async function openverse(q: string) {
  const r = await fetchJSON(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=5&mature=false&aspect_ratio=wide`, { headers: { "user-agent": "SebastianAI/1.0" } }, 7000);
  const p = (r.results || []).find((x: any) => x.url && /\.(jpe?g|png|webp)(\?|$)/i.test(x.url)) || r.results?.[0];
  return p ? { url: p.thumbnail || p.url, credit: `Photo: ${p.creator || "unknown"} (${String(p.license || "").toUpperCase()}) via Openverse`, link: p.foreign_landing_url } : null;
}

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 80);
  if (!q) return Response.json({ ok: false }, { status: 400 });
  const query = /food|dish|meal|recipe|drink|cocktail|cake|bread|salad|soup/i.test(q) ? q : `${q} food`;
  for (const f of [pexels, openverse]) {
    try { const r = await f(query); if (r?.url) return Response.json({ ok: true, ...r }, { headers: { "cache-control": "public, max-age=604800" } }); } catch {}
  }
  return Response.json({ ok: false, error: "No photo found." }, { status: 404 });
}
