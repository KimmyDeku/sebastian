"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { create } from "zustand";
import { X, Mic, Square, Send, ExternalLink, Check, Phone, ArrowRight, AudioLines } from "lucide-react";
import { SebastianMark, Waveform, type MarkState } from "../SebastianMark";
import { useSpeaker, useSpeechRecognition, voiceMessage } from "@/lib/voice";
import { api } from "@/lib/api";
import { actions, useAccount, useData } from "@/lib/store";
import { formOfAddress, greeting } from "@/lib/address";
import { TASKS, formatSlot } from "@/lib/agentTasks";
import { runTask, type Card } from "./runTask";
import { EMERGENCY } from "../discover/emergency";
import { uid, cx } from "@/lib/util";

/** Open the Voice Concierge from anywhere: useVoiceAgent.getState().show("optional first request") */
export const useVoiceAgent = create<{ open: boolean; seed: string; show: (seed?: string) => void; hide: () => void }>((set) => ({
  open: false, seed: "", show: (seed = "") => set({ open: true, seed }), hide: () => set({ open: false, seed: "" }),
}));

type Line = { id: string; who: "user" | "sebastian"; text: string; cards?: Card[]; link?: { label: string; href: string } };
type Phase = "idle" | "listening" | "thinking" | "working" | "speaking";
const YES = /^(yes|yeah|yep|yup|sure|ok|okay|please|go ahead|do it|confirm|correct|that'?s right|call)/i;
const NO = /^(no|nope|cancel|don'?t|stop|not now|wait|change)/i;

export function VoiceAgent() {
  const { open, seed, hide } = useVoiceAgent();
  return open ? <Session seed={seed} onClose={hide} /> : null;
}

export function VoiceLauncher() {
  const open = useVoiceAgent((s) => s.open);
  const path = usePathname();
  if (open || path.startsWith("/chat")) return null;
  return (
    <button onClick={() => useVoiceAgent.getState().show()} aria-label="Talk to Sebastian"
      className="fixed z-50 right-4 bottom-20 lg:right-6 lg:bottom-6 w-14 h-14 rounded-full bg-ink text-white shadow-lift inline-flex items-center justify-center hover:bg-ink-soft">
      <AudioLines className="w-6 h-6" />
    </button>
  );
}

function Session({ seed, onClose }: { seed: string; onClose: () => void }) {
  const acc = useAccount();
  const d = useData();
  const who = formOfAddress(acc, d.prefs);
  const [lines, setLines] = useState<Line[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [task, setTask] = useState<string | null>(null);
  const [slots, setSlots] = useState<Record<string, any>>({});
  const [pending, setPending] = useState<null | { task: string; slots: any }>(null);
  const [handsFree, setHandsFree] = useState(true);
  const [typed, setTyped] = useState("");
  const [hint, setHint] = useState("");

  const history = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const chatId = useRef<string | null>(null);
  const live = useRef({ task, slots, pending, handsFree, busy: false, closed: false, listening: false });
  live.current = { ...live.current, task, slots, pending, handsFree };
  const endRef = useRef<HTMLDivElement>(null);
  const { speak, cancel } = useSpeaker();
  const mic = useSpeechRecognition((t) => handleUtterance(t));

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [lines, phase]);

  // Save everything to Sebastian's chat history as the conversation happens.
  const log = (whoSays: Line["who"], text: string, extra: Partial<Line> = {}, save = true) => {
    setLines((l) => [...l, { id: uid("v_"), who: whoSays, text, ...extra }]);
    if (!save) return;
    const m = { id: uid("m_"), role: whoSays === "user" ? ("user" as const) : ("assistant" as const), content: text, at: new Date().toISOString(), actions: extra.link ? [extra.link] : undefined };
    if (!chatId.current) { if (whoSays === "user") chatId.current = actions.newChat(m); }
    else actions.pushMsg(chatId.current, m);
  };

  const listen = useCallback(() => {
    if (live.current.closed || live.current.listening) return;
    live.current.listening = true;
    cancel();
    setHint("");
    setPhase("listening");
    mic.start();
  }, [cancel, mic]);

  // Speak, then (in hands-free mode) start listening again for the reply.
  const say = (text: string, extra: Partial<Line> = {}, thenListen = true, save = true) =>
    new Promise<void>((resolve) => {
      log("sebastian", text, extra, save);
      setPhase("speaking");
      let finished = false;
      const done = () => {
        if (finished) return;
        finished = true;
        resolve();
        if (live.current.closed || live.current.listening || live.current.busy) return;
        setPhase("idle");
        if (thenListen && live.current.handsFree) listen();
      };
      if (!speak(text, d.prefs.voiceName, done)) done();
      // Safety net in case the voice never reports that it finished.
      setTimeout(done, Math.min(45000, 3000 + text.length * 90));
    });

  const ctx = () => {
    const now = new Date();
    return {
      address: who, timezone: acc?.timezone,
      today: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
      weekday: now.toLocaleDateString("en-GB", { weekday: "long" }), time: now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const execute = async (t: string, s: Record<string, any>, announce?: Promise<void>) => {
    setPhase("working");
    const [res] = await Promise.all([runTask(t, s), announce]);
    if (live.current.closed) return;
    if (!res.ok) { history.current.push({ role: "assistant", content: `(The task failed: ${res.error})` }); void say(`I'm sorry, I couldn't complete that. ${res.error}`); return; }
    let text = res.say;
    if (!text) {
      setPhase("thinking");
      const sum = await api<any>("/api/agent", { mode: "summarise", task: t, slots: s, results: res.data, context: ctx() });
      text = sum.ok ? sum.say : "Here is what I found. The details are on screen.";
    }
    history.current.push({ role: "assistant", content: `(Results delivered) ${text}` });
    void say(text!, { cards: res.cards, link: res.link });
  };

  const callEmergency = (service: string) => {
    const c = EMERGENCY[d.prefs.emergencyCountry] || EMERGENCY.ZW;
    window.location.href = `tel:${(c as any)[service] || c.general}`;
  };

  const handleUtterance = async (text: string) => {
    const t = text.trim();
    if (!t) return;
    if (live.current.busy) { setHint("One moment, I'm still working on your last request."); return; }
    live.current.busy = true;
    cancel();
    try {
      log("user", t);
      const p = live.current.pending;
      if (p && YES.test(t)) {
        setPending(null);
        if (p.task === "emergency") { void say("Calling now. Stay on the line with the operator.", {}, false); callEmergency(p.slots.service); return; }
        history.current.push({ role: "user", content: t });
        await execute(p.task, p.slots);
        return;
      }
      if (p && NO.test(t)) { setPending(null); history.current.push({ role: "user", content: t }); void say("Very well, I won't. What would you like to change?"); return; }

      history.current.push({ role: "user", content: t });
      setPhase("thinking");
      const r = await api<any>("/api/agent", { mode: "turn", messages: history.current.slice(-24), state: { task: live.current.task, slots: live.current.slots }, context: ctx() });
      if (live.current.closed) return;
      if (!r.ok) { void say(r.code === "ai_unavailable" ? "My reasoning service isn't configured yet, so I can't hold a conversation. Please add the AI key on the server." : `I'm sorry, something went wrong. ${r.error || ""}`, {}, false); return; }
      history.current.push({ role: "assistant", content: r.say });
      setTask(r.task === "question" ? null : r.task);
      setSlots(r.slots || {});
      if (r.status === "ready") {
        const announce = say(r.say, {}, false);
        await execute(r.task, r.slots, announce);
      } else if (r.status === "confirm") {
        setPending({ task: r.task, slots: r.slots });
        live.current.busy = false;
        void say(r.say);
      } else {
        live.current.busy = false;
        void say(r.say);
      }
    } finally {
      live.current.busy = false;
    }
  };

  // Greet, or act on a request typed before opening.
  useEffect(() => {
    live.current.closed = false;
    if (seed.trim()) handleUtterance(seed);
    else say(`${greeting(acc, d.prefs).replace(/\.$/, "")}. What can I do for you?`, {}, true, false);
    return () => { live.current.closed = true; cancel(); mic.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recogniser finished without hearing anything, or hit a problem.
  useEffect(() => {
    if (mic.state === "listening") return;
    live.current.listening = false;
    if (phase === "listening") setPhase("idle");
    if (["denied", "unsupported", "error", "no-speech"].includes(mic.state)) setHint(voiceMessage[mic.state]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mic.state]);

  const close = () => { live.current.closed = true; cancel(); mic.stop(); onClose(); };
  const tapMic = () => { if (phase === "listening") { mic.stop(); setPhase("idle"); } else if (phase === "speaking") { cancel(); listen(); } else if (phase === "idle") listen(); };
  const sendTyped = () => { if (typed.trim()) { const t = typed; setTyped(""); mic.stop(); live.current.listening = false; handleUtterance(t); } };

  const markState: MarkState = phase === "listening" ? "listening" : phase === "speaking" ? "speaking" : phase === "idle" ? "idle" : "thinking";
  const status = { idle: handsFree ? "Tap the microphone to speak" : "Tap to speak", listening: mic.interim || "Listening…", thinking: "Thinking…", working: "Working on it…", speaking: "Speaking · tap to interrupt" }[phase];
  const def = task ? TASKS[task] : null;
  const shown = def ? def.slots.filter((x) => x.required || slots[x.key] != null) : [];

  return (
    <div role="dialog" aria-modal="true" aria-label="Voice conversation with Sebastian" className="fixed inset-0 z-[90] bg-canvas flex flex-col">
      <header className="flex items-center justify-between gap-3 px-4 md:px-8 h-16 border-b border-line bg-paper/80 backdrop-blur" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex items-center gap-3 min-w-0"><SebastianMark size={34} state={markState} /><div className="min-w-0"><p className="text-sm font-medium">Voice concierge</p><p className="text-[11px] text-muted truncate">Everything is also saved to your chats</p></div></div>
        <div className="flex items-center gap-2">
          <button role="switch" aria-checked={handsFree} onClick={() => setHandsFree(!handsFree)} className="hidden sm:inline-flex items-center gap-2 h-8 px-3 rounded-pill border border-line text-[12px]">
            <span className={cx("w-7 h-4 rounded-full relative transition-colors", handsFree ? "bg-ink" : "bg-line")}><span className={cx("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all", handsFree ? "left-3.5" : "left-0.5")} /></span>Hands-free
          </button>
          <button onClick={close} aria-label="End conversation" className="w-9 h-9 rounded-full hover:bg-cream inline-flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {def && (
          <aside className="lg:order-2 lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-l border-line bg-paper px-4 py-3 lg:p-6 overflow-x-auto" aria-label="Details gathered so far">
            <p className="t-kicker text-muted">Gathering</p>
            <p className="font-serif text-lg mt-0.5">{def.label}</p>
            <ul className="mt-2 lg:mt-4 flex lg:flex-col gap-2 lg:gap-2.5 text-[13px]">
              {shown.map((x) => {
                const v = formatSlot(slots[x.key]);
                return (
                  <li key={x.key} className={cx("shrink-0 flex items-center gap-2 rounded-xl px-3 py-2 border", v ? "bg-canvas border-line" : "border-dashed border-cream-line")}>
                    {v ? <Check className="w-3.5 h-3.5 text-success shrink-0" aria-hidden /> : <span className="w-3.5 h-3.5 rounded-full border border-muted-soft shrink-0" aria-hidden />}
                    <span className="text-muted whitespace-nowrap">{x.label}</span>
                    <span className="ml-auto text-ink whitespace-nowrap lg:whitespace-normal lg:text-right">{v || "needed"}</span>
                  </li>
                );
              })}
            </ul>
          </aside>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 py-6" aria-live="polite">
          <div className="max-w-2xl mx-auto space-y-4">
            {lines.map((l) => l.who === "user" ? (
              <div key={l.id} className="flex justify-end"><div className="max-w-[85%] bg-ink text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm">{l.text}</div></div>
            ) : (
              <div key={l.id} className="flex gap-3">
                <SebastianMark size={28} />
                <div className="flex-1 min-w-0">
                  <div className="bg-paper border border-line rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed">{l.text}</div>
                  {l.cards && l.cards.length > 0 && (
                    <div className="mt-2 grid sm:grid-cols-2 gap-2">
                      {l.cards.map((c, i) => {
                        const body = (<><p className="text-[13px] font-medium line-clamp-2">{c.title}</p>{c.subtitle && <p className="text-[11.5px] text-muted mt-0.5">{c.subtitle}</p>}{c.detail && <p className="text-[12px] text-muted mt-1 line-clamp-3">{c.detail}</p>}</>);
                        return c.href ? (
                          <a key={i} href={c.href} target="_blank" rel="noopener noreferrer" className="block rounded-xl bg-paper border border-line p-3 hover:border-cream-line">{body}<span className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-ink">Open<ExternalLink className="w-3 h-3" /></span></a>
                        ) : <div key={i} className="rounded-xl bg-paper border border-line p-3">{body}</div>;
                      })}
                    </div>
                  )}
                  {l.link && <Link href={l.link.href} onClick={close} className="mt-2 inline-flex items-center gap-1.5 h-9 px-4 rounded-pill bg-ink text-white text-[13px]">{l.link.label}<ArrowRight className="w-3.5 h-3.5" /></Link>}
                </div>
              </div>
            ))}
            {(phase === "thinking" || phase === "working") && <div className="flex gap-3 items-center"><SebastianMark size={28} state="thinking" /><span className="text-sm text-muted italic font-serif">{phase === "working" ? "Working on it…" : "Considering…"}</span></div>}
            {pending?.task === "emergency" && (
              <button onClick={() => callEmergency(pending.slots.service)} className="w-full h-14 rounded-2xl bg-danger text-white inline-flex items-center justify-center gap-2 text-base"><Phone className="w-5 h-5" />Call {pending.slots.service} now</button>
            )}
            {pending && pending.task !== "emergency" && (
              <div className="flex gap-2">
                <button onClick={() => handleUtterance("yes")} className="h-9 px-4 rounded-pill bg-ink text-white text-[13px]">Yes, go ahead</button>
                <button onClick={() => handleUtterance("no")} className="h-9 px-4 rounded-pill border border-line text-[13px]">No, change something</button>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>
      </div>

      <footer className="border-t border-line bg-paper px-4 md:px-8 pt-4 pb-4 pb-safe">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-3">
          <button onClick={tapMic} disabled={phase === "thinking" || phase === "working"} aria-label={phase === "listening" ? "Stop listening" : "Speak to Sebastian"}
            className={cx("w-16 h-16 rounded-full inline-flex items-center justify-center transition-all disabled:opacity-50", phase === "listening" ? "bg-glow text-white shadow-thinking scale-105" : "bg-ink text-white")}>
            {phase === "listening" ? <Square className="w-6 h-6" /> : <Mic className="w-7 h-7" />}
          </button>
          <p className="text-[13px] text-muted inline-flex items-center gap-2 min-h-5 text-center">{phase === "listening" && <Waveform active />}{hint || status}</p>
          <div className="w-full flex gap-2">
            <label htmlFor="voice-typed" className="sr-only">Or type to Sebastian</label>
            <input id="voice-typed" value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendTyped()} placeholder="Or type here…"
              className="flex-1 min-w-0 h-10 px-4 rounded-pill border border-line bg-canvas text-base md:text-sm outline-none focus-visible:outline-none focus:border-gold" />
            <button onClick={sendTyped} disabled={!typed.trim()} aria-label="Send" className="shrink-0 w-10 h-10 rounded-full bg-gold text-white inline-flex items-center justify-center disabled:opacity-40"><Send className="w-4 h-4" /></button>
          </div>
        </div>
      </footer>
    </div>
  );
}
