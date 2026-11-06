"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, MoveRight } from "lucide-react";
import { useCalendarItems, refreshGoogle, findClashes, timeOf } from "@/lib/clash";
import { googleCalendarReady, type CalItem } from "@/lib/gcal";
import { gmailToken, useEmail } from "@/lib/gmail";
import { toast } from "../ui/Toast";
import { cx } from "@/lib/util";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** A clean black-and-white calendar of everything: Sebastian's plans and Google Calendar's. */
export function MonoCalendar() {
  const items = useCalendarItems();
  const em = useEmail();
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [sel, setSel] = useState(() => new Date());
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(googleCalendarReady()); refreshGoogle().then(() => setReady(googleCalendarReady())); }, []);

  const byDay = useMemo(() => { const m = new Map<string, CalItem[]>(); items.forEach((i) => { const k = key(new Date(i.start)); m.set(k, [...(m.get(k) || []), i]); }); return m; }, [items]);
  const clashIds = useMemo(() => new Set(findClashes(60).flatMap((c) => [c.a.id, c.b.id])), [items]);
  const today = new Date();
  const days = useMemo(() => {
    if (view === "week") { const s = new Date(cursor); s.setDate(s.getDate() - s.getDay()); return Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return d; }); }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1); const s = new Date(first); s.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return d; });
  }, [cursor, view]);
  const step = (n: number) => { const d = new Date(cursor); if (view === "week") d.setDate(d.getDate() + 7 * n); else d.setMonth(d.getMonth() + n); setCursor(d); };
  const reconnect = async () => { try { await gmailToken("calendar"); await refreshGoogle(true); setReady(true); toast.success("Google Calendar is connected."); } catch (e: any) { toast.error(e?.message || "Google Calendar couldn't connect."); } };
  const agenda = (byDay.get(key(sel)) || []).sort((a, b) => a.start.localeCompare(b.start));
  const title = view === "week" ? `${days[0].toLocaleDateString("en-GB", { day: "numeric", month: "short" })} to ${days[6].toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-6 items-start">
      <section aria-label="Calendar" className="rounded-3xl bg-white text-black border-2 border-black p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button onClick={() => step(-1)} aria-label="Previous" className="w-9 h-9 rounded-full hover:bg-black hover:text-white inline-flex items-center justify-center"><ChevronLeft className="w-5 h-5" /></button>
            <h2 className="font-serif text-2xl sm:text-3xl min-w-[11ch] text-center" aria-live="polite">{title}</h2>
            <button onClick={() => step(1)} aria-label="Next" className="w-9 h-9 rounded-full hover:bg-black hover:text-white inline-flex items-center justify-center"><ChevronRight className="w-5 h-5" /></button>
          </div>
          <div className="flex gap-1.5">
            {(["month", "week"] as const).map((v) => <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={cx("h-9 px-4 rounded-full border-2 border-black text-[13px] capitalize", view === v ? "bg-black text-white" : "hover:bg-black/5")}>{v}</button>)}
            <button onClick={() => { setCursor(new Date()); setSel(new Date()); }} className="h-9 px-4 rounded-full border-2 border-black text-[13px] hover:bg-black/5">Today</button>
          </div>
        </div>
        <div className="grid grid-cols-7 mt-5 border-t-2 border-l border-black">
          {DAYS.map((d) => <div key={d} className="py-2 text-center text-[11px] tracking-[.18em] uppercase font-medium border-b-2 border-r border-black">{d}</div>)}
          {days.map((d) => {
            const list = byDay.get(key(d)) || []; const out = view === "month" && d.getMonth() !== cursor.getMonth();
            const isToday = d.toDateString() === today.toDateString(); const isSel = d.toDateString() === sel.toDateString();
            const clash = list.some((i) => clashIds.has(i.id));
            return (
              <button key={key(d)} onClick={() => setSel(d)} aria-pressed={isSel} aria-label={`${d.toDateString()}${list.length ? `, ${list.length} plan${list.length > 1 ? "s" : ""}` : ""}${clash ? ", with a clash" : ""}`}
                className={cx("relative text-left border-b border-r border-black p-1.5 transition-colors", view === "week" ? "min-h-[220px]" : "min-h-[74px] sm:min-h-[96px]", out ? "text-black/30" : "", isSel ? "bg-black/[.06]" : "hover:bg-black/[.03]")}>
                <span className={cx("inline-flex w-7 h-7 items-center justify-center rounded-full text-[13px]", isToday && "bg-black text-white font-medium", isSel && !isToday && "ring-2 ring-black")}>{d.getDate()}</span>
                {clash && <AlertTriangle className="absolute top-2 right-1.5 w-3.5 h-3.5" aria-hidden />}
                <div className="mt-1 space-y-0.5">
                  {list.slice(0, view === "week" ? 8 : 2).map((i) => (
                    <span key={i.id} className={cx("block truncate rounded-[5px] px-1 text-[10.5px] leading-[1.6]", i.source === "google" ? "border border-black" : "bg-black text-white")}>{view === "week" && `${timeOf(i.start)} `}{i.title}</span>
                  ))}
                  {list.length > (view === "week" ? 8 : 2) && <span className="block text-[10px] text-black/60">+{list.length - (view === "week" ? 8 : 2)} more</span>}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-3 text-[11.5px]">
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-black" />Sebastian</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border border-black" />Google Calendar</span>
          <span className="inline-flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />Clash</span>
        </div>
      </section>

      <aside aria-label="Plans for the selected day" className="rounded-3xl bg-white text-black border-2 border-black p-5">
        <p className="text-[11px] tracking-[.18em] uppercase">{sel.toDateString() === today.toDateString() ? "Today" : sel.toLocaleDateString("en-GB", { weekday: "long" })}</p>
        <p className="font-serif text-2xl">{sel.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
        {!agenda.length && <p className="text-[13px] text-black/60 mt-4">Nothing planned. A quiet day.</p>}
        <ul className="mt-4 space-y-2">
          {agenda.map((i) => (
            <li key={i.id} className={cx("rounded-2xl border p-3 flex items-start gap-3", clashIds.has(i.id) ? "border-black border-2" : "border-black/25")}>
              <span className="text-[13px] font-medium tabular-nums w-12 shrink-0">{timeOf(i.start)}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-medium">{i.title}</span>
                <span className="block text-[11.5px] text-black/60">{timeOf(i.start)} to {timeOf(i.end)} · {i.source === "google" ? "Google Calendar" : "Sebastian"}{i.source === "google" && i.canEdit === false ? ` · organised by ${i.organizer || "someone else"}` : ""}{clashIds.has(i.id) ? " · clashes" : ""}</span>
              </span>
              <button onClick={() => window.dispatchEvent(new CustomEvent("sebastian-move", { detail: i }))} className="h-8 px-3 rounded-full border-2 border-black text-[12px] inline-flex items-center gap-1 hover:bg-black hover:text-white shrink-0">Move<MoveRight className="w-3.5 h-3.5" /></button>
            </li>
          ))}
        </ul>
        <div className="mt-5 pt-4 border-t border-black/20 text-[12px] text-black/70">
          {em.allowCalendar ? (ready ? <span className="inline-flex items-center gap-2">Showing Google Calendar too.<button onClick={() => refreshGoogle(true)} className="underline inline-flex items-center gap-1"><RefreshCw className="w-3 h-3" />Refresh</button></span>
            : <button onClick={reconnect} className="h-9 px-4 rounded-full bg-black text-white text-[12.5px] inline-flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" />Reconnect Google Calendar</button>)
            : <>To see your Google Calendar here and catch clashes with it, switch on Google Calendar in <Link href="/apps" className="underline">Your apps</Link>.</>}
        </div>
      </aside>
    </div>
  );
}
