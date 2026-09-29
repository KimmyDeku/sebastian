import { geocode } from "@/lib/server/weather";
export const runtime = "nodejs";
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") || "";
  if (!q.trim()) return Response.json({ ok: false, error: "Type a place to search for." }, { status: 400 });
  try { const g = await geocode(q); return Response.json({ ok: true, name: g.country && g.name !== g.country ? `${g.name}, ${g.country}` : g.name, lat: g.lat, lng: g.lng, country: g.country }); }
  catch (e: any) { return Response.json({ ok: false, error: e?.message || "I couldn't find that place." }, { status: 404 }); }
}
