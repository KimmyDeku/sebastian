"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cx } from "@/lib/util";

/*
 * Two-month date picker (one month on narrow screens). The layout uses inline styles
 * so it always renders as a proper calendar grid.
 */
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const nice = (s: string) => parse(s).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const GRID7: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))" };
const GOLD = "#B8823A";

function Month({ year, month, start, end, hover, min, onPick, onHover }: {
  year: number; month: number; start: string; end: string; hover: string; min: string; onPick: (d: string) => void; onHover: (d: string) => void;
}) {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const rangeEnd = end || (start && hover && hover > start ? hover : "");
  return (
    <div style={{ minWidth: 0 }}>
      <p style={{ textAlign: "center", fontWeight: 600, fontSize: 15, marginBottom: 14 }}>{first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
      <div style={{ ...GRID7, textAlign: "center", fontSize: 12.5, marginBottom: 6 }} className="text-muted">{WEEK.map((w) => <span key={w} style={{ padding: "6px 0" }}>{w}</span>)}</div>
      <div style={{ ...GRID7, rowGap: 4 }}>
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const key = `${year}-${pad(month + 1)}-${pad(d)}`;
          const disabled = key < min;
          const isStart = key === start;
          const isEnd = !!rangeEnd && key === rangeEnd;
          const inRange = !!start && !!rangeEnd && key > start && key < rangeEnd;
          const picked = isStart || isEnd;
          const joinRight = isStart && !!rangeEnd && rangeEnd !== start;
          const joinLeft = isEnd && !!start;
          const radius = picked ? `${joinLeft ? 0 : 8}px ${joinRight ? 0 : 8}px ${joinRight ? 0 : 8}px ${joinLeft ? 0 : 8}px` : inRange ? "0" : "8px";
          return (
            <button key={i} type="button" disabled={disabled} onClick={() => onPick(key)} onMouseEnter={() => onHover(key)}
              aria-label={parse(key).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              aria-pressed={picked}
              style={{ height: 44, fontSize: 14, borderRadius: radius, background: picked ? GOLD : undefined, color: picked ? "#fff" : undefined, fontWeight: picked ? 600 : key === min ? 600 : 400 }}
              className={cx("transition-colors", disabled ? "text-muted-soft opacity-50 cursor-not-allowed" : !picked && "hover:bg-cream-deep", inRange && "bg-cream", !picked && key === min && "text-gold-deep underline underline-offset-4 decoration-gold")}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Click check-in, then check-out. Set `single` to choose one date. */
export function DateRangePicker({ start, end, onChange, label = "Check-in — Check-out", startText = "Check-in date", endText = "Check-out date", single = false }: {
  start: string; end: string; onChange: (start: string, end: string) => void; label?: string; startText?: string; endText?: string; single?: boolean;
}) {
  const today = ymd(new Date());
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState("");
  const base = start ? parse(start) : new Date();
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() });
  const [box, setBox] = useState<{ width: number; left: number; twoUp: boolean }>({ width: 680, left: 0, twoUp: true });
  const ref = useRef<HTMLDivElement>(null);

  // Two months side by side when there's room; keep the pop-up inside the screen.
  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const place = () => {
      const r = ref.current!.getBoundingClientRect();
      const vw = window.innerWidth;
      const twoUp = vw >= 720;
      const width = Math.min(twoUp ? 680 : 360, vw - 24);
      let left = 0;
      if (r.left + width > vw - 12) left = vw - 12 - width - r.left;
      if (r.left + left < 12) left = 12 - r.left;
      setBox({ width, left, twoUp });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", click); document.removeEventListener("keydown", key); };
  }, [open]);

  const pick = (d: string) => {
    if (single) { onChange(d, ""); setOpen(false); return; }
    if (!start || end || d <= start) { onChange(d, ""); return; }
    onChange(start, d);
    setTimeout(() => setOpen(false), 250);
  };
  const move = (n: number) => setView((v) => { const d = new Date(v.y, v.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const nextMonth = new Date(view.y, view.m + 1, 1);
  const now = new Date();
  const atFirst = view.y === now.getFullYear() && view.m === now.getMonth();
  const nights = start && end ? Math.round((parse(end).getTime() - parse(start).getTime()) / 86400000) : 0;
  const prompt = single ? "Choose a date" : !start || end ? `Choose your ${startText.toLowerCase()}` : `Now choose your ${endText.toLowerCase()}`;
  const arrow: React.CSSProperties = { position: "absolute", top: -4, width: 36, height: 36, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center" };

  return (
    <div ref={ref} className="relative min-w-0" style={{ flex: "1.6 1 0%" }}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="dialog"
        className={cx("w-full h-full text-left flex items-center gap-2.5 bg-paper rounded-xl border px-3", open ? "border-gold" : "border-line")} style={{ minHeight: 48 }}>
        <CalendarDays className="w-4 h-4 text-gold shrink-0" strokeWidth={1.5} aria-hidden />
        <span className="min-w-0">
          <span className="block text-muted" style={{ fontSize: 10.5, lineHeight: 1.2 }}>{label}</span>
          <span className="block truncate" style={{ fontSize: 13 }}>
            <span className={start ? "text-ink" : "text-muted-soft"}>{start ? nice(start) : startText}</span>
            {!single && <><span className="text-muted" style={{ margin: "0 6px" }}>—</span><span className={end ? "text-ink" : "text-muted-soft"}>{end ? nice(end) : endText}</span></>}
          </span>
        </span>
      </button>

      {open && (
        <div role="dialog" aria-label="Choose dates" className="bg-paper border border-line shadow-lift animate-fadeUp"
          style={{ position: "absolute", zIndex: 60, top: "calc(100% + 8px)", left: box.left, width: box.width, borderRadius: 18, padding: "20px 22px 16px" }}>
          <p className="text-muted" style={{ fontSize: 12.5, marginBottom: 14 }} aria-live="polite">{prompt}</p>
          <div style={{ position: "relative" }}>
            <button type="button" onClick={() => move(-1)} disabled={atFirst} aria-label="Previous month" className="hover:bg-cream disabled:opacity-30" style={{ ...arrow, left: -6 }}><ChevronLeft className="w-5 h-5" /></button>
            <button type="button" onClick={() => move(1)} aria-label="Next month" className="hover:bg-cream" style={{ ...arrow, right: -6 }}><ChevronRight className="w-5 h-5" /></button>
            <div style={{ display: "grid", gridTemplateColumns: box.twoUp ? "1fr 1fr" : "1fr", columnGap: 36 }} onMouseLeave={() => setHover("")}>
              <Month year={view.y} month={view.m} start={start} end={end} hover={hover} min={today} onPick={pick} onHover={setHover} />
              {box.twoUp && <Month year={nextMonth.getFullYear()} month={nextMonth.getMonth()} start={start} end={end} hover={hover} min={today} onPick={pick} onHover={setHover} />}
            </div>
          </div>
          <div className="border-t border-line" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 12 }}>
            <span className="text-muted" style={{ fontSize: 12.5 }}>{nights ? `${nights} night${nights > 1 ? "s" : ""}` : ""}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => onChange("", "")} className="text-muted hover:text-ink" style={{ height: 34, padding: "0 12px", fontSize: 13 }}>Clear</button>
              <button type="button" onClick={() => setOpen(false)} className="bg-ink text-white" style={{ height: 34, padding: "0 18px", fontSize: 13, borderRadius: 999 }}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
