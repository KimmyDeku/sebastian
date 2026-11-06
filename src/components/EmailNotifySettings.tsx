"use client";
import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { useEmailPrefs, setEmailPrefs, emailNow, syncEmailJobs } from "@/lib/emailNotify";
import { useAccount } from "@/lib/store";
import { toast } from "./ui/Toast";
import { cx } from "@/lib/util";

const KINDS: [keyof ReturnType<typeof useEmailPrefs>, string, string][] = [
  ["reminders", "Reminders", "Plans, payments 3 days before, medication, bills and follow-ups"],
  ["briefing", "Daily briefing", "The full briefing and what to focus on"],
  ["finds", "Things Sebastian finds for you", "Suggestions and news that match what you like"],
  ["needs", "Things that need you", "Clashes, payments due today and approvals"],
];

/** Email notifications in Settings: on or off, which kinds, and a test email. */
export function EmailNotifySettings() {
  const p = useEmailPrefs(); const acc = useAccount();
  const [busy, setBusy] = useState(false);
  const test = async () => {
    setBusy(true);
    const r = await emailNow("test", "test", "A test email from Sebastian", { title: "Your emails are working", intro: "This is how Sebastian's reminders, briefings and finds will reach your inbox.", url: "/settings", button: "Open Sebastian" });
    setBusy(false);
    if (r.ok) { toast.success(`Test email sent to ${r.to || "your address"}. Check your inbox (and spam folder, the first time).`); syncEmailJobs().catch(() => {}); }
    else toast.error(r.error || "The test email couldn't be sent.");
  };
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl bg-cream inline-flex items-center justify-center shrink-0"><Mail className="w-4 h-4 text-gold" aria-hidden /></span>
        <div className="flex-1">
          <p className="text-sm font-medium">Email notifications</p>
          <p className="text-[12.5px] text-muted">Sebastian also emails {acc?.email ? <b className="font-medium">{acc.email}</b> : "you"}, alongside push notifications. Unlike push notifications, emails include the details.</p>
        </div>
        <button role="switch" aria-checked={p.enabled} aria-label="Email notifications" onClick={() => setEmailPrefs({ enabled: !p.enabled })} className={cx("w-11 h-6 rounded-full relative transition-colors shrink-0", p.enabled ? "bg-ink" : "bg-line")}>
          <span className={cx("absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all", p.enabled ? "left-[22px]" : "left-0.5")} />
        </button>
      </div>
      {p.enabled && (
        <>
          <div className="mt-3 space-y-2 pl-12">
            {KINDS.map(([k, label, desc]) => (
              <label key={k} className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={!!p[k]} onChange={(e) => setEmailPrefs({ [k]: e.target.checked } as any)} className="mt-1 w-4 h-4 accent-[#1C1B19]" />
                <span><span className="block text-[13px]">{label}</span><span className="block text-[11.5px] text-muted">{desc}</span></span>
              </label>
            ))}
          </div>
          <div className="pl-12 mt-3 flex flex-wrap items-center gap-3">
            <button onClick={test} disabled={busy} className="h-9 px-4 rounded-pill border border-line text-[12.5px] inline-flex items-center gap-1.5 hover:bg-cream/60 disabled:opacity-60">{busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Send me a test email</button>
            <span className="text-[11.5px] text-muted">Water and movement reminders stay as push notifications only.</span>
          </div>
        </>
      )}
    </div>
  );
}
