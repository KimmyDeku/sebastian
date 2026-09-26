import { fetchJSON } from "./http";

export async function youtubeShorts(q: string, max = 4) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;
  const r = await fetchJSON(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=short&maxResults=${max}&q=${encodeURIComponent(q + " #shorts")}&key=${key}`);
  return (r.items || []).map((i: any) => ({ id: i.id.videoId, title: i.snippet.title, channel: i.snippet.channelTitle, thumb: i.snippet.thumbnails?.high?.url }));
}

export async function unsplashImages(q: string, max = 6) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  const r = await fetchJSON(`https://api.unsplash.com/search/photos?per_page=${max}&orientation=portrait&query=${encodeURIComponent(q)}`, { headers: { Authorization: `Client-ID ${key}` } });
  return (r.results || []).map((p: any) => ({ id: p.id, thumb: p.urls.small, full: p.urls.regular, alt: p.alt_description, credit: p.user?.name, link: p.links?.html }));
}

export function socialLinks(q: string) {
  const e = encodeURIComponent(q);
  const tag = q.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return {
    tiktok: `https://www.tiktok.com/search?q=${e}`,
    instagram: `https://www.instagram.com/explore/tags/${tag.slice(0, 40)}/`,
    youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(q + " #shorts")}`,
    pinterest: `https://www.pinterest.com/search/pins/?q=${e}`,
  };
}

// ---------- Pinterest (your own saved pins) ----------
let boardCache: { board: string; at: number; items: any[] } | null = null;

function pinToImage(p: any) {
  const im = p?.media?.images || {};
  const thumb = (im["600x"] || im["400x300"] || im["1200x"] || im["150x150"])?.url;
  if (!thumb) return null;
  return {
    id: String(p.id),
    thumb,
    full: (im["1200x"] || im["600x"] || im["400x300"])?.url || thumb,
    alt: p.alt_text || p.title || p.description || "Pinterest look",
    text: `${p.title || ""} ${p.description || ""} ${p.alt_text || ""}`.toLowerCase(),
    link: `https://www.pinterest.com/pin/${p.id}/`,
    credit: "Pinterest",
  };
}

   async function pinterestGet(path: string) {
     const token = (process.env.PINTEREST_ACCESS_TOKEN || "").trim().replace(/^["']|["']$/g, "");
     const r = await fetch(`https://api.pinterest.com/v5${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
     if (r.ok) return r.json();
     let reason = "";
     try { const j = await r.json(); reason = j.message || j.error || ""; } catch {}
     if (r.status === 401) throw new Error(`Pinterest rejected the access token${reason ? ` ("${reason}")` : ""}. Check PINTEREST_ACCESS_TOKEN in .env.local, restart the server, or generate a new token.`);
     if (r.status === 403) throw new Error(`Pinterest refused access${reason ? ` ("${reason}")` : ""}. Check the token has the pins:read and boards:read scopes and that your app's access is approved.`);
     throw new Error(`Pinterest returned ${r.status}${reason ? `: ${reason}` : ""}`);
   }

export async function pinterestImages(q: string, max = 3, seen: Set<string> = new Set()) {
  if (!process.env.PINTEREST_ACCESS_TOKEN) return null;
  const out: any[] = [];
  const add = (x: any) => { if (x && !seen.has(x.id) && out.length < max) { seen.add(x.id); out.push(x); } };

  // 1) Search your own saved pins for this look.
  try {
    const s = await pinterestGet(`/search/pins?query=${encodeURIComponent(q)}`);
    (s.items || []).map(pinToImage).forEach(add);
  } catch (e: any) {
    if (String(e?.message).startsWith("Pinterest")) throw e;
  }

  // 2) Top up from your chosen board, best keyword matches first.
  const board = process.env.PINTEREST_BOARD_ID;
  if (out.length < max && board) {
    if (!boardCache || boardCache.board !== board || Date.now() - boardCache.at > 10 * 60000) {
      const b = await pinterestGet(`/boards/${board}/pins?page_size=100`);
      boardCache = { board, at: Date.now(), items: (b.items || []).map(pinToImage).filter(Boolean) };
    }
    const words = q.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
    const score = (x: any) => words.filter((w) => x.text.includes(w)).length;
    [...boardCache.items].sort((a, b) => score(b) - score(a)).forEach(add);
  }
  return out.map(({ text, ...rest }) => rest);
}