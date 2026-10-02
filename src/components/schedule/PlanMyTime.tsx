"use client";
import { useState } from "react";
import { Sparkles, Trash2, CalendarCheck, Loader2, Feather } from "lucide-react";
import { Button } from "../ui/Button";
import { Notice } from "../ui/States";
import { inputCls, textareaCls } from "../ui/Chip";
import { VoiceButton } from "../VoiceButton";
import { actions, useAccount, useStore } from "@/lib/store";
import { useEmail, googleClientId } from "@/lib/gmail";
import { grantGmail } from "../email/Permission";
import { addToGoogleCalendar } from "@/lib/gcal";
import { api } from "@/lib/api";
import { cx } from "@/lib/util";
import { toast } from "../ui/Toast";
import type { EventKind } from "@/lib/types";

type Item = { title: string; kind: EventKind; start: string; end?: string; location?: string; notes?: string; remindMinutes: number; keep: boolean };
const KINDS: [EventKind, string][] = [["appointment", "Appointment"], ["meeting", "Meeting"], ["reminder", "Reminder"], ["other", "Other"]];

/** "Schedule my week / month": say or type upcoming appointments; Sebastian arranges them. */
export function PlanMyTime() {
  const acc = useAccount();
  const em = useEmail();
  const [range, setRange] = useState<"week" | "month">("week");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [toGoogle, setToGoogle] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (i: number, p: Partial<Item>) => setItems((x) => x!.map((it, k) => (k === i ? { ...it, ...p } : it)));

  const arrange = async () => {
    setBusy(true); setErr("");
    const n = new Date();
    const r = await api<any>("/api/schedule/plan", { text, range, timezone: acc?.timezone, today: `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`, weekday: n.toLocaleDateString("en-GB", { weekday: "long" }) });
    setBusy(false);
    if (!r.ok) { setErr(r.error || "I couldn't arrange that."); return; }
    if (!r.events.length) { setErr("I couldn't find any appointments in that. Try including a day and time, e.g. \"dentist on Tuesday at 10am\"."); return; }
    setItems(r.events.map((e: any) => ({ title: e.title, kind: (["appointment", "meeting", "reminder", "other"].includes(e.kind) ? e.kind : "other") as EventKind, start: e.start.slice(0, 16), end: e.end ? String(e.end).slice(0, 16) : undefined, location: e.location || undefined, notes: e.notes || undefined, remindMinutes: Number(e.remindMinutes) || 30, keep: true })));
    setQuestions(r.questions || []);
  };

  const save = async () => {
    const chosen = (items || []).filter((i) => i.keep && i.title.trim() && i.start);
    if (!chosen.length) return;
    let google = toGoogle && !!googleClientId();
    if (google && !em.allowCalendar) {
      try { await grantGmail("calendar"); }
      catch (e: any) { google = false; toast.error(`${e?.message || "Google Calendar wasn't connected."} Saved in Sebastian only.`); }
    }
    setSaving(true);
    let synced = 0, failed = 0;
    const batch = Date.now().toString(36);
    for (const [n, it] of chosen.entries()) {
      // Each entry gets its own reference (entries with the same reference are treated as one event).
      const ev = { kind: it.kind, title: it.title.trim(), start: new Date(it.start).toISOString(), end: it.end ? new Date(it.end).toISOString() : undefined, location: it.location, notes: it.notes, remindMinutes: it.remindMinutes, source: { type: "manual" as const, ref: `plan:${batch}:${n}` } };
      const id = actions.addEvent(ev as any);
      if (google) {
        try { const gid = await addToGoogleCalendar({ ...(ev as any), id, createdAt: new Date().toISOString() }, acc?.timezone || "UTC"); actions.updateEvent(id, { gcalId: gid, gcalOpened: true } as any); synced++; }
        catch { failed++; }
      }
    }
    setSaving(false);
    toast.success(`${chosen.length} item${chosen.length === 1 ? "" : "s"} added to your calendar${google ? `${synced ? `, ${synced} in Google Calendar with Gmail reminders` : ""}${failed ? ` (${failed} couldn't reach Google Calendar)` : ""}` : ""}.`);
    setItems(null); setText(""); setQuestions([]);
  };

  return (
    <section className="rounded-3xl bg-paper border border-line p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="t-h3 inline-flex items-center gap-2"><Feather className="w-5 h-5 text-gold" />Schedule my {range}</h2>
        <div role="radiogroup" aria-label="Plan for" className="inline-grid grid-cols-2 rounded-xl border border-line p-1 bg-canvas">
          {(["week", "month"] as const).map((r) => <button key={r} role="radio" aria-checked={range === r} onClick={() => setRange(r)} className={cx("h-8 px-4 rounded-lg text-[13px]", range === r ? "bg-paper shadow-soft" : "text-muted")}>{r === "week" ? "This week" : "This month"}</button>)}
        </div>
      </div>

      {!items ? (
        <>
          <p className="text-[13px] text-muted mt-2">Tap the microphone and tell me what&apos;s coming up, or type it. For example: &ldquo;Dentist on Tuesday at 10, lunch with Tendai on Friday at 1 at Amanzi, and the team call every weekday at 9.&rdquo;</p>
          <div className="flex gap-2 items-start mt-4">
            <label htmlFor="plan-text" className="sr-only">Your upcoming appointments</label>
            <textarea id="plan-text" className={textareaCls + " min-h-[110px]"} value={text} onChange={(e) => setText(e.target.value)} placeholder={`What's on this ${range}?`} />
            <VoiceButton onText={(t) => setText((x) => (x ? `${x.trim()} ${t}` : t))} continuous size={48} />
          </div>
          {err && <Notice tone="warning" className="mt-3">{err}</Notice>}
          <Button className="mt-4" onClick={arrange} loading={busy} disabled={text.trim().length < 6}><Sparkles className="w-4 h-4" />Arrange my calendar</Button>
        </>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-[13px] text-muted">Here&apos;s what I&apos;ve arranged. Check each one, untick anything that&apos;s wrong, then save.</p>
          {questions.length > 0 && <Notice>{questions.join(" ")}</Notice>}
          <ul className="space-y-2">
            {items.map((it, i) => (
              <li key={i} className={cx("rounded-2xl border p-3 grid grid-cols-1 sm:grid-cols-[auto_minmax(0,1fr)_200px_140px_auto] gap-2 items-center", it.keep ? "border-line" : "border-dashed border-line opacity-50")}>
                <input type="checkbox" className="w-4 h-4 accent-ink" checked={it.keep} onChange={(e) => set(i, { keep: e.target.checked })} aria-label={`Keep ${it.title}`} />
                <input className={inputCls + " h-10"} value={it.title} onChange={(e) => set(i, { title: e.target.value })} aria-label="Title" />
                <input type="datetime-local" className={inputCls + " h-10"} value={it.start} onChange={(e) => set(i, { start: e.target.value })} aria-label="Date and time" />
                <select className={inputCls + " h-10"} value={it.kind} onChange={(e) => set(i, { kind: e.target.value as EventKind })} aria-label="Type">{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
                <button onClick={() => setItems((x) => x!.filter((_, k) => k !== i))} aria-label={`Remove ${it.title}`} className="w-9 h-9 rounded-full hover:bg-cream inline-flex items-center justify-center text-muted justify-self-end"><Trash2 className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
          {googleClientId() && (
            <label className="flex items-start gap-2 text-[13px]"><input type="checkbox" className="mt-0.5 w-4 h-4 accent-ink" checked={toGoogle} onChange={(e) => setToGoogle(e.target.checked)} />
              <span>Also add to my Google Calendar, with an email reminder to my Gmail{!em.allowCalendar && <span className="text-muted"> (Google will ask for permission the first time)</span>}</span></label>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={save} loading={saving} disabled={!items.some((i) => i.keep)}>{saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><CalendarCheck className="w-4 h-4" />Save {items.filter((i) => i.keep).length} to my calendar</>}</Button>
            <Button variant="ghost" onClick={() => { setItems(null); setQuestions([]); }}>Back</Button>
          </div>
        </div>
      )}
    </section>
  );
}
