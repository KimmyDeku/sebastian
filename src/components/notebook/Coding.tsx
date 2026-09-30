"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Send, Trash2, Loader2, Gauge, Plus, MessageSquare } from "lucide-react";
import { Button } from "../ui/Button";
import { Option } from "../ui/Chip";
import { Notice } from "../ui/States";
import { ConfirmDialog } from "../ui/Modal";
import { Markdown } from "../Markdown";
import { useNotebook, patchNotebook, newId, type CodeChat } from "@/lib/notebook";
import { api } from "@/lib/api";
import { relTime, cx } from "@/lib/util";

const LANGS = ["Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "SQL", "HTML & CSS", "PHP", "Kotlin"];
const STARTERS = ["Explain what a for loop is, with an example", "Write a Python program that averages 5 numbers", "Why does my code say 'undefined is not a function'?", "Build a simple landing page for a vet clinic"];
const titleOf = (t: string) => { const s = t.replace(/\s+/g, " ").trim(); return s.length > 48 ? s.slice(0, 45) + "…" : s; };

export function Coding() {
  const nb = useNotebook();
  const [activeId, setActiveId] = useState<string | null>(nb.codeChats[0]?.id || null);
  const [lang, setLang] = useState("Python");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [del, setDel] = useState<CodeChat | null>(null);
  const chat = nb.codeChats.find((c) => c.id === activeId) || null;
  const month = new Date().toISOString().slice(0, 7);
  const used = nb.codingUsage.filter((u) => u.at.startsWith(month));
  const tokens = used.reduce((s, u) => s + u.input + u.output, 0);
  const provider = used.at(-1)?.provider || "Groq";

  // Move a conversation from the earlier single-chat version into the history list.
  useEffect(() => {
    if (nb.codeChat.length && !nb.codeChats.length) {
      const c: CodeChat = { id: newId("cc_"), title: titleOf(nb.codeChat.find((m) => m.role === "user")?.content || "Earlier chat"), language: "Python", messages: nb.codeChat, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      patchNotebook((d) => ({ ...d, codeChats: [c], codeChat: [] }));
      setActiveId(c.id);
    }
  }, [nb.codeChat, nb.codeChats.length]);
  useEffect(() => { if (chat) setLang(chat.language || "Python"); }, [chat?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = (c: CodeChat) => patchNotebook((d) => ({ ...d, codeChats: [c, ...d.codeChats.filter((x) => x.id !== c.id)] }));
  const newChat = () => { setActiveId(null); setText(""); setErr(""); };

  const send = async (t: string) => {
    const q = t.trim();
    if (!q || busy) return;
    const now = new Date().toISOString();
    const base: CodeChat = chat || { id: newId("cc_"), title: titleOf(q), language: lang, messages: [], createdAt: now, updatedAt: now };
    const pending = { ...base, language: lang, messages: [...base.messages, { role: "user" as const, content: q }], updatedAt: now };
    save(pending);
    setActiveId(pending.id);
    setText(""); setBusy(true); setErr("");
    const r = await api<any>("/api/notebook/code", { messages: pending.messages, language: lang });
    setBusy(false);
    if (r.ok) save({ ...pending, messages: [...pending.messages, { role: "assistant", content: r.reply }], updatedAt: new Date().toISOString() });
    else {
      // Don't leave a message without an answer: put the text back so it can be sent again.
      if (base.messages.length) save(base); else patchNotebook((d) => ({ ...d, codeChats: d.codeChats.filter((x) => x.id !== pending.id) }));
      if (!base.messages.length) setActiveId(null);
      setText(q);
      setErr(r.error || "The coding assistant couldn't reply.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)] gap-5 items-start">
      <aside className="space-y-2 lg:sticky lg:top-6">
        <Button className="w-full" onClick={newChat}><Plus className="w-4 h-4" />New chat</Button>
        {nb.codeChats.length > 0 && <p className="text-[11.5px] text-muted px-1 pt-2">History</p>}
        <ul className="space-y-1 max-h-[60vh] overflow-y-auto">
          {nb.codeChats.map((c) => (
            <li key={c.id} className={cx("group flex items-center rounded-xl border", c.id === activeId ? "bg-cream border-cream-line" : "border-transparent hover:bg-cream/50")}>
              <button onClick={() => { setActiveId(c.id); setErr(""); }} className="flex-1 min-w-0 text-left px-3 py-2" title={c.title}>
                <span className="flex items-center gap-1.5 text-[13px]"><MessageSquare className="w-3.5 h-3.5 text-gold shrink-0" /><span className="truncate">{c.title}</span></span>
                <span className="block text-[11px] text-muted mt-0.5">{c.language} · {relTime(c.updatedAt)}</span>
              </button>
              <button onClick={() => setDel(c)} aria-label={`Delete chat: ${c.title}`} className="w-8 h-8 mr-1 rounded-full opacity-60 hover:opacity-100 hover:bg-cream-deep inline-flex items-center justify-center shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="space-y-4 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Language">{LANGS.map((l) => <Option key={l} variant="chip" selected={lang === l} onClick={() => setLang(l)}>{l}</Option>)}</div>
          <Link href="/settings#coding" className="inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-ink"><Gauge className="w-4 h-4" />{used.length} request{used.length === 1 ? "" : "s"} · {tokens.toLocaleString()} tokens this month</Link>
        </div>
        {err && <Notice tone="warning">{err}</Notice>}
        {!chat && (
          <div>
            <p className="font-serif text-2xl">What shall we build?</p>
            <div className="grid sm:grid-cols-2 gap-2 mt-3">{STARTERS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-2xl border border-line bg-paper p-4 text-left text-[13.5px] hover:border-cream-line">{s}</button>)}</div>
          </div>
        )}
        {chat && (
          <div className="space-y-3">
            {chat.messages.map((m, i) => m.role === "user"
              ? <div key={i} className="flex justify-end"><div className="bg-ink text-white rounded-2xl rounded-br-md px-4 py-2.5 text-[13.5px] max-w-[85%] whitespace-pre-wrap">{m.content}</div></div>
              : <div key={i} className="rounded-2xl bg-paper border border-line px-4 py-3 text-[14px] leading-relaxed min-w-0"><Markdown text={m.content} /></div>)}
          </div>
        )}
        {busy && <p className="text-sm text-muted inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Writing code…</p>}
        <div className="rounded-2xl bg-paper border border-line p-2 flex gap-2 items-end">
          <label htmlFor="code-in" className="sr-only">Describe what you want to build or fix</label>
          <textarea id="code-in" rows={2} className="flex-1 min-w-0 resize-y bg-transparent outline-none text-base md:text-[14px] p-2 font-sans" placeholder={`Ask about ${lang}, or paste code to fix…`} value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }} />
          <Button onClick={() => send(text)} disabled={!text.trim() || busy} aria-label="Send"><Send className="w-4 h-4" /></Button>
        </div>
        <p className="text-[11.5px] text-muted">Powered by {provider}. Shift + Enter adds a new line. Always test code before relying on it.</p>
      </section>

      <ConfirmDialog open={!!del} danger title="Delete this chat?" body={del ? `"${del.title}" will be removed from your history.` : ""} confirmLabel="Delete"
        onCancel={() => setDel(null)} onConfirm={() => { patchNotebook((d) => ({ ...d, codeChats: d.codeChats.filter((c) => c.id !== del!.id) })); if (activeId === del!.id) setActiveId(null); setDel(null); }} />
    </div>
  );
}
