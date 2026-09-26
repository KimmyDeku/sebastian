export const runtime = "nodejs";

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("url") || "";
  let u: URL;
  try { u = new URL(raw); } catch { return new Response("Bad request", { status: 400 }); }
  if (u.protocol !== "https:" || !/(^|\.)pinimg\.com$/.test(u.hostname)) return new Response("Not allowed", { status: 403 });
  const r = await fetch(u.toString());
  if (!r.ok) return new Response("Not found", { status: 404 });
  return new Response(r.body, {
    headers: {
      "content-type": r.headers.get("content-type") || "image/jpeg",
      "content-disposition": 'attachment; filename="sebastian-look.jpg"',
    },
  });
}