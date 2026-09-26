import { fetchJSON } from "./http";

export interface PlaceResult { id: string; name: string; address?: string; lat: number; lng: number; rating?: number; ratingCount?: number; openNow?: boolean; phone?: string; photo?: string; mapsUrl: string; category: string; provider: string }

const OSM_TAGS: Record<string, string[]> = {
  pharmacy: ['["amenity"="pharmacy"]'], restaurant: ['["amenity"="restaurant"]'], cafe: ['["amenity"="cafe"]'],
  mechanic: ['["shop"="car_repair"]'], mall: ['["shop"="mall"]'], cinema: ['["amenity"="cinema"]'],
  recreation: ['["leisure"="park"]', '["leisure"="sports_centre"]'], hospital: ['["amenity"="hospital"]'], ambulance: ['["amenity"="hospital"]'],
  police: ['["amenity"="police"]'], fire: ['["amenity"="fire_station"]'], hotel: ['["tourism"="hotel"]'],
  salon: ['["shop"="hairdresser"]'], dermatologist: ['["healthcare"="doctor"]', '["amenity"="clinic"]'], supermarket: ['["shop"="supermarket"]'],
  bank: ['["amenity"="bank"]'], fuel: ['["amenity"="fuel"]'],
};

export async function geocodeText(q: string) {
  const r = await fetchJSON(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`, { headers: { "user-agent": "SebastianAI/1.0 (concierge app)" } });
  if (!r[0]) throw new Error(`I couldn't find "${q}" on the map.`);
  return { lat: +r[0].lat, lng: +r[0].lon, label: r[0].display_name as string };
}

const dirUrl = (lat: number, lng: number, placeId?: string, name?: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${placeId ? `&destination_place_id=${placeId}` : ""}${name && !placeId ? "" : ""}`;

async function google(query: string, lat: number, lng: number, key: string, category: string): Promise<PlaceResult[]> {
  const r = await fetchJSON("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "content-type": "application/json", "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours.openNow,places.nationalPhoneNumber,places.photos,places.googleMapsUri",
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 12, locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: 8000 } } }),
  });
  return (r.places || []).map((p: any) => ({
    id: p.id, name: p.displayName?.text, address: p.formattedAddress, lat: p.location.latitude, lng: p.location.longitude,
    rating: p.rating, ratingCount: p.userRatingCount, openNow: p.currentOpeningHours?.openNow, phone: p.nationalPhoneNumber,
    photo: `/api/places/photo?${new URLSearchParams({ ...(p.photos?.[0]?.name ? { name: p.photos[0].name } : {}), lat: String(p.location.latitude), lng: String(p.location.longitude) }).toString()}`,
    mapsUrl: dirUrl(p.location.latitude, p.location.longitude, p.id), category, provider: "Google Maps",
  }));
}

async function osm(category: string, text: string, lat: number, lng: number): Promise<PlaceResult[]> {
  const tags = OSM_TAGS[category];
  if (!tags) {
    const r = await fetchJSON(`https://nominatim.openstreetmap.org/search?format=json&limit=12&q=${encodeURIComponent(text)}&viewbox=${lng - 0.15},${lat + 0.15},${lng + 0.15},${lat - 0.15}&bounded=1`, { headers: { "user-agent": "SebastianAI/1.0" } });
    return r.map((x: any) => ({ id: "osm" + x.place_id, name: x.name || x.display_name.split(",")[0], address: x.display_name.split(",").slice(1, 4).join(","), lat: +x.lat, lng: +x.lon, mapsUrl: dirUrl(+x.lat, +x.lon), category, provider: "OpenStreetMap" }));
  }
  const body = `[out:json][timeout:15];(${tags.map((t) => `nwr${t}(around:6000,${lat},${lng});`).join("")});out center 20;`;
  const r = await fetchJSON("https://overpass-api.de/api/interpreter", { method: "POST", body: "data=" + encodeURIComponent(body), headers: { "content-type": "application/x-www-form-urlencoded" } }, 16000);
  return (r.elements || [])
    .filter((e: any) => e.tags?.name)
    .map((e: any) => {
      const la = e.lat ?? e.center?.lat, ln = e.lon ?? e.center?.lon;
      const t = e.tags;
      return { id: "osm" + e.id, name: t.name, address: [t["addr:street"], t["addr:suburb"], t["addr:city"]].filter(Boolean).join(", ") || undefined, lat: la, lng: ln, phone: t.phone || t["contact:phone"], mapsUrl: dirUrl(la, ln), category, provider: "OpenStreetMap" };
    })
    .sort((a: any, b: any) => Math.hypot(a.lat - lat, a.lng - lng) - Math.hypot(b.lat - lat, b.lng - lng))
    .slice(0, 12);
}

export async function searchPlaces(opts: { category: string; text?: string; lat?: number; lng?: number; where?: string }) {
  let { lat, lng } = opts;
  let where = "your location";
  if (opts.where) { const g = await geocodeText(opts.where); lat = g.lat; lng = g.lng; where = g.label.split(",").slice(0, 2).join(","); }
  if (lat == null || lng == null) throw new Error("A location is needed for the search.");
  const label = opts.text || opts.category;
  const key = process.env.GOOGLE_MAPS_API_KEY;
  let results: PlaceResult[] = [];
  let provider = "OpenStreetMap";
  if (key) {
    try { results = await google(`${label} near ${opts.where || `${lat},${lng}`}`, lat, lng, key, opts.category); provider = "Google Maps"; }
    catch { results = []; }
  }
  if (!results.length) results = await osm(opts.category.toLowerCase(), label, lat, lng);
    if (key) results = results.map((r) => (r.photo ? r : { ...r, photo: `/api/places/photo?lat=${r.lat}&lng=${r.lng}` }));
  return { results, provider, where, center: { lat, lng } };
}
