import { db, pushReady, validEndpoint } from "@/lib/server/push";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!pushReady()) return Response.json({ ok: false, code: "not_configured", error: "Push notifications aren't set up on the server yet." }, { status: 503 });
  const { subscription, phrase } = await req.json();
  if (!subscription?.endpoint || !validEndpoint(subscription.endpoint) || !subscription.keys?.p256dh) return Response.json({ ok: false, error: "That notification subscription isn't valid." }, { status: 400 });
  const { error } = await db().from("push_subscriptions").upsert({ endpoint: subscription.endpoint, subscription, phrase: String(phrase || "You have a notification that requires your attention.").slice(0, 160), updated_at: new Date().toISOString() });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!pushReady()) return Response.json({ ok: true });
  const { endpoint } = await req.json();
  if (endpoint) { const c = db(); await c.from("push_jobs").delete().eq("endpoint", endpoint); await c.from("push_subscriptions").delete().eq("endpoint", endpoint); }
  return Response.json({ ok: true });
}
