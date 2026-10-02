export const runtime = "nodejs";

// Where messages go. CONTACT_TO_EMAIL overrides the default.
const TO = () => process.env.CONTACT_TO_EMAIL || "kimberlyrmunyoro@gmail.com";
// Sender: your verified domain if set, otherwise Resend's test sender (which can only deliver to your own Resend account's email).
const FROM = () => process.env.CONTACT_FROM_EMAIL || process.env.BILLING_FROM_EMAIL || "Sebastian <onboarding@resend.dev>";
const TYPES = ["Complaint", "Suggestion", "Feedback", "Report a problem"];

// A simple limit: at most 5 messages per address every 10 minutes.
const recent = new Map<string, number[]>();
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  if (b.website) return Response.json({ ok: true }); // a spam bot filled the hidden field
  const type = TYPES.includes(b.type) ? b.type : "Feedback";
  const name = String(b.name || "").trim().slice(0, 100);
  const email = String(b.email || "").trim().slice(0, 200);
  const subject = String(b.subject || "").trim().slice(0, 150);
  const message = String(b.message || "").trim().slice(0, 5000);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ ok: false, error: "Please enter a valid email address so we can reply." }, { status: 400 });
  if (message.length < 10) return Response.json({ ok: false, error: "Please tell us a little more (at least a sentence)." }, { status: 400 });

  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < 600000);
  if (hits.length >= 5) return Response.json({ ok: false, error: "You've sent several messages just now. Please wait a few minutes and try again." }, { status: 429 });
  recent.set(ip, [...hits, now]);

  const key = process.env.RESEND_API_KEY;
  if (!key) return Response.json({ ok: false, code: "not_configured", error: "Messages can't be sent yet because email isn't set up on the server (RESEND_API_KEY)." }, { status: 503 });
  const ref = `SEB-${now.toString(36).toUpperCase()}`;
  const rows: [string, string][] = [["Type", type], ["From", `${name || "(no name)"} <${email}>`], ["Reference", ref], ["Page", String(b.page || "").slice(0, 200)], ["Device", String(b.device || "").slice(0, 300)], ["Plan", String(b.plan || "").slice(0, 20)], ["Language", String(b.language || "").slice(0, 20)]];
  const html = `<div style="font-family:Arial,sans-serif;max-width:620px;color:#1C1B19">
    <p style="font-family:Georgia,serif;font-size:22px;margin:0 0 4px">Sebastian · ${esc(type)}</p>
    <p style="color:#6E6A64;margin:0 0 16px">${esc(subject || "(no subject)")}</p>
    <div style="white-space:pre-wrap;line-height:1.6;border-left:3px solid #B8823A;padding:8px 14px;background:#FCFBF9">${esc(message)}</div>
    <table style="margin-top:18px;font-size:13px;border-collapse:collapse">${rows.filter(([, v]) => v).map(([k, v]) => `<tr><td style="color:#6E6A64;padding:3px 14px 3px 0">${k}</td><td>${esc(v)}</td></tr>`).join("")}</table>
    <p style="color:#9A958D;font-size:12px;margin-top:18px">Reply to this email to answer ${esc(name || email)} directly.</p></div>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: FROM(), to: [TO()], reply_to: email, subject: `[Sebastian ${type}] ${subject || message.slice(0, 60)}`, html, text: `${type} from ${name} <${email}>\n\n${subject}\n\n${message}\n\nReference: ${ref}` }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    return Response.json({ ok: false, error: `The message couldn't be sent (${j?.message || r.status}). Please try again later.` }, { status: 502 });
  }
  return Response.json({ ok: true, ref });
}
