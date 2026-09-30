"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus, LogOut, ChevronRight, Trash2 } from "lucide-react";
import { Wordmark } from "../SebastianMark";
import { PRIMARY, SUITES } from "./nav";
import { useData, useStore, actions } from "@/lib/store";
import { cx, relTime } from "@/lib/util";
import { useState } from "react";
import { ConfirmDialog } from "../ui/Modal";
import { useUI } from "@/lib/ui";
import { KIND, useHistory } from "../HistoryItems";
import { deleteActivity } from "@/lib/activity";

export function useUpcomingCount() {
  const d = useData();
  return d.schedule.filter((e) => new Date(e.end || e.start).getTime() >= Date.now() - 3600000).length;
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const router = useRouter();
  const d = useData();
  const history = useHistory();
  const count = useUpcomingCount();
  const [confirmOut, setConfirmOut] = useState(false);
  const active = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));

  return (
    <div className="flex flex-col h-full">
      <Link href="/" onClick={onNavigate} className="px-2 pt-1" aria-label="Sebastian home"><Wordmark /></Link>
      <button onClick={() => { onNavigate?.(); router.push("/chat?new=1"); }} className="mt-7 h-12 w-full rounded-2xl bg-ink text-white inline-flex items-center justify-center gap-2 text-[15px] hover:bg-ink-soft shadow-soft">
        <Plus className="w-5 h-5" aria-hidden /> New chat
      </button>

      <nav aria-label="Main" className="mt-6 space-y-1">
        {PRIMARY.map((n) => (
          <Link key={n.href + n.label} href={n.href} onClick={onNavigate} aria-current={active(n.href) ? "page" : undefined}
            className={cx("flex items-center gap-4 h-12 px-4 rounded-2xl text-[15px] transition-colors", active(n.href) ? "bg-cream text-ink" : "text-ink hover:bg-cream/50")}>
            <n.icon className={cx("w-5 h-5", active(n.href) ? "text-gold" : "text-ink")} strokeWidth={1.6} aria-hidden />
            <span className="flex-1">{n.label}</span>
            {n.badge === "schedule" && count > 0 && <span className="min-w-6 h-6 px-2 rounded-full bg-gold text-white text-[11px] font-medium inline-flex items-center justify-center" aria-label={`${count} scheduled`}>{count}</span>}
          </Link>
        ))}
      </nav>

      <div className="mt-6 pt-5 border-t border-line">
        <p className="px-4 text-[13px] text-muted mb-2">Suites</p>
        <div className="grid grid-cols-2 gap-1">
          {SUITES.filter((s) => !["news", "schedule"].includes(s.key)).map((s) => (
            <Link key={s.key} href={s.href} onClick={onNavigate} aria-current={active(s.href) ? "page" : undefined}
              className={cx("flex items-center gap-2 h-10 px-3 rounded-xl text-[13px]", active(s.href) ? "bg-cream" : "hover:bg-cream/50")}>
              <s.icon className="w-4 h-4 text-gold" strokeWidth={1.6} aria-hidden /> {(s as any).short || s.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-line flex-1 min-h-0">
        <div className="flex items-center justify-between px-4 mb-1"><p className="text-[13px] text-muted">History</p><Link href="/history" onClick={onNavigate} className="text-[12px] text-muted hover:text-ink underline underline-offset-2">View all</Link></div>
        {history.length === 0 && <p className="px-4 py-3 text-[13px] text-muted-soft">Your chats and activity will appear here.</p>}
        <ul className="divide-y divide-line">
          {history.slice(0, 8).map((h) => { const K = KIND[h.kind]; const external = h.href?.startsWith("http"); return (
            <li key={h.id} className="group relative">
              <Link href={h.href || "/history"} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} onClick={onNavigate} className="flex items-center gap-2.5 px-4 py-3 hover:bg-cream/40 rounded-xl" title={h.title}>
                <K.icon className="w-4 h-4 text-gold shrink-0" aria-hidden />
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-[14px]">{h.title}</span>
                  <span className="block text-[12px] text-muted">{K.label} · {relTime(h.at)}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-muted group-hover:opacity-0" aria-hidden />
              </Link>
              <button onClick={() => (h.chatId ? actions.deleteChat(h.chatId) : deleteActivity(h.id))} aria-label={`Delete ${h.title}`} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus:opacity-100 w-8 h-8 rounded-full hover:bg-cream inline-flex items-center justify-center text-muted">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>); })}
        </ul>
      </div>
      <ConfirmDialog open={confirmOut} title="Log out of Sebastian?" body="Your data stays saved on this device for when you return." confirmLabel="Log out"
        onCancel={() => setConfirmOut(false)} onConfirm={() => { useStore.getState().logout(); router.replace("/login"); }} />
    </div>
  );
}

export function Sidebar() {
  const open = useUI((s) => s.sidebar);
  if (!open) return null;
  return (
    <aside className="hidden lg:block w-[300px] xl:w-[320px] shrink-0 p-4 xl:p-5">
      <div className="sticky top-4 h-[calc(100vh-2rem)] overflow-y-auto no-scrollbar rounded-[28px] border border-line bg-paper px-5 py-6 shadow-soft">
        <SidebarContent />
      </div>
    </aside>
  );
}
