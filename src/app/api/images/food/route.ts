import { findDishPhoto } from "@/lib/server/photos";
export const runtime = "nodejs";

// A real photo of a dish (Unsplash, Wikipedia, or public-domain photos from Openverse), with its credit.
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 80);
  if (!q) return Response.json({ ok: false }, { status: 400 });
  const p = await findDishPhoto(q);
  return p ? Response.json({ ok: true, ...p }, { headers: { "cache-control": "public, max-age=604800" } }) : Response.json({ ok: false, error: "No photo found." }, { status: 404 });
}
