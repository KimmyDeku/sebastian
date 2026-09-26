import { getWeather } from "@/lib/server/weather";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const s = new URL(req.url).searchParams;
  try {
    const r = await getWeather({ place: s.get("place") || undefined, lat: s.get("lat") ? +s.get("lat")! : undefined, lng: s.get("lng") ? +s.get("lng")! : undefined });
    return Response.json({ ok: true, weather: r });
  } catch (e: any) { return Response.json({ ok: false, error: String(e?.message || e) }, { status: 502 }); }
}
