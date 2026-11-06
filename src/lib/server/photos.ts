/**
 * Real photos for Sebastian: Unsplash when UNSPLASH_ACCESS_KEY is set, otherwise public-domain photos
 * from Openverse. Unsplash's rules are followed: photos are shown from Unsplash's own servers, credited to
 * the photographer and Unsplash, and Unsplash is told when a photo is used.
 */
export type Photo = { url: string; credit: string; link?: string; source: "unsplash" | "openverse" | "wikipedia" };
const cache = new Map<string, { p: Photo; at: number }>();
const UTM = "utm_source=sebastian&utm_medium=referral";

async function unsplash(q: string, orientation: "squarish" | "landscape"): Promise<Photo | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY; if (!key) return null;
  const r = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=1&orientation=${orientation}&content_filter=high`,
    { headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" }, signal: AbortSignal.timeout(6000) });
  if (!r.ok) return null;
  const p = (await r.json()).results?.[0];
  if (!p) return null;
  // Tell Unsplash the photo is being used (required by its API guidelines).
  if (p.links?.download_location) fetch(`${p.links.download_location}${p.links.download_location.includes("?") ? "&" : "?"}client_id=${key}`).catch(() => {});
  return { url: orientation === "squarish" ? p.urls?.small : p.urls?.regular, credit: `Photo by ${p.user?.name || "an Unsplash photographer"} on Unsplash`,
    link: `${p.user?.links?.html || "https://unsplash.com"}?${UTM}`, source: "unsplash" };
}
async function openverse(q: string): Promise<Photo | null> {
  const r = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&license=cc0,pdm&page_size=8&mature=false&extension=jpg`, { headers: { "user-agent": "SebastianAI/1.0" }, signal: AbortSignal.timeout(7000) });
  if (!r.ok) return null;
  const p = ((await r.json()).results || []).find((x: any) => x.thumbnail || x.url);
  return p ? { url: p.thumbnail || p.url, credit: `Public-domain photo${p.creator ? ` by ${p.creator}` : ""} via Openverse`, link: p.foreign_landing_url, source: "openverse" } : null;
}

export async function findPhoto(q: string, orientation: "squarish" | "landscape" = "squarish"): Promise<Photo | null> {
  const k = `${orientation}:${q.toLowerCase()}`;
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < 7 * 86400e3) return hit.p;
  for (const f of [() => unsplash(q, orientation), () => openverse(q)]) {
    try { const p = await f(); if (p?.url) { cache.set(k, { p, at: Date.now() }); if (cache.size > 800) cache.clear(); return p; } } catch {}
  }
  return null;
}

/* ---------- Wikipedia (excellent for landmarks and well-known dishes) ---------- */
const STOP = new Set(["the", "and", "of", "de", "la", "le", "du", "des", "of", "at", "in", "on", "for", "a", "an", "restaurant", "hotel", "cafe", "café"]);
const words = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));

/** The main photo of the Wikipedia article about `name` (only if the article really is about it). */
async function wikipedia(name: string, near = ""): Promise<Photo | null> {
  const q = `${name} ${near}`.trim();
  const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=3&prop=pageimages|info&inprop=url&piprop=thumbnail&pithumbsize=1000&pilicense=any`;
  const r = await fetch(url, { headers: { "user-agent": "SebastianAI/1.0 (https://sebastianai.co.zw)" }, signal: AbortSignal.timeout(6000) });
  if (!r.ok) return null;
  const pages = Object.values((await r.json()).query?.pages || {}).sort((a: any, b: any) => (a.index || 0) - (b.index || 0)) as any[];
  const want = words(name);
  for (const p of pages) {
    if (!p.thumbnail?.source) continue;
    const t = words(p.title);
    const overlap = want.filter((w) => t.includes(w)).length;
    if (want.length && overlap / want.length < 0.5) continue; // not the right article
    if (/\.svg|logo|flag|map|coat_of_arms/i.test(p.thumbnail.source)) continue;
    return { url: p.thumbnail.source, credit: `Image from the Wikipedia article "${p.title}"`, link: p.fullurl, source: "wikipedia" as const };
  }
  return null;
}

/** A photo of a named place (an attraction, hotel, restaurant): Wikipedia, then Unsplash, then Openverse. */
export async function findPlacePhoto(name: string, near = ""): Promise<Photo | null> {
  const k = `place:${name.toLowerCase()}|${near.toLowerCase()}`;
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < 7 * 86400e3) return hit.p;
  const tries = [() => wikipedia(name, near), () => unsplash(`${name} ${near}`.trim(), "landscape"), () => openverse(`${name} ${near}`.trim())];
  for (const f of tries) {
    try { const p = await f(); if (p?.url) { cache.set(k, { p, at: Date.now() }); return p; } } catch {}
  }
  return null;
}
/** A photo of a dish: Unsplash, then Wikipedia (good for classic dishes), then Openverse. */
export async function findDishPhoto(dish: string): Promise<Photo | null> {
  const k = `dish:${dish.toLowerCase()}`;
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < 7 * 86400e3) return hit.p;
  const q = /food|dish|meal|recipe|drink|cocktail|cake|bread|salad|soup/i.test(dish) ? dish : `${dish} food`;
  for (const f of [() => unsplash(q, "landscape"), () => wikipedia(dish), () => openverse(q)]) {
    try { const p = await f(); if (p?.url) { cache.set(k, { p, at: Date.now() }); return p; } } catch {}
  }
  return null;
}

/* ---------- A photo of a kind of thing ("cinema", "dessert"), varied by seed ---------- */
const topicCache = new Map<string, { list: Photo[]; at: number }>();
async function topicList(topic: string): Promise<Photo[]> {
  const k = topic.toLowerCase();
  const hit = topicCache.get(k);
  if (hit && Date.now() - hit.at < 7 * 86400e3) return hit.list;
  let list: Photo[] = [];
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (key) {
    try {
      const r = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(topic)}&per_page=20&orientation=landscape&content_filter=high`, { headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" }, signal: AbortSignal.timeout(6000) });
      if (r.ok) list = ((await r.json()).results || []).map((p: any) => ({ url: p.urls?.regular, credit: `Photo by ${p.user?.name || "an Unsplash photographer"} on Unsplash`, link: `${p.user?.links?.html || "https://unsplash.com"}?${UTM}`, source: "unsplash" as const, dl: p.links?.download_location }));
    } catch {}
  }
  if (!list.length) {
    try {
      const r = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(topic)}&license=cc0,pdm&page_size=20&mature=false&extension=jpg&aspect_ratio=wide`, { headers: { "user-agent": "SebastianAI/1.0" }, signal: AbortSignal.timeout(7000) });
      if (r.ok) list = ((await r.json()).results || []).filter((p: any) => p.url).map((p: any) => ({ url: p.thumbnail || p.url, credit: `Public-domain photo${p.creator ? ` by ${p.creator}` : ""} via Openverse`, link: p.foreign_landing_url, source: "openverse" as const }));
    } catch {}
  }
  list = list.filter((p) => p.url);
  if (list.length) topicCache.set(k, { list, at: Date.now() });
  return list;
}
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h); };
/** A real photo of a kind of thing, different for each seed (so neighbouring cards don't repeat). */
export async function findTopicPhoto(topic: string, seed = ""): Promise<Photo | null> {
  const list = await topicList(topic);
  if (!list.length) return null;
  const p: any = list[hash(seed || topic) % list.length];
  if (p.dl && process.env.UNSPLASH_ACCESS_KEY) fetch(`${p.dl}${p.dl.includes("?") ? "&" : "?"}client_id=${process.env.UNSPLASH_ACCESS_KEY}`).catch(() => {});
  return { url: p.url, credit: p.credit, link: p.link, source: p.source };
}
