"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BellRing, X } from "lucide-react";
import { actions, useAccount, useData } from "@/lib/store";

/** A sticky note of pending reminders, shown when Sebastian opens and whenever a reminder is due. */
export function StickyReminders() {
  const d = useData();
  const acc = useAccount();
  const [hidden, setHidden] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);

  const items = d.prefs.notifications
    ? d.schedule
        .filter((e) => {
          if (e.seen || e.remindMinutes == null) return false;
          const start = new Date(e.start).getTime();
          return e.notified ? start > now - 12 * 3600000 : start > now && start - now < 24 * 3600000;
        })
        .sort((a, b) => a.start.localeCompare(b.start))
    : [];

  const dueCount = items.filter((e) => e.notified).length;
  const last = useRef(dueCount);
  useEffect(() => { if (dueCount > last.current) setHidden(false); last.current = dueCount; }, [dueCount]);

  if (hidden || !items.length) return null;
  const done = () => { items.forEach((e) => actions.updateEvent(e.id, { seen: true })); setHidden(true); };

  return (
    <aside role="status" aria-label="Pending reminders"
      className="fixed z-[55] right-4 top-20 lg:right-10 lg:top-24 w-[min(88vw,290px)] rotate-[0.8deg] rounded-md bg-[#FFF3C4] text-[#3B2F12] shadow-lift animate-fadeUp">
      <span aria-hidden className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-16 h-5 bg-[#F3E3A8]/80 rotate-[-2deg] rounded-sm" />
      <div className="p-4 pt-5">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium inline-flex items-center gap-1.5"><BellRing className="w-4 h-4" aria-hidden />Pending reminders</p>
          <button onClick={() => setHidden(true)} aria-label="Hide for now" className="w-7 h-7 -mr-1 rounded-full hover:bg-black/5 inline-flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
        <ul className="mt-2.5 space-y-2">
          {items.slice(0, 5).map((e) => (
            <li key={e.id} className="text-[13px] leading-snug">
              <span className="block font-serif text-[15px]">{e.title}</span>
              <span className="text-[11.5px] opacity-75">
                {e.notified ? "Due · " : ""}
                {new Date(e.start).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: acc?.timezone })}
              </span>
            </li>
          ))}
        </ul>
        {items.length > 5 && <p className="text-[11.5px] opacity-75 mt-1">and {items.length - 5} more</p>}
        <div className="flex items-center gap-2 mt-3.5">
          <button onClick={done} className="h-8 px-3.5 rounded-pill bg-[#3B2F12] text-[#FFF3C4] text-[12px]">Got it</button>
          <Link href="/schedule" onClick={() => setHidden(true)} className="h-8 px-3 rounded-pill text-[12px] underline underline-offset-2 inline-flex items-center">View schedule</Link>
        </div>
      </div>
    </aside>
  );
}
