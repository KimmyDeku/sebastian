"use client";
import { useState } from "react";
import { Target, Pencil, Trash2, Plus, Archive, RotateCcw, ChevronDown, ChevronLeft } from "lucide-react";
import { Button } from "../ui/Button";
import { Field, Option, inputCls } from "../ui/Chip";
import { Modal, ConfirmDialog } from "../ui/Modal";
import { Progress } from "../ui/Wizard";
import { EmptyState } from "../ui/States";
import { actions, useData } from "@/lib/store";
import { money, uid, clamp, fmtDate } from "@/lib/util";
import type { SavingsPlan } from "@/lib/types";
import { toast } from "../ui/Toast";

const saved = (p: SavingsPlan) => p.deposits.reduce((s, d) => s + d.amount, 0);
const perWeek = (p: { frequency: string; commitment: number }) => (p.frequency === "weekly" ? p.commitment : p.frequency === "monthly" ? p.commitment / 4.345 : 0);
function eta(p: { target: number; commitment: number; frequency: string }, have = 0) {
  const w = perWeek(p);
  if (!w) return null;
  const weeks = Math.ceil(Math.max(0, p.target - have) / w);
  const d = new Date(); d.setDate(d.getDate() + weeks * 7);
  return { weeks, date: d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) };
}
function nextDue(p: SavingsPlan) {
  const d = new Date(); d.setHours(9, 0, 0, 0);
  if (p.frequency === "weekly") { const wd = p.reminder.weekday ?? 1; d.setDate(d.getDate() + ((wd - d.getDay() + 7) % 7 || 7)); }
  else { const dm = p.reminder.dayOfMonth ?? 1; d.setDate(dm); if (d <= new Date()) d.setMonth(d.getMonth() + 1); }
  return d;
}
function syncReminder(p: SavingsPlan) {
  if (!p.reminder.enabled || p.frequency === "flexible" || p.archived) return;
  actions.addEvent({ kind: "reminder", title: `Deposit ${money(p.commitment)} into ${p.name}`, start: nextDue(p).toISOString(), remindMinutes: 0, notes: "Savings reminder from your Finance plan.", source: { type: "manual", ref: `plan:${p.id}:next` } });
}

export function PlanWizard({ initial, onDone }: { initial?: SavingsPlan; onDone: () => void }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(initial?.name || "");
  const [target, setTarget] = useState(initial?.target ? String(initial.target) : "");
  const [freq, setFreq] = useState<SavingsPlan["frequency"]>(initial?.frequency || "weekly");
  const [amt, setAmt] = useState(initial?.commitment ?? 100);
  const [rem, setRem] = useState(initial?.reminder || { enabled: true, weekday: 1, dayOfMonth: 1 });
  const t = +target;
  const e = eta({ target: t, commitment: amt, frequency: freq }, initial ? saved(initial) : 0);
  const unit = freq === "weekly" ? "week" : freq === "monthly" ? "month" : "deposit";
  const save = () => {
    const now = new Date().toISOString();
    const p: SavingsPlan = { id: initial?.id || uid("p_"), name: name.trim(), target: t, frequency: freq, commitment: amt, deposits: initial?.deposits || [], reminder: rem, archived: false, createdAt: initial?.createdAt || now, updatedAt: now };
    actions.savePlan(p);
    syncReminder(p);
    toast.success(initial ? "Plan updated." : `“${p.name}” created.${rem.enabled && freq !== "flexible" ? " I've added a deposit reminder to your schedule." : ""}`);
    onDone();
  };
  return (
    <div className="max-w-xl">
      <button onClick={() => (step > 1 ? setStep(step - 1) : onDone())} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink mb-4"><ChevronLeft className="w-4 h-4" />Back</button>
      {step === 1 && (<>
        <h2 className="t-h1">What are you saving toward?</h2><p className="text-muted mt-2 text-sm">Give it a name and a target.</p>
        <div className="space-y-4 mt-7">
          <Field label="Goal name" htmlFor="gn"><input id="gn" className={inputCls} placeholder="e.g. Emergency fund" value={name} onChange={(x) => setName(x.target.value)} /></Field>
          <Field label="Target amount ($)" htmlFor="ta"><input id="ta" type="number" min={1} className={inputCls} value={target} onChange={(x) => setTarget(x.target.value)} /></Field>
          <Button className="w-full" onClick={() => setStep(2)} disabled={!name.trim() || !(t > 0)}>Continue</Button>
        </div>
      </>)}
      {step === 2 && (<>
        <h2 className="t-h1">How much can you commit?</h2><p className="text-muted mt-2 text-sm">Toward your {money(t)} goal. Start small if you like.</p>
        <div role="radiogroup" className="grid grid-cols-3 gap-2 mt-6">
          {([["weekly", "Weekly"], ["monthly", "Monthly"], ["flexible", "Whenever I can"]] as const).map(([k, l]) => <Option key={k} variant="row" selected={freq === k} onClick={() => setFreq(k)}>{l}</Option>)}
        </div>
        <div className="rounded-3xl bg-paper border border-line p-6 mt-5">
          <p className="text-center"><span className="font-serif text-4xl">{money(amt)}</span><span className="text-muted text-sm"> / {unit}</span></p>
          <input type="range" min={0} max={1000} step={5} value={amt} onChange={(x) => setAmt(+x.target.value)} className="range w-full mt-5" aria-label="Commitment amount" />
          <div className="flex justify-between text-xs text-muted mt-1"><span>$0</span><span>$1,000</span></div>
          <label className="flex items-center gap-3 mt-4 text-sm text-muted">Or type:<input type="number" min={0} max={1000} className={inputCls + " w-28 h-10"} value={amt} onChange={(x) => setAmt(clamp(+x.target.value || 0, 0, 1000))} /></label>
        </div>
        <p className="font-serif italic text-center text-muted mt-4">{e ? `You'll get there in about ${e.weeks} weeks, by ${e.date}.` : freq === "flexible" ? "Log deposits whenever you can; I'll track your progress." : "Set an amount above $0 to see a finish date."}</p>
        <Button className="w-full mt-5" onClick={() => setStep(3)}>Continue</Button>
      </>)}
      {step === 3 && (<>
        <h2 className="t-h1">Shall I remind you?</h2><p className="text-muted mt-2 text-sm">I&apos;ll add a reminder to your schedule for each deposit.</p>
        <div className="mt-6 space-y-3">
          <Option variant="row" role="checkbox" selected={rem.enabled && freq !== "flexible"} onClick={() => freq !== "flexible" && setRem({ ...rem, enabled: !rem.enabled })}>Remind me to deposit</Option>
          {freq === "flexible" && <p className="text-xs text-muted">Reminders need a weekly or monthly rhythm.</p>}
          {rem.enabled && freq === "weekly" && <select aria-label="Reminder day" className={inputCls} value={rem.weekday} onChange={(x) => setRem({ ...rem, weekday: +x.target.value })}>{["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => <option key={d} value={i}>Every {d}</option>)}</select>}
          {rem.enabled && freq === "monthly" && <select aria-label="Reminder day of month" className={inputCls} value={rem.dayOfMonth} onChange={(x) => setRem({ ...rem, dayOfMonth: +x.target.value })}>{Array.from({ length: 28 }, (_, i) => <option key={i} value={i + 1}>Day {i + 1} of each month</option>)}</select>}
        </div>
        <Button className="w-full mt-7" onClick={save}>Save plan</Button>
      </>)}
    </div>
  );
}

export function Plans() {
  const d = useData();
  const [mode, setMode] = useState<"list" | "new" | SavingsPlan>("list");
  const [dep, setDep] = useState<SavingsPlan | null>(null);
  const [amount, setAmount] = useState(""); const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); const [note, setNote] = useState("");
  const [del, setDel] = useState<SavingsPlan | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  if (mode === "new") return <PlanWizard onDone={() => setMode("list")} />;
  if (typeof mode === "object") return <PlanWizard initial={mode} onDone={() => setMode("list")} />;
  const active = d.plans.filter((p) => !p.archived), archived = d.plans.filter((p) => p.archived);
  const logDeposit = () => {
    const a = +amount; if (!(a > 0)) return;
    const p = { ...dep!, deposits: [...dep!.deposits, { id: uid("d_"), amount: a, at: new Date(date + "T12:00").toISOString(), note }], updatedAt: new Date().toISOString() };
    actions.savePlan(p); syncReminder(p);
    const s = saved(p);
    toast.success(s >= p.target ? `Goal reached! ${p.name} is fully funded.` : `Logged ${money(a)}. ${money(p.target - s)} to go.`);
    setDep(null); setAmount(""); setNote("");
  };
  const card = (p: SavingsPlan) => {
    const s = saved(p), pct = Math.min(100, Math.round((s / p.target) * 100)), e = eta(p, s);
    return (
      <article key={p.id} className="bg-paper rounded-3xl border border-line p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-serif text-xl flex items-center gap-2"><Target className="w-4 h-4 text-gold" aria-hidden />{p.name}</h3>
            <p className="text-xs text-muted mt-1">{p.frequency === "flexible" ? "Whenever you can" : `${money(p.commitment)}/${p.frequency === "weekly" ? "week" : "month"}`}{e && s < p.target ? ` · ≈ ${e.weeks} weeks · by ${e.date}` : ""}</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {p.archived ? <button onClick={() => { actions.savePlan({ ...p, archived: false }); toast.success("Plan restored."); }} aria-label="Restore plan" className="w-9 h-9 rounded-full border border-line inline-flex items-center justify-center"><RotateCcw className="w-4 h-4" /></button>
              : <><button onClick={() => setMode(p)} aria-label={`Edit ${p.name}`} className="w-9 h-9 rounded-full border border-line inline-flex items-center justify-center"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => { actions.savePlan({ ...p, archived: true }); toast.info("Plan archived. You can restore it anytime."); }} aria-label={`Archive ${p.name}`} className="w-9 h-9 rounded-full border border-line inline-flex items-center justify-center"><Archive className="w-4 h-4" /></button></>}
            <button onClick={() => setDel(p)} aria-label={`Delete ${p.name}`} className="w-9 h-9 rounded-full border border-line inline-flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="mt-4"><Progress value={s} max={p.target} label={`${p.name} progress`} /></div>
        <div className="flex items-center justify-between mt-2.5 text-sm">
          <span className="text-muted">{money(s)} of {money(p.target)} · {pct}%</span>
          {!p.archived && <button onClick={() => setDep(p)} className="inline-flex items-center gap-1 text-ink hover:underline"><Plus className="w-4 h-4" />Log a deposit</button>}
        </div>
        {p.deposits.length > 0 && (
          <div className="mt-3">
            <button onClick={() => setOpen(open === p.id ? null : p.id)} aria-expanded={open === p.id} className="text-xs text-muted inline-flex items-center gap-1">History ({p.deposits.length})<ChevronDown className={`w-3.5 h-3.5 transition ${open === p.id ? "rotate-180" : ""}`} /></button>
            {open === p.id && <ul className="mt-2 divide-y divide-line text-sm">{[...p.deposits].reverse().map((x) => <li key={x.id} className="flex justify-between py-2"><span className="text-muted">{fmtDate(x.at)}{x.note ? ` · ${x.note}` : ""}</span><span>{money(x.amount)}</span></li>)}</ul>}
          </div>
        )}
      </article>
    );
  };
  return (
    <div>
      <h2 className="t-h1">Your savings plans</h2><p className="text-muted text-sm mt-2">Keep as many as you like. Review or edit anytime.</p>
      <div className="mt-7 space-y-4">
        {active.length === 0 && <EmptyState title="No active plans" body="Create a pot — an emergency fund, a trip, a new laptop." />}
        {active.map(card)}
        <Button className="w-full" size="lg" onClick={() => setMode("new")}><Plus className="w-4 h-4" />New plan</Button>
      </div>
      {archived.length > 0 && <div className="mt-12"><h3 className="t-h3 mb-4">Previous plans</h3><div className="space-y-4 opacity-90">{archived.map(card)}</div></div>}
      <Modal open={!!dep} onClose={() => setDep(null)} title={`Log a deposit · ${dep?.name || ""}`}>
        <div className="space-y-4">
          <Field label="Amount ($)"><input type="number" min={0.01} step="0.01" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></Field>
          <Field label="Date"><input type="date" className={inputCls} value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Note (optional)"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <p className="text-xs text-muted">This records a deposit you made yourself. Sebastian doesn&apos;t move money.</p>
          <Button className="w-full" onClick={logDeposit} disabled={!(+amount > 0)}>Log deposit</Button>
        </div>
      </Modal>
      <ConfirmDialog open={!!del} danger title="Delete this plan?" body={`“${del?.name}” and its ${del?.deposits.length || 0} logged deposits will be permanently removed. Archive it instead if you might return to it.`} confirmLabel="Delete permanently"
        onCancel={() => setDel(null)} onConfirm={() => { actions.deletePlan(del!.id); const ev = d.schedule.find((e) => e.source.ref === `plan:${del!.id}:next`); if (ev) actions.deleteEvent(ev.id); setDel(null); toast.info("Plan deleted."); }} />
    </div>
  );
}
