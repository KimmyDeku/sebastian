import { db, push, pushReady } from "@/lib/server/push";
export const runtime = "nodejs";
export const maxDuration = 60;

/** Sends due reminders. Call every few minutes from a scheduler with ?key=CRON_SECRET (or an Authorization: Bearer header). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) return Response.json({ ok: false, error: "Not allowed." }, { status: 401 });
  if (!pushReady()) return Response.json({ ok: false, error: "Push isn't configured." }, { status: 503 });
  const c = db();
  const { data: jobs, error } = await c.from("push_jobs").select("endpoint,id,fire_at").eq("sent", false).lte("fire_at", new Date().toISOString()).limit(500);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  const endpoints = Array.from(new Set((jobs || []).map((j) => j.endpoint)));
  const { data: subs } = endpoints.length ? await c.from("push_subscriptions").select("endpoint,subscription,phrase").in("endpoint", endpoints) : { data: [] as any[] };
  const byEndpoint = new Map((subs || []).map((s: any) => [s.endpoint, s]));
  let sent = 0, gone = 0;
  for (const j of jobs || []) {
    const s: any = byEndpoint.get(j.endpoint);
    if (s) {
      try {
        await push().sendNotification(s.subscription, JSON.stringify({ title: "Sebastian", body: s.phrase, tag: `sebastian-${j.id}`, url: "/schedule?alert=1" }), { TTL: 3600, urgency: "high" });
        sent++;
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) { gone++; await c.from("push_jobs").delete().eq("endpoint", j.endpoint); await c.from("push_subscriptions").delete().eq("endpoint", j.endpoint); byEndpoint.delete(j.endpoint); continue; }
      }
    }
    await c.from("push_jobs").update({ sent: true }).eq("endpoint", j.endpoint).eq("id", j.id);
  }
  // Tidy up reminders sent more than two days ago.
  await c.from("push_jobs").delete().eq("sent", true).lt("fire_at", new Date(Date.now() - 2 * 86400000).toISOString());
  return Response.json({ ok: true, due: jobs?.length || 0, sent, removedDevices: gone });
}
