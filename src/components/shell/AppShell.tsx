"use client";
import { useEffect } from "react";
import { Menu, PanelLeftClose } from "lucide-react";
import { useUI } from "@/lib/ui";
import { recordLinkOpens, recordSaves } from "@/lib/activity";
import { refreshMemory } from "@/lib/memory";
import { startUsageTracking } from "@/lib/usage";
import { syncPush } from "@/lib/push";
import { alertPhrase } from "@/lib/alertPhrase";
import { useSpeaker } from "@/lib/voice";
import { useAccount } from "@/lib/store";
import { toast } from "../ui/Toast";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Sidebar } from "./Sidebar";
import { MobileTop, TopRight } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { OfflineWatcher, ReminderEngine } from "./Reminders";
import { StickyReminders } from "./StickyReminders";
import { BirthdayCelebration } from "./BirthdayCelebration";
import { CloudSync } from "./CloudSync";
import { CompanionBridge } from "../CompanionBridge";
import { Onboarding } from "../Onboarding";
import { TrialGate } from "../TrialGate";
import { SebastianMark } from "../SebastianMark";
import { VoiceAgent, VoiceLauncher } from "../voice/VoiceAgent";

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useStore((s) => s.hydrated);
  const session = useStore((s) => s.sessionId);
  const router = useRouter();
  const path = usePathname();
  const { sidebar, setSidebar, init, ready } = useUI();
  useEffect(() => { if (!ready) init(); }, [ready, init]);
  useEffect(() => { recordSaves(); recordLinkOpens(); startUsageTracking(); }, []);

  // Keep this device's push reminders in step with the schedule (times only).
  const schedule = useStore((s) => (s.sessionId ? s.data[s.sessionId]?.schedule : undefined));
  const prefs = useStore((s) => (s.sessionId ? s.data[s.sessionId]?.prefs : undefined));
  useEffect(() => {
    if (!schedule) return;
    const t = setTimeout(() => syncPush(schedule, prefs?.notifications !== false), 2500);
    return () => clearTimeout(t);
  }, [schedule, prefs?.notifications]);

  // Opened from a notification: Sebastian says the alert aloud (never its contents).
  const acc = useAccount();
  const { speak } = useSpeaker();
  useEffect(() => {
    if (!session || typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("alert") !== "1") return;
    const line = alertPhrase(acc, prefs?.useTitle !== false);
    toast.info(line);
    const say = () => speak(line, prefs?.voiceName);
    if ((navigator as any).userActivation?.hasBeenActive) say();
    else { const once = () => { say(); window.removeEventListener("pointerdown", once); }; window.addEventListener("pointerdown", once); }
    window.history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);
  // Sebastian keeps learning quietly: shortly after opening, then every 15 minutes, when there's something new.
  useEffect(() => {
    if (!session) return;
    const first = setTimeout(() => refreshMemory(), 8000);
    const every = setInterval(() => refreshMemory(), 15 * 60000);
    return () => { clearTimeout(first); clearInterval(every); };
  }, [session]);

  useEffect(() => {
    if (hydrated && !session) router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [hydrated, session, router, path]);

  if (!hydrated || !session)
    return (
      <div className="min-h-screen flex items-center justify-center" aria-busy>
        <SebastianMark size={56} state="processing" />
      </div>
    );

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileTop />
        <div className="hidden lg:flex items-center justify-between px-10 pt-7 -mb-4 relative z-30">
          <button onClick={() => setSidebar(!sidebar)} aria-label={sidebar ? "Hide menu" : "Show menu"} aria-expanded={sidebar}
            className="w-11 h-11 rounded-full hover:bg-cream inline-flex items-center justify-center">
            {sidebar ? <PanelLeftClose className="w-5 h-5" strokeWidth={1.6} /> : <Menu className="w-6 h-6" strokeWidth={1.6} />}
          </button>
          <TopRight />
        </div>
        <main id="main" className="flex-1">{children}</main>
        <footer className="text-center text-[11.5px] text-muted-soft px-6 pb-28 lg:pb-8">
          Sebastian can make mistakes, so double-check important information. Confirm your details before any booking, and keep an eye on current weather news.
        </footer>
      </div>
      <BottomNav />
      <ReminderEngine />
      <StickyReminders />
      <BirthdayCelebration />
      <CloudSync />
      <CompanionBridge />
      <Onboarding />
      <TrialGate />
      <VoiceLauncher />
      <VoiceAgent />
      <OfflineWatcher />
    </div>
  );
}
