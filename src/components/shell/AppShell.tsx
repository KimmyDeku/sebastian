"use client";
import { useEffect } from "react";
import { Menu, PanelLeftClose } from "lucide-react";
import { useUI } from "@/lib/ui";
import { recordLinkOpens, recordSaves } from "@/lib/activity";
import { refreshMemory } from "@/lib/memory";
import { startUsageTracking } from "@/lib/usage";
import { syncPush, enablePush } from "@/lib/push";
import { moveServiceWorker } from "@/lib/notify";
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
import { WhatsNew } from "../WhatsNew";
import { ClashDialog } from "../schedule/ClashDialog";
import { BriefingPrompt } from "../briefing/BriefingPrompt";
import { briefingJob } from "@/lib/briefing";
import { TaskDock } from "../agent/TaskDock";
import { AgentEngine } from "../agent/AgentEngine";
import { routineJobs } from "@/lib/routines";
import { recJob } from "@/lib/recommend";
import { wipeNotebookData } from "@/lib/wipeNotebook";
import { identify, track } from "@/lib/analytics";
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
  // Analytics: a sign-up or log-in (once per visit), with a random account id (never an email or name).
  useEffect(() => {
    if (!session || !acc) return;
    try { if (sessionStorage.getItem("sebastian-ga-session") === session) return; sessionStorage.setItem("sebastian-ga-session", session); } catch {}
    const t = setTimeout(() => {
      identify(session, { plan: (prefs as any)?.plan || "silver" });
      track(Date.now() - new Date((acc as any).createdAt || 0).getTime() < 10 * 60000 ? "sign_up" : "login");
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);
  // Notebook has been removed: permanently delete its old data (runs once; nothing to do afterwards).
  useEffect(() => { if (hydrated) wipeNotebookData(); }, [hydrated]);

  // Keep this device's push reminders in step with the schedule (times only).
  const schedule = useStore((s) => (s.sessionId ? s.data[s.sessionId]?.schedule : undefined));
  const prefs = useStore((s) => (s.sessionId ? s.data[s.sessionId]?.prefs : undefined));
  const routines = useStore((s) => (s.sessionId ? (s.data[s.sessionId] as any)?.routines : undefined));
  const briefingCfg = useStore((s) => (s.sessionId ? (s.data[s.sessionId] as any)?.briefingSettings : undefined));
  useEffect(() => {
    if (!schedule) return;
    const t = setTimeout(() => syncPush(schedule, prefs?.notifications !== false, [...routineJobs(routines || []), recJob(), ...briefingJob()]), 2500);
    return () => clearTimeout(t);
  }, [schedule, routines, briefingCfg, prefs?.notifications]);

  // Pushify now uses the site root; move Sebastian's own notifications to /sebastian/ (once).
  useEffect(() => {
    if (!session) return;
    const t = setTimeout(() => moveServiceWorker(() => enablePush(alertPhrase(acc, prefs?.useTitle !== false))), 3000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

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
    // Visitors who aren't signed in see the landing page first; other pages go to log in.
    if (hydrated && !session) router.replace(path === "/" ? "/welcome" : `/login?next=${encodeURIComponent(path)}`);
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
      <WhatsNew />
      <ClashDialog />
      <BriefingPrompt />
      <AgentEngine />
      <TaskDock />
      <VoiceLauncher />
      <VoiceAgent />
      <OfflineWatcher />
    </div>
  );
}
