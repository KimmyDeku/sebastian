"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Paperclip, X, FileText, AudioLines } from "lucide-react";
import { cx } from "@/lib/util";
import type { Attachment } from "@/lib/pending";
import { toast } from "./ui/Toast";
import { useVoiceAgent } from "./voice/VoiceAgent";

export async function readAttachment(f: File): Promise<Attachment | null> {
  if (f.size > 5 * 1024 * 1024) { toast.error("That file is larger than 5 MB. Please choose a smaller one."); return null; }
  if (/^text\/|json|csv/.test(f.type) || /\.(txt|md|csv|json)$/i.test(f.name)) return { name: f.name, mediaType: f.type || "text/plain", text: await f.text(), size: f.size };
  if (/^image\/(png|jpe?g|gif|webp)$/.test(f.type) || f.type === "application/pdf") {
    const data = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(f); });
    return { name: f.name, mediaType: f.type, data, size: f.size };
  }
  toast.error("Sebastian can read images, PDFs and text files.");
  return null;
}

export function Composer({ onSend, busy, autoFocus, children, placeholder = "Ask Sebastian anything…", large }: {
  onSend: (text: string, att: Attachment | null) => void; busy?: boolean; autoFocus?: boolean; children?: React.ReactNode; placeholder?: string; large?: boolean;
}) {
  const [text, setText] = useState("");
  const [att, setAtt] = useState<Attachment | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  const [ph, setPh] = useState(placeholder);
  useEffect(() => { const f = () => setPh(window.innerWidth < 480 ? "Ask Sebastian…" : placeholder); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, [placeholder]);

  const send = () => {
    const t = text.trim();
    if ((!t && !att) || busy) return;
    onSend(t || `Please look at ${att?.name}.`, att);
    setText(""); setAtt(null);
    if (ta.current) ta.current.style.height = "";
  };

  // The microphone opens the Voice Concierge. Anything already typed becomes the first request.
  const talk = () => { const seed = text.trim(); setText(""); useVoiceAgent.getState().show(seed); };

  return (
    <div className={cx("bg-paper border border-cream-line/80 rounded-3xl shadow-halo focus-within:border-gold/70 transition-colors", large ? "px-3 md:px-4 pt-2.5 pb-3" : "px-2.5 py-2")}>
      {att && (
        <div className="mb-1.5 ml-2 inline-flex items-center gap-2 text-xs bg-cream rounded-full pl-3 pr-1 h-7">
          <FileText className="w-3.5 h-3.5" aria-hidden />{att.name}
          <button onClick={() => setAtt(null)} aria-label="Remove attachment" className="w-5 h-5 rounded-full hover:bg-cream-deep inline-flex items-center justify-center"><X className="w-3 h-3" /></button>
        </div>
      )}
      <div className="flex items-center gap-1.5 md:gap-2">
        <button type="button" onClick={() => file.current?.click()} aria-label="Attach a file" className="w-9 h-9 shrink-0 rounded-full hover:bg-cream inline-flex items-center justify-center text-muted">
          <Paperclip className="w-[18px] h-[18px]" strokeWidth={1.5} />
        </button>
        <input ref={file} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.txt,.md,.csv,.json" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setAtt(await readAttachment(f)); e.target.value = ""; }} />
        <span className="w-px h-6 bg-line shrink-0 hidden sm:block" aria-hidden />
        <label className="sr-only" htmlFor="composer">Message Sebastian</label>
        <textarea id="composer" ref={ta} rows={1} autoFocus={autoFocus} value={text} placeholder={ph}
          onChange={(e) => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px"; }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          className="flex-1 min-w-0 resize-none bg-transparent outline-none focus-visible:outline-none placeholder:text-muted-soft py-1.5 text-base md:text-[15px]" />
        <button type="button" onClick={talk} aria-label="Talk to Sebastian" title="Talk to Sebastian"
          className="shrink-0 w-9 h-9 rounded-full border border-line bg-paper inline-flex items-center justify-center hover:bg-cream">
          <AudioLines className="w-[18px] h-[18px]" />
        </button>
        <button type="button" onClick={send} disabled={busy || (!text.trim() && !att)} aria-label="Send"
          className="shrink-0 w-9 h-9 rounded-full bg-gold text-white inline-flex items-center justify-center hover:bg-gold-deep disabled:opacity-40 transition">
          <ArrowUp className="w-[18px] h-[18px]" strokeWidth={2} />
        </button>
      </div>
      {children}
    </div>
  );
}
