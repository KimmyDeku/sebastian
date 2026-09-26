"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarPlus, Download, Pencil, Trash2, Plus, Bell, BedDouble, Plane, User } from "lucide-react";
import { Container, PageHeader } from "@/components/ui/Page";
import { WizardCard } from "@/components/ui/Wizard";
import { Option, inputCls, textareaCls } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState, Notice } from "@/components/ui/States";
import { actions, useAccount, useData } from "@/lib/store";
import { REMIND_OPTIONS, downloadICS, googleCalendarUrl } from "@/lib/calendar";
import { cx } from "@/lib/util";
import type { EventKind, ScheduleEvent } from "@/lib/types";
import { toast } from "@/components/ui/Toast";

const KINDS: { k: EventKind; l: string }[] = [{ k: "appointment", l: "Appointment" }, { k: "meeting", l: "Meeting" }, { k: "reminder", l: "Reminder" }, { k: "other", l: "Other" }];
const LABELS = ["The occasion", "When", "Details", "Confirm"];
const toLocalInput = (iso: string) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

function ScheduleInner() {
  const sp = useSearchParams();
  const acc = useAccount();
  const d = useData();
  const tz = acc?.timezone;
  const [wiz, setWiz] = useState(false);
  const [step, setStep] = useState(1);
  const [editId, setEditId] = useState<string | null>(null);
  const [kind, setKind] = useState<EventKind>("appointment");
  const [other, setOther] = useState("");
  const [when, setWhen] = useState("");
  const [remind, setRemind] = useState<number | null>(15);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [del, setDel] = useState<ScheduleEvent | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [perm, setPerm] = useState<string>("default");

  useEffect(() => { if (typeof Notification !== "undefined") setPerm(Notification.permission); else setPerm("unsupported"); }, []);
  useEffect(() => {
    if (sp.get("kind") || sp.get("title") || sp.get("datetime")) {
      const k = sp.get("kind") as EventKind; if (KINDS.some((x) => x.k === k)) setKind(k);
      if (sp.get("title")) setTitle(sp.get("title")!);
      if (sp.get("datetime")) setWhen(sp.get("datetime")!);
      setWiz(true);
    }
  }, [sp]);

  const reset = () => { setStep(1); setEditId(null); setKind("appointment"); setOther(""); setWhen(""); setRemind(15); setTitle(""); setNotes(""); };
  const startEdit = (e: ScheduleEvent) => {
    setEditId(e.id); setKind(KINDS.some((x) => x.k === e.kind) ? e.kind : "other"); setOther(e.otherLabel || (["booking", "trip"].includes(e.kind) ? e.kind : ""));
    setWhen(toLocalInput(e.start)); setRemind(e.remindMinutes); setTitle(e.title); setNotes(e.notes || ""); setStep(1); setWiz(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const kindLabel = kind === "other" ? other || "Other" : KINDS.find((x) => x.k === kind)!.l;
  const whenPast = when && new Date(when).getTime() < Date.now() - 60000;

  const build = (): Omit<ScheduleEvent, "id" | "createdAt"> => {
    const existing = editId ? d.schedule.find((x) => x.id === editId) : null;
    return { kind: existing && ["booking", "trip"].includes(existing.kind) ? existing.kind : kind, otherLabel: kind === "other" ? other : undefined, title: title.trim(), start: new Date(when).toISOString(), end: existing?.end, remindMinutes: remind, notes, source: existing?.source || { type: "manual" }, notified: false };
  };
  const save = (openGoogle: boolean) => {
    const ev = build();
    let id = editId;
    if (editId) actions.updateEvent(editId, ev); else id = actions.addEvent(ev);
    if (openGoogle) { window.open(googleCalendarUrl({ ...ev, id: id!, createdAt: "" }), "_blank", "noopener"); actions.updateEvent(id!, { gcalOpened: true }); toast.success("Saved in Sebastian. Google Calendar is open. Press Save there to finish syncing."); }
    else toast.success(editId ? "Changes saved to your Sebastian schedule." : "Saved to your Sebastian schedule.");
    if (remind != null && perm === "default" && typeof Notification !== "undefined") Notification.requestPermission().then(setPerm);
    setWiz(false); reset();
  };

  const now = Date.now();
  const list = d.schedule.filter((e) => (tab === "upcoming" ? new Date(e.end || e.start).getTime() >= now - 3600000 : new Date(e.end || e.start).getTime() < now - 3600000))
    .sort((a, b) => (tab === "upcoming" ? a.start.localeCompare(b.start) : b.start.localeCompare(a.start)));
  const upcomingCount = d.schedule.filter((e) => new Date(e.end || e.start).getTime() >= now - 3600000).length;
  const groups: Record<string, ScheduleEvent[]> = {};
  list.forEach((e) => { const k = new Date(e.start).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: tz }); (groups[k] ||= []).push(e); });
  const SrcIcon = (e: ScheduleEvent) => (e.source.type === "booking" ? BedDouble : e.source.type === "trip" ? Plane : User);

  return (
    <Container>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Schedule", onClick: () => setWiz(false) }, ...(wiz ? [{ label: LABELS[step - 1] }] : [])]} title={wiz ? (editId ? "Edit entry" : "New entry") : "Scheduled"}
        subtitle={wiz ? undefined : "Appointments, reminders, bookings and trips in one place."} onBack={wiz ? () => (step > 1 ? setStep(step - 1) : (setWiz(false), reset())) : undefined}
        right={!wiz && <Button onClick={() => { reset(); setWiz(true); }}><Plus className="w-4 h-4" />Schedule</Button>} />

      {wiz && (
        <div className="max-w-2xl">
          {step === 1 && (
            <WizardCard label="The occasion" step={1} total={4} title="What may I schedule for you?" onNext={() => setStep(2)} nextDisabled={kind === "other" && !other.trim()}>
              <div role="radiogroup" className="space-y-3">{KINDS.map((x) => <Option key={x.k} selected={kind === x.k} onClick={() => setKind(x.k)}>{x.l}</Option>)}</div>
              {kind === "other" && <input autoFocus className={inputCls + " mt-4"} placeholder="Please specify: birthday, shopping…" value={other} onChange={(e) => setOther(e.target.value)} aria-label="Specify type" />}
            </WizardCard>
          )}
          {step === 2 && (
            <WizardCard label="When" step={2} total={4} title="When shall I set it for?" onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!when}>
              <label className="text-[13px] text-muted">Date and time<input type="datetime-local" className={inputCls + " mt-1.5"} value={when} onChange={(e) => setWhen(e.target.value)} /></label>
              {whenPast && <p className="text-xs text-warning mt-2">That time has already passed. You can still save it as a record.</p>}
              <p className="text-[13px] text-muted mt-6 mb-2">Remind me</p>
              <div className="flex flex-wrap gap-2" role="radiogroup">
                {REMIND_OPTIONS.map((o) => <Option key={o.value} variant="chip" selected={remind === o.value} onClick={() => setRemind(o.value)}>{o.label}</Option>)}
                <Option variant="chip" selected={remind === null} onClick={() => setRemind(null)}>No reminder</Option>
              </div>
            </WizardCard>
          )}
          {step === 3 && (
            <WizardCard label="Details" step={3} total={4} title="What is it regarding?" subtitle="A short line becomes the calendar entry." onBack={() => setStep(2)} onNext={() => setStep(4)} nextDisabled={!title.trim()}>
              <input autoFocus className={inputCls} placeholder="e.g. Dental check-up with Dr Adeyemi" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
              <textarea className={textareaCls + " mt-3"} placeholder="Notes (optional): location, what to bring…" value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Notes" />
            </WizardCard>
          )}
          {step === 4 && (
            <WizardCard label="Confirm" step={4} total={4} title="Ready to confirm" onBack={() => setStep(3)}
              footer={<div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end"><Button variant="outline" onClick={() => save(false)}>Save to Sebastian only</Button><Button onClick={() => save(true)}><CalendarPlus className="w-4 h-4" />Save & open Google Calendar</Button></div>}>
              <dl className="rounded-2xl bg-canvas border border-line divide-y divide-line text-sm">
                {[["What", `${kindLabel} — ${title}`], ["When", new Date(when).toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })], ["Reminder", remind == null ? "None" : REMIND_OPTIONS.find((o) => o.value === remind)?.label || ""], ["Saved to", "Sebastian schedule, then Google Calendar if you choose"]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-4 py-3"><dt className="text-muted">{k}</dt><dd className="text-right">{v}</dd></div>
                ))}
              </dl>
              <p className="text-xs text-muted mt-3">Google Calendar opens pre-filled; press Save there to sync it to your phone. For other calendars, use the .ics export.</p>
            </WizardCard>
          )}
        </div>
      )}

      {!wiz && (
        <>
          {perm === "default" && <Notice tone="permission" className="mb-6" action={<Button size="sm" variant="outline" onClick={() => Notification.requestPermission().then(setPerm)}><Bell className="w-4 h-4" />Allow</Button>}>Allow notifications so I can remind you even when this tab is in the background. Otherwise I&apos;ll remind you here in the app.</Notice>}
          {perm === "denied" && <Notice tone="permission" className="mb-6">Browser notifications are blocked, so reminders will appear inside Sebastian while it&apos;s open.</Notice>}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="inline-flex rounded-pill bg-paper border border-line p-1" role="tablist">
              {(["upcoming", "past"] as const).map((t) => (
                <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cx("h-9 px-5 rounded-pill text-sm inline-flex items-center gap-2", tab === t ? "bg-ink text-white" : "text-muted")}>
                  {t === "upcoming" ? "Upcoming" : "Past"}{t === "upcoming" && <span className={cx("min-w-5 h-5 px-1.5 rounded-full text-[11px] inline-flex items-center justify-center", tab === t ? "bg-gold" : "bg-cream text-ink")}>{upcomingCount}</span>}
                </button>
              ))}
            </div>
            {d.schedule.length > 0 && <Button size="sm" variant="outline" onClick={() => downloadICS(d.schedule)}><Download className="w-4 h-4" />Export .ics for phone</Button>}
          </div>
          {list.length === 0 ? <EmptyState title={tab === "upcoming" ? "Nothing scheduled yet" : "No past entries"} body="Bookings and trips appear here automatically. Add anything else yourself." action={<Button onClick={() => { reset(); setWiz(true); }}>Schedule something</Button>} />
            : Object.entries(groups).map(([day, evs]) => (
              <section key={day} className="mb-8">
                <h2 className="font-serif text-xl mb-3">{day}</h2>
                <ul className="space-y-3">
                  {evs.map((e) => { const I = SrcIcon(e); return (
                    <li key={e.id} className="bg-paper rounded-2xl border border-line p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <span className="w-16 shrink-0 text-center"><span className="block font-serif text-2xl">{new Date(e.start).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz })}</span></span>
                        <div className="min-w-0">
                          <p className="text-[15px] truncate">{e.title}</p>
                          <p className="text-xs text-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="inline-flex items-center gap-1 bg-cream rounded-full px-2 py-0.5 text-ink"><I className="w-3 h-3" aria-hidden />{e.source.type === "manual" ? (e.otherLabel || e.kind.charAt(0).toUpperCase() + e.kind.slice(1)) : e.source.type === "booking" ? "From Booking" : "From Travel"}</span>
                            {e.remindMinutes != null && <span className="inline-flex items-center gap-1"><Bell className="w-3 h-3" />{REMIND_OPTIONS.find((o) => o.value === e.remindMinutes)?.label}</span>}
                            {e.gcalOpened && <span>Sent to Google Calendar</span>}
                          </p>
                          {e.notes && <p className="text-xs text-muted mt-1.5 line-clamp-2">{e.notes}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2 sm:shrink-0">
                        <Button size="sm" variant="outline" onClick={() => { window.open(googleCalendarUrl(e), "_blank", "noopener"); actions.updateEvent(e.id, { gcalOpened: true }); }}><CalendarPlus className="w-4 h-4" /><span className="hidden md:inline">Google Calendar</span></Button>
                        <button onClick={() => startEdit(e)} aria-label={`Edit ${e.title}`} className="w-9 h-9 rounded-full border border-line inline-flex items-center justify-center hover:bg-cream"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => setDel(e)} aria-label={`Delete ${e.title}`} className="w-9 h-9 rounded-full border border-line inline-flex items-center justify-center hover:bg-cream"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </li>
                  ); })}
                </ul>
              </section>
            ))}
        </>
      )}
      <ConfirmDialog open={!!del} danger title="Delete this entry?" body={`"${del?.title}" will be removed from your Sebastian schedule. Anything you saved in Google Calendar stays there.`} confirmLabel="Delete"
        onCancel={() => setDel(null)} onConfirm={() => { actions.deleteEvent(del!.id); setDel(null); toast.info("Entry deleted."); }} />
    </Container>
  );
}
export default function SchedulePage() { return <Suspense><ScheduleInner /></Suspense>; }
