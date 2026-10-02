"use client";
import { useEffect, useState } from "react";
import { MessageSquareWarning, Lightbulb, Heart, Bug, CheckCircle2, Send } from "lucide-react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Field, inputCls, textareaCls } from "./ui/Chip";
import { Notice } from "./ui/States";
import { useAccount, useData } from "@/lib/store";
import { getLang } from "@/lib/i18n";
import { logActivity } from "@/lib/activity";
import { cx } from "@/lib/util";

const TYPES = [
  { k: "Complaint", icon: MessageSquareWarning, hint: "Something wasn't right" },
  { k: "Suggestion", icon: Lightbulb, hint: "An idea to make Sebastian better" },
  { k: "Feedback", icon: Heart, hint: "Tell us what you think" },
  { k: "Report a problem", icon: Bug, hint: "Something isn't working" },
] as const;

/** Contact us: complaints, suggestions, feedback and problem reports, sent to the Sebastian team by email. */
export function ContactForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const acc = useAccount();
  const d = useData();
  const [type, setType] = useState<string>("Feedback");
  const [f, setF] = useState({ name: "", email: "", subject: "", message: "", website: "" });
  const [device, setDevice] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  useEffect(() => { if (open) { setF((x) => ({ ...x, name: x.name || [acc?.firstName, acc?.surname].filter(Boolean).join(" "), email: x.email || acc?.email || "" })); setSent(null); setErr(""); } }, [open, acc]);

  const send = async () => {
    setBusy(true); setErr("");
    const r = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...f, type, page: document.referrer || window.location.pathname, device: device ? navigator.userAgent : "", plan: d.prefs.plan || "silver", language: getLang() }) })
      .then((x) => x.json()).catch(() => ({ ok: false, error: "Couldn't reach Sebastian's server. Please check your connection." }));
    setBusy(false);
    if (!r.ok) { setErr(r.error || "The message couldn't be sent."); return; }
    setSent(r.ref || "sent");
    logActivity({ kind: "link", title: `${type} sent to the Sebastian team`, detail: f.subject || undefined, href: "/settings" });
    setF((x) => ({ ...x, subject: "", message: "" }));
  };

  return (
    <Modal open={open} onClose={onClose} title={sent ? "Thank you" : "Contact us"}>
      {sent ? (
        <div className="text-center py-4">
          <span className="inline-flex w-14 h-14 rounded-full bg-[#EFF5F1] items-center justify-center"><CheckCircle2 className="w-7 h-7 text-success" aria-hidden /></span>
          <p className="t-h3 mt-4">Your message has been sent</p>
          <p className="text-sm text-muted mt-2 max-w-sm mx-auto">Thank you for taking the time to write to us. We read every message, and we&apos;ll reply to {f.email} if a response is needed.</p>
          {sent !== "sent" && <p className="text-[12px] text-muted mt-3">Reference: <span translate="no">{sent}</span></p>}
          <div className="flex justify-center gap-2 mt-6"><Button variant="ghost" onClick={() => setSent(null)}>Send another</Button><Button onClick={onClose}>Done</Button></div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[13px] text-muted">Complaints, suggestions and feedback all reach the Sebastian team directly.</p>
          <div role="radiogroup" aria-label="What is this about?" className="grid grid-cols-2 gap-2">
            {TYPES.map((t) => (
              <button key={t.k} type="button" role="radio" aria-checked={type === t.k} onClick={() => setType(t.k)}
                className={cx("rounded-2xl border p-3 text-left transition-colors", type === t.k ? "border-gold bg-gold-soft/40" : "border-line hover:border-cream-line")}>
                <t.icon className="w-4 h-4 text-gold" aria-hidden /><span className="block text-[13.5px] font-medium mt-1">{t.k}</span><span className="block text-[11.5px] text-muted">{t.hint}</span>
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Your name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" /></Field>
            <Field label="Email for our reply *"><input type="email" className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" /></Field>
          </div>
          <Field label="Subject"><input className={inputCls} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder={type === "Report a problem" ? "e.g. The map won't load on the Travel page" : "In a few words"} /></Field>
          <Field label="Message *"><textarea className={textareaCls + " min-h-[140px]"} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder={type === "Report a problem" ? "What happened, what you expected, and the steps to make it happen again." : "Tell us more"} /></Field>
          {/* Hidden from people; spam bots fill it in. */}
          <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />
          <label className="flex items-start gap-2 text-[12.5px] text-muted"><input type="checkbox" className="mt-0.5 w-4 h-4 accent-ink" checked={device} onChange={(e) => setDevice(e.target.checked)} />Include my browser and device details (helps us fix problems)</label>
          {err && <Notice tone="warning">{err}</Notice>}
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={send} loading={busy} disabled={f.message.trim().length < 10 || !f.email.trim()}><Send className="w-4 h-4" />Send message</Button></div>
        </div>
      )}
    </Modal>
  );
}
