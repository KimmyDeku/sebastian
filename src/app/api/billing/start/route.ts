import { PLAN_PRICES, PLAN_NAMES, type PayMethod } from "@/lib/billing";
import { paynow, paynowReady, paypalCreate, paypalReady, signTicket } from "@/lib/server/billing";

export const runtime = "nodejs";

const zimMobile = (p: string) => {
  const d = String(p || "").replace(/[^\d+]/g, "").replace(/^\+?263/, "0");
  return /^07[78]\d{7}$/.test(d) ? d : null; // Econet numbers (077 / 078)
};

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const plan = String(b.plan);
    const method = b.method as PayMethod;
    const amount = PLAN_PRICES[plan];
    const origin = new URL(req.url).origin;
    if (!amount) return Response.json({ ok: false, error: "Unknown plan." }, { status: 400 });
    const d = b.billing || {};
    if (!d.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email || "")) return Response.json({ ok: false, error: "Please enter your name and a valid email address." }, { status: 400 });
    if (!process.env.BILLING_SECRET) return Response.json({ ok: false, code: "not_configured", error: "Payments aren't set up on the server yet (BILLING_SECRET is missing)." }, { status: 503 });

    const ref = `SEB-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    const base = { ref, plan, amount, method, billing: { name: d.name, email: d.email, phone: d.phone, country: d.country, address: d.address, city: d.city }, iat: Date.now() };

    if (method === "ecocash" || method === "card") {
      if (!paynowReady()) return Response.json({ ok: false, code: "not_configured", error: "EcoCash and card payments aren't set up yet (Paynow keys are missing)." }, { status: 503 });
      const p = paynow(origin);
      // In Paynow test mode, authEmail must be the merchant's own email.
      const payment = p.createPayment(ref, process.env.PAYNOW_AUTH_EMAIL || d.email);
      payment.add(`Sebastian ${PLAN_NAMES[plan]} plan (1 month)`, amount);
      if (method === "ecocash") {
        const phone = zimMobile(b.phone);
        if (!phone) return Response.json({ ok: false, error: "Enter a valid EcoCash number, such as 077 123 4567." }, { status: 400 });
        const r: any = await p.sendMobile(payment, phone, "ecocash");
        if (!r?.success) return Response.json({ ok: false, error: r?.error || "EcoCash couldn't start the payment. Check the number and try again." }, { status: 502 });
        return Response.json({ ok: true, ticket: signTicket({ ...base, pollUrl: r.pollUrl }), instructions: r.instructions || "" });
      }
      const r: any = await p.send(payment);
      if (!r?.success || !r.redirectUrl) return Response.json({ ok: false, error: r?.error || "The card payment page couldn't be opened." }, { status: 502 });
      return Response.json({ ok: true, ticket: signTicket({ ...base, pollUrl: r.pollUrl }), redirectUrl: r.redirectUrl });
    }

    if (method === "paypal") {
      if (!paypalReady()) return Response.json({ ok: false, code: "not_configured", error: "PayPal isn't set up yet (PayPal keys are missing)." }, { status: 503 });
      const o = await paypalCreate(ref, plan, amount, origin);
      return Response.json({ ok: true, ticket: signTicket({ ...base, orderId: o.orderId }), redirectUrl: o.redirectUrl });
    }
    return Response.json({ ok: false, error: "Choose a payment method." }, { status: 400 });
  } catch (e: any) {
    return Response.json({ ok: false, error: `The payment couldn't be started: ${e?.message || e}` }, { status: 502 });
  }
}
