export const runtime = "nodejs";

// Returns the best Google image for a place, in order:
// 1) the business's own Google Maps photo, 2) Street View of the spot, 3) a map snapshot.
// The API key stays on the server.
async function image(url: string) {
  const r = await fetch(url);
  const type = r.headers.get("content-type") || "";
  if (!r.ok || !type.startsWith("image/")) return null;
  return new Response(r.body, { headers: { "content-type": type, "cache-control": "public, max-age=86400" } });
}

export async function GET(req: Request) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return new Response("Not found", { status: 404 });
  const s = new URL(req.url).searchParams;
  const name = s.get("name");
  const hasPoint = s.get("lat") !== null && s.get("lng") !== null;
  const lat = Number(s.get("lat"));
  const lng = Number(s.get("lng"));

  // 1) The business's own photo
  if (name && /^places\/[^/]+\/photos\/[^/]+$/.test(name)) {
    const r = await image(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=900&key=${key}`);
    if (r) return r;
  }

  if (hasPoint && Number.isFinite(lat) && Number.isFinite(lng)) {
    // 2) Street View, only if Google has imagery for this spot
    try {
      const meta = await (await fetch(`https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&source=outdoor&key=${key}`)).json();
      if (meta.status === "OK") {
        const r = await image(`https://maps.googleapis.com/maps/api/streetview?size=640x400&location=${lat},${lng}&fov=80&source=outdoor&key=${key}`);
        if (r) return r;
      }
    } catch {}

    // 3) A map snapshot with a gold pin
    const r = await image(`https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=16&size=640x400&scale=2&markers=color:0xB8823A%7C${lat},${lng}&key=${key}`);
    if (r) return r;
  }

  return new Response("Not found", { status: 404 });
}