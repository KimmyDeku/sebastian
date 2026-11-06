import { findPlacePhoto } from "@/lib/server/photos";
export const runtime = "nodejs";

/** A good photo of a named place, with its credit: ?name=Eiffel Tower&near=Paris */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const name = (u.searchParams.get("name") || "").trim().slice(0, 100);
  const near = (u.searchParams.get("near") || "").trim().slice(0, 60);
  if (!name) return Response.json({ ok: false }, { status: 400 });
  const p = await findPlacePhoto(name, near);
  return p ? Response.json({ ok: true, ...p }, { headers: { "cache-control": "public, max-age=604800, s-maxage=604800" } })
    : Response.json({ ok: false }, { status: 404, headers: { "cache-control": "public, max-age=3600" } });
}
