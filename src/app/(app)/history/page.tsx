"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Trash2, ExternalLink } from "lucide-react";
import { Container, PageHeader } from "@/components/ui/Page";
import { Option, inputCls } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/States";
import { KIND, useHistory } from "@/components/HistoryItems";
import { actions, useData } from "@/lib/store";
import { clearActivity, deleteActivity, type ActivityKind } from "@/lib/activity";
import { cx } from "@/lib/util";

function dayLabel(iso: string) {
  const d = new Date(iso), t = new Date();
  const y = new Date(); y.setDate(t.getDate() - 1);
  if (d.toDateString() === t.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: d.getFullYear() === t.getFullYear() ? undefined : "numeric" });
}

export default function HistoryPage() {
  const d = useData();
  const items = useHistory();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<ActivityKind | "all">("all");
  const [clear, setClear] = useState(false);
  const off = d.prefs.activityHistory === false;
  const kinds = useMemo(() => Array.from(new Set(items.map((i) => i.kind))), [items]);
  const shown = items.filter((i) => (kind === "all" || i.kind === kind) && (!q.trim() || `${i.title} ${i.detail || ""}`.toLowerCase().includes(q.toLowerCase())));
  const groups: [string, typeof shown][] = [];
  shown.forEach((i) => { const l = dayLabel(i.at); const g = groups.find((x) => x[0] === l); if (g) g[1].push(i); else groups.push([l, [i]]); });

  return (
    <Container narrow>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "History" }]} title="History" subtitle="Your chats and everything you've done in Sebastian, kept privately with your account." />
      {off && <p className="text-[13px] text-muted mb-4">Activity history is switched off, so only chats are shown. Turn it back on in <Link href="/settings" className="underline">Settings</Link>, under Privacy & data.</p>}
      <div className="flex gap-2 mb-3">
        <label className="relative flex-1"><span className="sr-only">Search history</span><Search className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" aria-hidden />
          <input className={inputCls + " pl-11"} placeholder="Search your history" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        {items.some((i) => i.kind !== "chat") && <Button variant="outline" onClick={() => setClear(true)}><Trash2 className="w-4 h-4" />Clear activity</Button>}
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 mb-4" role="radiogroup" aria-label="Filter">
        <Option variant="chip" selected={kind === "all"} onClick={() => setKind("all")}>All</Option>
        {kinds.map((k) => <Option key={k} variant="chip" selected={kind === k} onClick={() => setKind(k)}>{KIND[k].label}</Option>)}
      </div>
      {!shown.length ? <EmptyState title={items.length ? "Nothing matches" : "No history yet"} body={items.length ? "Try another search or filter." : "As you chat, read the news, plan trips or draft emails, they'll appear here."} /> : (
        <div className="space-y-6">
          {groups.map(([label, list]) => (
            <section key={label}>
              <h2 className="text-[12.5px] font-medium text-muted mb-2">{label}</h2>
              <ul className="rounded-2xl border border-line bg-paper divide-y divide-line overflow-hidden">
                {list.map((i) => { const K = KIND[i.kind]; const external = i.href?.startsWith("http"); return (
                  <li key={i.id} className="group flex items-center">
                    <Link href={i.href || "#"} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3 hover:bg-cream/40">
                      <span className="w-9 h-9 rounded-xl bg-cream inline-flex items-center justify-center shrink-0"><K.icon className="w-4 h-4 text-gold" aria-hidden /></span>
                      <span className="flex-1 min-w-0"><span className="block text-[14px] truncate">{i.title}</span><span className="block text-[12px] text-muted truncate">{K.label}{i.detail ? ` · ${i.detail}` : ""}</span></span>
                      <span className="text-[11.5px] text-muted shrink-0 inline-flex items-center gap-1">{new Date(i.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}{external && <ExternalLink className="w-3 h-3" />}</span>
                    </Link>
                    <button onClick={() => (i.chatId ? actions.deleteChat(i.chatId) : deleteActivity(i.id))} aria-label={`Delete ${i.title}`} className={cx("w-9 h-9 mr-2 rounded-full hover:bg-cream inline-flex items-center justify-center text-muted opacity-60 group-hover:opacity-100 shrink-0")}><Trash2 className="w-4 h-4" /></button>
                  </li>); })}
              </ul>
            </section>
          ))}
        </div>
      )}
      <ConfirmDialog open={clear} danger title="Clear your activity history?" body="Your chats stay. Everything else in your history (stories opened, recipes, searches, drafts and so on) will be removed." confirmLabel="Clear activity" onCancel={() => setClear(false)} onConfirm={() => { clearActivity(); setClear(false); }} />
    </Container>
  );
}
