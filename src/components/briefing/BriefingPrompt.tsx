"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sunrise, Play } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { BriefingControls } from "./BriefingControls";
import { useBriefingSettings, setBriefingSettings, useBriefing } from "@/lib/briefing";
import { useAccount, useData } from "@/lib/store";
import { useSpeaker } from "@/lib/voice";
import { WHATS_NEW_VERSION } from "../WhatsNew";

/** Asks once when the user would like their daily briefing, and announces it when it's ready. */
export function BriefingPrompt() {
  const acc = useAccount(); const d = useData();
  const s = useBriefingSettings(); const b = useBriefing();
  const router = useRouter();
  const { speak, cancel, speaking } = useSpeaker();
  const [mode, setMode] = useState<"ask" | "ready" | null>(null);
  // Wait politely while another window is open (the welcome tour, What's new, a clash).
  const whenFree = (fn: () => void) => { const go = () => (document.querySelector('[role="dialog"][aria-modal="true"]') ? setTimeout(go, 2000) : fn()); go(); };

  useEffect(() => {
    if (!acc || !d.prefs.onboarded || (d.prefs as any).whatsNew !== WHATS_NEW_VERSION || s.asked) return;
    const t = setTimeout(() => whenFree(() => setMode((m) => m || "ask")), 2500);
    return () => clearTimeout(t);
  }, [acc?.id, d.prefs.onboarded, (d.prefs as any).whatsNew, s.asked]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const f = () => whenFree(() => setMode("ready")); window.addEventListener("sebastian-briefing-ready", f); return () => window.removeEventListener("sebastian-briefing-ready", f); }, []);

  if (!mode) return null;
  if (mode === "ask") return (
    <Modal open onClose={() => { setBriefingSettings({ asked: true }); setMode(null); }} title="Your daily briefing">
      <div className="flex gap-3 items-start mb-5">
        <span className="w-11 h-11 rounded-2xl bg-cream inline-flex items-center justify-center shrink-0"><Sunrise className="w-5 h-5 text-gold" aria-hidden /></span>
        <p className="text-[14px] text-muted leading-relaxed">At a time you choose, Sebastian will check your follow-ups, today&apos;s plans, payments due and the news you care about, then read you the highlights and the three things to focus on.</p>
      </div>
      <p className="text-[13px] font-medium mb-2">When would you like it?</p>
      <BriefingControls compact />
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="ghost" onClick={() => { setBriefingSettings({ asked: true }); setMode(null); }}>Not now</Button>
        <Button onClick={() => { setBriefingSettings({ enabled: true, asked: true }); setMode(null); }}>Set my briefing</Button>
      </div>
      <p className="text-[11.5px] text-muted mt-3">You can change or switch this off in Settings, under Daily briefing.</p>
    </Modal>
  );
  return (
    <Modal open onClose={() => { cancel(); setMode(null); }} title={b?.greeting || "Your briefing is ready"}>
      <p className="text-[14px] text-muted">Your daily briefing is ready.</p>
      {b?.focus?.length ? <><p className="text-[13px] font-medium mt-4 mb-2">Focus on today</p><ol className="space-y-1.5 list-decimal pl-5 text-[14px]">{b.focus.map((f, i) => <li key={i}>{f}</li>)}</ol></> : null}
      <div className="flex flex-wrap justify-end gap-2 mt-6">
        <Button variant="ghost" onClick={() => { cancel(); setMode(null); router.push("/briefing"); }}>Open briefing</Button>
        <Button onClick={() => (speaking ? cancel() : b && speak(`${b.greeting} ${b.narration}`, d.prefs.voiceName))}><Play className="w-4 h-4" />{speaking ? "Stop" : "Read it to me"}</Button>
      </div>
    </Modal>
  );
}
