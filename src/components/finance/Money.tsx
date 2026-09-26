"use client";
import { useMemo, useState } from "react";
import { BarChart3, Plus, Trash2, Sparkles } from "lucide-react";
import { Button } from "../ui/Button";
import { inputCls } from "../ui/Chip";
import { Notice, ErrorState } from "../ui/States";
import { actions, useData } from "@/lib/store";
import { money, uid, monthKey, cx } from "@/lib/util";
import { api } from "@/lib/api";

export const EXPENSE_CATS = ["Housing", "Groceries", "Transport", "Utilities", "Eating out", "Entertainment", "Health", "Education", "Shopping", "Debt", "Family", "Other"];
const monthLabel = (k: string) => new Date(k + "-01T00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" });

function Bar({ label, value, max, tone }: { label: string; value: number; max: number; tone: "ink" | "clay" }) {
  return (
    <div>
      <div className="flex justify-between text-sm"><span>{label}</span><span>{money(value)}</span></div>
      <div className="h-3 rounded-full bg-canvas border border-line mt-1.5 overflow-hidden"><div className={cx("h-full rounded-full transition-all duration-700", tone === "ink" ? "bg-ink" : "bg-[#A35A45]")} style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%` }} /></div>
    </div>
  );
}

export function Money() {
  const d = useData();
  const [month, setMonth] = useState(monthKey(new Date()));
  const [inc, setInc] = useState({ label: "Salary", amount: "" });
  const [exp, setExp] = useState({ label: "", category: "Groceries", amount: "" });
  const [review, setReview] = useState<any>(null);
  const [reviewing, setReviewing] = useState(false);
  const [rErr, setRErr] = useState("");
  const [period, setPeriod] = useState<"month" | "year">("month");

  const months = useMemo(() => { const s = new Set(d.txns.map((t) => monthKey(t.date))); s.add(monthKey(new Date())); return [...s].sort().reverse(); }, [d.txns]);
  const inMonth = d.txns.filter((t) => monthKey(t.date) === month);
  const income = inMonth.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = inMonth.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const left = income - expenses;
  const byCat = EXPENSE_CATS.map((c) => ({ c, v: inMonth.filter((t) => t.type === "expense" && t.category === c).reduce((s, t) => s + t.amount, 0) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
  const year = month.slice(0, 4);
  const yearly = Array.from({ length: 12 }, (_, i) => { const k = `${year}-${String(i + 1).padStart(2, "0")}`; const ts = d.txns.filter((t) => monthKey(t.date) === k); return { k, i: ts.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0), e: ts.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0) }; });
  const yMax = Math.max(1, ...yearly.map((y) => Math.max(y.i, y.e)));
  const yI = yearly.reduce((s, y) => s + y.i, 0), yE = yearly.reduce((s, y) => s + y.e, 0);
  const dateFor = () => (month === monthKey(new Date()) ? new Date().toISOString() : new Date(month + "-15T12:00").toISOString());

  const add = (type: "income" | "expense") => {
    const src = type === "income" ? inc : exp;
    const a = +src.amount; if (!(a > 0) || !src.label.trim()) return;
    actions.addTxn({ id: uid("x_"), type, label: src.label.trim(), category: type === "income" ? "Income" : exp.category, amount: a, date: dateFor() });
    if (type === "income") setInc({ label: "Salary", amount: "" }); else setExp({ ...exp, label: "", amount: "" });
  };

  const getReview = async () => {
    setReviewing(true); setRErr("");
    const summary = period === "month" ? { month: monthLabel(month), income, expenses, byCategory: byCat } : { year, income: yI, expenses: yE, months: yearly.filter((y) => y.i || y.e) };
    const r = await api<any>("/api/finance", { summary, period: period === "month" ? "monthly" : "yearly" });
    setReviewing(false);
    if (r.ok) setReview(r.review); else setRErr(r.error || "Review failed.");
  };
  const needs = income * 0.5, wants = income * 0.3, save = income * 0.2;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h2 className="t-h1">Income vs. expenses</h2><p className="text-muted text-sm mt-2">See how much of what you earn is being used.</p></div>
        <select aria-label="Month" className={inputCls + " w-auto"} value={month} onChange={(e) => { setMonth(e.target.value); setReview(null); }}>{months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>
      </div>

      <div className="rounded-3xl bg-paper border border-line p-6 space-y-5">
        <p className="flex items-center gap-2 text-sm font-medium"><BarChart3 className="w-4 h-4" aria-hidden />{monthLabel(month)}</p>
        <Bar label="Income" value={income} max={Math.max(income, expenses)} tone="ink" />
        <Bar label="Expenses" value={expenses} max={Math.max(income, expenses)} tone="clay" />
        <p className="text-sm border-t border-line pt-4">{left >= 0 ? "Left over" : "Overspent"}: <span className="font-serif text-xl">{money(Math.abs(left))}</span> {income > 0 && <span className="text-muted">({Math.round((left / income) * 100)}% of income)</span>}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-paper border border-line p-6">
          <h3 className="t-h3">Record income</h3>
          <div className="flex gap-2 mt-4"><input aria-label="Income source" className={inputCls} value={inc.label} onChange={(e) => setInc({ ...inc, label: e.target.value })} /><input aria-label="Income amount" type="number" min={0} placeholder="Amount" className={inputCls + " w-32"} value={inc.amount} onChange={(e) => setInc({ ...inc, amount: e.target.value })} /><Button aria-label="Add income" onClick={() => add("income")} disabled={!(+inc.amount > 0)}><Plus className="w-4 h-4" /></Button></div>
          <h3 className="t-h3 mt-7">Add an expense</h3>
          <div className="grid grid-cols-[1fr_auto] gap-2 mt-4">
            <input aria-label="Expense description" placeholder="e.g. Entertainment" className={inputCls} value={exp.label} onChange={(e) => setExp({ ...exp, label: e.target.value })} />
            <input aria-label="Expense amount" type="number" min={0} placeholder="Amount" className={inputCls + " w-32"} value={exp.amount} onChange={(e) => setExp({ ...exp, amount: e.target.value })} />
            <select aria-label="Expense category" className={inputCls} value={exp.category} onChange={(e) => setExp({ ...exp, category: e.target.value })}>{EXPENSE_CATS.map((c) => <option key={c}>{c}</option>)}</select>
            <Button aria-label="Add expense" onClick={() => add("expense")} disabled={!(+exp.amount > 0) || !exp.label.trim()}><Plus className="w-4 h-4" /></Button>
          </div>
          <ul className="mt-6 space-y-2">
            {inMonth.length === 0 && <li className="text-sm text-muted">No entries for this month yet.</li>}
            {inMonth.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 rounded-xl bg-canvas border border-line px-4 h-12 text-sm">
                <span className="truncate">{t.label} <span className="text-xs text-muted">· {t.category}</span></span>
                <span className="flex items-center gap-3 shrink-0"><span className={t.type === "income" ? "text-success" : ""}>{t.type === "income" ? "+" : "−"}{money(t.amount)}</span><button onClick={() => actions.deleteTxn(t.id)} aria-label={`Delete ${t.label}`} className="text-muted hover:text-danger"><Trash2 className="w-4 h-4" /></button></span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl bg-paper border border-line p-6">
          <h3 className="t-h3">Where it goes</h3>
          {byCat.length === 0 ? <p className="text-sm text-muted mt-3">Add expenses to see your biggest categories.</p> : <div className="space-y-4 mt-4">{byCat.map((x) => <Bar key={x.c} label={x.c} value={x.v} max={byCat[0].v} tone="clay" />)}</div>}
          <h3 className="t-h3 mt-8">Suggested monthly split</h3>
          {income > 0 ? (<>
            <p className="text-xs text-muted mt-1">The 50/30/20 guideline applied to {money(income)}.</p>
            <dl className="mt-3 grid grid-cols-3 gap-3 text-center">
              {[["Needs", needs], ["Wants", wants], ["Save", save]].map(([k, v]) => <div key={k as string} className="rounded-2xl bg-canvas p-3"><dt className="text-xs text-muted">{k}</dt><dd className="font-serif text-lg">{money(v as number)}</dd></div>)}
            </dl>
            <p className="text-sm mt-3">{left >= save ? `You're on track: ${money(left)} left covers the ${money(save)} savings target.` : `To reach a 20% saving, trim about ${money(save - left)} — start with ${byCat[0]?.c || "your largest category"}.`}</p>
          </>) : <p className="text-sm text-muted mt-2">Record your income to get a savings plan.</p>}
        </div>
      </div>

      <section className="rounded-3xl bg-paper border border-line p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="t-h3">{year} review: spending vs savings</h3>
          <p className="text-sm text-muted">Income {money(yI)} · Expenses {money(yE)} · Saved {money(yI - yE)}</p>
        </div>
        <div className="mt-6 flex items-end gap-2 h-44 overflow-x-auto" role="img" aria-label={`Monthly income and expenses for ${year}`}>
          {yearly.map((y) => (
            <div key={y.k} className="flex-1 min-w-[28px] flex flex-col items-center gap-1 h-full justify-end">
              <div className="w-full flex items-end gap-0.5 h-full">
                <div className="flex-1 bg-ink rounded-t" style={{ height: `${(y.i / yMax) * 100}%` }} title={`Income ${money(y.i)}`} />
                <div className="flex-1 bg-[#A35A45] rounded-t" style={{ height: `${(y.e / yMax) * 100}%` }} title={`Expenses ${money(y.e)}`} />
              </div>
              <span className="text-[10px] text-muted">{new Date(y.k + "-01T00:00").toLocaleDateString("en-GB", { month: "short" })}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 text-xs text-muted mt-3"><span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-ink" />Income</span><span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#A35A45]" />Expenses</span></div>
      </section>

      <section className="rounded-3xl bg-cream/50 border border-cream-line p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="t-h3">Sebastian&apos;s assessment</h3>
          <div className="flex gap-2">
            <select aria-label="Review period" className={inputCls + " h-10 w-auto"} value={period} onChange={(e) => setPeriod(e.target.value as any)}><option value="month">This month</option><option value="year">This year</option></select>
            <Button size="sm" onClick={getReview} loading={reviewing} disabled={period === "month" ? !income && !expenses : !yI && !yE}><Sparkles className="w-4 h-4" />Review</Button>
          </div>
        </div>
        {rErr && <div className="mt-4"><ErrorState body={rErr} onRetry={getReview} /></div>}
        {review && (
          <div className="mt-5 space-y-4 text-sm">
            <p className="font-serif text-xl">{review.headline}</p>
            <ul className="list-disc pl-5 space-y-1">{review.observations?.map((o: string) => <li key={o}>{o}</li>)}</ul>
            {review.savingsPlan?.length > 0 && <div><p className="font-medium mt-2">Savings plan</p><ul className="mt-1 space-y-1">{review.savingsPlan.map((s: any) => <li key={s.step} className="flex justify-between gap-4"><span>{s.step}</span><span>{money(+s.amount || 0)}</span></li>)}</ul></div>}
            {review.cutBack?.length > 0 && <div><p className="font-medium mt-2">Where to cut back</p><ul className="mt-1 space-y-1">{review.cutBack.map((c: any) => <li key={c.category}><span className="text-ink">{c.category}:</span> <span className="text-muted">{c.suggestion}</span></li>)}</ul></div>}
          </div>
        )}
        <Notice className="mt-5">These figures are the entries you&apos;ve recorded. Sebastian offers budgeting guidance, not regulated financial advice, and never moves money.</Notice>
      </section>
    </div>
  );
}
