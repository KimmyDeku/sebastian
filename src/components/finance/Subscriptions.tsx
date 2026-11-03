"use client";
import { useMemo, useState } from "react";
import { Plus, Trash2, Check, ExternalLink, Search, CalendarClock } from "lucide-react";
import { Button } from "../ui/Button";
import { inputCls } from "../ui/Chip";
import { AppLogo } from "../AppLogo";
import { SERVICES, CURRENCIES, useSubscriptions, addSub, deleteSub, markPaid, money, perMonth, cycleLabel, type Cycle, type Service } from "@/lib/subscriptions";
import { cx } from "@/lib/util";
import { toast } from "../ui/Toast";

const daysUntil = (d: string) => Math.round((new Date(`${d}T09:00`).getTime() - Date.now()) / 86400e3);
const when = (d: string) => { const n = daysUntil(d); return n < 0 ? `${-n} day${n === -1 ? "" : "s"} overdue` : n === 0 ? "due today" : n === 1 ? "due tomorrow" : `due in ${n} days`; };

/** Subscriptions and regular payments: what you pay, when it's due, and what you've paid. */
export function Subscriptions() {
  const subs = useSubscriptions();
  const [q, setQ] = useState("");
  const [pick, setPick] = useState<Service | null>(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", amount: "", currency: "USD", cycle: "monthly" as Cycle, nextDue: "", payLink: "" });
  const year = new Date().getFullYear();

  const shown = useMemo(() => SERVICES.filter((s) => !q.trim() || `${s.name} ${s.category}`.toLowerCase().includes(q.toLowerCase())), [q]);
  const groups = useMemo(() => { const m = new Map<string, Service[]>(); shown.forEach((s) => m.set(s.category, [...(m.get(s.category) || []), s])); return [...m.entries()]; }, [shown]);
  const active = subs.filter((s) => s.active).sort((a, b) => a.nextDue.localeCompare(b.nextDue));
  const totals = useMemo(() => { const m = new Map<string, number>(); active.forEach((s) => m.set(s.currency, (m.get(s.currency) || 0) + perMonth(s))); return [...m.entries()]; }, [active]);
  const paidThisYear = useMemo(() => { const m = new Map<string, number>(); subs.forEach((s) => s.payments.filter((p) => p.at.startsWith(String(year))).forEach((p) => m.set(s.currency, (m.get(s.currency) || 0) + p.amount))); return [...m.entries()]; }, [subs, year]);
  const fmtTotals = (t: [string, number][], k = 1) => (t.length ? t.map(([c, v]) => money(v * k, c)).join(" + ") : "—");

  const choose = (s: Service) => { setPick(s); setOpen(false); setQ(""); setF((x) => ({ ...x, name: s.key === "custom" ? "" : s.name, payLink: s.url || "" })); };
  const save = () => {
    const amount = Number(f.amount);
    if (!pick) return toast.error("Choose a subscription first.");
    if (!f.name.trim()) return toast.error("Please give it a name.");
    if (!(amount > 0)) return toast.error("Please enter the amount you pay.");
    if (!f.nextDue) return toast.error("When is the next payment due?");
    if (f.payLink && !/^https:\/\//.test(f.payLink)) return toast.error("The payment link must start with https://");
    addSub({ key: pick.key, name: f.name.trim(), category: pick.category, amount, currency: f.currency, cycle: f.cycle, nextDue: f.nextDue, payLink: f.payLink || undefined });
    toast.success(`${f.name.trim()} added. It's in your calendar, and Sebastian will remind you 3 days before it's due.`);
    setPick(null); setF({ name: "", amount: "", currency: "USD", cycle: "monthly", nextDue: "", payLink: "" });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[["Per month", fmtTotals(totals)], ["Per year", fmtTotals(totals, 12)], ["Next payment", active[0] ? `${active[0].name}, ${when(active[0].nextDue)}` : "—"], [`Paid in ${year}`, fmtTotals(paidThisYear)]].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-paper border border-line p-4"><p className="text-[12px] text-muted">{k}</p><p className="font-serif text-xl mt-1 break-words">{v}</p></div>
        ))}
      </div>

      <section className="rounded-3xl bg-paper border border-line p-5 md:p-6">
        <h2 className="t-h3">Add a subscription</h2>
        <p className="text-[13px] text-muted mt-1">Insurance, ZESA, streaming, AI tools, hosting and more. Sebastian adds each payment to your calendar and reminds you 3 days before it's due.</p>
        <div className="relative mt-4">
          <button onClick={() => setOpen(!open)} aria-expanded={open} className="w-full h-12 px-4 rounded-xl border border-line bg-canvas text-left text-[14px] inline-flex items-center gap-3">
            {pick ? <><AppLogo k={pick.key} name={pick.name} size={28} />{pick.name}</> : <span className="text-muted">Choose a subscription…</span>}
          </button>
          {open && (
            <div className="absolute z-20 mt-2 inset-x-0 rounded-2xl border border-line bg-paper shadow-lift p-2">
              <label className="relative block"><span className="sr-only">Search subscriptions</span><Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search, e.g. Netflix, ZESA, hosting" className="w-full h-10 pl-9 pr-3 rounded-xl border border-line bg-canvas text-base md:text-[13.5px] outline-none focus:border-gold" /></label>
              <div className="max-h-80 overflow-y-auto mt-2">
                {groups.map(([cat, list]) => (
                  <div key={cat}><p className="text-[11px] text-muted px-2 pt-2 pb-1">{cat}</p>
                    {list.map((s) => <button key={s.key} onClick={() => choose(s)} className="w-full flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-cream/60 text-left text-[13.5px]"><AppLogo k={s.key} name={s.name} size={28} />{s.name}</button>)}
                  </div>
                ))}
                {!groups.length && <p className="text-[13px] text-muted p-3">Nothing found. Choose &ldquo;Other&rdquo; to add your own.</p>}
              </div>
            </div>
          )}
        </div>
        {pick && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            {pick.key === "custom" && <label className="block sm:col-span-2 lg:col-span-4"><span className="text-[12px] text-muted">Name</span><input className={"mt-1 " + inputCls + " h-10"} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. School fees" /></label>}
            <label className="block"><span className="text-[12px] text-muted">Amount</span>
              <div className="mt-1 flex gap-1.5"><select className={inputCls + " h-10 w-24"} value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
                <input type="number" min={0} step="0.01" className={inputCls + " h-10"} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="0.00" /></div></label>
            <label className="block"><span className="text-[12px] text-muted">How often</span><select className={"mt-1 " + inputCls + " h-10"} value={f.cycle} onChange={(e) => setF({ ...f, cycle: e.target.value as Cycle })}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="quarterly">Every 3 months</option><option value="yearly">Yearly</option></select></label>
            <label className="block"><span className="text-[12px] text-muted">Next payment due</span><input type="date" className={"mt-1 " + inputCls + " h-10"} value={f.nextDue} onChange={(e) => setF({ ...f, nextDue: e.target.value })} /></label>
            <label className="block"><span className="text-[12px] text-muted">Where you pay (optional)</span><input className={"mt-1 " + inputCls + " h-10"} value={f.payLink} onChange={(e) => setF({ ...f, payLink: e.target.value })} placeholder="https://" /></label>
          </div>
        )}
        <Button className="mt-4" onClick={save} disabled={!pick}><Plus className="w-4 h-4" />Add subscription</Button>
      </section>

      {active.length > 0 && (
        <section>
          <h2 className="t-h3 mb-3">Your subscriptions</h2>
          <ul className="space-y-2">
            {active.map((s) => { const n = daysUntil(s.nextDue); return (
              <li key={s.id} className="rounded-2xl bg-paper border border-line p-4 flex flex-wrap items-center gap-3">
                <AppLogo k={s.key} name={s.name} />
                <div className="flex-1 min-w-[180px]">
                  <p className="text-[14.5px] font-medium">{s.name}</p>
                  <p className="text-[12.5px] text-muted">{money(s.amount, s.currency)} {cycleLabel[s.cycle]} · <span className={cx(n <= 3 && "text-gold-deep font-medium", n < 0 && "text-danger")}><CalendarClock className="w-3.5 h-3.5 inline -mt-0.5 mr-0.5" />{new Date(`${s.nextDue}T09:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}, {when(s.nextDue)}</span></p>
                  {s.payments.length > 0 && <p className="text-[11.5px] text-muted mt-0.5">Last paid {new Date(s.payments[0].at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · {s.payments.length} payment{s.payments.length === 1 ? "" : "s"} recorded</p>}
                </div>
                <div className="flex gap-2">
                  {s.payLink && <Button size="sm" variant="outline" href={s.payLink} external><ExternalLink className="w-3.5 h-3.5" />Pay</Button>}
                  <Button size="sm" onClick={() => { const next = markPaid(s.id); toast.success(`Payment recorded. Next one is due ${next ? new Date(`${next}T09:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long" }) : ""}.`); }}><Check className="w-3.5 h-3.5" />Mark as paid</Button>
                  <button onClick={() => deleteSub(s.id)} aria-label={`Remove ${s.name}`} className="w-9 h-9 rounded-full hover:bg-cream inline-flex items-center justify-center text-muted"><Trash2 className="w-4 h-4" /></button>
                </div>
              </li>); })}
          </ul>
        </section>
      )}
    </div>
  );
}
