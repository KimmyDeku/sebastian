import { claudeJSON, errorResponse, SEBASTIAN_CORE } from "@/lib/server/ai";
import { pinterestImages, socialLinks, youtubeShorts } from "@/lib/server/media";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(req: Request) {
  try {
    const a = await req.json();
    const skin = a.type === "skincare";
    const r = await claudeJSON<any>(`${SEBASTIAN_CORE}\nRole: a stylist, hair artist and colour consultant${skin ? ", plus skincare educator (not a doctor — never diagnose)" : ""}.`,
      `Create ${skin ? "a skincare routine and 4 inspiration looks" : "6 inspiration looks"} for: type=${a.type}, occasion=${a.occasion}, gender=${a.gender}, age=${a.age}, describes self as=${a.heritage}${skin ? `, skin type=${a.skinType}, concerns=${(a.concerns || []).join(", ")}, sensitivity=${a.sensitive}` : ""}. Notes: ${a.notes || "none"}.
Colours must flatter the stated complexion. Return {"intro":"1-2 sentences","looks":[{"title","description","palette":["#hex","#hex","#hex"],"pieces":[3-5 items],"searchQuery":"short query for reels/pins"}]${skin ? `,"routine":{"morning":[steps],"evening":[steps],"weekly":[steps],"ingredientsToLookFor":[...],"avoid":[...]}` : ""}}`, 3500);

    let pinterestError = "";
    const seen = new Set<string>(); // stops the same pin appearing under two looks
    const looks: any[] = [];
    for (const [i, l] of (r.looks || []).entries()) {
      const videos = await youtubeShorts(l.searchQuery, 2).catch(() => null);
      let images: any[] | null = null;
      try { images = await pinterestImages(l.searchQuery, 3, seen); }
      catch (e: any) { pinterestError = e.message; }
      looks.push({ ...l, id: "look_" + i, videos, images: images?.map((im) => ({ ...im, look: l.title })) || null, links: socialLinks(l.searchQuery) });
    }

    return Response.json({ ok: true, ...r, looks, pinterestError, providers: { youtube: !!process.env.YOUTUBE_API_KEY, images: !!process.env.PINTEREST_ACCESS_TOKEN } });
  } catch (e) { return errorResponse(e); }
}