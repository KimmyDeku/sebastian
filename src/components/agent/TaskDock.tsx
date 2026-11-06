"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ListChecks, X, Send, Loader2 } from "lucide-react";
import { TaskCard } from "./TaskCard";
import { VoiceButton } from "../VoiceButton";
import { useTasks, startTask } from "@/lib/agent";
import { wantsDownload, downloadFor } from "@/lib/download";
import { toast } from "../ui/Toast";
import { cx } from "@/lib/util";

/** The task window: what Sebastian is doing, what needs approval, and a box to give him a task. */
export function TaskDock() {
  const tasks = useTasks();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const fromVoice = useRef(false);
  const active = tasks.filter((t) => t.status === "running" || t.status === "awaiting");
  const waiting = tasks.filter((t) => t.status === "awaiting").length;
  const recent = tasks.filter((t) => !(t.status === "running" || t.status === "awaiting")).slice(0, 3);
  useEffect(() => { const f = () => setOpen(true); window.addEventListener("sebastian-open-tasks", f); return () => window.removeEventListener("sebastian-open-tasks", f); }, []);

  const go = async () => {
    const q = text.trim(); if (!q || busy) return;
    setBusy(true); setText("");
    if (wantsDownload(q)) {
      const r = await downloadFor(q).catch(() => ({ ok: false, message: "I'm sorry, I couldn't make that download." }));
      (r.ok ? toast.success : toast.error)(r.message);
      fromVoice.current = false; setBusy(false); return;
    }
    await startTask(q, fromVoice.current ? "voice" : "you");
    fromVoice.current = false; setBusy(false);
  };

  return (
    <>
      <button onClick={() => setOpen(!open)} aria-label={`Tasks${waiting ? `, ${waiting} waiting for your approval` : ""}`} aria-expanded={open}
        className="fixed z-[44] left-4 lg:left-auto lg:right-24 bottom-[88px] lg:bottom-6 h-12 pl-4 pr-5 rounded-pill bg-paper border border-line shadow-lift inline-flex items-center gap-2 text-[13.5px]">
        {active.some((t) => t.status === "running") ? <Loader2 className="w-4 h-4 animate-spin text-gold" /> : <ListChecks className="w-4 h-4 text-gold" />}Tasks
        {waiting > 0 && <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-ink text-white text-[11px] inline-flex items-center justify-center">{waiting}</span>}
      </button>
      {open && (
        <section aria-label="Sebastian's tasks" className="fixed z-[60] inset-x-3 bottom-[148px] lg:inset-x-auto lg:right-24 lg:bottom-20 lg:w-[400px] max-h-[70vh] flex flex-col rounded-3xl bg-canvas border border-line shadow-lift">
          <header className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="font-serif text-xl">Tasks</p>
            <button onClick={() => setOpen(false)} aria-label="Close tasks" className="w-9 h-9 rounded-full hover:bg-cream inline-flex items-center justify-center"><X className="w-4 h-4" /></button>
          </header>
          <div className="px-4 pb-3">
            <div className="flex gap-2 items-center rounded-2xl border border-line bg-paper p-1.5 pl-3">
              <label htmlFor="task-in" className="sr-only">What should Sebastian take care of?</label>
              <input id="task-in" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} placeholder="What should I take care of?" className="flex-1 min-w-0 bg-transparent outline-none text-base md:text-[13.5px]" />
              <VoiceButton size={36} onText={(t) => { fromVoice.current = true; setText((x) => (x ? `${x} ${t}` : t)); }} />
              <button onClick={go} disabled={!text.trim() || busy} aria-label="Start this task" className="w-9 h-9 rounded-full bg-ink text-white inline-flex items-center justify-center disabled:opacity-40">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</button>
            </div>
            <p className="text-[11px] text-muted mt-1.5">I'll do the groundwork and ask before anything is added, sent, booked or paid.</p>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2.5">
            {!active.length && !recent.length && <p className="text-[13px] text-muted text-center py-6">Nothing on the go. Try &ldquo;Find a mechanic near Avondale&rdquo; or &ldquo;Remind me to drink water every two hours&rdquo;.</p>}
            {active.map((t) => <TaskCard key={t.id} task={t} />)}
            {recent.length > 0 && <p className="text-[11.5px] text-muted pt-1">Recently finished</p>}
            {recent.map((t) => <TaskCard key={t.id} task={t} open={false} />)}
          </div>
          <Link href="/settings#activity" onClick={() => setOpen(false)} className="block text-center text-[12px] underline py-2.5 border-t border-line">All tasks in Settings, under Activity</Link>
        </section>
      )}
    </>
  );
}
