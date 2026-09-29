import { emailReceipt, receiptIsGenuine, receiptPdf } from "@/lib/server/billing";
export const runtime = "nodejs";

/** Returns a receipt as a PDF (or emails it again with ?email=1). */
export async function POST(req: Request) {
  const r = await req.json();
  if (!r?.number || !r?.plan) return Response.json({ ok: false, error: "Missing receipt." }, { status: 400 });
  if (!receiptIsGenuine(r)) return Response.json({ ok: false, error: "This receipt couldn't be verified." }, { status: 403 });
  const pdf = await receiptPdf(r);
  if (new URL(req.url).searchParams.get("email")) {
    const ok = await emailReceipt(r, pdf).catch(() => false);
    return Response.json({ ok, error: ok ? undefined : "Email isn't set up yet (RESEND_API_KEY and BILLING_FROM_EMAIL)." });
  }
  return new Response(Buffer.from(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="Sebastian-receipt-${r.number}.pdf"` } });
}
