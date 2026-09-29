"use client";
import { useState } from "react";
import { Plus, CalendarPlus, Trash2, ChevronLeft, ClipboardCheck, Search, ListChecks, MessageSquareText } from "lucide-react";
import { Button } from "../ui/Button";
import { Field, inputCls, textareaCls } from "../ui/Chip";
import { ConfirmDialog } from "../ui/Modal";
import { EmptyState, ErrorState, Notice } from "../ui/States";
import { useNotebook, patchNotebook, newId, type Assignment } from "@/lib/notebook";
import { actions } from "@/lib/store";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/util";
import { toast } from "../ui/Toast";

export function Assignments() {
  const nb = useNotebook();
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [f, setF] = useState({ subject: "", title: "", brief: "", due: "", length: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [draft, setDraft] = useState("");
  const [del, setDel] = useState<Assignment | null>(null);
  const cur = nb.assignments.find((a) => a.id === openId) || null;
  const update = (id: string, p: Partial<Assignment>) => patchNotebook((d) => ({ ...d, assignments: d.assignments.map((a) => (a.id === id ? { ...a, ...p } : a)) }));

  const plan = async (a: Assignment) => {
    setBusy("plan"); setErr("");
    const r = await api<any>("/api/notebook", { mode: "plan", ...a, today: new Date().toISOString().slice(0, 10) });
    setBusy(null);
    if (r.ok) update(a.id, { plan: r.plan }); else setErr(r.error || "The plan couldn't be made.");
  };
  const create = () => {
    const a: Assignment = { id: newId("as_"), ...f, plan: null, feedback: null, createdAt: new Date().toISOString() };
    patchNotebook((d) => ({ ...d, assignments: [a, ...d.assignments] }));
    setOpenId(a.id); setCreating(false); setF({ subject: "", title: "", brief: "", due: "", length: "" });
    plan(a);
  };
  const schedule = (a: Assignment) => {
    const ms = a.plan?.milestones || [];
    ms.forEach((m: any, i: number) => actions.addEvent({ kind: "reminder", title: `${a.title}: ${m.task}`, start: new Date(`${m.date}T09:00`).toISOString(), remindMinutes: 0, notes: `Assignment milestone (${a.subject})`, source: { type: "manual", ref: `assign:${a.id}:${i}` } }));
    if (a.due) actions.addEvent({ kind: "reminder", title: `Due: ${a.title}`, start: new Date(`${a.due}T09:00`).toISOString(), remindMinutes: 1440, notes: a.subject, source: { type: "manual", ref: `assign:${a.id}:due` } });
    toast.success(`${ms.length + (a.due ? 1 : 0)} dates added to your schedule.`);
  };
  const feedback = async (a: Assignment) => {
    setBusy("fb"); setErr("");
    const r = await api<any>("/api/notebook", { mode: "feedback", title: a.title, subject: a.subject, brief: a.brief, draft });
    setBusy(null);
    if (r.ok) update(a.id, { feedback: r.feedback }); else setErr(r.error || "Feedback couldn't be prepared.");
  };

  if (creating || (!cur && !nb.assignments.length)) return (
    <section className="rounded-2xl bg-paper border border-line p-5 md:p-6 max-w-2xl">
      <h2 className="t-h3">Tell me about the assignment</h2>
      <p className="text-[13px] text-muted mt-1">I&apos;ll break it into a plan with milestones and give feedback on your drafts.</p>
      <div className="grid sm:grid-cols-2 gap-3 mt-5">
        <Field label="Subject"><input className={inputCls} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="e.g. History" /></Field>
        <Field label="Due date"><input type="date" className={inputCls} value={f.due} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setF({ ...f, due: e.target.value })} /></Field>
      </div>
      <div className="space-y-3 mt-3">
        <Field label="Title"><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Causes of the First World War" /></Field>
        <Field label="The brief"><textarea className={textareaCls} value={f.brief} onChange={(e) => setF({ ...f, brief: e.target.value })} placeholder="Paste the question or instructions from your teacher" /></Field>
        <Field label="Length or format (optional)"><input className={inputCls} value={f.length} onChange={(e) => setF({ ...f, length: e.target.value })} placeholder="e.g. 1,500-word essay" /></Field>
      </div>
      <div className="flex gap-2 mt-5">{nb.assignments.length > 0 && <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>}<Button onClick={create} disabled={!f.title.trim() || !f.brief.trim()}>Plan it with me</Button></div>
    </section>
  );

  if (!cur) return (
    <div className="space-y-3 max-w-2xl">
      <Button onClick={() => setCreating(true)}><Plus className="w-4 h-4" />New assignment</Button>
      {nb.assignments.map((a) => (
        <button key={a.id} onClick={() => setOpenId(a.id)} className="w-full text-left rounded-2xl bg-paper border border-line p-4 hover:border-cream-line">
          <span className="block text-[15px] font-medium">{a.title}</span><span className="block text-[12.5px] text-muted">{a.subject}{a.due ? ` · due ${fmtDate(a.due)}` : ""}</span>
        </button>
      ))}
    </div>
  );

  const p = cur.plan, fb = cur.feedback;
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => setOpenId(null)} className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink"><ChevronLeft className="w-4 h-4" />All assignments</button>
        <button onClick={() => setDel(cur)} aria-label="Delete assignment" className="w-9 h-9 rounded-full hover:bg-cream inline-flex items-center justify-center text-muted"><Trash2 className="w-4 h-4" /></button>
      </div>
      <div><h2 className="font-serif text-2xl">{cur.title}</h2><p className="text-[12.5px] text-muted">{cur.subject}{cur.due ? ` · due ${fmtDate(cur.due)}` : ""}{cur.length ? ` · ${cur.length}` : ""}</p></div>
      <Notice>Sebastian helps you plan, research and improve your work. Please write the final assignment in your own words.</Notice>
      {err && <ErrorState body={err} onRetry={() => plan(cur)} />}
      {busy === "plan" && <p className="text-sm text-muted">Planning your assignment…</p>}
      {p && (
        <div className="rounded-2xl bg-paper border border-line p-5 space-y-5">
          <p className="text-[14px] leading-relaxed">{p.understanding}</p>
          <div><p className="text-sm font-medium inline-flex items-center gap-1.5"><ListChecks className="w-4 h-4 text-gold" />Outline</p>
            <ol className="mt-2 space-y-2 list-decimal pl-5 text-[13.5px]">{(p.outline || []).map((o: any) => <li key={o.section}><span className="font-medium">{o.section}</span><ul className="list-disc pl-4 text-muted">{(o.points || []).map((x: string) => <li key={x}>{x}</li>)}</ul></li>)}</ol></div>
          {p.research?.length > 0 && <div><p className="text-sm font-medium inline-flex items-center gap-1.5"><Search className="w-4 h-4 text-gold" />Research leads</p><ul className="mt-2 list-disc pl-5 text-[13.5px] space-y-1">{p.research.map((x: string) => <li key={x}>{x}</li>)}</ul></div>}
          {p.milestones?.length > 0 && <div>
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">Milestones</p><Button size="sm" variant="outline" onClick={() => schedule(cur)}><CalendarPlus className="w-4 h-4" />Add to my schedule</Button></div>
            <ul className="mt-2 divide-y divide-line text-[13.5px]">{p.milestones.map((m: any) => <li key={m.date + m.task} className="flex gap-3 py-2"><span className="text-muted w-24 shrink-0">{fmtDate(m.date)}</span><span>{m.task}</span></li>)}</ul></div>}
          {p.checklist?.length > 0 && <div><p className="text-sm font-medium inline-flex items-center gap-1.5"><ClipboardCheck className="w-4 h-4 text-gold" />Before you submit</p><ul className="mt-2 space-y-1 text-[13.5px]">{p.checklist.map((x: string) => <li key={x} className="flex gap-2"><input type="checkbox" className="mt-1 accent-ink" aria-label={x} />{x}</li>)}</ul></div>}
        </div>
      )}
      <div className="rounded-2xl bg-paper border border-line p-5">
        <p className="text-sm font-medium inline-flex items-center gap-1.5"><MessageSquareText className="w-4 h-4 text-gold" />Feedback on your draft</p>
        <textarea className={textareaCls + " mt-3 min-h-[160px]"} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Paste your draft here" />
        <Button className="mt-3" onClick={() => feedback(cur)} loading={busy === "fb"} disabled={draft.trim().length < 80}>Get feedback</Button>
        {fb && (
          <div className="mt-5 space-y-4 text-[13.5px]">
            <p className="leading-relaxed">{fb.overall}</p>
            {fb.scores?.length > 0 && <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">{fb.scores.map((s: any) => <div key={s.criterion} className="rounded-xl bg-canvas border border-line p-2.5 text-center"><p className="text-[11px] text-muted">{s.criterion}</p><p className="font-serif text-xl">{s.score}/5</p></div>)}</div>}
            {fb.strengths?.length > 0 && <div><p className="font-medium text-success">What works</p><ul className="list-disc pl-5 mt-1 space-y-1">{fb.strengths.map((x: string) => <li key={x}>{x}</li>)}</ul></div>}
            {fb.improve?.length > 0 && <div><p className="font-medium">How to improve</p><ul className="mt-1 space-y-2">{fb.improve.map((x: any, i: number) => <li key={i} className="rounded-xl bg-cream/50 border border-cream-line p-3"><p className="text-muted italic">&ldquo;{x.where}&rdquo;</p><p className="mt-1">{x.how}</p></li>)}</ul></div>}
          </div>
        )}
      </div>
      <ConfirmDialog open={!!del} danger title="Delete this assignment?" body="Its plan and feedback will be removed. Dates already in your schedule stay there." confirmLabel="Delete"
        onCancel={() => setDel(null)} onConfirm={() => { patchNotebook((d) => ({ ...d, assignments: d.assignments.filter((a) => a.id !== del!.id) })); setOpenId(null); setDel(null); }} />
    </div>
  );
}
