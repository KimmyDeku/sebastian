export const runtime = "nodejs";

/**
 * The picture for a place, from Google, in this order:
 *  1. the place's own photo (the one shown under Overview / Photos in Google Maps)
 *  2. Google Street View of the location
 *  3. a Google map of the spot
 * The API key never reaches the browser. Add &debug=1 to see why a step failed.
 */
const ok = (b: ArrayBuffer, type: string) => new Response(b, { headers: { "content-type": type, "cache-control": "public, max-age=604800, s-maxage=604800" } });
const why = async (r: Response) => { const t = await r.text().catch(() => ""); try { const j = JSON.parse(t); return `${r.status} ${j.error?.status || ""} ${j.error?.message || j.status || ""}`.trim(); } catch { return `${r.status} ${t.slice(0, 160)}`; } };

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const key = process.env.GOOGLE_MAPS_API_KEY;
  const debug = q.get("debug") === "1";
  const steps: Record<string, string> = {};
  const done = (b: ArrayBuffer | null, type: string, step: string) => (debug ? Response.json({ ok: true, used: step, steps }) : ok(b!, type));
  if (!key) return debug ? Response.json({ ok: false, steps: { setup: "GOOGLE_MAPS_API_KEY is not set on the server" } }) : new Response("Not found", { status: 404 });

  const name = q.get("name") || "";
  const lat = Number(q.get("lat")), lng = Number(q.get("lng"));
  const hasLoc = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

  // 1. The place's own Google photo
  if (/^places\/[^/]+\/photos\/[^/]+$/.test(name)) {
    try {
      const m = await fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=800&skipHttpRedirect=true&key=${key}`, { cache: "no-store" });
      if (m.ok) {
        const { photoUri } = await m.json();
        const img = photoUri ? await fetch(photoUri) : null;
        if (img?.ok) return done(await img.arrayBuffer(), img.headers.get("content-type") || "image/jpeg", "place photo");
        steps.placePhoto = `photo download failed (${img?.status ?? "no address"})`;
      } else steps.placePhoto = await why(m);
    } catch (e: any) { steps.placePhoto = `error: ${e?.message || e}`; }
  } else steps.placePhoto = "this place has no Google photo";

  if (hasLoc) {
    // 2. Street View, when there's imagery near the place
    try {
      const meta = await fetch(`https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&radius=60&source=outdoor&key=${key}`).then((r) => r.json());
      if (meta.status === "OK") {
        const sv = await fetch(`https://maps.googleapis.com/maps/api/streetview?size=800x450&location=${lat},${lng}&radius=60&source=outdoor&fov=80&key=${key}`);
        if (sv.ok) return done(await sv.arrayBuffer(), sv.headers.get("content-type") || "image/jpeg", "street view");
        steps.streetView = await why(sv);
      } else steps.streetView = `${meta.status}${meta.error_message ? `: ${meta.error_message}` : ""}`;
    } catch (e: any) { steps.streetView = `error: ${e?.message || e}`; }

    // 3. A Google map of the spot
    try {
      const map = await fetch(`https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=17&size=800x450&scale=1&maptype=roadmap&markers=color:0xB8823A%7C${lat},${lng}&key=${key}`);
      if (map.ok && (map.headers.get("content-type") || "").startsWith("image/")) return done(await map.arrayBuffer(), map.headers.get("content-type") || "image/png", "map");
      steps.staticMap = await why(map);
    } catch (e: any) { steps.staticMap = `error: ${e?.message || e}`; }
  } else steps.location = "no location given";

  console.error("Place photo unavailable", steps);
  return debug ? Response.json({ ok: false, steps }) : new Response("Not found", { status: 404 });
}
