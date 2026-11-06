import { db } from "@/lib/server/push";
import { userFromRequest, sendNotifyEmail } from "@/lib/server/notify";
export const runtime = "nodejs";

/** Sends an email to the signed-in user straight away (at most 40 a day, and never the same one twice). */
export async function POST(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return Response.json({ ok: false, error: "Please sign in again." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const subject = String(b.subject || "").slice(0, 160), body = b.body && typeof b.body === "object" ? b.body : null;
  if (!subject || !body?.title) return Response.json({ ok: false, error: "Nothing to send." }, { status: 400 });
  const c = db();
  const id = `now_${String(b.key || `${Date.now()}`).slice(0, 90)}`;
  const since = new Date(Date.now() - 86400e3).toISOString();
  const { count } = await c.from("notify_jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).like("id", "now_%").gte("fire_at", since);
  if ((count || 0) >= 40) return Response.json({ ok: false, error: "Daily email limit reached." }, { status: 429 });
  const { data: exists } = await c.from("notify_jobs").select("id").eq("user_id", user.id).eq("id", id).maybeSingle();
  if (exists) return Response.json({ ok: true, duplicate: true });
  const r = await sendNotifyEmail(user.email, subject, body);
  if (!r.ok) return Response.json({ ok: false, error: r.error || "The email couldn't be sent." }, { status: 502 });
  // A full email can replace a shorter one that was scheduled (for example, the daily briefing).
  if (b.replaces) await c.from("notify_jobs").delete().eq("user_id", user.id).eq("id", String(b.replaces).slice(0, 100)).is("sent_at", null);
  await c.from("notify_jobs").insert({ user_id: user.id, id, fire_at: new Date().toISOString(), kind: String(b.kind || "now").slice(0, 20), subject, body, sent_at: new Date().toISOString() });
  return Response.json({ ok: true, to: user.email.replace(/^(.).+(@.+)$/, "$1…$2") });
}
