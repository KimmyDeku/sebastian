"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Trash2, ExternalLink, Clock } from "lucide-react";
import { Option, inputCls } from "./ui/Chip";
import { EmptyState } from "./ui/States";
import { KIND } from "./HistoryItems";
import { useActivity, deleteActivity, type ActivityKind } from "@/lib/activity";
import { useUsage, summarise, fmtDuration, SECTION_NAMES } from "@/lib/usage";
import { cx } from "@/lib/util";

function dayLabel(iso: string) {
  const d = new Date(iso), t = new Date();
  const y = new Date(); y.setDate(t.getDate() - 1);
  if (d.toDateString() === t.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

/** Time spent in the app and every action, newest first. `compact` shows a short version (Settings). */
export function ActivityPanel({ compact = false }: { compact?: boolean }) {
  const usage = useUsage();
  const items = useActivity();
  const sum = useMemo(() => summarise(usage, 7), [usage]);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<ActivityKind | "all">("all");
  const peakDay = Math.max(1, ...sum.perDay.map((d) => d.total));
  const peakSec = Math.max(1, ...sum.topSections.map((s) => s[1]));
  const kinds = useMemo(() => Array.from(new Set(items.map((i) => i.kind))), [items]);
  const shown = items.filter((i) => (kind === "all" || i.kind === kind) && (!q.trim() || `${i.title} ${i.detail || ""}`.toLowerCase().includes(q.toLowerCase())));
  const list = compact ? shown.slice(0, 6) : shown;
  const groups: [string, typeof list][] = [];
  list.forEach((i) => { const l = dayLabel(i.at); const g = groups.find((x) => x[0] === l); if (g) g[1].push(i); else groups.push([l, [i]]); });

  return (
    <div className="space-y-5">
      {/* Time spent */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[["Today", fmtDuration(sum.today)], ["Last 7 days", fmtDuration(sum.total)], ["Daily average", fmtDuration(Math.round(sum.average))], ["Most used", sum.topSections[0] ? SECTION_NAMES[sum.topSections[0][0]] : "—"]].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-canvas border border-line p-3"><p className="text-[11.5px] text-muted">{k}</p><p className="font-serif text-xl mt-0.5">{v}</p></div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-line bg-paper p-4">
          <p className="text-[12.5px] text-muted mb-3 inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Time in Sebastian, last 7 days</p>
          <div className="flex items-end gap-2 h-28" role="img" aria-label="Time spent per day">
            {sum.perDay.map((d) => (
              <div key={d.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end" title={`${d.label}: ${fmtDuration(d.total)}`}>
                <div className="w-full rounded-t-md bg-gold/80" style={{ height: `${Math.max(3, (d.total / peakDay) * 100)}%`, opacity: d.total ? 1 : 0.25 }} />
                <span className="text-[10.5px] text-muted">{d.label}</span>
              </div>
            ))}
          </div>
          {sum.peakText && <p className="text-[12.5px] text-muted mt-3">You&apos;re usually most active {sum.peakText}.</p>}
        </div>
        <div className="rounded-2xl border border-line bg-paper p-4">
          <p className="text-[12.5px] text-muted mb-3">Where your time goes</p>
          {!sum.topSections.length ? <p className="text-[13px] text-muted">Time is counted while Sebastian is open and you&apos;re using it.</p> : (
            <ul className="space-y-2">{sum.topSections.slice(0, 6).map(([s, v]) => (
              <li key={s} className="text-[12.5px]"><span className="flex justify-between"><span>{SECTION_NAMES[s] || s}</span><span className="text-muted">{fmtDuration(v)}</span></span>
                <span className="block h-1.5 rounded-full bg-line mt-1 overflow-hidden"><span className="block h-full bg-gold rounded-full" style={{ width: `${(v / peakSec) * 100}%` }} /></span></li>
            ))}</ul>
          )}
        </div>
      </div>

      {/* Actions */}
      <div>
        <p className="text-sm font-medium mb-2">{compact ? "Recent activity" : "Everything you've done"}</p>
        {!compact && (
          <>
            <label className="relative block mb-3"><span className="sr-only">Search activity</span><Search className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" aria-hidden />
              <input className={inputCls + " pl-11"} placeholder="Search your activity" value={q} onChange={(e) => setQ(e.target.value)} /></label>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-3" role="radiogroup" aria-label="Filter">
              <Option variant="chip" selected={kind === "all"} onClick={() => setKind("all")}>All</Option>
              {kinds.map((k) => <Option key={k} variant="chip" selected={kind === k} onClick={() => setKind(k)}>{KIND[k].label}</Option>)}
            </div>
          </>
        )}
        {!list.length ? <EmptyState title={items.length ? "Nothing matches" : "No activity yet"} body={items.length ? "Try another search or filter." : "Recipes, bookings, trips, finance entries, news you read and more will appear here."} /> : (
          <div className="space-y-4">
            {groups.map(([label, rows]) => (
              <section key={label}>
                {!compact && <h3 className="text-[12.5px] font-medium text-muted mb-2">{label}</h3>}
                <ul className="rounded-2xl border border-line bg-paper divide-y divide-line overflow-hidden">
                  {rows.map((i) => { const K = KIND[i.kind]; const external = i.href?.startsWith("http"); return (
                    <li key={i.id} className="group flex items-center">
                      <Link href={i.href || "#"} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3 hover:bg-cream/40">
                        <span className="w-9 h-9 rounded-xl bg-cream inline-flex items-center justify-center shrink-0"><K.icon className="w-4 h-4 text-gold" aria-hidden /></span>
                        <span className="flex-1 min-w-0"><span className="block text-[14px] truncate">{i.title}</span><span className="block text-[12px] text-muted truncate">{K.label}{i.detail ? ` · ${i.detail}` : ""}</span></span>
                        <span className="text-[11.5px] text-muted shrink-0 inline-flex items-center gap-1">{compact ? dayLabel(i.at) + ", " : ""}{new Date(i.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}{external && <ExternalLink className="w-3 h-3" />}</span>
                      </Link>
                      {!compact && <button onClick={() => deleteActivity(i.id)} aria-label={`Delete ${i.title}`} className={cx("w-9 h-9 mr-2 rounded-full hover:bg-cream inline-flex items-center justify-center text-muted opacity-60 group-hover:opacity-100 shrink-0")}><Trash2 className="w-4 h-4" /></button>}
                    </li>); })}
                </ul>
              </section>
            ))}
          </div>
        )}
        {compact && items.length > 6 && <Link href="/history?tab=activity" className="inline-block mt-3 text-[13px] underline underline-offset-2">See all activity ({items.length})</Link>}
      </div>
    </div>
  );
}
