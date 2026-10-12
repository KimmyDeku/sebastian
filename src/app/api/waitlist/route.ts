import { createClient } from "@supabase/supabase-js";
import { sendMail, mailMethod, canReach, OWNER_EMAIL } from "@/lib/server/mail";
export const runtime = "nodejs";

// Waitlist sign-ups: saved in Supabase (table "waitlist") and emailed to you.
const recent = new Map<string, number[]>();
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  if (b.website) return Response.json({ ok: true }); // spam bot
  const name = String(b.name || "").trim().slice(0, 100);
  const email = String(b.email || "").trim().toLowerCase().slice(0, 200);
  const interest = String(b.interest || "").trim().slice(0, 300);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const hits = (recent.get(ip) || []).filter((t) => Date.now() - t < 600000);
  if (hits.length >= 5) return Response.json({ ok: false, error: "Please wait a few minutes before trying again." }, { status: 429 });
  recent.set(ip, [...hits, Date.now()]);

  let saved = false, already = false;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { error } = await db.from("waitlist").insert({ name, email, interest });
    if (!error) saved = true; else if (error.code === "23505") already = true;
  }
  let emailed = false;
  if (mailMethod() && !already) {
    // Tell you about the new sign-up.
    const r = await sendMail({ to: OWNER_EMAIL(), replyTo: email, subject: `[Sebastian waitlist] ${name || email}`,
      html: `<div style="font-family:Arial,sans-serif;color:#1C1B19"><p style="font-family:Georgia,serif;font-size:20px">New waitlist sign-up</p><p><b>${esc(name || "(no name)")}</b> &lt;${esc(email)}&gt;</p>${interest ? `<p>Most interested in: ${esc(interest)}</p>` : ""}</div>` });
    emailed = r.ok;
    // And thank them (only possible when Sebastian can email other people, for example through Gmail).
    if (canReach(email)) await sendMail({ to: email, subject: "You're on the Sebastian waitlist",
      html: `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:28px;color:#1C1B19;background:#FCFBF9"><p style="font-size:24px;margin:0">Sebastian</p><hr style="border:0;border-top:1px solid #B8823A;margin:14px 0 22px"><p style="font-size:17px">Good day${name ? `, ${esc(name.split(" ")[0])}` : ""},</p><p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#3A3833">Thank you for joining the Sebastian waitlist. We'll write to you as soon as a place opens so you can try your new personal concierge.</p><p style="font-family:Arial,sans-serif;font-size:14px;color:#3A3833">At your service,<br><b>Sebastian</b></p></div>` }).catch(() => null);
  }
  if (already) return Response.json({ ok: true, already: true });
  if (!saved && !emailed) return Response.json({ ok: false, error: "The waitlist isn't set up yet. Please contact us on WhatsApp or by email instead." }, { status: 503 });
  return Response.json({ ok: true });
}
