"use client";
import { useState } from "react";
import Link from "next/link";
import { Send, Trash2, Loader2, Gauge } from "lucide-react";
import { Button } from "../ui/Button";
import { Option } from "../ui/Chip";
import { Notice } from "../ui/States";
import { Markdown } from "../Markdown";
import { useNotebook, patchNotebook } from "@/lib/notebook";
import { api } from "@/lib/api";

const LANGS = ["Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "SQL", "HTML & CSS", "PHP", "Kotlin"];
const STARTERS = ["Explain what a for loop is, with an example", "Write a Python program that averages 5 numbers", "Why does my code say 'undefined is not a function'?", "Build a simple to-do list webpage"];

export function Coding() {
  const nb = useNotebook();
  const [lang, setLang] = useState("Python");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const month = new Date().toISOString().slice(0, 7);
  const used = nb.codingUsage.filter((u) => u.at.startsWith(month));
  const tokens = used.reduce((s, u) => s + u.input + u.output, 0);

  const send = async (t: string) => {
    if (!t.trim() || busy) return;
    const messages = [...nb.codeChat, { role: "user" as const, content: t }];
    patchNotebook((d) => ({ ...d, codeChat: messages }));
    setText(""); setBusy(true); setErr("");
    const r = await api<any>("/api/notebook/code", { messages, language: lang });
    setBusy(false);
    if (r.ok) patchNotebook((d) => ({ ...d, codeChat: [...d.codeChat, { role: "assistant", content: r.reply }] }));
    else setErr(r.error || "The coding assistant couldn't reply.");
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Language">{LANGS.map((l) => <Option key={l} variant="chip" selected={lang === l} onClick={() => setLang(l)}>{l}</Option>)}</div>
        <Link href="/settings#coding" className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-ink"><Gauge className="w-4 h-4" />{used.length} request{used.length === 1 ? "" : "s"} · {tokens.toLocaleString()} tokens this month</Link>
      </div>
      {err && <Notice tone="warning">{err}</Notice>}
      {!nb.codeChat.length && (
        <div className="grid sm:grid-cols-2 gap-2">{STARTERS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-2xl border border-line bg-paper p-4 text-left text-[13.5px] hover:border-cream-line">{s}</button>)}</div>
      )}
      <div className="space-y-3">
        {nb.codeChat.map((m, i) => m.role === "user"
          ? <div key={i} className="flex justify-end"><div className="bg-ink text-white rounded-2xl rounded-br-md px-4 py-2.5 text-[13.5px] max-w-[85%] whitespace-pre-wrap">{m.content}</div></div>
          : <div key={i} className="rounded-2xl bg-paper border border-line px-4 py-3 text-[14px] leading-relaxed min-w-0"><Markdown text={m.content} /></div>)}
        {busy && <p className="text-sm text-muted inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Writing code…</p>}
      </div>
      <div className="rounded-2xl bg-paper border border-line p-2 flex gap-2 items-end">
        <label htmlFor="code-in" className="sr-only">Describe what you want to build or fix</label>
        <textarea id="code-in" rows={2} className="flex-1 min-w-0 resize-y bg-transparent outline-none text-base md:text-[14px] p-2 font-sans" placeholder={`Ask about ${lang}, or paste code to fix…`} value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }} />
        {nb.codeChat.length > 0 && <button onClick={() => patchNotebook((d) => ({ ...d, codeChat: [] }))} aria-label="Clear conversation" className="w-10 h-10 rounded-full hover:bg-cream inline-flex items-center justify-center text-muted"><Trash2 className="w-4 h-4" /></button>}
        <Button onClick={() => send(text)} disabled={!text.trim() || busy} aria-label="Send"><Send className="w-4 h-4" /></Button>
      </div>
      <p className="text-[11.5px] text-muted">Powered by OpenAI. Shift + Enter adds a new line. Always test code before relying on it.</p>
    </div>
  );
}
