import { db, pushReady, validEndpoint } from "@/lib/server/push";
export const runtime = "nodejs";

/** Replaces this device's upcoming reminder times (only times and ids are stored, never titles). */
export async function POST(req: Request) {
  if (!pushReady()) return Response.json({ ok: false, code: "not_configured" }, { status: 503 });
  const { endpoint, jobs } = await req.json();
  if (!validEndpoint(endpoint)) return Response.json({ ok: false, error: "Invalid device." }, { status: 400 });
  const c = db();
  const { data: sub } = await c.from("push_subscriptions").select("endpoint").eq("endpoint", endpoint).maybeSingle();
  if (!sub) return Response.json({ ok: false, code: "unknown_device", error: "This device isn't subscribed." }, { status: 404 });
  const now = Date.now();
  const rows = (Array.isArray(jobs) ? jobs : [])
    .filter((j: any) => j?.id && Number.isFinite(new Date(j.fireAt).getTime()) && new Date(j.fireAt).getTime() > now - 60000 && new Date(j.fireAt).getTime() < now + 62 * 86400000)
    .slice(0, 300).map((j: any) => ({ endpoint, id: String(j.id).slice(0, 80), fire_at: new Date(j.fireAt).toISOString(), sent: false }));
  await c.from("push_jobs").delete().eq("endpoint", endpoint).eq("sent", false);
  if (rows.length) { const { error } = await c.from("push_jobs").upsert(rows); if (error) return Response.json({ ok: false, error: error.message }, { status: 500 }); }
  return Response.json({ ok: true, scheduled: rows.length });
}
