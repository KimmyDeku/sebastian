"use client";
import { useEffect, useState } from "react";
import { Hourglass, Download, LogOut, MessageSquareText } from "lucide-react";
import { Button } from "./ui/Button";
import { SebastianMark } from "./SebastianMark";
import { ContactForm } from "./ContactForm";
import { useAccount, useData, useStore } from "@/lib/store";
import { formOfAddress } from "@/lib/address";
import { cloudEnabled, supabase } from "@/lib/supabase";
import { trialState, type TrialState } from "@/lib/authFetch";

const DAYS = Number(process.env.NEXT_PUBLIC_TRIAL_DAYS || 0);
const END = process.env.NEXT_PUBLIC_TRIAL_END_DATE || "";

/** Shows the trial countdown, and a closing screen once the trial is over. */
export function TrialGate() {
  const acc = useAccount();
  const d = useData();
  const [t, setT] = useState<TrialState>(trialState());
  const [contact, setContact] = useState(false);
  const active = !!(DAYS || END);

  useEffect(() => {
    if (!active) return;
    const f = (e: Event) => setT({ ...(e as CustomEvent).detail });
    window.addEventListener("sebastian-trial", f);
    // Work out the end date straight away from the account's sign-up date.
    if (cloudEnabled && !trialState().ends && !trialState().exempt) {
      supabase.auth.getUser().then(({ data }: any) => {
        const created = data?.user?.created_at ? new Date(data.user.created_at).getTime() : null;
        if (!created) return;
        const ends = Math.min(DAYS ? created + DAYS * 86400000 : Infinity, END ? new Date(END).getTime() : Infinity);
        setT((x) => (x.ends || x.exempt ? x : { ...x, ends: new Date(ends).toISOString(), ended: x.ended || Date.now() > ends }));
      }).catch(() => {});
    }
    return () => window.removeEventListener("sebastian-trial", f);
  }, [active]);

  if (!active || t.exempt) return null;
  const left = t.ends ? Math.ceil((new Date(t.ends).getTime() - Date.now()) / 86400000) : null;
  const ended = t.ended || (left !== null && left <= 0);
  const who = formOfAddress(acc, d.prefs) || acc?.firstName || "";

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ profile: { ...acc, passwordHash: undefined, salt: undefined }, data: d }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "sebastian-data.json"; a.click();
  };

  if (ended) return (
    <div className="fixed inset-0 z-[90] bg-canvas/95 backdrop-blur-sm flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-labelledby="trial-ended">
      <div className="max-w-md w-full rounded-3xl bg-paper border border-line shadow-lift p-7 text-center">
        <div className="inline-flex"><SebastianMark size={56} /></div>
        <h2 id="trial-ended" className="t-h2 mt-4">Thank you{who ? `, ${who}` : ""}</h2>
        <p className="text-[14px] text-muted mt-3 leading-relaxed">Your free trial of Sebastian has ended. It has been a pleasure to serve you, and your feedback will help shape what comes next.</p>
        <p className="text-[13px] text-muted mt-2">Your information is still safe in your account.</p>
        <div className="flex flex-col gap-2 mt-6">
          <Button onClick={() => setContact(true)}><MessageSquareText className="w-4 h-4" />Send feedback</Button>
          <Button variant="outline" onClick={exportData}><Download className="w-4 h-4" />Download my data</Button>
          <Button variant="ghost" onClick={async () => { try { if (cloudEnabled) await supabase.auth.signOut(); } catch {} useStore.getState().logout(); window.location.href = "/login"; }}><LogOut className="w-4 h-4" />Sign out</Button>
        </div>
      </div>
      <ContactForm open={contact} onClose={() => setContact(false)} />
    </div>
  );

  if (left === null) return null;
  return (
    <div className="fixed z-[45] top-3 left-1/2 -translate-x-1/2 lg:left-auto lg:right-[230px] lg:translate-x-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-pill bg-gold-soft/80 border border-cream-line text-[12px] text-ink shadow-soft" role="status">
      <Hourglass className="w-3.5 h-3.5 text-gold" aria-hidden />Free trial · {left} day{left === 1 ? "" : "s"} left
    </div>
  );
}
