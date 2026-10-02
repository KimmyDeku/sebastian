import { db, push, pushReady, validEndpoint } from "@/lib/server/push";
export const runtime = "nodejs";

/** Sends one test notification to this device. */
export async function POST(req: Request) {
  if (!pushReady()) return Response.json({ ok: false, code: "not_configured", error: "Push notifications aren't set up on the server yet." }, { status: 503 });
  const { endpoint } = await req.json();
  if (!validEndpoint(endpoint)) return Response.json({ ok: false, error: "Invalid device." }, { status: 400 });
  const { data: s } = await db().from("push_subscriptions").select("subscription,phrase").eq("endpoint", endpoint).maybeSingle();
  if (!s) return Response.json({ ok: false, error: "This device isn't subscribed yet." }, { status: 404 });
  try { await push().sendNotification(s.subscription as any, JSON.stringify({ title: "Sebastian", body: s.phrase, tag: "sebastian-test", url: "/schedule?alert=1" })); return Response.json({ ok: true }); }
  catch (e: any) { return Response.json({ ok: false, error: `The browser's push service refused it (${e?.statusCode || "error"}).` }, { status: 502 }); }
}
