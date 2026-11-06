/**
 * Email notifications: reminders, briefings, suggestions and anything that needs the user,
 * always sent to the address on their own Sebastian account (never an address from the browser).
 */
import { db } from "./push";
import { sendMail, mailMethod } from "./mail";

export type NotifyBody = { title: string; lines?: string[]; url?: string; button?: string; intro?: string };
const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://sebastianai.co.zw").replace(/\/$/, "");

/** The signed-in user, from their Sebastian sign-in token. */
export async function userFromRequest(req: Request): Promise<{ id: string; email: string } | null> {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  try {
    const { data } = await db().auth.getUser(token);
    return data?.user?.email ? { id: data.user.id, email: data.user.email } : null;
  } catch { return null; }
}

export function emailHtml(b: NotifyBody) {
  const url = b.url ? (b.url.startsWith("http") ? b.url : `${SITE()}${b.url}`) : SITE();
  const lines = (b.lines || []).map((l) => `<tr><td style="padding:10px 0;border-top:1px solid #E6DFD3;font-size:15px;line-height:1.5;color:#1C1B19">${esc(l)}</td></tr>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#F7F4EF;font-family:Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EF;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FCFBF9;border:1px solid #E6DFD3;border-radius:18px">
<tr><td style="padding:22px 26px 6px"><span style="display:inline-block;width:34px;height:34px;border-radius:50%;background:#1C1B19;color:#fff;text-align:center;line-height:34px;font-size:15px">&#x2726;</span>
<span style="font-family:Georgia,serif;font-size:22px;color:#1C1B19;vertical-align:middle;margin-left:8px">Sebastian</span></td></tr>
<tr><td style="padding:14px 26px 4px"><h1 style="margin:0;font-family:Georgia,serif;font-weight:normal;font-size:26px;line-height:1.25;color:#1C1B19">${esc(b.title)}</h1>
${b.intro ? `<p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#4A4741">${esc(b.intro)}</p>` : ""}</td></tr>
${lines ? `<tr><td style="padding:10px 26px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${lines}</table></td></tr>` : ""}
<tr><td style="padding:22px 26px 26px"><a href="${esc(url)}" style="display:inline-block;background:#1C1B19;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px">${esc(b.button || "Open Sebastian")}</a></td></tr>
</table>
<p style="max-width:560px;font-size:12px;color:#8A857D;line-height:1.5;margin:14px auto 0">You're receiving this because you switched on email notifications in Sebastian. To change which emails you get, open Settings, then Notifications.</p>
</td></tr></table></body></html>`;
}
export const emailText = (b: NotifyBody) => [b.title, b.intro, ...(b.lines || []), "", b.url ? `${b.url.startsWith("http") ? b.url : SITE() + b.url}` : SITE()].filter((x) => x !== undefined).join("\n");

export async function sendNotifyEmail(to: string, subject: string, b: NotifyBody) {
  if (!mailMethod()) return { ok: false, error: "Email sending isn't set up on the server." };
  return sendMail({ to, subject, html: emailHtml(b), text: emailText(b) });
}

/** Sends scheduled emails that are due (called by the reminder scheduler every few minutes). */
export async function sendDueEmails() {
  const c = db();
  const { data: jobs, error } = await c.from("notify_jobs").select("user_id,id,subject,body").is("sent_at", null).lte("fire_at", new Date().toISOString()).limit(200);
  if (error) return { ok: false, error: error.message, sent: 0 };
  let sent = 0;
  const emails = new Map<string, string | null>();
  for (const j of jobs || []) {
    if (!emails.has(j.user_id)) { const { data } = await c.auth.admin.getUserById(j.user_id).catch(() => ({ data: null as any })); emails.set(j.user_id, data?.user?.email || null); }
    const to = emails.get(j.user_id);
    if (to) { const r = await sendNotifyEmail(to, j.subject, j.body as NotifyBody); if (r.ok) sent++; }
    await c.from("notify_jobs").update({ sent_at: new Date().toISOString() }).eq("user_id", j.user_id).eq("id", j.id);
  }
  await c.from("notify_jobs").delete().not("sent_at", "is", null).lt("fire_at", new Date(Date.now() - 7 * 86400e3).toISOString());
  return { ok: true, due: jobs?.length || 0, sent };
}
