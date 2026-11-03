"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Repeat, Mail, ListChecks, Mic, Globe, Sparkles, BellRing, ArrowRight } from "lucide-react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { actions, useAccount, useData } from "@/lib/store";
import { formOfAddress } from "@/lib/address";

/** Change this whenever there's something new to announce; everyone sees it once. */
export const WHATS_NEW_VERSION = "2026-11-subscriptions-tasks";

const ITEMS = [
  { icon: Repeat, title: "Track your subscriptions", text: "Netflix, ZESA, insurance, Claude, hosting and more, in Finance. Sebastian adds each payment to your calendar and reminds you 3 days before it's due.", href: "/finance?tab=subs", cta: "Add a subscription" },
  { icon: ListChecks, title: "Give Sebastian a task", text: "Tap Tasks at the bottom of the screen and tell him what you need. He does the groundwork and asks before anything is added, sent, booked or paid.", open: "tasks", cta: "Open Tasks" },
  { icon: Mic, title: "Dictate to Sebastian", text: "Tap the microphone in Tasks and simply say it, for example \"Find a mechanic near Avondale and remind me on Friday\".", open: "tasks", cta: "Try it" },
  { icon: Globe, title: "He opens websites for you", text: "For bills, bookings and sign-ups, Sebastian prepares everything and opens the right website for you to finish. He never enters passwords or card details.", open: "tasks", cta: "Open Tasks" },
  { icon: Mail, title: "Connect your Gmail", text: "In Your apps, let Sebastian read your inbox so he can summarise it, remind you to follow up on emails you've sent, and draft replies.", href: "/apps", cta: "Your apps" },
  { icon: BellRing, title: "Routines and reminders", text: "Water, movement, medication, bills and follow-ups, with discreet reminders, in Schedule.", href: "/schedule", cta: "Set one up" },
  { icon: Sparkles, title: "Picked for you", text: "Recipes, places to visit, things to do and news from your favourite sources, chosen from what Sebastian has learned you enjoy.", href: "/for-you", cta: "See For you" },
];

/** A short "what's new" note for returning users, shown once per update. */
export function WhatsNew() {
  const acc = useAccount();
  const d = useData();
  const [open, setOpen] = useState(false);
  const who = formOfAddress(acc, d.prefs) || acc?.firstName || "";

  useEffect(() => {
    // Returning users only: new users get the welcome tour instead.
    if (!acc || !d.prefs.onboarded || (d.prefs as any).whatsNew === WHATS_NEW_VERSION) return;
    const t = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(t);
  }, [acc?.id, d.prefs.onboarded, (d.prefs as any).whatsNew]); // eslint-disable-line react-hooks/exhaustive-deps

  const done = () => { setOpen(false); actions.setPrefs({ whatsNew: WHATS_NEW_VERSION } as any); };
  if (!open) return null;
  return (
    <Modal open onClose={done} title={`What's new${who ? `, ${who}` : ""}`}>
      <p className="text-[13.5px] text-muted -mt-1 mb-4">A few new ways Sebastian can look after you.</p>
      <ul className="space-y-2.5 max-h-[58vh] overflow-y-auto pr-1">
        {ITEMS.map((it) => (
          <li key={it.title} className="flex gap-3 rounded-2xl border border-line p-3">
            <span className="w-10 h-10 rounded-xl bg-cream inline-flex items-center justify-center shrink-0"><it.icon className="w-5 h-5 text-gold" aria-hidden /></span>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium">{it.title}</p>
              <p className="text-[12.5px] text-muted mt-0.5 leading-relaxed">{it.text}</p>
              {it.href
                ? <Link href={it.href} onClick={done} className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-medium underline underline-offset-2">{it.cta}<ArrowRight className="w-3.5 h-3.5" /></Link>
                : <button onClick={() => { done(); window.dispatchEvent(new Event("sebastian-open-tasks")); }} className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-medium underline underline-offset-2">{it.cta}<ArrowRight className="w-3.5 h-3.5" /></button>}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex justify-end mt-4"><Button onClick={done}>Got it</Button></div>
    </Modal>
  );
}
