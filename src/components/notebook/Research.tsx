"use client";
import { useRef, useState } from "react";
import { Plus, FileText, Link2, Upload, Trash2, Send, BookMarked, ListChecks, HelpCircle, Layers, Sparkles, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "../ui/Button";
import { Field, inputCls, textareaCls } from "../ui/Chip";
import { Modal, ConfirmDialog } from "../ui/Modal";
import { EmptyState, Notice } from "../ui/States";
import { Markdown } from "../Markdown";
import { Quiz, type QuizQ } from "./Quiz";
import { useNotebook, patchNotebook, newId, type Notebook, type Source } from "@/lib/notebook";
import { api } from "@/lib/api";
import { cx } from "@/lib/util";
import { toast } from "../ui/Toast";

function AddSource({ onAdd, onClose }: { onAdd: (s: Omit<Source, "id" | "addedAt">) => void; onClose: () => void }) {
  const [tab, setTab] = useState<"paste" | "file" | "link">("paste");
  const [title, setTitle] = useState(""); const [text, setText] = useState(""); const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const fromLink = async () => {
    setBusy(true); setErr("");
    const r = await api<any>("/api/notebook/url", { url });
    setBusy(false);
    if (!r.ok) { setErr(r.error || "That page couldn't be read."); return; }
    onAdd({ title: r.title, text: r.text, url: r.url });
  };
  const fromFile = async (f: File) => {
    if (f.size > 2 * 1024 * 1024) { setErr("Please choose a text file under 2 MB."); return; }
    if (!/\.(txt|md|csv|json|html?)$/i.test(f.name) && !/^text\//.test(f.type)) { setErr("Text files work best: .txt, .md or .csv. For PDFs and Word files, copy the text and paste it in."); return; }
    onAdd({ title: f.name.replace(/\.[^.]+$/, ""), text: (await f.text()).slice(0, 60000) });
  };
  return (
    <Modal open onClose={onClose} title="Add a source">
      <div role="tablist" className="grid grid-cols-3 rounded-xl border border-line p-1 mb-4">
        {([["paste", "Paste text", FileText], ["file", "Upload file", Upload], ["link", "Web link", Link2]] as const).map(([k, l, I]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setErr(""); }} className={cx("h-9 rounded-lg text-[13px] inline-flex items-center justify-center gap-1.5", tab === k ? "bg-cream" : "text-muted")}><I className="w-4 h-4" />{l}</button>
        ))}
      </div>
      {err && <Notice tone="warning" className="mb-3">{err}</Notice>}
      {tab === "paste" && (<div className="space-y-3">
        <Field label="Title"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lecture 3 notes" /></Field>
        <Field label="Text"><textarea className={textareaCls + " min-h-[180px]"} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste notes, an article or a chapter" /></Field>
        <div className="flex justify-end"><Button onClick={() => onAdd({ title: title.trim() || "Pasted notes", text: text.slice(0, 60000) })} disabled={text.trim().length < 20}>Add source</Button></div>
      </div>)}
      {tab === "file" && (<div className="text-center py-6">
        <input ref={file} type="file" hidden accept=".txt,.md,.csv,.json,.html,text/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) fromFile(f); e.target.value = ""; }} />
        <Button variant="outline" onClick={() => file.current?.click()}><Upload className="w-4 h-4" />Choose a text file</Button>
        <p className="text-[12px] text-muted mt-3">.txt, .md or .csv, up to 2 MB</p>
      </div>)}
      {tab === "link" && (<div className="space-y-3">
        <Field label="Web address"><input type="url" className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></Field>
        <div className="flex justify-end"><Button onClick={fromLink} loading={busy} disabled={!/^https?:\/\//.test(url)}>Add page</Button></div>
      </div>)}
    </Modal>
  );
}

export function Research() {
  const nb = useNotebook();
  const [openId, setOpenId] = useState<string | null>(nb.notebooks[0]?.id || null);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [cards, setCards] = useState<{ front: string; back: string }[] | null>(null);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [quiz, setQuiz] = useState<QuizQ[] | null>(null);
  const [del, setDel] = useState<Notebook | null>(null);
  const cur = nb.notebooks.find((n) => n.id === openId) || null;

  const update = (id: string, fn: (n: Notebook) => Notebook) => patchNotebook((d) => ({ ...d, notebooks: d.notebooks.map((n) => (n.id === id ? { ...fn(n), updatedAt: new Date().toISOString() } : n)) }));
  const create = () => {
    const n: Notebook = { id: newId("nb_"), title: `Notebook ${nb.notebooks.length + 1}`, sources: [], chat: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    patchNotebook((d) => ({ ...d, notebooks: [n, ...d.notebooks] }));
    setOpenId(n.id);
  };
  const ask = async (question: string) => {
    if (!cur || !question.trim()) return;
    const history = cur.chat;
    update(cur.id, (n) => ({ ...n, chat: [...n.chat, { role: "user", content: question }] }));
    setQ(""); setBusy("ask");
    const r = await api<any>("/api/notebook", { mode: "ask", sources: cur.sources, question, history });
    setBusy(null);
    update(cur.id, (n) => ({ ...n, chat: [...n.chat, { role: "assistant", content: r.ok ? r.reply : `I couldn't answer that: ${r.error}` }] }));
  };
  const guide = async (kind: "summary" | "study" | "faq") => {
    if (!cur) return;
    setBusy(kind);
    const r = await api<any>("/api/notebook", { mode: "guide", kind, sources: cur.sources });
    setBusy(null);
    const label = { summary: "Summary", study: "Study guide", faq: "FAQ" }[kind];
    update(cur.id, (n) => ({ ...n, chat: [...n.chat, { role: "user", content: `Make a ${label.toLowerCase()}` }, { role: "assistant", content: r.ok ? r.reply : `That couldn't be made: ${r.error}` }] }));
  };
  const makeCards = async () => { if (!cur) return; setBusy("cards"); const r = await api<any>("/api/notebook", { mode: "flashcards", sources: cur.sources }); setBusy(null); if (r.ok) { setCards(r.cards); setFlipped({}); } else toast.error(r.error || "Flashcards couldn't be made."); };
  const makeQuiz = async () => { if (!cur) return; setBusy("quiz"); const r = await api<any>("/api/notebook", { mode: "quiz", sources: cur.sources, count: 6 }); setBusy(null); if (r.ok && r.questions.length) setQuiz(r.questions); else toast.error(r.error || "A quiz couldn't be made."); };

  if (!nb.notebooks.length)
    return <EmptyState title="Start your first notebook" body="Add lecture notes, articles or web pages, and I'll answer questions using only those sources, with citations." action={<Button onClick={create}><Plus className="w-4 h-4" />New notebook</Button>} />;

  const hasSources = !!cur?.sources.length;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-5 items-start">
      <aside className="space-y-3">
        <Button className="w-full" onClick={create}><Plus className="w-4 h-4" />New notebook</Button>
        <ul className="space-y-1.5">
          {nb.notebooks.map((n) => (
            <li key={n.id}><button onClick={() => { setOpenId(n.id); setCards(null); setQuiz(null); }} className={cx("w-full text-left rounded-xl px-3 py-2.5 border", n.id === openId ? "bg-cream border-cream-line" : "border-transparent hover:bg-cream/50")}>
              <span className="block text-[14px] truncate">{n.title}</span><span className="block text-[11.5px] text-muted">{n.sources.length} source{n.sources.length === 1 ? "" : "s"}</span>
            </button></li>
          ))}
        </ul>
        <a href="https://notebooklm.google.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[12px] text-muted hover:text-ink px-1"><ExternalLink className="w-3.5 h-3.5" />Open Google NotebookLM</a>
      </aside>

      {cur && (
        <section className="space-y-4 min-w-0">
          <div className="rounded-2xl bg-paper border border-line p-4 md:p-5">
            <div className="flex items-center gap-2">
              <input aria-label="Notebook title" value={cur.title} onChange={(e) => update(cur.id, (n) => ({ ...n, title: e.target.value }))} className="flex-1 min-w-0 font-serif text-2xl bg-transparent outline-none" />
              <button onClick={() => setDel(cur)} aria-label="Delete notebook" className="w-9 h-9 rounded-full hover:bg-cream inline-flex items-center justify-center text-muted"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {cur.sources.map((s, i) => (
                <span key={s.id} className="inline-flex items-center gap-1.5 h-8 pl-3 pr-1 rounded-pill bg-cream text-[12.5px] max-w-full">
                  <span className="text-gold-deep font-medium">[{i + 1}]</span><span className="truncate max-w-[180px]">{s.title}</span>
                  <button onClick={() => update(cur.id, (n) => ({ ...n, sources: n.sources.filter((x) => x.id !== s.id) }))} aria-label={`Remove ${s.title}`} className="w-6 h-6 rounded-full hover:bg-cream-deep inline-flex items-center justify-center"><Trash2 className="w-3 h-3" /></button>
                </span>
              ))}
              <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-pill border border-dashed border-cream-line text-[12.5px] hover:bg-cream/60"><Plus className="w-3.5 h-3.5" />Add source</button>
            </div>
            {hasSources && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-line">
                {([["summary", "Summary", BookMarked], ["study", "Study guide", ListChecks], ["faq", "FAQ", HelpCircle]] as const).map(([k, l, I]) => (
                  <Button key={k} size="sm" variant="outline" onClick={() => guide(k)} loading={busy === k}><I className="w-4 h-4" />{l}</Button>
                ))}
                <Button size="sm" variant="outline" onClick={makeCards} loading={busy === "cards"}><Layers className="w-4 h-4" />Flashcards</Button>
                <Button size="sm" variant="outline" onClick={makeQuiz} loading={busy === "quiz"}><Sparkles className="w-4 h-4" />Quiz me</Button>
              </div>
            )}
          </div>

          {!hasSources && <Notice>Add at least one source. I only answer from your sources, so you can trust where each point comes from.</Notice>}

          {cards && (
            <div className="rounded-2xl bg-paper border border-line p-4 md:p-5">
              <div className="flex justify-between items-center mb-3"><p className="text-sm font-medium">Flashcards · tap to flip</p><button onClick={() => setCards(null)} className="text-[12px] text-muted underline">Close</button></div>
              <div className="grid sm:grid-cols-2 gap-3">
                {cards.map((c, i) => (
                  <button key={i} onClick={() => setFlipped((f) => ({ ...f, [i]: !f[i] }))} className={cx("min-h-[110px] rounded-2xl border p-4 text-left text-[14px] transition-colors", flipped[i] ? "bg-ink text-white border-ink" : "bg-cream/50 border-cream-line")}>
                    <span className="block text-[10.5px] opacity-60 mb-1">{flipped[i] ? "Answer" : "Question"}</span>{flipped[i] ? c.back : c.front}
                  </button>
                ))}
              </div>
            </div>
          )}

          {quiz && <div className="rounded-2xl bg-paper border border-line p-5"><Quiz questions={quiz} onDone={() => {}} onClose={() => setQuiz(null)} /></div>}

          {cur.chat.length > 0 && (
            <div className="space-y-3">
              {cur.chat.map((m, i) => m.role === "user"
                ? <div key={i} className="flex justify-end"><div className="bg-ink text-white rounded-2xl rounded-br-md px-4 py-2.5 text-[13.5px] max-w-[85%]">{m.content}</div></div>
                : <div key={i} className="rounded-2xl bg-paper border border-line px-4 py-3 text-[14px] leading-relaxed"><Markdown text={m.content} /></div>)}
            </div>
          )}
          {busy === "ask" && <p className="text-sm text-muted inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Reading your sources…</p>}

          <div className="flex gap-2">
            <label htmlFor="nb-q" className="sr-only">Ask about your sources</label>
            <input id="nb-q" className={inputCls} placeholder={hasSources ? "Ask anything about your sources…" : "Add a source first"} disabled={!hasSources} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask(q)} />
            <Button onClick={() => ask(q)} disabled={!hasSources || !q.trim() || busy === "ask"} aria-label="Ask"><Send className="w-4 h-4" /></Button>
          </div>
        </section>
      )}

      {adding && cur && <AddSource onClose={() => setAdding(false)} onAdd={(s) => { update(cur.id, (n) => ({ ...n, sources: [...n.sources, { ...s, id: newId("src_"), addedAt: new Date().toISOString() }] })); setAdding(false); toast.success("Source added."); }} />}
      <ConfirmDialog open={!!del} danger title="Delete this notebook?" body="Its sources and conversation will be removed." confirmLabel="Delete"
        onCancel={() => setDel(null)} onConfirm={() => { patchNotebook((d) => ({ ...d, notebooks: d.notebooks.filter((n) => n.id !== del!.id) })); setOpenId(null); setDel(null); }} />
    </div>
  );
}
