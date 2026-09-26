"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Paperclip, X, FileText } from "lucide-react";
import { VoiceButton } from "./VoiceButton";
import { cx } from "@/lib/util";
import type { Attachment } from "@/lib/pending";
import { toast } from "./ui/Toast";

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

  return (
    <div className={cx("bg-paper border border-cream-line/80 rounded-[28px] shadow-halo focus-within:border-gold/70 transition-colors", large ? "px-4 md:px-7 pt-4 md:pt-6 pb-4 md:pb-5" : "px-3 md:px-4 py-3")}>
      {att && (
        <div className="mb-2 ml-2 inline-flex items-center gap-2 text-xs bg-cream rounded-full pl-3 pr-1 h-8">
          <FileText className="w-3.5 h-3.5" aria-hidden />{att.name}
          <button onClick={() => setAtt(null)} aria-label="Remove attachment" className="w-6 h-6 rounded-full hover:bg-cream-deep inline-flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      <div className="flex items-center gap-2 md:gap-3">
        <button type="button" onClick={() => file.current?.click()} aria-label="Attach a file" className="w-10 h-10 shrink-0 rounded-full hover:bg-cream inline-flex items-center justify-center text-muted">
          <Paperclip className="w-[22px] h-[22px]" strokeWidth={1.5} />
        </button>
        <input ref={file} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.txt,.md,.csv,.json" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setAtt(await readAttachment(f)); e.target.value = ""; }} />
        <span className="w-px h-8 bg-line shrink-0 hidden sm:block" aria-hidden />
        <label className="sr-only" htmlFor="composer">Message Sebastian</label>
        <textarea id="composer" ref={ta} rows={1} autoFocus={autoFocus} value={text} placeholder={ph}
          onChange={(e) => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 180) + "px"; }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          className={cx("flex-1 min-w-0 resize-none bg-transparent outline-none focus-visible:outline-none placeholder:text-muted-soft py-2", large ? "text-base md:text-xl" : "text-base md:text-[15px]")} />
        <VoiceButton onText={(t) => setText((p) => (p ? p + " " : "") + t)} size={42} />
        <button type="button" onClick={send} disabled={busy || (!text.trim() && !att)} aria-label="Send"
          className={cx("shrink-0 rounded-full bg-gold text-white inline-flex items-center justify-center hover:bg-gold-deep disabled:opacity-40 transition", large ? "w-12 h-12 md:w-[60px] md:h-[60px]" : "w-11 h-11")}>
          <ArrowUp className={large ? "w-6 h-6 md:w-7 md:h-7" : "w-5 h-5"} strokeWidth={2} />
        </button>
      </div>
      {children}
    </div>
  );
}
