import { findTopicPhoto } from "@/lib/server/photos";
export const runtime = "nodejs";

/** A real photo of a kind of thing (?topic=cinema&seed=place-id), as a redirect to the image. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const topic = (u.searchParams.get("topic") || "").trim().slice(0, 60);
  if (!topic) return new Response("Missing topic", { status: 400 });
  const p = await findTopicPhoto(topic, (u.searchParams.get("seed") || "").slice(0, 120));
  return p ? new Response(null, { status: 302, headers: { location: p.url, "cache-control": "public, max-age=604800, s-maxage=604800" } }) : new Response("No photo", { status: 404, headers: { "cache-control": "public, max-age=3600" } });
}
