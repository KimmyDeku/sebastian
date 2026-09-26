import { searchPlaces } from "@/lib/server/places";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    const r = await searchPlaces(await req.json());
    if (!r.results.length) return Response.json({ ok: false, code: "empty", error: `Nothing matched near ${r.where}. Try a wider area or another category.`, ...r }, { status: 404 });
    return Response.json({ ok: true, ...r });
  } catch (e: any) { return Response.json({ ok: false, error: String(e?.message || e) }, { status: 502 }); }
}
