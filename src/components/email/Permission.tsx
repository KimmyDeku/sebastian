"use client";
import { useState } from "react";
import { ShieldCheck, Send, Inbox } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { gmailToken, googleEmail, patchEmail } from "@/lib/gmail";
import { toast } from "../ui/Toast";

const COPY = {
  send: { title: "Allow Sebastian to send email", icon: Send, body: "Sebastian needs permission to send emails from your Gmail account. Sebastian will still show you every email and ask you to confirm before anything is sent.", button: "Allow sending" },
  read: { title: "Allow Sebastian to read your Gmail", icon: Inbox, body: "Sebastian needs permission to read your Gmail so it can summarise your inbox, read important emails aloud, draft replies and check whether people have replied before a follow-up reminder. Sebastian can read but never delete or change your email.", button: "Allow reading" },
};

/** Explains what access is requested, then asks Google for it. */
export async function grantGmail(kind: "send" | "read" | "calendar") {
  const token = await gmailToken(kind, true);
  const address = await googleEmail(token).catch(() => undefined);
  const flag = kind === "send" ? { allowSend: true } : kind === "read" ? { allowRead: true } : { allowCalendar: true };
  patchEmail((e) => ({ ...e, ...flag, address: address || e.address }));
  return address;
}

export function GmailPermission({ kind, open, onClose, onGranted }: { kind: "send" | "read"; open: boolean; onClose: () => void; onGranted: () => void }) {
  const [busy, setBusy] = useState(false);
  const c = COPY[kind];
  return (
    <Modal open={open} onClose={onClose} title={c.title}>
      <div className="space-y-4">
        <div className="flex gap-3"><span className="w-10 h-10 rounded-xl bg-cream inline-flex items-center justify-center shrink-0"><c.icon className="w-5 h-5 text-gold" aria-hidden /></span><p className="text-sm leading-relaxed">{c.body}</p></div>
        <p className="text-[12.5px] text-muted inline-flex gap-1.5"><ShieldCheck className="w-4 h-4 text-success shrink-0" />Google will show exactly what&apos;s being allowed. You can turn this off in Settings, or remove access at any time at myaccount.google.com/permissions.</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Not now</Button>
          <Button loading={busy} onClick={async () => { setBusy(true); try { await grantGmail(kind); onGranted(); } catch (e: any) { toast.error(e?.message || "Gmail permission wasn't granted."); } setBusy(false); }}>{c.button}</Button>
        </div>
      </div>
    </Modal>
  );
}
