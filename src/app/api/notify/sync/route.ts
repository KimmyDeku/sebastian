import { db } from "@/lib/server/push";
import { userFromRequest } from "@/lib/server/notify";
export const runtime = "nodejs";

/** Replaces the user's upcoming reminder emails with the list from their app. */
export async function POST(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return Response.json({ ok: false, error: "Email notifications need SUPABASE_SERVICE_ROLE_KEY on the server." }, { status: 503 });
  const user = await userFromRequest(req);
  if (!user) return Response.json({ ok: false, error: "Please sign in again." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const now = Date.now(), limit = now + 15 * 86400e3;
  const rows = (Array.isArray(b.jobs) ? b.jobs : []).slice(0, 300).map((j: any) => ({
    user_id: user.id, id: String(j.id || "").slice(0, 100), fire_at: new Date(j.fireAt).toISOString(), kind: String(j.kind || "reminder").slice(0, 20),
    subject: String(j.subject || "A reminder from Sebastian").slice(0, 160), body: j.body && typeof j.body === "object" ? j.body : { title: String(j.subject || "") },
  })).filter((r: any) => r.id && !r.id.startsWith("now_") && !isNaN(Date.parse(r.fire_at)) && Date.parse(r.fire_at) > now - 60000 && Date.parse(r.fire_at) < limit);
  const c = db();
  // Remove upcoming scheduled emails that are no longer wanted, then add the current ones.
  const { error: e1 } = await c.from("notify_jobs").delete().eq("user_id", user.id).is("sent_at", null).gt("fire_at", new Date(now - 60000).toISOString()).not("id", "like", "now_%");
  if (e1) return Response.json({ ok: false, error: e1.message }, { status: 500 });
  if (rows.length) { const { error } = await c.from("notify_jobs").upsert(rows, { onConflict: "user_id,id", ignoreDuplicates: true }); if (error) return Response.json({ ok: false, error: error.message }, { status: 500 }); }
  return Response.json({ ok: true, scheduled: rows.length });
}
