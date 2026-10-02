"use client";
import { useEffect, useRef, useState } from "react";
import { Puzzle, ExternalLink, Check, Clock, X } from "lucide-react";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { useAccount, useData, useStore } from "@/lib/store";
import { useCompanion, patchCompanion, openUnfinished, type Unfinished } from "@/lib/companion";
import { logActivity } from "@/lib/activity";
import { formOfAddress } from "@/lib/address";
import { toast } from "./ui/Toast";

/** Talks to the Sebastian Companion browser extension (with the user's approval) and shows unfinished tasks at log-in. */
export function CompanionBridge() {
  const acc = useAccount();
  const d = useData();
  const c = useCompanion();
  const [ask, setAsk] = useState(false);
  const [remind, setRemind] = useState(false);
  const pendingHello = useRef<any>(null);

  const accept = (hello: any) => {
    const items: Unfinished[] = (hello.items || []).map((i: any) => ({ id: `b_${i.id}`, title: String(i.title || i.url || "Untitled").slice(0, 200), url: i.url, note: i.note || undefined, source: "browser" as const, at: i.at || new Date().toISOString(), status: "open" as const }));
    patchCompanion((x) => {
      const known = new Set(x.items.map((i) => i.id));
      return { ...x, lastSeen: new Date().toISOString(), version: hello.version, items: [...items.filter((i) => !known.has(i.id)), ...x.items].slice(0, 300), openTabs: (hello.openTabs || []).slice(0, 30), openTabsAt: hello.openTabsAt || x.openTabsAt };
    });
    items.forEach((i) => logActivity({ kind: "link", title: `Saved as unfinished: ${i.title.slice(0, 60)}`, href: i.url }));
    window.postMessage({ source: "sebastian-app", type: "ack", ids: (hello.items || []).map((i: any) => i.id) }, window.location.origin);
  };

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== window || e.data?.source !== "sebastian-companion" || e.data.type !== "hello") return;
      const allowed = (useStore.getState().data[useStore.getState().sessionId!] as any)?.companion?.allowed;
      if (allowed === true) accept(e.data);
      else if (allowed == null) { pendingHello.current = e.data; setAsk(true); }
    };
    window.addEventListener("message", onMsg);
    window.postMessage({ source: "sebastian-app", type: "ping" }, window.location.origin);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // At log-in (once per visit), remind about unfinished tasks.
  useEffect(() => {
    const t = setTimeout(() => {
      try { if (sessionStorage.getItem("sebastian-unfinished-shown")) return; } catch {}
      const cur: any = (useStore.getState().data[useStore.getState().sessionId!] as any)?.companion;
      if (cur?.allowed && (openUnfinished({ allowed: true, items: cur.items || [], openTabs: [] }).length || (cur.openTabs || []).length)) {
        setRemind(true);
        try { sessionStorage.setItem("sebastian-unfinished-shown", "1"); } catch {}
      }
    }, 2500);
    return () => clearTimeout(t);
  }, []);

  const items = openUnfinished(c);
  const mark = (id: string, p: Partial<Unfinished>) => patchCompanion((x) => ({ ...x, items: x.items.map((i) => (i.id === id ? { ...i, ...p } : i)) }));
  const who = formOfAddress(acc, d.prefs) || acc?.firstName || "";

  return (
    <>
      <Modal open={ask} onClose={() => setAsk(false)} title="Connect Sebastian Companion?">
        <div className="space-y-4">
          <p className="text-sm flex gap-3"><Puzzle className="w-5 h-5 text-gold shrink-0" />The Sebastian Companion browser extension wants to share the pages and tasks you&apos;ve saved as unfinished{pendingHello.current?.openTabs?.length ? ", and the tabs you've left open" : ""}, so Sebastian can remind you when you log in.</p>
          <p className="text-[12.5px] text-muted">This stays between your browser and your Sebastian account. You can disconnect at any time in Settings, under Connections.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { patchCompanion((x) => ({ ...x, allowed: false })); setAsk(false); }}>Don&apos;t allow</Button>
            <Button onClick={() => { patchCompanion((x) => ({ ...x, allowed: true })); if (pendingHello.current) accept(pendingHello.current); setAsk(false); toast.success("Sebastian Companion connected."); }}>Allow</Button>
          </div>
        </div>
      </Modal>

      <Modal open={remind && !ask} onClose={() => setRemind(false)} title={`Welcome back${who ? `, ${who}` : ""}`}>
        <div className="space-y-4">
          {items.length > 0 && <p className="text-sm">You left {items.length === 1 ? "this" : "these"} unfinished:</p>}
          <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
            {items.slice(0, 10).map((i) => (
              <li key={i.id} className="rounded-2xl border border-line p-3">
                <p className="text-[14px] font-medium">{i.title}</p>
                {i.note && <p className="text-[12.5px] text-muted mt-0.5">{i.note}</p>}
                <div className="flex flex-wrap gap-2 mt-2">
                  {i.url && <Button size="sm" variant="outline" href={i.url} external><ExternalLink className="w-3.5 h-3.5" />Open</Button>}
                  <Button size="sm" variant="ghost" onClick={() => mark(i.id, { status: "done" })}><Check className="w-3.5 h-3.5" />Done</Button>
                  <Button size="sm" variant="ghost" onClick={() => { const t = new Date(); t.setDate(t.getDate() + 1); mark(i.id, { snoozeUntil: t.toISOString() }); }}><Clock className="w-3.5 h-3.5" />Tomorrow</Button>
                </div>
              </li>
            ))}
          </ul>
          {c.openTabs.length > 0 && (
            <div>
              <p className="text-[13px] font-medium">Tabs you left open</p>
              <ul className="mt-1.5 space-y-1">{c.openTabs.slice(0, 6).map((t) => <li key={t.url}><a href={t.url} target="_blank" rel="noopener noreferrer" className="text-[13px] underline underline-offset-2 truncate block">{t.title}</a></li>)}</ul>
            </div>
          )}
          <div className="flex justify-end"><Button onClick={() => setRemind(false)}><X className="w-4 h-4" />Close</Button></div>
        </div>
      </Modal>
    </>
  );
}
