"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, Mic, UtensilsCrossed, BedDouble, Plane, Compass, CalendarDays, BarChart3, Shirt, Newspaper, Mail, BookOpen, BellRing, History, Settings, ShieldCheck, Brain, Volume2, VolumeX, ArrowRight, ArrowLeft, Sparkles, Feather } from "lucide-react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { SebastianMark } from "./SebastianMark";
import { actions, useAccount, useData } from "@/lib/store";
import { formOfAddress } from "@/lib/address";
import { useSpeaker } from "@/lib/voice";
import { translateText } from "@/lib/translator";
import { cx } from "@/lib/util";

export const openTour = () => window.dispatchEvent(new Event("sebastian-tour"));

const SUITES = [
  [UtensilsCrossed, "Recipes", "/recipes"], [BedDouble, "Booking", "/booking"], [Plane, "Travel", "/travel"], [Compass, "Discover", "/discover"], [CalendarDays, "Schedule", "/schedule"],
  [BarChart3, "Finance", "/finance"], [Shirt, "Fashion", "/fashion"], [Newspaper, "News", "/news"], [Mail, "Email", "/email"], [BookOpen, "Notebook", "/notebook"],
] as const;

/** A short, narrated welcome tour shown the first time someone uses Sebastian. */
export function Onboarding() {
  const acc = useAccount();
  const d = useData();
  const path = usePathname();
  const { speak, cancel, speaking } = useSpeaker();
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [voice, setVoice] = useState(true);
  const spoken = useRef(-1);
  const who = formOfAddress(acc, d.prefs) || acc?.firstName || "";
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const steps = [
    { title: `${greet}${who ? `, ${who}` : ""}`, say: `${greet}${who ? `, ${who}` : ""}. I am Sebastian, your personal concierge. Allow me a moment to show you around.`,
      body: <div className="text-center"><div className="inline-flex"><SebastianMark size={72} state={speaking ? "speaking" : "idle"} /></div><p className="text-[15px] mt-4 leading-relaxed">I&apos;m Sebastian, your personal concierge. Allow me a moment to show you around. It takes less than a minute.</p></div> },
    { title: "Simply ask", say: "Type or speak to me from the home page or the chat. The round button at the bottom right is my Voice Concierge, for completely hands-free help.",
      body: <div className="space-y-3">{[[MessageCircle, "Type to me", "On the home page or in Chat, ask for anything in your own words."], [Mic, "Or speak", "Tap the round button at the bottom right for the Voice Concierge, fully hands-free."]].map(([I, t, s]: any) => <div key={t} className="flex gap-3 rounded-2xl border border-line p-3"><span className="w-10 h-10 rounded-xl bg-cream inline-flex items-center justify-center shrink-0"><I className="w-5 h-5 text-gold" /></span><span><span className="block text-[14px] font-medium">{t}</span><span className="block text-[13px] text-muted">{s}</span></span></div>)}</div> },
    { title: "Everything in one place", say: "Each suite looks after one part of your life: recipes, bookings, travel, nearby services, your schedule, finances, style, the news, email and your notebook for study and work.",
      body: <div><div className="grid grid-cols-5 gap-2">{SUITES.map(([I, l, h]) => <Link key={l} href={h} onClick={() => setOpen(false)} className="rounded-xl border border-line p-2 text-center hover:border-cream-line"><I className="w-5 h-5 text-gold mx-auto" /><span className="block text-[10.5px] mt-1">{l}</span></Link>)}</div><p className="text-[13px] text-muted mt-3">Each suite looks after one part of life. You&apos;ll find them in the menu on the left (or the menu button on a phone).</p></div> },
    { title: "Your calendar, kept for you", say: "Tell me your week or month, by voice or in writing, and I will arrange your calendar, add it to Google Calendar if you wish, and remind you discreetly, without ever reading private details aloud.",
      body: <div className="space-y-3">{[[Feather, "Schedule my week", "Say or type what's coming up; I arrange it on your calendar and, if you like, in Google Calendar."], [BellRing, "Discreet reminders", "I'll alert you before each appointment, never reading the details aloud."]].map(([I, t, s]: any) => <div key={t} className="flex gap-3 rounded-2xl border border-line p-3"><span className="w-10 h-10 rounded-xl bg-cream inline-flex items-center justify-center shrink-0"><I className="w-5 h-5 text-gold" /></span><span><span className="block text-[14px] font-medium">{t}</span><span className="block text-[13px] text-muted">{s}</span></span></div>)}</div> },
    { title: "Your information, in your hands", say: "Your chats and activity are kept under History. In Settings you can see your details, what I remember about you, your plan and your privacy choices, and contact us. You are always in control.",
      body: <div className="grid grid-cols-2 gap-2">{[[History, "History", "Your chats and activity", "/history"], [Settings, "Settings", "Your details, plan and preferences", "/settings"], [Brain, "Memory", "What I remember, and how to change it", "/settings"], [ShieldCheck, "Privacy", "Your choices and the privacy policy", "/privacy"]].map(([I, t, s, h]: any) => <Link key={t} href={h} onClick={() => setOpen(false)} className="rounded-2xl border border-line p-3 hover:border-cream-line"><I className="w-5 h-5 text-gold" /><span className="block text-[13.5px] font-medium mt-1.5">{t}</span><span className="block text-[12px] text-muted">{s}</span></Link>)}</div> },
    { title: "At your service", say: "That is all. Whenever you are ready, simply ask. You can watch this tour again in Settings, under Support.",
      body: <div className="text-center"><Sparkles className="w-10 h-10 text-gold mx-auto" /><p className="text-[15px] mt-3 leading-relaxed">That&apos;s all. Whenever you&apos;re ready, simply ask.</p><p className="text-[12.5px] text-muted mt-2">You can watch this tour again in Settings, under Support.</p></div> },
  ];

  // First visit on this account: open the tour (not on the privacy page).
  useEffect(() => {
    if (!acc || d.prefs.onboarded || path.startsWith("/privacy")) return;
    const t = setTimeout(() => { setI(0); spoken.current = -1; setOpen(true); }, 700);
    return () => clearTimeout(t);
  }, [acc?.id, d.prefs.onboarded]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const f = () => { setI(0); spoken.current = -1; setOpen(true); }; window.addEventListener("sebastian-tour", f); return () => window.removeEventListener("sebastian-tour", f); }, []);

  // Narration: speak each step once (browsers only allow speech after the first tap).
  useEffect(() => {
    if (!open || !voice || spoken.current === i) return;
    const go = async () => { spoken.current = i; speak(await translateText(steps[i].say), d.prefs.voiceName); };
    if ((navigator as any).userActivation?.hasBeenActive) go();
    else { const once = () => { window.removeEventListener("pointerdown", once); go(); }; window.addEventListener("pointerdown", once); return () => window.removeEventListener("pointerdown", once); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, i, voice]);

  const finish = () => { cancel(); setOpen(false); actions.setPrefs({ onboarded: true }); };
  const next = () => { cancel(); if (i < steps.length - 1) setI(i + 1); else finish(); };
  const back = () => { cancel(); setI(Math.max(0, i - 1)); };
  if (!open) return null;
  const s = steps[i];

  return (
    <Modal open onClose={finish} title={s.title}>
      <div onKeyDown={(e) => { if (e.key === "ArrowRight") next(); if (e.key === "ArrowLeft") back(); }}>
        <div className="min-h-[220px] animate-fadeUp" key={i}>{s.body}</div>
        <div className="flex items-center justify-center gap-1.5 mt-5" aria-label={`Step ${i + 1} of ${steps.length}`}>
          {steps.map((_, k) => <button key={k} onClick={() => { cancel(); setI(k); }} aria-label={`Go to step ${k + 1}`} className={cx("rounded-full transition-all", k === i ? "w-6 h-2 bg-gold" : "w-2 h-2 bg-line hover:bg-cream-line")} />)}
        </div>
        <div className="flex items-center justify-between gap-2 mt-5">
          <div className="flex items-center gap-1">
            <button onClick={() => { if (voice) cancel(); else spoken.current = -1; setVoice(!voice); }} aria-label={voice ? "Mute Sebastian's narration" : "Turn narration on"} className="w-10 h-10 rounded-full hover:bg-cream inline-flex items-center justify-center text-muted">{voice ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}</button>
            {i < steps.length - 1 && <Button variant="ghost" size="sm" onClick={finish}>Skip tour</Button>}
          </div>
          <div className="flex gap-2">
            {i > 0 && <Button variant="outline" onClick={back} aria-label="Previous step"><ArrowLeft className="w-4 h-4" /></Button>}
            {i === steps.length - 1
              ? <><Button variant="outline" onClick={finish}>Explore on my own</Button><Button href="/chat?new=1" onClick={finish}>Start a chat</Button></>
              : <Button onClick={next}>{i === 0 ? "Show me" : "Next"}<ArrowRight className="w-4 h-4" /></Button>}
          </div>
        </div>
      </div>
    </Modal>
  );
}
