import { findPhoto } from "@/lib/server/photos";
export const runtime = "nodejs";

/** A real photo for a few words. ?format=json returns the address and its credit; otherwise a redirect to the image. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const q = (u.searchParams.get("q") || "").trim().slice(0, 80);
  if (!q) return new Response("Missing q", { status: 400 });
  const p = await findPhoto(q, "squarish");
  const cacheHdr = { "cache-control": "public, max-age=604800, s-maxage=604800" };
  if (u.searchParams.get("format") === "json") return p ? Response.json({ ok: true, ...p }, { headers: cacheHdr }) : Response.json({ ok: false }, { status: 404, headers: { "cache-control": "public, max-age=3600" } });
  return p ? new Response(null, { status: 302, headers: { location: p.url, ...cacheHdr } }) : new Response("No photo found", { status: 404 });
}
