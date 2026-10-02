"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ScheduleEvent } from "@/lib/types";
import { cx } from "@/lib/util";

const C = { paper: "#F7EFDD", paper2: "#EFE2C4", ink: "#2B1D14", sepia: "#6E5640", burgundy: "#6B1F2A", gold: "#B08D57", line: "rgba(176,141,87,.45)" };
const KIND_INK: Record<string, string> = { appointment: "#6B1F2A", meeting: "#22325A", reminder: "#2F5233", booking: "#7A4B12", trip: "#7A4B12", other: "#5A2E5E" };
const WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const roman = (n: number) => [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]].reduce((acc, [v, r]) => { while (n >= (v as number)) { acc += r; n -= v as number; } return acc; }, "");
const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function Flourish({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 60 60" className={className} style={style} aria-hidden fill="none" stroke={C.gold} strokeWidth="1.3">
      <path d="M4 56 C4 30 12 14 30 8 C44 4 52 6 56 4" />
      <path d="M8 56 C9 36 16 22 30 15 C40 11 48 11 56 10" opacity=".6" />
      <path d="M14 40 c6 -2 9 -7 7 -12 c-2 -4 -8 -3 -8 2 c0 3 3 4 5 2" />
      <circle cx="30" cy="8" r="1.6" fill={C.gold} />
    </svg>
  );
}

/** A Victorian-styled calendar of the user's schedule (month and week views). */
export function VictorianCalendar({ events, onOpenDay }: { events: ScheduleEvent[]; onOpenDay?: (d: Date) => void }) {
  const today = new Date();
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [picked, setPicked] = useState<Date | null>(today);
  const byDay = useMemo(() => {
    const m = new Map<string, ScheduleEvent[]>();
    [...events].sort((a, b) => a.start.localeCompare(b.start)).forEach((e) => { const k = key(new Date(e.start)); m.set(k, [...(m.get(k) || []), e]); });
    return m;
  }, [events]);

  const days: Date[] = [];
  if (view === "month") {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first); start.setDate(1 - first.getDay());
    for (let i = 0; i < 42; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(d); }
    while (days.length > 35 && days.slice(-7).every((d) => d.getMonth() !== cursor.getMonth())) days.splice(-7);
  } else {
    const start = new Date(cursor); start.setDate(cursor.getDate() - cursor.getDay());
    for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(start.getDate() + i); days.push(d); }
  }
  const move = (n: number) => setCursor((c) => (view === "month" ? new Date(c.getFullYear(), c.getMonth() + n, 1) : new Date(c.getFullYear(), c.getMonth(), c.getDate() + 7 * n)));
  const title = view === "month" ? cursor.toLocaleDateString("en-GB", { month: "long" }) : `${days[0].toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${days[6].toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
  const list = picked ? byDay.get(key(picked)) || [] : [];

  return (
    <section aria-label="Calendar" className="relative rounded-[22px] p-5 md:p-7 overflow-hidden"
      style={{ background: `linear-gradient(160deg, ${C.paper}, ${C.paper2})`, color: C.ink, boxShadow: `inset 0 0 0 1px ${C.line}, inset 0 0 0 6px ${C.paper}, inset 0 0 0 7px ${C.line}, 0 18px 40px -22px rgba(60,35,10,.45)` }}>
      <Flourish className="absolute top-2 left-2 w-12 h-12" />
      <Flourish className="absolute top-2 right-2 w-12 h-12" style={{ transform: "scaleX(-1)" }} />
      <Flourish className="absolute bottom-2 left-2 w-12 h-12" style={{ transform: "scaleY(-1)" }} />
      <Flourish className="absolute bottom-2 right-2 w-12 h-12" style={{ transform: "scale(-1,-1)" }} />

      <header className="relative flex flex-wrap items-center justify-between gap-3 px-2">
        <button onClick={() => move(-1)} aria-label={view === "month" ? "Previous month" : "Previous week"} className="w-9 h-9 rounded-full inline-flex items-center justify-center hover:bg-black/5" style={{ color: C.burgundy }}><ChevronLeft className="w-5 h-5" /></button>
        <div className="text-center flex-1 min-w-[180px]">
          <p className="text-[10.5px] tracking-[.3em] uppercase" style={{ color: C.sepia }}>The Household Calendar</p>
          <h2 className="font-serif text-[28px] md:text-[34px] leading-tight" style={{ color: C.burgundy, fontVariant: "small-caps" }}>{title}</h2>
          <p className="font-serif italic text-[14px]" style={{ color: C.sepia }}>Anno {roman(cursor.getFullYear())}</p>
        </div>
        <button onClick={() => move(1)} aria-label={view === "month" ? "Next month" : "Next week"} className="w-9 h-9 rounded-full inline-flex items-center justify-center hover:bg-black/5" style={{ color: C.burgundy }}><ChevronRight className="w-5 h-5" /></button>
      </header>
      <div className="relative flex justify-center gap-2 mt-3 mb-4">
        {(["month", "week"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className="h-8 px-4 rounded-full font-serif text-[14px] border transition-colors"
            style={view === v ? { background: C.burgundy, color: C.paper, borderColor: C.burgundy } : { borderColor: C.gold, color: C.burgundy }}>{v === "month" ? "Month" : "Week"}</button>
        ))}
        <button onClick={() => { setCursor(new Date(today.getFullYear(), today.getMonth(), today.getDate())); setPicked(today); }} className="h-8 px-4 rounded-full font-serif text-[14px] border" style={{ borderColor: C.gold, color: C.burgundy }}>Today</button>
      </div>

      <div className="relative" style={{ borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
        <div className="grid grid-cols-7">
          {WEEK.map((w) => <div key={w} className="py-2 text-center font-serif text-[13px] md:text-[14px]" style={{ color: C.sepia, fontVariant: "small-caps", letterSpacing: ".06em" }}><abbr title={w} className="no-underline">{w.slice(0, 3)}</abbr></div>)}
        </div>
        <div className="grid grid-cols-7" style={{ borderTop: `1px solid ${C.line}` }}>
          {days.map((d, i) => {
            const evs = byDay.get(key(d)) || [];
            const isToday = key(d) === key(today), out = view === "month" && d.getMonth() !== cursor.getMonth();
            const isPicked = picked && key(d) === key(picked);
            return (
              <button key={i} onClick={() => { setPicked(d); onOpenDay?.(d); }} aria-label={`${d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}${evs.length ? `, ${evs.length} item${evs.length > 1 ? "s" : ""}` : ""}`}
                className={cx("text-left p-1.5 md:p-2 transition-colors hover:bg-black/[.03] align-top", view === "week" ? "min-h-[180px]" : "min-h-[74px] md:min-h-[96px]")}
                style={{ borderRight: (i + 1) % 7 ? `1px solid ${C.line}` : undefined, borderBottom: `1px solid ${C.line}`, opacity: out ? 0.45 : 1, background: isPicked ? "rgba(176,141,87,.12)" : undefined }}>
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full font-serif text-[15px]"
                  style={isToday ? { background: C.burgundy, color: C.paper, boxShadow: `0 0 0 2px ${C.paper}, 0 0 0 3px ${C.gold}` } : { color: C.ink }}>{d.getDate()}</span>
                <span className="mt-1 flex flex-col gap-0.5">
                  {evs.slice(0, view === "week" ? 8 : 3).map((e) => (
                    <span key={e.id} title={`${time(e.start)} ${e.title}`} className={cx("block rounded-sm px-1 py-[1px] font-serif text-[11.5px] md:text-[12.5px]", view === "week" ? "leading-tight" : "truncate")} style={{ color: KIND_INK[e.kind] || C.ink, borderLeft: `2px solid ${KIND_INK[e.kind] || C.gold}`, background: "rgba(255,255,255,.35)" }}>
                      {view === "week" && <span className="block text-[10.5px] opacity-75">{time(e.start)}</span>}{e.title}
                    </span>
                  ))}
                  {evs.length > (view === "week" ? 8 : 3) && <span className="font-serif italic text-[11px]" style={{ color: C.sepia }}>and {evs.length - (view === "week" ? 8 : 3)} more</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {picked && (
        <div className="relative mt-4 px-2">
          <p className="font-serif text-[18px]" style={{ color: C.burgundy }}>{picked.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
          {!list.length ? <p className="font-serif italic text-[14px] mt-1" style={{ color: C.sepia }}>Nothing is arranged for this day.</p> : (
            <ul className="mt-2 space-y-1.5">{list.map((e) => (
              <li key={e.id} className="flex items-baseline gap-3 font-serif text-[15px]"><span className="w-12 shrink-0 text-[13px]" style={{ color: C.sepia }}>{time(e.start)}</span><span style={{ color: KIND_INK[e.kind] || C.ink }}>{e.title}</span>{e.location && <span className="italic text-[13px]" style={{ color: C.sepia }}>· {e.location}</span>}{e.gcalId && <span className="text-[11px] ml-auto" style={{ color: C.sepia }}>In Google Calendar</span>}</li>
            ))}</ul>
          )}
        </div>
      )}
      <p className="relative text-center font-serif italic text-[12px] mt-4" style={{ color: C.sepia }}>
        <span style={{ color: KIND_INK.appointment }}>■</span> Appointments &nbsp; <span style={{ color: KIND_INK.meeting }}>■</span> Meetings &nbsp; <span style={{ color: KIND_INK.reminder }}>■</span> Reminders &nbsp; <span style={{ color: KIND_INK.trip }}>■</span> Travel &nbsp; <span style={{ color: KIND_INK.other }}>■</span> Other
      </p>
    </section>
  );
}
