"use client";
import { useBriefingSettings, setBriefingSettings, nextBriefing } from "@/lib/briefing";
import { cx } from "@/lib/util";

/** On/off, time and days for the daily briefing (used in Settings and the set-up pop-up). */
export function BriefingControls({ compact = false }: { compact?: boolean }) {
  const s = useBriefingSettings();
  const next = nextBriefing(s);
  return (
    <div className="space-y-4">
      {!compact && (
        <label className="flex items-start gap-3 cursor-pointer">
          <button role="switch" aria-checked={s.enabled} onClick={() => setBriefingSettings({ enabled: !s.enabled, asked: true })} className={cx("mt-0.5 w-11 h-6 rounded-full relative transition-colors shrink-0", s.enabled ? "bg-ink" : "bg-line")}>
            <span className={cx("absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all", s.enabled ? "left-[22px]" : "left-0.5")} />
          </button>
          <span><span className="block text-sm font-medium">Daily briefing</span><span className="block text-[12.5px] text-muted">Sebastian wakes up at this time, checks your follow-ups, plans, payments and the news you care about, and reads you the highlights.</span></span>
        </label>
      )}
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <label className="block"><span className="text-[12px] text-muted">Time</span>
          <input type="time" value={s.time} onChange={(e) => setBriefingSettings({ time: e.target.value || "07:30", asked: true })} className="mt-1 w-full h-11 px-3 rounded-xl border border-line bg-canvas text-base md:text-[14px] outline-none focus:border-gold" /></label>
        <label className="block"><span className="text-[12px] text-muted">Days</span>
          <select value={s.days} onChange={(e) => setBriefingSettings({ days: e.target.value as any, asked: true })} className="mt-1 w-full h-11 px-3 rounded-xl border border-line bg-canvas text-base md:text-[14px] outline-none focus:border-gold">
            <option value="every">Every day</option><option value="weekdays">Weekdays only</option></select></label>
      </div>
      {!compact && s.enabled && next && <p className="text-[12px] text-muted">Next briefing: {next.toLocaleString("en-GB", { weekday: "long", hour: "2-digit", minute: "2-digit" })}.</p>}
    </div>
  );
}
