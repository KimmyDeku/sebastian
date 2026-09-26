"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Volume2, Square, RotateCcw } from "lucide-react";
import { Composer } from "@/components/Composer";
import { SebastianMark, type MarkState } from "@/components/SebastianMark";
import { Markdown } from "@/components/Markdown";
import { actions, useAccount, useData } from "@/lib/store";
import { formOfAddress, greeting } from "@/lib/address";
import { uid } from "@/lib/util";
import { api } from "@/lib/api";
import { localIntent, routeHref } from "@/lib/intent";
import { pendingAttachment, setPendingAttachment, type Attachment } from "@/lib/pending";
import { useSpeaker } from "@/lib/voice";
import type { Msg } from "@/lib/types";
import { Breadcrumbs } from "@/components/ui/Page";

const STARTERS = ["Find a quiet café nearby", "I'm going to Cape Town for five days in December. I like food, beaches and museums, budget $1,000.", "Remind me to call my mother tomorrow at 6pm", "What should I cook for a lazy Sunday for four?"];

function ChatInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const acc = useAccount();
  const d = useData();
  const [chatId, setChatId] = useState<string | null>(sp.get("id"));
  const [busy, setBusy] = useState(false);
  const [mark, setMark] = useState<MarkState>("idle");
  const endRef = useRef<HTMLDivElement>(null);
  const { speak, cancel, speaking } = useSpeaker();
  const sentPending = useRef(false);

  useEffect(() => { if (sp.get("new")) { setChatId(null); router.replace("/chat"); } else setChatId(sp.get("id")); }, [sp, router]);
  const chat = d.chats.find((c) => c.id === chatId) || null;
  const msgs = chat?.messages || [];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs.length, busy]);
  useEffect(() => setMark(speaking ? "speaking" : busy ? "thinking" : "idle"), [speaking, busy]);

  const ask = useCallback(async (cid: string, history: Msg[], att: Attachment | null) => {
    setBusy(true);
    const now = new Date();
    const context = {
      address: formOfAddress(acc, d.prefs), timezone: acc?.timezone, today: now.toISOString().slice(0, 10),
      localTime: now.toLocaleString("en-GB", { timeZone: acc?.timezone }),
      schedule: d.schedule.filter((e) => new Date(e.start) > now).slice(0, 8).map((e) => ({ title: e.title, start: e.start, kind: e.kind })),
      cookbook: d.cookbook.length, plans: d.plans.filter((p) => !p.archived).map((p) => ({ name: p.name, target: p.target, saved: p.deposits.reduce((s, x) => s + x.amount, 0) })),
    };
    const payload = history.map((m, i) => ({ role: m.role, content: m.content, ...(i === history.length - 1 && att ? { attachment: att } : {}) }));
    const r = await api<{ reply: string; route?: string; params?: any; actionLabel?: string }>("/api/chat", { messages: payload, context });
    let msg: Msg;
    if (r.ok) {
      const actionsList = r.route ? [{ label: r.actionLabel || "Open " + r.route, href: routeHref(r.route, r.params) }] : undefined;
      msg = { id: uid("m_"), role: "assistant", content: r.reply || "…", at: new Date().toISOString(), actions: actionsList };
      if (d.prefs.voiceReplies) speak(r.reply, d.prefs.voiceName);
    } else {
      const last = history[history.length - 1]?.content || "";
      const guess = localIntent(last);
      const offline = (r as any).offline;
      msg = {
        id: uid("m_"), role: "assistant", error: true, at: new Date().toISOString(),
        content: offline ? "You appear to be offline, so I can't reach my reasoning service. " + (guess ? "I can still open the right place for you." : "")
          : (r as any).code === "ai_unavailable" ? `My conversational service isn't configured yet: the server needs an ANTHROPIC_API_KEY. ${guess ? "In the meantime, this looks like something I can help with directly:" : "You can still use every suite from the menu."}`
          : `I couldn't complete that: ${r.error}`,
        actions: guess ? [{ label: guess.label, href: routeHref(guess.route, guess.params) }] : undefined,
      };
    }
    actions.pushMsg(cid, msg);
    setBusy(false);
  }, [acc, d, speak]);

  // Message handed over from the home composer
  useEffect(() => {
    if (sp.get("pending") && chat && !sentPending.current && !busy) {
      const last = chat.messages[chat.messages.length - 1];
      if (last?.role === "user") { sentPending.current = true; const att = pendingAttachment; setPendingAttachment(null); ask(chat.id, chat.messages, att); router.replace(`/chat?id=${chat.id}`); }
    }
  }, [sp, chat, ask, busy, router]);

  const send = (text: string, att: Attachment | null) => {
    const m: Msg = { id: uid("m_"), role: "user", content: text, at: new Date().toISOString() };
    let cid = chatId;
    if (!cid || !chat) { cid = actions.newChat(m); setChatId(cid); router.replace(`/chat?id=${cid}`); ask(cid, [m], att); }
    else { actions.pushMsg(cid, m); ask(cid, [...msgs, m], att); }
  };

  const retry = () => {
    if (!chat) return;
    const hist = chat.messages.filter((m) => !m.error);
    if (hist[hist.length - 1]?.role === "user") ask(chat.id, hist, null);
  };

  return (
    <div className="max-w-3xl mx-auto w-full px-5 md:px-8 pt-6 lg:pt-10 flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="mb-6"><Breadcrumbs items={[{ label: "Home", href: "/" }, { label: chat?.title || "New chat" }]} /></div>
      <div className="flex-1 space-y-6 pb-6" aria-live="polite">
        {msgs.length === 0 && (
          <div className="text-center pt-8 md:pt-16">
            <SebastianMark size={64} state={mark} />
            <h1 className="t-h1 mt-6" suppressHydrationWarning>{greeting(acc, d.prefs)}</h1>
            <p className="text-muted mt-2">How may I be of service?</p>
            <div className="mt-8 grid sm:grid-cols-2 gap-3 text-left">
              {STARTERS.map((s) => (
                <button key={s} onClick={() => send(s, null)} className="rounded-2xl border border-line bg-paper p-4 text-sm hover:border-cream-line hover:bg-cream/40">{s}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m) => m.role === "user" ? (
          <div key={m.id} className="flex justify-end animate-fadeUp">
            <div className="max-w-[85%] bg-ink text-white rounded-3xl rounded-br-lg px-5 py-3 text-[15px] whitespace-pre-wrap">{m.content}</div>
          </div>
        ) : (
          <div key={m.id} className="flex gap-3 animate-fadeUp">
            <SebastianMark size={34} state={m.error ? "error" : "idle"} />
            <div className="flex-1 min-w-0">
              <div className={`rounded-3xl rounded-tl-lg px-5 py-4 text-[15px] leading-relaxed border ${m.error ? "bg-[#FBF5EA] border-[#EBD7AE]" : "bg-paper border-line"}`}>
                <Markdown text={m.content} />
                {m.actions && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {m.actions.map((a) => (
                      <Link key={a.href} href={a.href} className="inline-flex items-center gap-2 h-10 px-5 rounded-pill bg-ink text-white text-sm hover:bg-ink-soft">{a.label}<ArrowRight className="w-4 h-4" aria-hidden /></Link>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-1 mt-1.5 ml-2">
                <button onClick={() => (speaking ? cancel() : speak(m.content, d.prefs.voiceName))} className="text-xs text-muted hover:text-ink inline-flex items-center gap-1 h-7 px-2 rounded-full hover:bg-cream">
                  {speaking ? <Square className="w-3 h-3" /> : <Volume2 className="w-3.5 h-3.5" />}{speaking ? "Stop" : "Read aloud"}
                </button>
                {m.error && <button onClick={retry} className="text-xs text-muted hover:text-ink inline-flex items-center gap-1 h-7 px-2 rounded-full hover:bg-cream"><RotateCcw className="w-3.5 h-3.5" />Retry</button>}
              </div>
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex gap-3 items-center"><SebastianMark size={34} state="thinking" /><span className="text-sm text-muted italic font-serif">Sebastian is considering…</span></div>
        )}
        <div ref={endRef} />
      </div>
      <div className="sticky bottom-16 lg:bottom-4 pb-4 pt-2 bg-gradient-to-t from-canvas via-canvas to-transparent">
        <Composer onSend={send} busy={busy} autoFocus />
      </div>
    </div>
  );
}

export default function ChatPage() {
  return <Suspense><ChatInner /></Suspense>;
}
