"use client";
import { useState } from "react";
import { Check, Loader2, Clock, X, AlertTriangle, ExternalLink, ShieldCheck, ChevronDown } from "lucide-react";
import { approveStep, rejectStep, cancelTask, type Task, type Step } from "@/lib/agent";
import { relTime, cx } from "@/lib/util";

const toLocal = (v: string) => { const d = new Date(v); if (isNaN(d.getTime())) return v; d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const STATUS: Record<Task["status"], [string, string]> = {
  running: ["Working", "bg-cream text-ink"], awaiting: ["Needs your approval", "bg-ink text-white"], done: ["Done", "bg-[#E3F0E8] text-[#2F6B4F]"],
  cancelled: ["Cancelled", "bg-canvas text-muted border border-line"], failed: ["Couldn't finish", "bg-[#F8E1E1] text-[#A63D3D]"],
};

function Icon({ s }: { s: Step["status"] }) {
  if (s === "done") return <Check className="w-4 h-4 text-success" aria-label="Done" />;
  if (s === "running") return <Loader2 className="w-4 h-4 animate-spin text-gold" aria-label="Working" />;
  if (s === "awaiting") return <ShieldCheck className="w-4 h-4 text-ink" aria-label="Waiting for you" />;
  if (s === "rejected") return <X className="w-4 h-4 text-muted" aria-label="Skipped" />;
  if (s === "failed") return <AlertTriangle className="w-4 h-4 text-danger" aria-label="Didn't work" />;
  return <Clock className="w-4 h-4 text-muted-soft" aria-label="Coming up" />;
}

function Approval({ task, step }: { task: Task; step: Step }) {
  const [args, setArgs] = useState<any>(step.args || {});
  const [busy, setBusy] = useState(false);
  const field = (k: string, label: string, type = "text") => (
    <label className="block mt-2"><span className="text-[11.5px] text-muted">{label}</span>
      <input type={type} value={type === "datetime-local" ? toLocal(args[k] || "") : args[k] || ""} onChange={(e) => setArgs({ ...args, [k]: e.target.value })}
        className="mt-1 w-full h-9 px-3 rounded-lg border border-line bg-paper text-base md:text-[13px] outline-none focus:border-gold" /></label>
  );
  return (
    <div className="mt-2 rounded-xl border border-ink/20 bg-gold-soft/30 p-3">
      <p className="text-[12.5px] font-medium">Sebastian would like to: {step.label}</p>
      {step.why && <p className="text-[12px] text-muted mt-0.5">{step.why}</p>}
      {step.tool === "add_event" && <>{field("title", "What")}{field("start", "When", "datetime-local")}</>}
      {step.tool === "reschedule_event" && field("newStart", "New time", "datetime-local")}
      {step.tool === "open_link" && <p className="text-[12px] mt-2 break-all">Opens <b>{args.url}</b>. You finish there; Sebastian never enters passwords or card details.</p>}
      {step.tool === "add_routine" && field("title", "Reminder")}
      <div className="flex gap-2 mt-3">
        <button disabled={busy} onClick={async () => { setBusy(true); await approveStep(task.id, step.id, args); setBusy(false); }} className="h-9 px-4 rounded-pill bg-ink text-white text-[12.5px] inline-flex items-center gap-1.5 disabled:opacity-60">{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}Approve</button>
        <button disabled={busy} onClick={() => rejectStep(task.id, step.id)} className="h-9 px-4 rounded-pill border border-line text-[12.5px]">Not this</button>
      </div>
    </div>
  );
}

/** One task, with its steps, results and anything waiting for approval. */
export function TaskCard({ task, open: startOpen = true }: { task: Task; open?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const [label, cls] = STATUS[task.status];
  return (
    <article className="rounded-2xl border border-line bg-paper p-3.5">
      <button onClick={() => setOpen(!open)} className="w-full flex items-start gap-2 text-left" aria-expanded={open}>
        <span className="flex-1 min-w-0"><span className="block text-[14px] font-medium">{task.title}</span>
          <span className="block text-[11.5px] text-muted">{task.source === "sebastian" ? "Sebastian noticed this" : task.source === "voice" ? "You asked by voice" : "You asked"} · {relTime(task.updatedAt)}</span></span>
        <span className={cx("shrink-0 text-[10.5px] rounded-full px-2 py-0.5", cls)}>{label}</span>
        <ChevronDown className={cx("w-4 h-4 text-muted shrink-0 mt-0.5 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <ol className="mt-3 space-y-2">
          {task.steps.map((s) => (
            <li key={s.id} className="flex gap-2.5">
              <span className="mt-0.5"><Icon s={s.status} /></span>
              <div className="flex-1 min-w-0">
                <p className={cx("text-[13px]", s.status === "rejected" && "line-through text-muted")}>{s.label}{s.critical && s.status !== "done" && <span className="ml-1.5 text-[10px] text-gold-deep">needs approval</span>}</p>
                {s.summary && s.tool !== "info" && <p className="text-[12px] text-muted">{s.summary}</p>}
                {s.tool === "info" && s.status === "done" && <p className="text-[12.5px] text-ink/80 mt-0.5 whitespace-pre-line">{s.summary}</p>}
                {s.error && <p className="text-[12px] text-danger">{s.error}</p>}
                {s.result?.items && (
                  <ul className="mt-1.5 space-y-1">{s.result.items.map((it: any, k: number) => (
                    <li key={k} className="text-[12.5px]">{it.url ? <a href={it.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 inline-flex items-center gap-1">{it.name}<ExternalLink className="w-3 h-3" /></a> : it.name}{it.detail && <span className="text-muted"> · {it.detail}</span>}</li>
                  ))}</ul>
                )}
                {s.result?.body && <details className="mt-1.5"><summary className="text-[12px] underline cursor-pointer">Read the draft</summary><p className="text-[12px] whitespace-pre-line mt-1 rounded-lg bg-canvas border border-line p-2">{s.result.body}</p></details>}
                {s.status === "awaiting" && <Approval task={task} step={s} />}
              </div>
            </li>
          ))}
        </ol>
      )}
      {open && (task.status === "running" || task.status === "awaiting") && <button onClick={() => cancelTask(task.id)} className="mt-3 text-[12px] text-muted underline">Cancel this task</button>}
    </article>
  );
}
