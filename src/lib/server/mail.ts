import nodemailer from "nodemailer";

/**
 * Sends email from Sebastian, choosing the best option available:
 *  1. Resend with your own verified domain (EMAIL_FROM set to an address on that domain)
 *  2. Your Gmail account (GMAIL_USER + GMAIL_APP_PASSWORD): sends to anyone, about 500 a day
 *  3. Resend's test sender: can only deliver to your own Resend account's email
 */
export type Mail = { to: string | string[]; subject: string; html: string; text?: string; replyTo?: string; attachments?: { filename: string; content: Buffer | Uint8Array }[] };
export const OWNER_EMAIL = () => process.env.CONTACT_TO_EMAIL || process.env.GMAIL_USER || "kimberlyrmunyoro@gmail.com";

export function mailMethod(): "resend-domain" | "gmail" | "resend-test" | null {
  const from = process.env.EMAIL_FROM || process.env.CONTACT_FROM_EMAIL || process.env.BILLING_FROM_EMAIL || "";
  if (process.env.RESEND_API_KEY && from && !/resend\.dev|yourdomain\.com|example\.com/i.test(from)) return "resend-domain";
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) return "gmail";
  if (process.env.RESEND_API_KEY) return "resend-test";
  return null;
}
/** Whether an email can reach this address (the Resend test sender only reaches you). */
export function canReach(to: string) {
  const m = mailMethod();
  return m === "resend-domain" || m === "gmail" || (m === "resend-test" && to.toLowerCase() === OWNER_EMAIL().toLowerCase());
}

   let transport: any = null;
export async function sendMail(m: Mail): Promise<{ ok: boolean; error?: string; via?: string }> {
  const method = mailMethod();
  const to = Array.isArray(m.to) ? m.to : [m.to];
  if (!method) return { ok: false, error: "Email isn't set up on the server (add GMAIL_USER and GMAIL_APP_PASSWORD, or RESEND_API_KEY)." };
  if (method === "resend-test" && !to.every((x) => x.toLowerCase() === OWNER_EMAIL().toLowerCase())) return { ok: false, error: "Without your own domain, Resend can only email you. Add Gmail sending to email other people." };

  if (method === "gmail") {
    // Gmail by default; SMTP_HOST / SMTP_PORT allow another provider (for example Outlook or Zoho).
    const port = Number(process.env.SMTP_PORT || 465);
    transport ||= nodemailer.createTransport({ host: process.env.SMTP_HOST || "smtp.gmail.com", port, secure: port === 465, auth: { user: process.env.GMAIL_USER, pass: String(process.env.GMAIL_APP_PASSWORD).replace(/\s+/g, "") } });
    try {
      await transport.sendMail({ from: `Sebastian <${process.env.GMAIL_USER}>`, to, subject: m.subject, html: m.html, text: m.text, replyTo: m.replyTo,
        attachments: m.attachments?.map((a) => ({ filename: a.filename, content: Buffer.from(a.content) })) });
      return { ok: true, via: "gmail" };
    } catch (e: any) {
      const msg = String(e?.message || e);
      return { ok: false, error: /535|Username and Password not accepted|BadCredentials/i.test(msg) ? "Gmail rejected the sign-in. Check GMAIL_USER and the 16-letter App Password." : `Gmail couldn't send it: ${msg.slice(0, 160)}` };
    }
  }
  const from = method === "resend-domain" ? (process.env.EMAIL_FROM || process.env.CONTACT_FROM_EMAIL || process.env.BILLING_FROM_EMAIL)! : "Sebastian <onboarding@resend.dev>";
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to, subject: m.subject, html: m.html, text: m.text, reply_to: m.replyTo, attachments: m.attachments?.map((a) => ({ filename: a.filename, content: Buffer.from(a.content).toString("base64") })) }),
  }).catch(() => null);
  if (!r) return { ok: false, error: "Couldn't reach Resend." };
  if (!r.ok) { const j = await r.json().catch(() => ({})); return { ok: false, error: j?.message || `Resend returned ${r.status}` }; }
  return { ok: true, via: method };
}
