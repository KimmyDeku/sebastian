"use client";
import { useEffect, useRef, useState } from "react";
import { CreditCard, Smartphone, Wallet, Lock, Check, Loader2, Download, Mail, AlertTriangle, Crown } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Field, inputCls } from "../ui/Chip";
import { Notice } from "../ui/States";
import { actions, useAccount, useData, useStore } from "@/lib/store";
import { PLAN_NAMES, PLAN_PRICES, METHOD_NAMES, addMonth, type BillingDetails, type PayMethod, type Receipt } from "@/lib/billing";
import { whatsappLink } from "@/lib/support";
import { cx } from "@/lib/util";
import { toast } from "../ui/Toast";

const PENDING = "sebastian-pending-payment";
type Step = "details" | "method" | "waiting" | "redirecting" | "verifying" | "success" | "failed" | "unavailable";
const d8 = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export async function downloadReceipt(r: Receipt) {
  const res = await fetch("/api/billing/receipt", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(r) });
  if (!res.ok) { toast.error("The receipt couldn't be downloaded."); return; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(await res.blob());
  a.download = `Sebastian-receipt-${r.number}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Saves a confirmed payment: plan, receipt and a renewal reminder. */
function activate(r: Receipt) {
  useStore.getState().patch((d) => ({
    ...d,
    prefs: { ...d.prefs, plan: r.plan as any },
    billing: { plan: r.plan, status: "active", periodEnd: r.periodEnd, method: r.method, details: r.billedTo },
    receipts: [r, ...(d.receipts || []).filter((x) => x.ref !== r.ref)],
  }));
  const remind = new Date(r.periodEnd);
  remind.setDate(remind.getDate() - 3);
  remind.setHours(9, 0, 0, 0);
  actions.addEvent({ kind: "reminder", title: `Sebastian ${PLAN_NAMES[r.plan]} plan renews on ${d8(r.periodEnd)}`, start: remind.toISOString(), remindMinutes: 0,
    notes: `Renew for $${r.amount.toFixed(2)} in Settings, then Package.`, source: { type: "manual", ref: `renew:${r.number}` } });
}

export function Checkout({ plan, onClose, resume }: { plan: string; onClose: () => void; resume?: { ticket: string; method: PayMethod } }) {
  const acc = useAccount();
  const d = useData();
  const price = PLAN_PRICES[plan];
  const prev = d.billing?.details;
  const [step, setStep] = useState<Step>(resume ? "verifying" : "details");
  const [det, setDet] = useState<BillingDetails>(() => ({
    name: prev?.name || [acc?.firstName, acc?.surname].filter(Boolean).join(" "), email: prev?.email || acc?.email || "", phone: prev?.phone || acc?.phone || "",
    country: prev?.country || (acc?.timezone === "Africa/Harare" ? "Zimbabwe" : ""), address: prev?.address || "", city: prev?.city || "",
  }));
  const [method, setMethod] = useState<PayMethod>(resume?.method || d.billing?.method || "ecocash");
  const [ecoPhone, setEcoPhone] = useState(acc?.phone || "");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [instructions, setInstructions] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const stop = useRef(false);
  const next = addMonth(new Date()).toISOString();
  const detailsOk = det.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(det.email) && det.phone.trim() && det.country.trim();

  // Checks the payment every few seconds until it's paid, declined, or times out.
  const poll = async (ticket: string, seconds: number) => {
    stop.current = false;
    const until = Date.now() + seconds * 1000;
    while (!stop.current && Date.now() < until) {
      const r = await fetch("/api/billing/status", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ticket }) }).then((x) => x.json()).catch(() => null);
      if (stop.current) return;
      if (r?.ok && r.status === "paid") {
        localStorage.removeItem(PENDING);
        activate(r.receipt);
        setReceipt(r.receipt);
        setStep("success");
        return;
      }
      if (r?.ok && r.status === "failed") { localStorage.removeItem(PENDING); setMsg(r.message); setStep("failed"); return; }
      if (r && !r.ok) { setMsg(r.error); setStep("failed"); return; }
      await new Promise((res) => setTimeout(res, 4000));
    }
    if (!stop.current) { setMsg("We haven't received confirmation yet. If you approved the payment, it may take a minute; open Settings, then Package, again shortly to check."); setStep("failed"); }
  };

  useEffect(() => {
    if (resume) poll(resume.ticket, 90);
    return () => { stop.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pay = async () => {
    setBusy(true); setMsg("");
    const r = await fetch("/api/billing/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan, method, phone: ecoPhone, billing: det }) }).then((x) => x.json()).catch(() => ({ ok: false, error: "Couldn't reach Sebastian's server." }));
    setBusy(false);
    if (!r.ok) { setMsg(r.error); setStep(r.code === "not_configured" ? "unavailable" : "method"); return; }
    localStorage.setItem(PENDING, JSON.stringify({ ticket: r.ticket, method, plan }));
    if (method === "ecocash") { setInstructions(r.instructions); setStep("waiting"); poll(r.ticket, 180); return; }
    setStep("redirecting");
    window.location.href = r.redirectUrl;
  };

  const close = () => { stop.current = true; onClose(); };
  const title = step === "success" ? `Welcome to ${PLAN_NAMES[plan]}` : `Upgrade to ${PLAN_NAMES[plan]}`;

  const methods: { k: PayMethod; label: string; sub: string; icon: any }[] = [
    { k: "card", label: "Mastercard or Visa", sub: "Pay by card on Paynow's secure page", icon: CreditCard },
    { k: "ecocash", label: "EcoCash", sub: "Approve with your EcoCash PIN on your phone", icon: Smartphone },
    { k: "paypal", label: "PayPal", sub: "Pay with your PayPal account", icon: Wallet },
  ];

  return (
    <Modal open onClose={close} title={title}>
      {(step === "details" || step === "method") && (
        <div className="flex items-center justify-between rounded-2xl bg-cream/60 border border-cream-line px-4 py-3 mb-5">
          <div className="flex items-center gap-2"><Crown className="w-4 h-4 text-gold" aria-hidden /><span className="text-sm font-medium">{PLAN_NAMES[plan]} plan</span></div>
          <p className="text-sm"><span className="font-serif text-xl">${price}</span><span className="text-muted">/month</span></p>
        </div>
      )}

      {step === "details" && (
        <div className="space-y-4">
          <p className="text-[13px] text-muted">Your billing details. They appear on your receipt, and we&apos;ve filled in what we know.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Full name *"><input className={inputCls} value={det.name} onChange={(e) => setDet({ ...det, name: e.target.value })} autoComplete="name" /></Field>
            <Field label="Email for receipts *"><input type="email" className={inputCls} value={det.email} onChange={(e) => setDet({ ...det, email: e.target.value })} autoComplete="email" /></Field>
            <Field label="Phone *"><input type="tel" className={inputCls} value={det.phone} onChange={(e) => setDet({ ...det, phone: e.target.value })} autoComplete="tel" /></Field>
            <Field label="Country *"><input className={inputCls} value={det.country} onChange={(e) => setDet({ ...det, country: e.target.value })} autoComplete="country-name" /></Field>
            <Field label="Address (optional)"><input className={inputCls} value={det.address} onChange={(e) => setDet({ ...det, address: e.target.value })} autoComplete="street-address" /></Field>
            <Field label="City (optional)"><input className={inputCls} value={det.city} onChange={(e) => setDet({ ...det, city: e.target.value })} autoComplete="address-level2" /></Field>
          </div>
          <div className="flex justify-end"><Button onClick={() => setStep("method")} disabled={!detailsOk}>Continue to payment</Button></div>
        </div>
      )}

      {step === "method" && (
        <div className="space-y-4">
          {msg && <Notice tone="warning">{msg}</Notice>}
          <div role="radiogroup" aria-label="Payment method" className="space-y-2">
            {methods.map((m) => (
              <button key={m.k} type="button" role="radio" aria-checked={method === m.k} onClick={() => setMethod(m.k)}
                className={cx("w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors", method === m.k ? "border-gold bg-gold-soft/40" : "border-line hover:border-cream-line")}>
                <span className={cx("w-4 h-4 rounded-full border-2 shrink-0 inline-flex items-center justify-center", method === m.k ? "border-gold" : "border-muted-soft")}>{method === m.k && <span className="w-2 h-2 rounded-full bg-gold" />}</span>
                <m.icon className="w-5 h-5 text-gold shrink-0" aria-hidden />
                <span className="flex-1"><span className="block text-sm font-medium">{m.label}</span><span className="block text-[12px] text-muted">{m.sub}</span></span>
              </button>
            ))}
          </div>
          {method === "ecocash" && <Field label="EcoCash number"><input type="tel" className={inputCls} value={ecoPhone} onChange={(e) => setEcoPhone(e.target.value)} placeholder="077 123 4567" /></Field>}
          {method === "card" && <p className="text-[12px] text-muted inline-flex gap-1.5"><Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />You&apos;ll enter your card on Paynow&apos;s secure page. Sebastian never sees or stores card numbers.</p>}
          <div className="rounded-xl bg-canvas border border-line p-3 text-[13px] space-y-1">
            <div className="flex justify-between"><span className="text-muted">Today</span><span>${price.toFixed(2)} USD</span></div>
            <div className="flex justify-between"><span className="text-muted">Next billing date</span><span>{d8(next)}</span></div>
          </div>
          <label className="flex items-start gap-2 text-[12.5px]">
            <input type="checkbox" className="mt-0.5 w-4 h-4 accent-ink" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>I agree to pay ${price.toFixed(2)} now for one month of {PLAN_NAMES[plan]}. It renews when I pay again; Sebastian will remind me before {d8(next)}.</span>
          </label>
          <div className="flex justify-between gap-2">
            <Button variant="ghost" onClick={() => setStep("details")}>Back</Button>
            <Button onClick={pay} loading={busy} disabled={!agree || (method === "ecocash" && !ecoPhone.trim())}><Lock className="w-4 h-4" />Pay ${price.toFixed(2)}</Button>
          </div>
        </div>
      )}

      {step === "waiting" && (
        <div className="text-center py-4">
          <Smartphone className="w-10 h-10 mx-auto text-gold" aria-hidden />
          <p className="t-h3 mt-3">Check your phone</p>
          <p className="text-sm text-muted mt-2">Enter your EcoCash PIN on the prompt to approve ${price.toFixed(2)}.</p>
          {instructions && <p className="text-[12.5px] text-muted mt-2">{instructions}</p>}
          <p className="text-[12px] text-muted mt-5 inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Waiting for confirmation…</p>
          <div className="mt-5"><Button variant="ghost" onClick={close}>Cancel</Button></div>
        </div>
      )}

      {(step === "redirecting" || step === "verifying") && (
        <div className="text-center py-6">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-gold" aria-hidden />
          <p className="t-h3 mt-3">{step === "redirecting" ? `Opening ${METHOD_NAMES[method]} payment…` : "Confirming your payment…"}</p>
          <p className="text-sm text-muted mt-2">{step === "redirecting" ? "You'll come straight back to Sebastian afterwards." : "This usually takes a few seconds."}</p>
        </div>
      )}

      {step === "success" && receipt && (
        <div className="space-y-4">
          <div className="text-center">
            <span className="inline-flex w-14 h-14 rounded-full bg-[#EFF5F1] items-center justify-center"><Check className="w-7 h-7 text-success" aria-hidden /></span>
            <p className="text-sm text-muted mt-3">Your {PLAN_NAMES[receipt.plan]} plan is active. Thank you.</p>
          </div>
          <dl className="rounded-2xl bg-canvas border border-line divide-y divide-line text-[13px]">
            {[["Receipt", receipt.number], ["Paid", `$${receipt.amount.toFixed(2)} by ${METHOD_NAMES[receipt.method]}`], ["Next billing date", d8(receipt.periodEnd)]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-4 py-2.5"><dt className="text-muted">{k}</dt><dd className="text-right">{v}</dd></div>
            ))}
          </dl>
          <p className="text-[12.5px] text-muted inline-flex items-center gap-1.5"><Mail className="w-4 h-4" />{receipt.emailed ? `Receipt emailed to ${receipt.billedTo.email}.` : "The receipt couldn't be emailed (email isn't set up yet), but it's saved in Receipts."}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => downloadReceipt(receipt)}><Download className="w-4 h-4" />Download receipt</Button>
            <Button onClick={close}>Done</Button>
          </div>
        </div>
      )}

      {step === "failed" && (
        <div className="space-y-4">
          <Notice tone="warning"><span className="inline-flex gap-1.5"><AlertTriangle className="w-4 h-4 shrink-0" />{msg || "The payment didn't go through."}</span></Notice>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={close}>Close</Button><Button onClick={() => { setMsg(""); setStep("method"); }}>Try again</Button></div>
        </div>
      )}

      {step === "unavailable" && (
        <div className="space-y-4">
          <Notice tone="info">{msg} Until then, our team can upgrade you directly.</Notice>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>Close</Button>
            <Button href={whatsappLink(`Hello, I'd like to upgrade my Sebastian account (${acc?.email}) to ${PLAN_NAMES[plan]}.`)} external>Contact us on WhatsApp</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** Picks up a card or PayPal payment when the user returns from the payment page. */
export function pendingPayment(): { ticket: string; method: PayMethod; plan: string } | null {
  try { return JSON.parse(localStorage.getItem(PENDING) || "null"); } catch { return null; }
}
export const clearPendingPayment = () => { try { localStorage.removeItem(PENDING); } catch {} };
