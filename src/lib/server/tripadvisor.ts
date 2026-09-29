import { fetchJSON } from "./http";

// Official Tripadvisor Content API (needs TRIPADVISOR_API_KEY). Tripadvisor requires that
// its ratings are shown with attribution and a link back to Tripadvisor.
const BASE = "https://api.content.tripadvisor.com/api/v1";

export type TAInfo = { id: string; name: string; rating?: number; reviews?: number; url?: string; photo?: string; ranking?: string; priceLevel?: string };

export async function tripadvisorFind(query: string, category: "hotels" | "attractions" | "restaurants" = "hotels"): Promise<TAInfo | null> {
  const key = process.env.TRIPADVISOR_API_KEY;
  if (!key) return null;
  try {
    const s = await fetchJSON(`${BASE}/location/search?key=${key}&searchQuery=${encodeURIComponent(query)}&category=${category}&language=en`, { headers: { accept: "application/json" } }, 7000);
    const hit = s.data?.[0];
    if (!hit) return null;
    const [det, ph] = await Promise.all([
      fetchJSON(`${BASE}/location/${hit.location_id}/details?key=${key}&language=en&currency=USD`, { headers: { accept: "application/json" } }, 7000).catch(() => null),
      fetchJSON(`${BASE}/location/${hit.location_id}/photos?key=${key}&language=en&limit=1`, { headers: { accept: "application/json" } }, 7000).catch(() => null),
    ]);
    const img = ph?.data?.[0]?.images;
    return {
      id: String(hit.location_id), name: hit.name,
      rating: det?.rating ? Number(det.rating) : undefined, reviews: det?.num_reviews ? Number(det.num_reviews) : undefined,
      url: det?.web_url, ranking: det?.ranking_data?.ranking_string, priceLevel: det?.price_level,
      photo: img?.large?.url || img?.medium?.url,
    };
  } catch { return null; }
}
