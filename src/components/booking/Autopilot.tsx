"use client";
import { useEffect, useRef, useState } from "react";
import { X, Mic, Square, Send, Check, SkipForward, Sparkles } from "lucide-react";
import { SebastianMark, Waveform } from "../SebastianMark";
import { useSpeaker, useSpeechRecognition, voiceMessage } from "@/lib/voice";
import { useAccount, useData } from "@/lib/store";
import { formOfAddress } from "@/lib/address";
import { formatSlot } from "@/lib/agentTasks";
import { api } from "@/lib/api";
import { cx } from "@/lib/util";

export type AutoField = { key: string; label: string; ask: string; hint?: string; required?: boolean; options?: string[] };
type Phase = "idle" | "listening" | "thinking" | "speaking" | "done";
const empty = (v: any) => v == null || v === "" || (Array.isArray(v) && !v.length);

/**
 * Autopilot: Sebastian reads each field aloud, listens to the answer, and fills the form as you speak.
 * It never submits or pays; you review and press the button yourself.
 */
export function Autopilot({ open, title, fields, values, onValues, onClose, doneText = "Have a look, then press Search when you're ready." }: {
  open: boolean; title: string; fields: AutoField[]; values: Record<string, any>; onValues: (patch: Record<string, any>) => void; onClose: () => void; doneText?: string;
}) {
  if (!open) return null;
  return <Session title={title} fields={fields} values={values} onValues={onValues} onClose={onClose} doneText={doneText} />;
}

function Session({ title, fields, values, onValues, onClose, doneText }: { title: string; fields: AutoField[]; values: Record<string, any>; onValues: (p: Record<string, any>) => void; onClose: () => void; doneText: string }) {
  const acc = useAccount();
  const d = useData();
  const who = formOfAddress(acc, d.prefs);
  const [phase, setPhase] = useState<Phase>("idle");
  const [said, setSaid] = useState("");
  const [heard, setHeard] = useState("");
  const [typed, setTyped] = useState("");
  const [hint, setHint] = useState("");
  const history = useRef<{ role: "user" | "assistant"; content: string }[]>([]);
  const vals = useRef(values);
  vals.current = values;
  const closed = useRef(false);
  const busy = useRef(false);
  const { speak, cancel } = useSpeaker();
  const mic = useSpeechRecognition((t) => answer(t));

  const nextField = () => fields.find((f) => empty(vals.current[f.key]) && f.required) || fields.find((f) => empty(vals.current[f.key]));

  const say = (text: string, listenAfter = true) => {
    setSaid(text);
    setPhase("speaking");
    history.current.push({ role: "assistant", content: text });
    let finished = false;
    const done = () => {
      if (finished || closed.current) return;
      finished = true;
      if (!listenAfter) return;
      setPhase("listening");
      mic.start();
    };
    if (!speak(text, d.prefs.voiceName, done)) done();
    setTimeout(done, Math.min(20000, 2500 + text.length * 85));
  };

  const ctx = () => {
    const n = new Date();
    return { address: who, today: `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`, weekday: n.toLocaleDateString("en-GB", { weekday: "long" }) };
  };

  const answer = async (text: string) => {
    const t = text.trim();
    if (!t || busy.current || closed.current) return;
    busy.current = true;
    cancel(); mic.stop();
    setHeard(t); setHint("");
    history.current.push({ role: "user", content: t });
    setPhase("thinking");
    const r = await api<any>("/api/agent", { mode: "fill", title, fields, values: vals.current, messages: history.current, context: ctx() });
    busy.current = false;
    if (closed.current) return;
    if (!r.ok) { setPhase("idle"); setHint(r.code === "ai_unavailable" ? "Autopilot needs the AI service. You can still fill the form by hand." : r.error || "Something went wrong."); return; }
    if (r.values && Object.keys(r.values).length) { onValues(r.values); vals.current = { ...vals.current, ...r.values }; }
    if (r.done) { say(`${r.say} ${doneText}`.trim(), false); setPhase("done"); }
    else say(r.say);
  };

  // Start: say what's already filled, then ask the first question.
  useEffect(() => {
    closed.current = false;
    const filled = fields.filter((f) => !empty(vals.current[f.key])).map((f) => f.label.toLowerCase());
    const first = nextField();
    const intro = `Autopilot is on${who ? `, ${who}` : ""}.`;
    if (!first) { say(`${intro} ${doneText}`, false); setPhase("done"); }
    else say(`${intro} ${filled.length ? `I already have your ${filled.slice(0, 3).join(", ")}. ` : ""}${first.ask}`);
    return () => { closed.current = true; cancel(); mic.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mic.state === "listening") return;
    if (phase === "listening") setPhase("idle");
    if (["denied", "unsupported", "error", "no-speech"].includes(mic.state)) setHint(voiceMessage[mic.state]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mic.state]);

  const close = () => { closed.current = true; cancel(); mic.stop(); onClose(); };
  const tapMic = () => { if (phase === "listening") { mic.stop(); setPhase("idle"); } else { cancel(); setHint(""); setPhase("listening"); mic.start(); } };
  const skip = () => answer("skip");
  const current = nextField();

  return (
    <div className="fixed inset-0 z-[85] flex items-end md:items-center justify-center md:p-6" role="dialog" aria-modal="true" aria-label={`Autopilot: ${title}`}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={close} aria-hidden />
      <div className="relative w-full md:max-w-lg bg-paper rounded-t-3xl md:rounded-3xl shadow-lift border border-line max-h-[92vh] flex flex-col animate-fadeUp pb-safe">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line">
          <div className="flex items-center gap-2.5"><Sparkles className="w-4 h-4 text-gold" aria-hidden /><div><p className="text-sm font-medium">Autopilot</p><p className="text-[11px] text-muted">{title}</p></div></div>
          <button onClick={close} aria-label="Close Autopilot" className="w-9 h-9 rounded-full hover:bg-cream inline-flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4">
          <div className="flex gap-3 items-start">
            <SebastianMark size={32} state={phase === "listening" ? "listening" : phase === "speaking" ? "speaking" : phase === "thinking" ? "thinking" : "idle"} />
            <p className="flex-1 bg-canvas border border-line rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed" aria-live="polite">{said || "…"}</p>
          </div>
          {heard && <p className="text-right"><span className="inline-block bg-ink text-white rounded-2xl rounded-br-md px-4 py-2 text-sm max-w-[85%]">{heard}</span></p>}

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2" aria-label="Form fields">
            {fields.map((f) => {
              const v = formatSlot(values[f.key]);
              const isCur = current?.key === f.key && phase !== "done";
              return (
                <li key={f.key} className={cx("flex items-center gap-2 rounded-xl border px-3 py-2 text-[12.5px]", isCur ? "border-gold bg-gold-soft/40" : v ? "border-line bg-canvas" : "border-dashed border-cream-line")}>
                  {v ? <Check className="w-3.5 h-3.5 text-success shrink-0" aria-hidden /> : <span className={cx("w-3 h-3 rounded-full border shrink-0", isCur ? "border-gold bg-gold" : "border-muted-soft")} aria-hidden />}
                  <span className="text-muted shrink-0">{f.label}</span>
                  <span className="ml-auto text-ink truncate">{v || (f.required ? "needed" : "optional")}</span>
                </li>
              );
            })}
          </ul>
          {hint && <p className="text-xs text-danger" role="alert">{hint}</p>}
        </div>

        <div className="border-t border-line px-5 pt-3 pb-4 space-y-3">
          <div className="flex items-center justify-center gap-3">
            <button onClick={skip} disabled={phase === "thinking" || phase === "done" || !current} className="h-10 px-3 rounded-pill text-[12.5px] text-muted inline-flex items-center gap-1.5 disabled:opacity-40"><SkipForward className="w-4 h-4" />Skip</button>
            <button onClick={tapMic} disabled={phase === "thinking"} aria-label={phase === "listening" ? "Stop listening" : "Speak your answer"}
              className={cx("w-14 h-14 rounded-full inline-flex items-center justify-center transition-all disabled:opacity-50", phase === "listening" ? "bg-glow text-white shadow-thinking" : "bg-ink text-white")}>
              {phase === "listening" ? <Square className="w-5 h-5" /> : <Mic className="w-6 h-6" />}
            </button>
            <button onClick={close} className="h-10 px-3 rounded-pill text-[12.5px] text-ink inline-flex items-center gap-1.5">{phase === "done" ? <><Check className="w-4 h-4 text-success" />Done</> : "Finish"}</button>
          </div>
          <p className="text-center text-[12px] text-muted min-h-4 inline-flex w-full items-center justify-center gap-2">
            {phase === "listening" && <><Waveform active />{mic.interim || "Listening…"}</>}
            {phase === "thinking" && "Filling in…"}
            {phase === "speaking" && "Speaking · tap the microphone to answer now"}
            {phase === "idle" && "Tap the microphone to answer"}
            {phase === "done" && "All set. Review the form, then continue."}
          </p>
          <div className="flex gap-2">
            <label htmlFor="ap-typed" className="sr-only">Or type your answer</label>
            <input id="ap-typed" value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && typed.trim()) { answer(typed); setTyped(""); } }}
              placeholder="Or type your answer…" className="flex-1 min-w-0 h-10 px-4 rounded-pill border border-line bg-canvas text-base md:text-sm outline-none focus-visible:outline-none focus:border-gold" />
            <button onClick={() => { if (typed.trim()) { answer(typed); setTyped(""); } }} disabled={!typed.trim()} aria-label="Send" className="shrink-0 w-10 h-10 rounded-full bg-gold text-white inline-flex items-center justify-center disabled:opacity-40"><Send className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
