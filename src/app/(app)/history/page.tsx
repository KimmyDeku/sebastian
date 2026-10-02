"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Trash2, MessageCircle, Activity as ActivityIcon } from "lucide-react";
import { Container, PageHeader } from "@/components/ui/Page";
import { inputCls } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/States";
import { ActivityPanel } from "@/components/ActivityPanel";
import { actions, useData } from "@/lib/store";
import { clearActivity, useActivity } from "@/lib/activity";
import { clearUsage } from "@/lib/usage";
import { relTime, cx } from "@/lib/util";

function Chats() {
  const d = useData();
  const [q, setQ] = useState("");
  const chats = [...d.chats].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .filter((c) => !q.trim() || `${c.title} ${c.messages.map((m) => m.content).join(" ")}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <label className="relative block mb-4"><span className="sr-only">Search your chats</span><Search className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" aria-hidden />
        <input className={inputCls + " pl-11"} placeholder="Search your chats" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      {!chats.length ? <EmptyState title={d.chats.length ? "No chats match" : "No chats yet"} body={d.chats.length ? "Try different words." : "Everything you say to Sebastian is kept here, so you can pick any conversation back up."} action={!d.chats.length ? <Button href="/chat?new=1">Start a chat</Button> : undefined} /> : (
        <ul className="rounded-2xl border border-line bg-paper divide-y divide-line overflow-hidden">
          {chats.map((c) => {
            const said = c.messages.filter((m) => m.role === "user");
            return (
              <li key={c.id} className="group flex items-center">
                <Link href={`/chat?id=${c.id}`} className="flex-1 min-w-0 flex items-center gap-3 px-4 py-3 hover:bg-cream/40">
                  <span className="w-9 h-9 rounded-xl bg-cream inline-flex items-center justify-center shrink-0"><MessageCircle className="w-4 h-4 text-gold" aria-hidden /></span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] truncate">{c.title}</span>
                    <span className="block text-[12px] text-muted truncate">{said.at(-1)?.content || "No messages"}</span>
                  </span>
                  <span className="text-[11.5px] text-muted shrink-0 text-right">{relTime(c.updatedAt)}<span className="block">{said.length} message{said.length === 1 ? "" : "s"}</span></span>
                </Link>
                <button onClick={() => actions.deleteChat(c.id)} aria-label={`Delete chat: ${c.title}`} className="w-9 h-9 mr-2 rounded-full hover:bg-cream inline-flex items-center justify-center text-muted opacity-60 group-hover:opacity-100 shrink-0"><Trash2 className="w-4 h-4" /></button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Inner() {
  const sp = useSearchParams();
  const router = useRouter();
  const d = useData();
  const activity = useActivity();
  const tab = sp.get("tab") === "activity" ? "activity" : "chats";
  const [clear, setClear] = useState(false);
  return (
    <Container narrow>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "History" }]} title="History" subtitle="Your conversations with Sebastian, and your activity in the app." />
      <div className="flex items-center justify-between gap-3 mb-5">
        <div role="tablist" className="inline-grid grid-cols-2 rounded-xl border border-line p-1 bg-canvas">
          {([["chats", "Chat history", MessageCircle], ["activity", "Activity", ActivityIcon]] as const).map(([k, l, I]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => router.replace(`/history?tab=${k}`)} className={cx("h-9 px-4 rounded-lg text-[13px] inline-flex items-center gap-1.5", tab === k ? "bg-paper shadow-soft text-ink" : "text-muted")}><I className="w-4 h-4" />{l}</button>
          ))}
        </div>
        {tab === "activity" && activity.length > 0 && <Button size="sm" variant="ghost" onClick={() => setClear(true)}><Trash2 className="w-4 h-4" />Clear</Button>}
      </div>
      {tab === "chats" ? <Chats /> : (
        <>
          {d.prefs.activityHistory === false && <p className="text-[13px] text-muted mb-4">Activity tracking is switched off. Turn it back on in <Link href="/settings#activity" className="underline">Settings, under Activity</Link>.</p>}
          <ActivityPanel />
        </>
      )}
      <ConfirmDialog open={clear} danger title="Clear your activity?" body="Your list of actions and time spent will be removed. Your chats stay." confirmLabel="Clear activity" onCancel={() => setClear(false)} onConfirm={() => { clearActivity(); clearUsage(); setClear(false); }} />
    </Container>
  );
}
export default function HistoryPage() { return <Suspense><Inner /></Suspense>; }
