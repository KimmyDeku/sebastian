"use client";
import { useState } from "react";
import { Droplets, Footprints, Pill, Receipt, Repeat, ShieldCheck, Send, Bell, Trash2, Plus } from "lucide-react";
import { Button } from "../ui/Button";
import { inputCls } from "../ui/Chip";
import { useRoutines, addRoutine, updateRoutine, deleteRoutine, KIND_LABEL, type RoutineKind, type Routine } from "@/lib/routines";
import { cx } from "@/lib/util";
import { toast } from "../ui/Toast";

const ICON: Record<RoutineKind, any> = { water: Droplets, move: Footprints, medication: Pill, bill: Receipt, subscription: Repeat, insurance: ShieldCheck, application: Send, custom: Bell };
const describe = (r: Routine) => {
  if (r.kind === "water" || r.kind === "move") return `Every ${r.everyMinutes || (r.kind === "water" ? 120 : 60)} minutes, ${r.from || "08:00"} to ${r.to || "18:00"}`;
  if (r.kind === "medication" || r.kind === "custom") return `Daily at ${(r.times || ["08:00"]).join(", ")}`;
  if (r.kind === "bill" || r.kind === "subscription") return `Monthly on day ${r.dayOfMonth || 1}${r.amount ? ` · ${r.amount}` : ""} · heads-up 3 days before`;
  if (r.kind === "insurance") return `Renews ${r.date ? new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "long" }) : ""} · heads-up 14 days before`;
  return `Follow up on ${r.date ? new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "long" }) : ""}`;
};

/** Repeating reminders Sebastian looks after. */
export function RoutinesPanel() {
  const routines = useRoutines();
  const [kind, setKind] = useState<RoutineKind>("water");
  const [f, setF] = useState<any>({});
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const needsTitle = !["water", "move"].includes(kind);
  const add = () => {
    const title = needsTitle ? String(f.title || "").trim() : KIND_LABEL[kind];
    if (!title) { toast.error("Please give the reminder a name."); return; }
    if (f.link && !/^https:\/\//.test(f.link)) { toast.error("Payment links must start with https://"); return; }
    addRoutine({ kind, title, everyMinutes: f.every ? Number(f.every) : undefined, from: f.from, to: f.to, times: f.times ? String(f.times).split(/[,\s]+/).filter((x: string) => /^\d{1,2}:\d{2}$/.test(x)) : undefined,
      dayOfMonth: f.day ? Number(f.day) : undefined, date: f.date, amount: f.amount, link: f.link || undefined, note: f.note });
    setF({}); toast.success("Reminder added. Sebastian will look after it.");
  };
  const box = "mt-1 " + inputCls + " h-10";
  return (
    <section className="rounded-3xl bg-paper border border-line p-5 md:p-6">
      <h2 className="t-h3">Routines and reminders</h2>
      <p className="text-[13px] text-muted mt-1">Water, movement, medication, bills, subscriptions, insurance and follow-ups. Sebastian reminds you discreetly and, for anything to pay or send, prepares it for you to approve.</p>
      <div className="flex flex-wrap gap-1.5 mt-4" role="radiogroup" aria-label="Kind of reminder">
        {(Object.keys(KIND_LABEL) as RoutineKind[]).map((k) => { const I = ICON[k]; return (
          <button key={k} role="radio" aria-checked={kind === k} onClick={() => { setKind(k); setF({}); }} className={cx("h-9 px-3 rounded-pill border text-[12.5px] inline-flex items-center gap-1.5", kind === k ? "bg-ink text-white border-ink" : "border-line hover:bg-cream/60")}><I className="w-3.5 h-3.5" />{KIND_LABEL[k]}</button>); })}
      </div>
      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        {needsTitle && <label className="block"><span className="text-[12px] text-muted">{kind === "medication" ? "Medicine (name only)" : kind === "application" ? "What you applied for" : "Name"}</span><input className={box} value={f.title || ""} onChange={(e) => set("title", e.target.value)} placeholder={{ medication: "e.g. Blood pressure tablet", bill: "e.g. ZESA prepaid electricity", subscription: "e.g. Netflix", insurance: "e.g. Car insurance", application: "e.g. Product designer at Econet", custom: "e.g. Call Mum" }[kind as string] || ""} /></label>}
        {(kind === "water" || kind === "move") && <>
          <label className="block"><span className="text-[12px] text-muted">Every (minutes)</span><input type="number" min={15} className={box} value={f.every || (kind === "water" ? 120 : 60)} onChange={(e) => set("every", e.target.value)} /></label>
          <div className="grid grid-cols-2 gap-2"><label className="block"><span className="text-[12px] text-muted">From</span><input type="time" className={box} value={f.from || "08:00"} onChange={(e) => set("from", e.target.value)} /></label><label className="block"><span className="text-[12px] text-muted">Until</span><input type="time" className={box} value={f.to || "18:00"} onChange={(e) => set("to", e.target.value)} /></label></div>
        </>}
        {(kind === "medication" || kind === "custom") && <label className="block"><span className="text-[12px] text-muted">Times each day</span><input className={box} value={f.times || ""} onChange={(e) => set("times", e.target.value)} placeholder="e.g. 08:00, 20:00" /></label>}
        {(kind === "bill" || kind === "subscription") && <>
          <label className="block"><span className="text-[12px] text-muted">Due on day of the month</span><input type="number" min={1} max={31} className={box} value={f.day || ""} onChange={(e) => set("day", e.target.value)} placeholder="e.g. 25" /></label>
          <label className="block"><span className="text-[12px] text-muted">Amount (optional)</span><input className={box} value={f.amount || ""} onChange={(e) => set("amount", e.target.value)} placeholder="e.g. US$15" /></label>
        </>}
        {(kind === "insurance" || kind === "application") && <label className="block"><span className="text-[12px] text-muted">{kind === "insurance" ? "Renewal date" : "Follow up on"}</span><input type="date" className={box} value={f.date || ""} onChange={(e) => set("date", e.target.value)} /></label>}
        {(kind === "bill" || kind === "subscription" || kind === "insurance") && <label className="block"><span className="text-[12px] text-muted">Where you pay (optional, https link)</span><input className={box} value={f.link || ""} onChange={(e) => set("link", e.target.value)} placeholder="e.g. https://www.zesa.co.zw" /></label>}
        {needsTitle && <label className="block"><span className="text-[12px] text-muted">Note (optional)</span><input className={box} value={f.note || ""} onChange={(e) => set("note", e.target.value)} placeholder={kind === "medication" ? "e.g. with food" : ""} /></label>}
      </div>
      {kind === "medication" && <p className="text-[11.5px] text-muted mt-2">Sebastian only reminds you. For questions about your medicine, please ask your doctor or pharmacist.</p>}
      <Button className="mt-4" onClick={add}><Plus className="w-4 h-4" />Add reminder</Button>

      {routines.length > 0 && (
        <ul className="mt-5 divide-y divide-line rounded-2xl border border-line">
          {routines.map((r) => { const I = ICON[r.kind]; return (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3">
              <span className="w-9 h-9 rounded-xl bg-cream inline-flex items-center justify-center shrink-0"><I className="w-4 h-4 text-gold" /></span>
              <span className="flex-1 min-w-0"><span className={cx("block text-[13.5px]", !r.active && "text-muted line-through")}>{r.title}</span><span className="block text-[11.5px] text-muted">{describe(r)}</span></span>
              <button role="switch" aria-checked={r.active} aria-label={`${r.active ? "Pause" : "Resume"} ${r.title}`} onClick={() => updateRoutine(r.id, { active: !r.active })} className={cx("w-10 h-6 rounded-full relative transition-colors shrink-0", r.active ? "bg-ink" : "bg-line")}><span className={cx("absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all", r.active ? "left-[18px]" : "left-0.5")} /></button>
              <button onClick={() => deleteRoutine(r.id)} aria-label={`Delete ${r.title}`} className="w-8 h-8 rounded-full hover:bg-cream inline-flex items-center justify-center text-muted shrink-0"><Trash2 className="w-4 h-4" /></button>
            </li>); })}
        </ul>
      )}
    </section>
  );
}
