import { getNews } from "@/lib/server/news";
export const runtime = "nodejs";
export async function POST(req: Request) {
  const { sources = ["bbc"], categories = ["top"] } = await req.json();
  try {
    const r = await getNews(sources, categories);
    if (!r.items.length) return Response.json({ ok: false, code: "empty", error: "No stories matched those sources and categories right now.", ...r }, { status: 404 });
    return Response.json({ ok: true, ...r });
  } catch (e: any) { return Response.json({ ok: false, error: String(e?.message || e) }, { status: 502 }); }
}
