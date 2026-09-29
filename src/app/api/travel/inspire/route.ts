import { fetchJSON } from "@/lib/server/http";
import { youtubeShorts, socialLinks } from "@/lib/server/media";
import { searchPlaces } from "@/lib/server/places";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Inspiration for a destination: an overview and photo, travel reels, and top sights. */
export async function GET(req: Request) {
  const dest = (new URL(req.url).searchParams.get("dest") || "").trim();
  if (!dest) return Response.json({ ok: false, error: "No destination." }, { status: 400 });
  const main = dest.split(",")[0].trim();
  const [wiki, reels, sights] = await Promise.all([
    fetchJSON(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(main.replace(/ /g, "_"))}`, { headers: { "user-agent": "SebastianAI/1.0" } }, 7000).catch(() => null),
    youtubeShorts(`${dest} travel guide`, 6).catch(() => null),
    process.env.GOOGLE_MAPS_API_KEY ? searchPlaces({ category: "attraction", text: `top attractions in ${dest}`, where: dest }).then((g) => g.results.slice(0, 8)).catch(() => []) : Promise.resolve([]),
  ]);
  return Response.json({
    ok: true,
    overview: wiki?.extract ? { title: wiki.title, text: wiki.extract, image: wiki.originalimage?.source || wiki.thumbnail?.source, url: wiki.content_urls?.desktop?.page } : null,
    coords: wiki?.coordinates ? { lat: wiki.coordinates.lat, lng: wiki.coordinates.lon } : null,
    reels: reels || [],
    sights: (sights as any[]).map((p) => ({ id: p.id, name: p.name, photo: p.photo, rating: p.rating, mapsUrl: p.mapsUrl })),
    links: { ...socialLinks(`${main} travel`), blogs: `https://www.google.com/search?q=${encodeURIComponent(`${dest} travel blog`)}` },
  });
}
