import crypto from "crypto";
import { Paynow } from "paynow";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { METHOD_NAMES, PLAN_NAMES, type Receipt } from "@/lib/billing";
import { SUPPORT } from "@/lib/support";

/* ---------- Signed payment tickets (so the browser can't change the plan or amount) ---------- */
const secret = () => process.env.BILLING_SECRET || "";
export function signTicket(data: any) {
  const body = Buffer.from(JSON.stringify(data)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}
export function readTicket(t: string): any | null {
  const [body, sig] = String(t || "").split(".");
  if (!body || !sig || !secret()) return null;
  const want = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  if (want.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return null;
  try { return JSON.parse(Buffer.from(body, "base64url").toString()); } catch { return null; }
}

const receiptBody = (r: Receipt) => JSON.stringify([r.number, r.ref, r.plan, r.amount, r.currency, r.method, r.providerRef, r.paidAt, r.periodStart, r.periodEnd, r.billedTo?.email]);
export const sealReceipt = (r: Receipt) => crypto.createHmac("sha256", secret()).update(receiptBody(r)).digest("base64url");
export const receiptIsGenuine = (r: Receipt) => !!secret() && !!r.sig && r.sig === sealReceipt(r);

/* ---------- Paynow: EcoCash and Mastercard/Visa ---------- */
export const paynowReady = () => !!(process.env.PAYNOW_INTEGRATION_ID && process.env.PAYNOW_INTEGRATION_KEY);
export function paynow(origin: string) {
  return new Paynow(process.env.PAYNOW_INTEGRATION_ID!, process.env.PAYNOW_INTEGRATION_KEY!, `${origin}/api/billing/paynow-result`, `${origin}/settings?billing=return`);
}
/** Asks Paynow for the payment's status and checks Paynow's security signature. */
export async function paynowStatus(origin: string, pollUrl: string) {
  const u = new URL(pollUrl);
  if (u.protocol !== "https:" || !/(^|\.)paynow\.co\.zw$/.test(u.hostname)) throw new Error("Invalid payment status address.");
  const text = await (await fetch(pollUrl, { method: "POST", cache: "no-store" })).text();
  const st: any = (paynow(origin) as any).parseStatusUpdate(text);
  return { status: String(st.status || "").toLowerCase(), amount: Number(st.amount || 0), providerRef: String(st.paynowReference || ""), error: st.error };
}

/* ---------- PayPal ---------- */
export const paypalReady = () => !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
const PP = () => (process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");
async function ppToken() {
  const r = await fetch(`${PP()}/v1/oauth2/token`, {
    method: "POST", cache: "no-store",
    headers: { Authorization: "Basic " + Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64"), "content-type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!r.ok) throw new Error("PayPal rejected the app credentials. Check PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
  return (await r.json()).access_token as string;
}
export async function paypalCreate(ref: string, plan: string, amount: number, origin: string) {
  const token = await ppToken();
  const r = await fetch(`${PP()}/v2/checkout/orders`, {
    method: "POST", cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json", "PayPal-Request-Id": ref },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{ reference_id: ref, description: `Sebastian ${PLAN_NAMES[plan]} plan, 1 month`, amount: { currency_code: "USD", value: amount.toFixed(2) } }],
      payment_source: { paypal: { experience_context: { brand_name: "Sebastian", user_action: "PAY_NOW", shipping_preference: "NO_SHIPPING", return_url: `${origin}/settings?billing=return`, cancel_url: `${origin}/settings?billing=cancel` } } },
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.message || "PayPal couldn't create the payment.");
  const link = (j.links || []).find((l: any) => l.rel === "payer-action" || l.rel === "approve")?.href;
  return { orderId: j.id as string, redirectUrl: link as string };
}
export async function paypalCapture(orderId: string) {
  const token = await ppToken();
  let r = await fetch(`${PP()}/v2/checkout/orders/${orderId}/capture`, { method: "POST", cache: "no-store", headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" } });
  let j = await r.json();
  const issue = j?.details?.[0]?.issue;
  if (issue === "ORDER_NOT_APPROVED" || issue === "PAYER_ACTION_REQUIRED") return { status: "pending", amount: 0, providerRef: "" };
  if (issue === "ORDER_ALREADY_CAPTURED") {
    r = await fetch(`${PP()}/v2/checkout/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    j = await r.json();
  }
  const cap = j?.purchase_units?.[0]?.payments?.captures?.[0];
  if (j?.status === "COMPLETED" && cap?.status === "COMPLETED") return { status: "paid", amount: Number(cap.amount?.value || 0), providerRef: cap.id as string };
  return { status: j?.status === "VOIDED" ? "cancelled" : "pending", amount: 0, providerRef: "" };
}

/* ---------- Receipt PDF with the Sebastian watermark ---------- */
const safe = (s: any) => String(s ?? "").replace(/[^\x20-\x7E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022]/g, "");
const d8 = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export async function receiptPdf(r: Receipt): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Sebastian receipt ${r.number}`);
  doc.setAuthor("Sebastian");
  const page = doc.addPage([595.28, 841.89]);
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const serifB = await doc.embedFont(StandardFonts.TimesRomanBold);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const sansB = await doc.embedFont(StandardFonts.HelveticaBold);
  const gold = rgb(0.72, 0.51, 0.23), ink = rgb(0.11, 0.106, 0.098), muted = rgb(0.43, 0.415, 0.39), line = rgb(0.9, 0.87, 0.83), green = rgb(0.25, 0.49, 0.35);
  const text = (s: string, x: number, y: number, size = 10, font = sans, color = ink) => page.drawText(safe(s), { x, y, size, font, color });
  const right = (s: string, xr: number, y: number, size = 10, font = sans, color = ink) => text(s, xr - font.widthOfTextAtSize(safe(s), size), y, size, font, color);

  // Watermark
  page.drawText("SEBASTIAN", { x: 70, y: 250, size: 104, font: serifB, color: gold, opacity: 0.07, rotate: degrees(38) });
  page.drawCircle({ x: 297, y: 420, size: 150, borderColor: gold, borderWidth: 2, borderOpacity: 0.06, opacity: 0 });

  // Header with the bowtie mark
  page.drawCircle({ x: 68, y: 781, size: 18, color: ink });
  page.drawSvgPath("M6 16 L28 28 Q30 32 28 36 L6 48 Q3 32 6 16 Z M58 16 L36 28 Q34 32 36 36 L58 48 Q61 32 58 16 Z M26.5 26 H37.5 V38 H26.5 Z", { x: 51.5, y: 797.5, scale: 0.52, color: rgb(1, 1, 1) });
  text("Sebastian", 94, 772, 26, serif);
  text("Your intelligent concierge", 95, 758, 8.5, sans, muted);
  right("RECEIPT", 545, 782, 13, sansB, gold);
  right(r.number, 545, 767, 9.5, sans, muted);
  page.drawLine({ start: { x: 50, y: 740 }, end: { x: 545, y: 740 }, thickness: 1.2, color: gold });

  // Billed to / details
  text("BILLED TO", 50, 712, 8, sansB, muted);
  let y = 696;
  for (const l of [r.billedTo.name, r.billedTo.email, r.billedTo.phone, [r.billedTo.address, r.billedTo.city].filter(Boolean).join(", "), r.billedTo.country].filter(Boolean)) { text(l, 50, y, 10); y -= 14; }
  const rows: [string, string][] = [["Receipt number", r.number], ["Date paid", d8(r.paidAt)], ["Payment method", METHOD_NAMES[r.method]], ["Transaction reference", r.providerRef || r.ref]];
  y = 712;
  for (const [k, v] of rows) { text(k, 330, y, 8.5, sans, muted); right(v, 545, y, 9.5, sansB); y -= 17; }

  // Paid stamp
  page.drawRectangle({ x: 470, y: 600, width: 75, height: 26, borderColor: green, borderWidth: 1.5, rotate: degrees(-6) });
  page.drawText("PAID", { x: 489, y: 610, size: 13, font: sansB, color: green, rotate: degrees(-6) });

  // Line items
  y = 560;
  page.drawRectangle({ x: 50, y: y - 8, width: 495, height: 24, color: rgb(0.97, 0.94, 0.89) });
  text("Description", 60, y, 9, sansB); text("Billing period", 300, y, 9, sansB); right("Amount", 535, y, 9, sansB);
  y -= 32;
  text(`Sebastian ${PLAN_NAMES[r.plan]} plan (monthly)`, 60, y, 10);
  text(`${d8(r.periodStart)} to ${d8(r.periodEnd)}`, 300, y, 9.5, sans, muted);
  right(`$${r.amount.toFixed(2)}`, 535, y, 10);
  page.drawLine({ start: { x: 50, y: y - 14 }, end: { x: 545, y: y - 14 }, thickness: 0.6, color: line });
  y -= 36;
  text("Total paid", 330, y, 11, sansB); right(`$${r.amount.toFixed(2)} ${r.currency}`, 535, y, 13, sansB);
  y -= 34;
  page.drawRectangle({ x: 50, y: y - 12, width: 495, height: 34, color: rgb(0.99, 0.98, 0.96), borderColor: line, borderWidth: 0.6 });
  text("Next billing date", 62, y, 9, sansB, muted);
  right(`${d8(r.periodEnd)}  ·  $${r.amount.toFixed(2)}`, 533, y, 10.5, sansB);

  // Footer
  text("Thank you for choosing Sebastian. It is our honour to be of service.", 50, 150, 11, serif, ink);
  text("Your plan renews each month when you pay again. We'll remind you a few days before your next billing date.", 50, 132, 8.5, sans, muted);
  page.drawLine({ start: { x: 50, y: 100 }, end: { x: 545, y: 100 }, thickness: 0.6, color: line });
  text(`${SUPPORT.company} · ${SUPPORT.address}`, 50, 84, 8, sans, muted);
  text(`${SUPPORT.email} · ${SUPPORT.phone}`, 50, 72, 8, sans, muted);
  right("sebastian", 545, 72, 8, serif, gold);
  return doc.save();
}

/* ---------- Email the receipt (Resend) ---------- */
export async function emailReceipt(r: Receipt, pdf: Uint8Array) {
  const key = process.env.RESEND_API_KEY, from = process.env.BILLING_FROM_EMAIL;
  if (!key || !from || !r.billedTo.email) return false;
  const plan = PLAN_NAMES[r.plan];
  const html = `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:32px;color:#1C1B19;background:#FCFBF9">
    <p style="font-size:26px;margin:0">Sebastian</p>
    <hr style="border:0;border-top:1px solid #B8823A;margin:16px 0 24px">
    <p style="font-size:18px">Thank you, ${safe(r.billedTo.name)}.</p>
    <p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#3A3833">Your <b>${plan}</b> plan is now active. We received <b>$${r.amount.toFixed(2)} ${r.currency}</b> by ${METHOD_NAMES[r.method]} on ${d8(r.paidAt)}.</p>
    <table style="font-family:Arial,sans-serif;font-size:13px;width:100%;border-collapse:collapse;margin:16px 0">
      <tr><td style="padding:6px 0;color:#6E6A64">Receipt number</td><td style="text-align:right">${r.number}</td></tr>
      <tr><td style="padding:6px 0;color:#6E6A64">Billing period</td><td style="text-align:right">${d8(r.periodStart)} to ${d8(r.periodEnd)}</td></tr>
      <tr><td style="padding:6px 0;color:#6E6A64">Next billing date</td><td style="text-align:right"><b>${d8(r.periodEnd)}</b></td></tr>
    </table>
    <p style="font-family:Arial,sans-serif;font-size:13px;color:#6E6A64">Your receipt is attached, and it's saved under Settings, then Receipts.</p>
    <p style="font-family:Arial,sans-serif;font-size:11px;color:#9A958D;margin-top:32px">${SUPPORT.company} · ${SUPPORT.email}</p></div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [r.billedTo.email], subject: `Your Sebastian receipt ${r.number}`, html, attachments: [{ filename: `Sebastian-receipt-${r.number}.pdf`, content: Buffer.from(pdf).toString("base64") }] }),
  });
  return res.ok;
}
