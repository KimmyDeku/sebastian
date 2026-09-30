"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { PenLine, Paperclip, UsersRound, Trash2, Send, CheckCircle2, AlertTriangle, Loader2, Inbox, Mail, Volume2, Reply, BellRing, X, ShieldAlert, RefreshCw, Sparkles, FileText, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { logActivity } from "@/lib/activity";
import { Button } from "../ui/Button";
import { Field, inputCls, textareaCls, Option } from "../ui/Chip";
import { Modal } from "../ui/Modal";
import { Notice } from "../ui/States";
import { GmailPermission } from "./Permission";
import { useAccount, useData, actions } from "@/lib/store";
import { useSpeaker } from "@/lib/voice";
import { api } from "@/lib/api";
import { useEmail, patchEmail, emailId, sendEmail, listEmails, readEmail, threadHasReply, hasGmailToken, validEmail, validList, googleClientId, type MailSummary } from "@/lib/gmail";
import { relTime, cx } from "@/lib/util";
import { toast } from "../ui/Toast";

const TONES = ["Professional", "Formal", "Friendly professional", "Concise", "Persuasive", "Follow-up", "Apology", "Request", "Proposal", "Networking", "Job application", "Customer support", "Internal"];
const MAX_ATTACH = 5 * 1024 * 1024;
type Draft = { to: string; toName: string; cc: string; bcc: string; subject: string; body: string; attachments: File[]; threadId?: string; inReplyTo?: string; sensitive?: boolean; sensitiveReason?: string; followUp?: { suggest: boolean; days: number; reason?: string }; missing: string[] };
type Stage = "compose" | "draft" | "sending" | "sent" | "failed";
const fmtTime = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);

export function EmailApp({ initial }: { initial?: string }) {
  const acc = useAccount();
  const d = useData();
  const em = useEmail();
  const { speak, cancel, speaking } = useSpeaker();
  const sender = [acc?.firstName, acc?.surname].filter(Boolean).join(" ");

  /* ---------- Compose ---------- */
  const [instruction, setInstruction] = useState(initial || "");
  const [tone, setTone] = useState("Professional");
  const [answers, setAnswers] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [stage, setStage] = useState<Stage>("compose");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [checked, setChecked] = useState(false);
  const [perm, setPerm] = useState<null | "send" | "read">(null);
  const [sentInfo, setSentInfo] = useState<{ at: Date; to: string; subject: string; threadId?: string; followUpDone?: string } | null>(null);
  const [customDays, setCustomDays] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const started = useRef(false);
  const set = (p: Partial<Draft>) => setDraft((x) => (x ? { ...x, ...p } : x));

  const writeDraft = async (mode: "draft" | "reply" | "followup", extra: any = {}) => {
    setBusy(true); setErr("");
    const r = await api<any>("/api/email", { mode, sender, tone, instruction, answers, current: mode === "draft" && draft ? `Subject: ${draft.subject}\n\n${draft.body}` : undefined, ...extra });
    setBusy(false);
    if (!r.ok) { setErr(r.error || "The draft couldn't be written."); return; }
    const x = r.draft || {};
    setDraft((cur) => ({
      to: extra.to || x.toEmail || cur?.to || "", toName: x.toName || cur?.toName || "", cc: (x.cc || []).join(", ") || cur?.cc || "", bcc: cur?.bcc || "",
      subject: x.subject || cur?.subject || "", body: x.body || "", attachments: cur?.attachments || [], threadId: extra.threadId ?? cur?.threadId, inReplyTo: extra.inReplyTo ?? cur?.inReplyTo,
      sensitive: !!x.sensitive, sensitiveReason: x.sensitiveReason, followUp: x.followUp, missing: x.missing || [],
    }));
    if ((x.cc || []).length) setShowCc(true);
    setStage("draft");
    setAnswers("");
  };
  useEffect(() => { if (initial && !started.current) { started.current = true; writeDraft("draft"); } }, [initial]); // eslint-disable-line react-hooks/exhaustive-deps

  const attach = (files: FileList | null) => {
    if (!files || !draft) return;
    const all = [...draft.attachments, ...Array.from(files)];
    if (all.reduce((s, f) => s + f.size, 0) > MAX_ATTACH) { toast.error("Attachments can total up to 5 MB here. For larger files, share a Google Drive link instead."); return; }
    set({ attachments: all });
  };

  const recipientsOk = draft && validEmail(draft.to) && validList(draft.cc) && validList(draft.bcc);
  const startSend = () => {
    if (!draft) return;
    if (!draft.to.trim()) { setErr(`What email address should I send this to${draft.toName ? `, for ${draft.toName}` : ""}?`); return; }
    if (!recipientsOk) { setErr("Please check the email addresses. One of them doesn't look right."); return; }
    if (!draft.subject.trim()) { setErr("Please add a subject."); return; }
    // Never send an email that still has blanks such as [time] or [date] in it.
    const blanks = Array.from(new Set((`${draft.subject}\n${draft.body}`.match(/\[[^\]\n]{2,40}\]/g) || [])));
    if (blanks.length) { setErr(`The email still has ${blanks.length === 1 ? "a blank" : "blanks"} to fill in: ${blanks.join(", ")}. Replace ${blanks.length === 1 ? "it" : "them"} in the message, or answer the questions above, before sending.`); return; }
    setErr("");
    if (!em.allowSend) { setPerm("send"); return; }
    setChecked(false); setConfirm(true);
  };

  const doSend = async () => {
    if (!draft) return;
    setConfirm(false); setStage("sending"); setErr("");
    try {
      const r = await sendEmail({ to: draft.to, cc: draft.cc, bcc: draft.bcc, subject: draft.subject, body: draft.body, attachments: draft.attachments, threadId: draft.threadId, inReplyTo: draft.inReplyTo });
      const at = new Date();
      patchEmail((e) => ({ ...e, sent: [{ id: r.id, threadId: r.threadId, to: draft.to, cc: draft.cc, subject: draft.subject, at: at.toISOString() }, ...e.sent].slice(0, 50) }));
      setSentInfo({ at, to: draft.to, subject: draft.subject, threadId: r.threadId });
      setStage("sent");
      logActivity({ kind: "email", title: `Email sent: ${draft.subject}`, detail: `To ${draft.to}`, href: "/email" });
      // A reply takes that email out of the inbox feed.
      if (draft.threadId) {
        const done = (inbox?.mails || []).filter((m) => m.threadId === draft.threadId).map((m) => m.id);
        if (done.length) patchEmail((e) => ({ ...e, replied: Array.from(new Set([...(e.replied || []), ...done])).slice(-300) }));
      }
    } catch (e: any) {
      setErr(e?.message || "Gmail returned an error.");
      setStage("failed");
    }
  };

  const addFollowUp = (days: number) => {
    if (!sentInfo || !draft) return;
    const due = new Date(sentInfo.at); due.setDate(due.getDate() + days); due.setHours(9, 0, 0, 0);
    const eventId = actions.addEvent({ kind: "reminder", title: `Follow up with ${draft.toName || draft.to}: ${draft.subject}`, start: due.toISOString(), remindMinutes: 0, notes: `Sent ${sentInfo.at.toLocaleDateString("en-GB")}. Sebastian will check Gmail for a reply first.`, source: { type: "manual", ref: `followup:${sentInfo.threadId || draft.subject}` } });
    patchEmail((e) => ({ ...e, followUps: [{ id: emailId(), to: draft.to, toName: draft.toName, subject: draft.subject, threadId: sentInfo.threadId, sentAt: sentInfo.at.toISOString(), due: due.toISOString(), status: "waiting", eventId }, ...e.followUps] }));
    setSentInfo({ ...sentInfo, followUpDone: `${days} day${days === 1 ? "" : "s"}` });
  };
  const reset = () => { setDraft(null); setStage("compose"); setInstruction(""); setSentInfo(null); setErr(""); setShowCc(false); };

  /* ---------- Inbox ---------- */
  const [inbox, setInbox] = useState<{ view: string; overview?: string; mails: (MailSummary & { category?: string; attention?: boolean; summary?: string; action?: string })[] } | null>(null);
  const [inboxBusy, setInboxBusy] = useState(false);
  const [open, setOpen] = useState<any>(null);
  const [openSummary, setOpenSummary] = useState<any>(null);
  const [longChoice, setLongChoice] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [idx, setIdx] = useState(0);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const feed = (inbox?.mails || []).filter((m) => !(em.replied || []).includes(m.id));
  useEffect(() => { if (idx > 0 && idx >= feed.length) setIdx(Math.max(0, feed.length - 1)); }, [feed.length, idx]);
  const go = (n: number) => setIdx((i) => Math.min(Math.max(0, i + n), Math.max(0, feed.length - 1)));
  const needsReply = (m: any) => !!m.attention || /reply|decision|confirm|respond/i.test(m.action || "");

  const needRead = (then: () => void) => { if (!em.allowRead) { setPerm("read"); return; } then(); };
  const loadInbox = (view: string) => needRead(async () => {
    const q = { important: "newer_than:1d -category:promotions -category:social", unread: "is:unread newer_than:7d", sent: "in:sent newer_than:14d", search: "" }[view] ?? view;
    setInboxBusy(true); setOpen(null);
    try {
      const mails = await listEmails(q, 15);
      let enriched: any[] = mails, overview = mails.length ? undefined : "No emails found for this view.";
      if (mails.length && view !== "sent") {
        const t = await api<any>("/api/email", { mode: "triage", messages: mails.map((m) => ({ id: m.id, from: m.from, subject: m.subject, date: m.date, snippet: m.snippet.slice(0, 220), unread: m.unread })) });
        if (t.ok) { overview = t.overview; enriched = mails.map((m) => ({ ...m, ...(t.items || []).find((i: any) => i.id === m.id) })); if (view === "important") enriched.sort((a, b) => Number(!!b.attention) - Number(!!a.attention)); }
      }
      setInbox({ view, overview, mails: enriched });
      setIdx(0);
    } catch (e: any) { toast.error(e?.message || "Gmail couldn't be read."); }
    setInboxBusy(false);
  });
  const openMail = (id: string) => needRead(async () => {
    try { setOpenSummary(null); setOpen(await readEmail(id)); } catch (e: any) { toast.error(e?.message || "That email couldn't be opened."); }
  });
  const summarize = async () => {
    if (!open) return;
    const r = await api<any>("/api/email", { mode: "summarize", from: open.from, subject: open.subject, body: open.body });
    if (r.ok) setOpenSummary(r); else toast.error(r.error || "The summary couldn't be made.");
    return r;
  };
  const readAloud = async (full: boolean) => {
    setLongChoice(false);
    if (full) { speak(`Email from ${open.from}. Subject: ${open.subject}. ${open.body.slice(0, 5000)}`, d.prefs.voiceName); return; }
    const s = openSummary || (await summarize());
    if (s?.summary) speak(`Here's a summary, not the full email. From ${open.from}: ${s.summary}`, d.prefs.voiceName);
  };
  const replyTo = (id: string) => needRead(async () => {
    try { const full = await readEmail(id); setOpen(full); startReply(full); } catch (e: any) { toast.error(e?.message || "That email couldn't be opened."); }
  });
  const draftReply = () => { if (open) startReply(open); };
  const startReply = (open: any) => {
    const re = /^re:/i.test(open.subject) ? open.subject : `Re: ${open.subject}`;
    setDraft({ to: open.fromEmail, toName: open.from, cc: "", bcc: "", subject: re, body: "", attachments: [], threadId: open.threadId, inReplyTo: open.messageId, missing: [] });
    writeDraft("reply", { original: { from: open.from, subject: open.subject, body: open.body }, instruction: replyText || "a courteous reply that responds to what they asked", to: open.fromEmail, threadId: open.threadId, inReplyTo: open.messageId });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ---------- Follow-ups ---------- */
  const due = useMemo(() => em.followUps.filter((f) => f.status === "waiting" && new Date(f.due).getTime() <= Date.now()), [em.followUps]);
  const [checkedReplies, setCheckedReplies] = useState<Record<string, boolean | null>>({});
  useEffect(() => {
    if (!em.allowRead || !hasGmailToken("read")) return;
    due.forEach(async (f) => {
      if (!f.threadId || checkedReplies[f.id] !== undefined) return;
      try { const replied = await threadHasReply(f.threadId, f.sentAt, em.address); setCheckedReplies((c) => ({ ...c, [f.id]: replied })); } catch { setCheckedReplies((c) => ({ ...c, [f.id]: null })); }
    });
  }, [due, em.allowRead]); // eslint-disable-line react-hooks/exhaustive-deps
  const updateFU = (id: string, p: any) => patchEmail((e) => ({ ...e, followUps: e.followUps.map((f) => (f.id === id ? { ...f, ...p } : f)) }));
  const followUpDraft = (f: any) => {
    const days = Math.max(1, Math.round((Date.now() - new Date(f.sentAt).getTime()) / 86400000));
    setDraft({ to: f.to, toName: f.toName || "", cc: "", bcc: "", subject: /^re:/i.test(f.subject) ? f.subject : `Re: ${f.subject}`, body: "", attachments: [], threadId: f.threadId, missing: [] });
    writeDraft("followup", { to: f.to, toName: f.toName, subject: f.subject, days, threadId: f.threadId });
    updateFU(f.id, { status: "dismissed" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ---------- UI ---------- */
  const noSetup = !googleClientId();
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-6 items-start">
      <section className="space-y-4 min-w-0">
        {due.map((f) => { const replied = checkedReplies[f.id]; return (
          <div key={f.id} className="rounded-2xl border border-cream-line bg-cream/50 p-4 text-[13.5px]" role="status">
            {replied ? (<>
              <p className="font-medium inline-flex items-center gap-1.5"><Mail className="w-4 h-4 text-success" />{f.toName || f.to} has replied</p>
              <p className="text-muted mt-1">I found a reply to &ldquo;{f.subject}&rdquo;. Would you like to open your inbox?</p>
              <div className="flex gap-2 mt-3"><Button size="sm" onClick={() => { updateFU(f.id, { status: "replied" }); loadInbox("unread"); }}>Show my inbox</Button><Button size="sm" variant="ghost" onClick={() => updateFU(f.id, { status: "replied" })}>Dismiss</Button></div>
            </>) : (<>
              <p className="font-medium inline-flex items-center gap-1.5"><BellRing className="w-4 h-4 text-gold" />Follow-up reminder</p>
              <p className="text-muted mt-1">You emailed {f.toName || f.to} about &ldquo;{f.subject}&rdquo; {relTime(f.sentAt)}{replied === false ? " and I haven't found a reply in your Gmail." : em.allowRead ? "." : ". Allow Gmail reading and I'll check for a reply first."}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button size="sm" onClick={() => followUpDraft(f)}><PenLine className="w-4 h-4" />Draft follow-up</Button>
                <Button size="sm" variant="outline" onClick={() => { const n = new Date(); n.setDate(n.getDate() + 2); updateFU(f.id, { due: n.toISOString() }); }}>Remind me in 2 days</Button>
                <Button size="sm" variant="ghost" onClick={() => updateFU(f.id, { status: "dismissed" })}>Dismiss</Button>
              </div>
            </>)}
          </div>); })}

        {stage === "compose" && (
          <div className="rounded-3xl bg-paper border border-line p-5 md:p-6">
            <h2 className="t-h3 inline-flex items-center gap-2"><PenLine className="w-5 h-5 text-gold" />What should the email say?</h2>
            <p className="text-[13px] text-muted mt-1">Say it in your own words, for example &ldquo;Email John and tell him the FarmWise AI demo is ready, and ask if we can meet next Thursday.&rdquo;</p>
            <label htmlFor="em-ins" className="sr-only">Describe the email</label>
            <textarea id="em-ins" className={textareaCls + " mt-4 min-h-[120px]"} value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Who is it to, and what do you need to say?" />
            <p className="text-[12px] text-muted mt-3 mb-1.5">Tone</p>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tone">{TONES.map((t) => <Option key={t} variant="chip" selected={tone === t} onClick={() => setTone(t)}>{t}</Option>)}</div>
            {err && <Notice tone="warning" className="mt-4">{err}</Notice>}
            <Button className="mt-5" onClick={() => writeDraft("draft")} loading={busy} disabled={instruction.trim().length < 8}><Sparkles className="w-4 h-4" />Draft the email</Button>
          </div>
        )}

        {draft && (stage === "draft" || stage === "failed" || stage === "sending") && (
          <div className="rounded-3xl bg-paper border border-line p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium inline-flex items-center gap-2"><span className="h-6 px-2.5 rounded-full bg-cream text-[11.5px] inline-flex items-center">{stage === "sending" ? "Sending…" : stage === "failed" ? "Not sent" : "Draft"}</span>Review before sending</p>
              {busy && <span className="text-[12px] text-muted inline-flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />Writing…</span>}
            </div>
            {stage === "failed" && <Notice tone="warning"><span className="font-medium">Email wasn&apos;t sent.</span> {err} Please check your connection or reconnect Gmail, then try again.</Notice>}
            {draft.missing.length > 0 && (
              <div className="rounded-2xl bg-cream/50 border border-cream-line p-4">
                <p className="text-[13px] font-medium">A few details I shouldn&apos;t guess:</p>
                <ul className="list-disc pl-5 text-[13px] mt-1.5 space-y-0.5">{draft.missing.map((m) => <li key={m}>{m}</li>)}</ul>
                <div className="flex gap-2 mt-3"><input className={inputCls + " h-10"} value={answers} onChange={(e) => setAnswers(e.target.value)} placeholder="Your answers, e.g. Thursday 2 pm, at our Harare office" aria-label="Answers" /><Button size="sm" onClick={() => writeDraft("draft")} disabled={!answers.trim() || busy}>Update</Button></div>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="To *" error={draft.to && !validEmail(draft.to) ? "This doesn't look like an email address." : undefined}><input type="email" className={inputCls} value={draft.to} onChange={(e) => set({ to: e.target.value })} placeholder={draft.toName ? `${draft.toName}'s email address` : "name@example.com"} /></Field>
              <Field label="Recipient's name"><input className={inputCls} value={draft.toName} onChange={(e) => set({ toName: e.target.value })} /></Field>
            </div>
            {showCc && (
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="CC" error={!validList(draft.cc) ? "Check these addresses." : undefined}><input className={inputCls} value={draft.cc} onChange={(e) => set({ cc: e.target.value })} placeholder="Separate with commas" /></Field>
                <Field label="BCC" error={!validList(draft.bcc) ? "Check these addresses." : undefined}><input className={inputCls} value={draft.bcc} onChange={(e) => set({ bcc: e.target.value })} placeholder="Hidden from other recipients" /></Field>
              </div>
            )}
            <Field label="Subject *"><input className={inputCls} value={draft.subject} onChange={(e) => set({ subject: e.target.value })} /></Field>
            <Field label="Message"><textarea className={textareaCls + " min-h-[260px] leading-relaxed"} value={draft.body} onChange={(e) => set({ body: e.target.value })} /></Field>
            {draft.attachments.length > 0 && (
              <ul className="flex flex-wrap gap-2">{draft.attachments.map((f, i) => (
                <li key={i} className="inline-flex items-center gap-1.5 h-8 pl-3 pr-1 rounded-pill bg-cream text-[12.5px]"><FileText className="w-3.5 h-3.5" />{f.name} · {kb(f.size)}
                  <button onClick={() => set({ attachments: draft.attachments.filter((_, k) => k !== i) })} aria-label={`Remove ${f.name}`} className="w-6 h-6 rounded-full hover:bg-cream-deep inline-flex items-center justify-center"><X className="w-3 h-3" /></button></li>))}</ul>
            )}
            {err && stage === "draft" && <Notice tone="warning">{err}</Notice>}
            <input ref={file} type="file" multiple hidden onChange={(e) => { attach(e.target.files); e.target.value = ""; }} />
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => writeDraft("draft")} disabled={busy}><RefreshCw className="w-4 h-4" />Rewrite</Button>
              <Button variant="outline" size="sm" onClick={() => file.current?.click()}><Paperclip className="w-4 h-4" />Add attachment</Button>
              {!showCc && <Button variant="outline" size="sm" onClick={() => setShowCc(true)}><UsersRound className="w-4 h-4" />Add CC</Button>}
              <Button variant="ghost" size="sm" onClick={reset}><Trash2 className="w-4 h-4" />Discard</Button>
              <Button className="ml-auto" onClick={startSend} loading={stage === "sending"} disabled={busy}><Send className="w-4 h-4" />{stage === "failed" ? "Try again" : "Send"}</Button>
            </div>
            <p className="text-[11.5px] text-muted">Drafting doesn&apos;t send anything. You&apos;ll see a final check before any email leaves your Gmail.</p>
          </div>
        )}

        {stage === "sent" && sentInfo && (
          <div className="rounded-3xl border border-[#CFE2D6] bg-[#EFF5F1] p-5 md:p-6 text-[#1C1B19]" role="status">
            <p className="t-h3 inline-flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-success" />Email sent</p>
            <dl className="mt-3 text-[13.5px] grid grid-cols-[auto_1fr] gap-x-4 gap-y-1"><dt className="opacity-60">To</dt><dd>{sentInfo.to}</dd><dt className="opacity-60">Subject</dt><dd>{sentInfo.subject}</dd><dt className="opacity-60">Sent</dt><dd>{fmtTime(sentInfo.at)}, confirmed by Gmail</dd></dl>
            {sentInfo.followUpDone ? <p className="text-[13.5px] mt-4">I&apos;ll remind you to follow up in {sentInfo.followUpDone}{em.allowRead ? ", and check Gmail for a reply first" : ""}.</p> : (
              <div className="mt-4">
                <p className="text-[13.5px]">{draft?.followUp?.suggest ? `${draft.followUp.reason || "This looks important."} Would you like a reminder to follow up if you haven't had a reply?` : "Would you like a reminder to follow up if you haven't had a reply?"}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Button size="sm" onClick={() => addFollowUp(3)}>3 days</Button>
                  <Button size="sm" variant="outline" onClick={() => addFollowUp(5)}>5 days</Button>
                  <span className="inline-flex items-center gap-1.5"><input type="number" min={1} max={60} value={customDays} onChange={(e) => setCustomDays(e.target.value)} className={inputCls + " h-9 w-20"} aria-label="Custom number of days" placeholder="Days" /><Button size="sm" variant="outline" disabled={!Number(customDays)} onClick={() => addFollowUp(Number(customDays))}>Set</Button></span>
                </div>
              </div>
            )}
            <Button className="mt-5" variant="outline" size="sm" onClick={reset}><PenLine className="w-4 h-4" />Write another email</Button>
          </div>
        )}
      </section>

      <aside className="space-y-4 min-w-0">
        <div className="rounded-3xl bg-paper border border-line p-5">
          <p className="t-h3 inline-flex items-center gap-2"><Inbox className="w-5 h-5 text-gold" />Your inbox</p>
          {noSetup ? <p className="text-[13px] text-muted mt-2">Gmail becomes available once NEXT_PUBLIC_GOOGLE_CLIENT_ID is set up.</p> : !em.allowRead ? (
            <><p className="text-[13px] text-muted mt-2">Allow reading and I can summarise your inbox, read important emails aloud and draft replies. Sending and reading are separate permissions.</p><Button size="sm" className="mt-3" onClick={() => setPerm("read")}>Allow Gmail reading</Button></>
          ) : (
            <div className="flex flex-wrap gap-2 mt-3">
              {[["important", "Today's important"], ["unread", "Unread"], ["sent", "Sent"]].map(([k, l]) => <Button key={k} size="sm" variant={inbox?.view === k ? "primary" : "outline"} onClick={() => loadInbox(k)} loading={inboxBusy && inbox?.view !== k ? false : inboxBusy && inbox?.view === k}>{l}</Button>)}
            </div>
          )}
          {inboxBusy && <p className="text-[13px] text-muted mt-3 inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Reading your Gmail…</p>}
          {inbox && !inboxBusy && (
            <div className="mt-4">
              {inbox.overview && <p className="text-[13.5px] mb-3">{inbox.overview}</p>}
              {!feed.length ? <p className="text-[13px] text-muted">{inbox.mails.length ? "You've replied to everything here." : ""}</p> : (() => { const m: any = feed[idx]; return (
                <div>
                  <div role="group" aria-roledescription="carousel" aria-label="Emails" tabIndex={0} data-no-drag
                    onKeyDown={(e) => { if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); }}
                    onPointerDown={(e) => { swipe.current = { x: e.clientX, y: e.clientY }; }}
                    onPointerUp={(e) => { const s0 = swipe.current; swipe.current = null; if (!s0) return; const dx = e.clientX - s0.x, dy = e.clientY - s0.y; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(1); }}
                    className="touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-gold/40 rounded-2xl">
                    <article key={m.id} aria-label={`Email ${idx + 1} of ${feed.length}`} className={cx("rounded-2xl border p-4 min-h-[170px] animate-fadeUp", m.attention ? "border-gold/50 bg-gold-soft/20" : "border-line bg-paper")}>
                      <p className="flex items-center justify-between gap-2 text-[12px] text-muted"><span className={cx("truncate", m.unread && "text-ink font-medium")}>{m.from}</span><span className="shrink-0">{m.date ? relTime(m.date) : ""}</span></p>
                      <h3 className="text-[15px] font-medium mt-1">{m.subject}</h3>
                      <p className="text-[13px] text-muted mt-1.5 line-clamp-3">{m.summary || m.snippet}</p>
                      {(m.action || m.category) && <p className="flex flex-wrap gap-1.5 mt-2">{m.category && <span className="text-[10.5px] bg-cream rounded-full px-2 py-0.5">{m.category}</span>}{m.action && <span className={cx("text-[10.5px] rounded-full px-2 py-0.5", needsReply(m) ? "bg-ink text-white" : "bg-canvas border border-line")}>{m.action}</span>}</p>}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {needsReply(m) && <Button size="sm" onClick={() => replyTo(m.id)}><Reply className="w-4 h-4" />Reply</Button>}
                        <Button size="sm" variant="outline" onClick={() => openMail(m.id)}><Eye className="w-4 h-4" />Open</Button>
                      </div>
                    </article>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <Button size="sm" variant="ghost" onClick={() => go(-1)} disabled={idx === 0} aria-label="Previous email"><ChevronLeft className="w-4 h-4" />Previous</Button>
                    <span className="flex items-center gap-1.5" aria-live="polite">
                      {feed.length <= 10 ? feed.map((x, k) => <button key={x.id} onClick={() => setIdx(k)} aria-label={`Show email ${k + 1}`} className={cx("rounded-full transition-all", k === idx ? "w-5 h-2 bg-gold" : "w-2 h-2 bg-line hover:bg-cream-line")} />) : <span className="text-[12px] text-muted">{idx + 1} of {feed.length}</span>}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => go(1)} disabled={idx >= feed.length - 1} aria-label="Next email">Next<ChevronRight className="w-4 h-4" /></Button>
                  </div>
                  <p className="text-[11.5px] text-muted text-center mt-1">Swipe or use Next to see more</p>
                </div>); })()}
            </div>
          )}
        </div>

        {!open && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/images/email-illustration.jpg" alt="Read, draft and send: Sebastian helps with every step of your email" className="w-full rounded-3xl border border-line bg-[#FCFBF9]" loading="lazy" />
        )}

        {open && (
          <div className="rounded-3xl bg-paper border border-line p-5 space-y-3">
            <div className="flex justify-between gap-3"><div className="min-w-0"><p className="text-[12px] text-muted truncate">{open.from} · {open.date ? relTime(open.date) : ""}</p><p className="font-medium text-[15px]">{open.subject}</p></div><button onClick={() => { setOpen(null); cancel(); }} aria-label="Close email" className="w-8 h-8 rounded-full hover:bg-cream inline-flex items-center justify-center shrink-0"><X className="w-4 h-4" /></button></div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => (speaking ? cancel() : open.body.length > 1200 ? setLongChoice(true) : readAloud(true))}><Volume2 className="w-4 h-4" />{speaking ? "Stop reading" : "Read aloud"}</Button>
              <Button size="sm" variant="outline" onClick={summarize}><Sparkles className="w-4 h-4" />Summarise</Button>
            </div>
            {longChoice && <div className="rounded-2xl bg-cream/50 border border-cream-line p-3 text-[13px]"><p>This email is quite long. Would you like the full email or a summary first?</p><div className="flex gap-2 mt-2"><Button size="sm" onClick={() => readAloud(true)}>Read full email</Button><Button size="sm" variant="outline" onClick={() => readAloud(false)}>Summarise</Button></div></div>}
            {openSummary && <div className="rounded-2xl bg-canvas border border-line p-3 text-[13px]"><p className="text-[11px] text-muted mb-1">Summary (not the full email)</p><p>{openSummary.summary}</p>{openSummary.actions?.length > 0 && <ul className="list-disc pl-5 mt-2">{openSummary.actions.map((a: string) => <li key={a}>{a}</li>)}</ul>}</div>}
            <div className="max-h-72 overflow-y-auto rounded-2xl bg-canvas border border-line p-3 text-[13px] whitespace-pre-wrap leading-relaxed">{open.body}</div>
            <div className="flex gap-2"><input className={inputCls + " h-10"} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="What should the reply say? e.g. Thursday at 2 pm works" aria-label="What should the reply say?" /><Button size="sm" onClick={draftReply}><Reply className="w-4 h-4" />Draft reply</Button></div>
          </div>
        )}
      </aside>

      <Modal open={confirm && !!draft} onClose={() => setConfirm(false)} title="Ready to send?">
        {draft && (
          <div className="space-y-4">
            <p className="text-sm">The email is ready. Would you like me to send it through your Gmail{em.address ? ` (${em.address})` : ""}?</p>
            <dl className="rounded-2xl border border-line divide-y divide-line text-[13px]">
              {([["To", draft.to], ["CC", draft.cc || "—"], ["BCC", draft.bcc || "—"], ["Subject", draft.subject], ["Attachments", draft.attachments.length ? draft.attachments.map((f) => f.name).join(", ") : "None"]] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex gap-4 px-4 py-2.5"><dt className="w-24 shrink-0 text-muted">{k}</dt><dd className="min-w-0 break-words">{v}</dd></div>
              ))}
            </dl>
            {draft.sensitive && (
              <label className="flex gap-2 rounded-2xl bg-[#FBF5EA] border border-[#EBD7AE] p-3 text-[13px] text-[#1C1B19]">
                <ShieldAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" /><span className="flex-1"><span className="font-medium">This email may contain sensitive information.</span> {draft.sensitiveReason} Please check the recipients and content carefully.<span className="flex items-center gap-2 mt-2"><input type="checkbox" className="w-4 h-4 accent-ink" checked={checked} onChange={(e) => setChecked(e.target.checked)} />I&apos;ve checked it and want to send it.</span></span>
              </label>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => { setConfirm(false); reset(); }}>Cancel</Button>
              <Button variant="outline" onClick={() => setConfirm(false)}><PenLine className="w-4 h-4" />Edit</Button>
              <Button onClick={doSend} disabled={draft.sensitive && !checked}><Send className="w-4 h-4" />Send email</Button>
            </div>
          </div>
        )}
      </Modal>
      <GmailPermission kind={perm || "send"} open={!!perm} onClose={() => setPerm(null)}
        onGranted={() => { const k = perm; setPerm(null); toast.success(k === "send" ? "Gmail sending allowed." : "Gmail reading allowed."); if (k === "send") { setChecked(false); setConfirm(true); } }} />
    </div>
  );
}
