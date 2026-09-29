import { addMonth, type Receipt } from "@/lib/billing";
import { emailReceipt, paynowStatus, paypalCapture, readTicket, receiptPdf, sealReceipt } from "@/lib/server/billing";

export const runtime = "nodejs";
export const maxDuration = 45;

/** Checks a payment with the provider. When it's paid (and the amount is right), returns the receipt and emails it. */
export async function POST(req: Request) {
  try {
    const { ticket } = await req.json();
    const t = readTicket(ticket);
    if (!t) return Response.json({ ok: false, error: "This payment link is invalid or has expired." }, { status: 400 });
    const origin = new URL(req.url).origin;

    const s = t.method === "paypal" ? await paypalCapture(t.orderId) : await paynowStatus(origin, t.pollUrl);
    if (s.status === "cancelled" || s.status === "failed" || s.status === "disputed") return Response.json({ ok: true, status: "failed", message: "The payment was cancelled or declined. You haven't been charged." });
    if (s.status !== "paid") return Response.json({ ok: true, status: "pending" });
    if (s.amount + 0.001 < t.amount) return Response.json({ ok: true, status: "failed", message: `The amount received ($${s.amount}) doesn't match the plan price. Please contact support.` });

    const paid = new Date();
    const stamp = `${paid.getFullYear()}${String(paid.getMonth() + 1).padStart(2, "0")}${String(paid.getDate()).padStart(2, "0")}`;
    const receipt: Receipt = {
      number: `SEB-${stamp}-${String(t.ref).slice(-4)}`, ref: t.ref, plan: t.plan, amount: t.amount, currency: "USD", method: t.method, providerRef: s.providerRef,
      paidAt: paid.toISOString(), periodStart: paid.toISOString(), periodEnd: addMonth(paid).toISOString(), billedTo: t.billing,
    };
    receipt.sig = sealReceipt(receipt);
    let emailed = false;
    try { emailed = await emailReceipt(receipt, await receiptPdf(receipt)); } catch {}
    return Response.json({ ok: true, status: "paid", receipt: { ...receipt, emailed } });
  } catch (e: any) {
    return Response.json({ ok: false, error: `Couldn't check the payment: ${e?.message || e}` }, { status: 502 });
  }
}
