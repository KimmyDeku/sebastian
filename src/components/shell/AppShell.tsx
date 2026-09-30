"use client";
import { useEffect } from "react";
import { Menu, PanelLeftClose } from "lucide-react";
import { useUI } from "@/lib/ui";
import { recordLinkOpens, recordSaves } from "@/lib/activity";
import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Sidebar } from "./Sidebar";
import { MobileTop, TopRight } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { OfflineWatcher, ReminderEngine } from "./Reminders";
import { StickyReminders } from "./StickyReminders";
import { BirthdayCelebration } from "./BirthdayCelebration";
import { CloudSync } from "./CloudSync";
import { SebastianMark } from "../SebastianMark";
import { VoiceAgent, VoiceLauncher } from "../voice/VoiceAgent";

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useStore((s) => s.hydrated);
  const session = useStore((s) => s.sessionId);
  const router = useRouter();
  const path = usePathname();
  const { sidebar, setSidebar, init, ready } = useUI();
  useEffect(() => { if (!ready) init(); }, [ready, init]);
  useEffect(() => { recordSaves(); recordLinkOpens(); }, []);

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
      <VoiceLauncher />
      <VoiceAgent />
      <OfflineWatcher />
    </div>
  );
}
