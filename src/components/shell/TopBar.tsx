"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, Menu, X, Settings, LogOut, CalendarDays } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAccount, useData, useStore } from "@/lib/store";
import { SebastianMark } from "../SebastianMark";
import { SidebarContent } from "./Sidebar";
import { fmtDateTime, cx } from "@/lib/util";

function useClickOutside(ref: React.RefObject<HTMLElement>, fn: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && fn();
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ref, fn]);
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const init = name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return <span className="inline-flex items-center justify-center rounded-full bg-cream border border-cream-line font-serif text-gold-deep shrink-0" style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden>{init}</span>;
}

export function TopRight() {
  const acc = useAccount();
  const d = useData();
  const router = useRouter();
  const [bell, setBell] = useState(false);
  const [menu, setMenu] = useState(false);
  const r1 = useRef<HTMLDivElement>(null), r2 = useRef<HTMLDivElement>(null);
  useClickOutside(r1, () => setBell(false));
  useClickOutside(r2, () => setMenu(false));
  const soon = d.schedule.filter((e) => { const t = new Date(e.start).getTime(); return t > Date.now() - 3600000 && t < Date.now() + 7 * 86400000; }).sort((a, b) => a.start.localeCompare(b.start));
  const name = acc ? `${acc.firstName} ${acc.surname}` : "";

  return (
    <div className="flex items-center gap-3 md:gap-5">
      <div ref={r1} className="relative">
        <button onClick={() => setBell(!bell)} aria-label={`Notifications, ${soon.length} upcoming`} aria-expanded={bell} className="relative w-11 h-11 rounded-full hover:bg-cream inline-flex items-center justify-center">
          <Bell className="w-6 h-6" strokeWidth={1.5} />
          {soon.length > 0 && <span className="absolute top-2 right-2.5 w-2.5 h-2.5 rounded-full bg-gold border-2 border-canvas" aria-hidden />}
        </button>
        {bell && (
          <div className="absolute right-0 top-full mt-2 w-[min(88vw,340px)] bg-paper border border-line rounded-2xl shadow-lift p-2 z-50 animate-fadeUp">
            <p className="px-3 pt-2 pb-1 text-xs text-muted">Coming up this week</p>
            {soon.length === 0 && <p className="px-3 py-4 text-sm text-muted">Nothing scheduled. <Link href="/schedule" className="text-ink underline" onClick={() => setBell(false)}>Add something</Link></p>}
            {soon.slice(0, 6).map((e) => (
              <Link key={e.id} href="/schedule" onClick={() => setBell(false)} className="flex gap-3 px-3 py-2.5 rounded-xl hover:bg-cream/60">
                <CalendarDays className="w-4 h-4 text-gold mt-0.5" aria-hidden />
                <span className="min-w-0"><span className="block text-sm truncate">{e.title}</span><span className="block text-xs text-muted">{fmtDateTime(e.start, acc?.timezone)}</span></span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <div ref={r2} className="relative">
        <button onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Account menu" className="flex items-center gap-3 rounded-full hover:bg-cream/60 pr-2">
          <Avatar name={name || "S"} size={46} />
          <span className="hidden md:inline text-[17px]">{name}</span>
          <ChevronDown className="hidden md:inline w-5 h-5" strokeWidth={1.5} aria-hidden />
        </button>
        {menu && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-paper border border-line rounded-2xl shadow-lift p-2 z-50 animate-fadeUp">
            <p className="px-3 py-2 text-xs text-muted truncate">{acc?.email}</p>
            <Link href="/settings" onClick={() => setMenu(false)} className="flex items-center gap-3 px-3 h-10 rounded-xl hover:bg-cream/60 text-sm"><Settings className="w-4 h-4" />Settings</Link>
            <button onClick={() => { useStore.getState().logout(); router.replace("/login"); }} className="w-full flex items-center gap-3 px-3 h-10 rounded-xl hover:bg-cream/60 text-sm"><LogOut className="w-4 h-4" />Log out</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function MobileTop() {
  const [open, setOpen] = useState(false);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; }, [open]);
  return (
    <>
      <div className="lg:hidden sticky top-0 z-40 bg-canvas/90 backdrop-blur border-b border-line/60 flex items-center justify-between px-4 h-16" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="w-10 h-10 -ml-1 rounded-full hover:bg-cream inline-flex items-center justify-center"><Menu className="w-6 h-6" /></button>
          <Link href="/" className="flex items-center gap-2"><SebastianMark size={32} /><span className="font-serif text-xl">Sebastian</span></Link>
        </div>
        <TopRight />
      </div>
      <div className={cx("lg:hidden fixed inset-0 z-[60] transition", open ? "visible" : "invisible")} aria-hidden={!open}>
        <div className={cx("absolute inset-0 bg-ink/30 transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={() => setOpen(false)} />
        <div role="dialog" aria-label="Menu" className={cx("absolute left-0 top-0 bottom-0 w-[86vw] max-w-[340px] bg-paper p-5 overflow-y-auto transition-transform", open ? "translate-x-0" : "-translate-x-full")}>
          <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-4 top-5 w-9 h-9 rounded-full hover:bg-cream inline-flex items-center justify-center"><X className="w-5 h-5" /></button>
          {open && <SidebarContent onNavigate={() => setOpen(false)} />}
        </div>
      </div>
    </>
  );
}
