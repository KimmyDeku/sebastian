"use client";
import { useState } from "react";
import { Plus, Send, Sparkles, TrendingUp, Target, Trash2, Loader2, ChevronLeft } from "lucide-react";
import { Button } from "../ui/Button";
import { Field, inputCls, textareaCls, Option } from "../ui/Chip";
import { ConfirmDialog } from "../ui/Modal";
import { EmptyState } from "../ui/States";
import { Markdown } from "../Markdown";
import { Quiz, type QuizQ } from "./Quiz";
import { useNotebook, patchNotebook, newId, type TutorSubject } from "@/lib/notebook";
import { api } from "@/lib/api";
import { cx } from "@/lib/util";
import { toast } from "../ui/Toast";

const LEVELS = ["Primary school", "High school", "College / university", "Adult learner"];
const SUGGEST = ["Mathematics", "Physics", "Chemistry", "Biology", "English", "History", "Geography", "Accounting", "Economics", "Computer science"];

function Progress({ s }: { s: TutorSubject }) {
  const last = s.quizzes.slice(-8);
  const weak = [...new Set(s.quizzes.slice(-3).flatMap((q) => q.weak))].slice(0, 4);
  const trend = last.length >= 2 ? Math.round((last[last.length - 1].score / last[last.length - 1].total) * 100) - Math.round((last[last.length - 2].score / last[last.length - 2].total) * 100) : 0;
  return (
    <div className="rounded-2xl bg-paper border border-line p-4">
      <p className="text-sm font-medium inline-flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-gold" />Your progress</p>
      {!last.length ? <p className="text-[12.5px] text-muted mt-2">Take a quiz and I&apos;ll track how you improve.</p> : (<>
        <div className="flex items-end gap-1.5 h-24 mt-3" role="img" aria-label="Recent quiz scores">
          {last.map((q) => { const p = Math.round((q.score / q.total) * 100); return (
            <div key={q.id} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <span className="text-[10px] text-muted">{p}%</span>
              <div className={cx("w-full rounded-t-md", p >= 80 ? "bg-success" : p >= 50 ? "bg-gold" : "bg-danger/80")} style={{ height: `${Math.max(6, p)}%` }} />
            </div>); })}
        </div>
        {last.length >= 2 && <p className={cx("text-[12.5px] mt-3", trend > 0 ? "text-success" : trend < 0 ? "text-danger" : "text-muted")}>{trend > 0 ? `Up ${trend}% on your last quiz. You're improving.` : trend < 0 ? `Down ${-trend}% on your last quiz. Let's revisit the tricky parts.` : "Holding steady since your last quiz."}</p>}
        {weak.length > 0 && <div className="mt-3"><p className="text-[12px] text-muted inline-flex items-center gap-1"><Target className="w-3.5 h-3.5" />Practise next</p><div className="flex flex-wrap gap-1.5 mt-1.5">{weak.map((w) => <span key={w} className="text-[11.5px] bg-cream rounded-full px-2.5 py-1">{w}</span>)}</div></div>}
      </>)}
    </div>
  );
}

export function Tutor() {
  const nb = useNotebook();
  const [openId, setOpenId] = useState<string | null>(null);
  const [form, setForm] = useState({ subject: "", level: LEVELS[1], topic: "", struggle: "" });
  const [creating, setCreating] = useState(!nb.tutor.length);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizQ[] | null>(null);
  const [review, setReview] = useState<any>(null);
  const [del, setDel] = useState<TutorSubject | null>(null);
  const cur = nb.tutor.find((t) => t.id === openId) || null;
  const update = (id: string, fn: (t: TutorSubject) => TutorSubject) => patchNotebook((d) => ({ ...d, tutor: d.tutor.map((t) => (t.id === id ? fn(t) : t)) }));
  const weakOf = (t: TutorSubject) => [...new Set(t.quizzes.slice(-3).flatMap((q) => q.weak))];

  const say = async (t: TutorSubject, text: string) => {
    const messages = [...t.chat, { role: "user" as const, content: text }];
    update(t.id, (x) => ({ ...x, chat: messages }));
    setBusy("chat");
    const r = await api<any>("/api/notebook", { mode: "tutor", subject: t.subject, level: t.level, topic: t.topics[0], struggle: t.topics[1], weak: weakOf(t), messages });
    setBusy(null);
    update(t.id, (x) => ({ ...x, chat: [...x.chat, { role: "assistant", content: r.ok ? r.reply : `I couldn't reply just now: ${r.error}` }] }));
  };
  const start = () => {
    const t: TutorSubject = { id: newId("tu_"), subject: form.subject.trim(), level: form.level, topics: [form.topic.trim() || "Getting started", form.struggle.trim()], chat: [], quizzes: [], createdAt: new Date().toISOString() };
    patchNotebook((d) => ({ ...d, tutor: [t, ...d.tutor] }));
    setOpenId(t.id); setCreating(false); setForm({ subject: "", level: LEVELS[1], topic: "", struggle: "" });
    say(t, `I'd like help with ${t.subject}: ${t.topics[0]}.${t.topics[1] ? ` What I find hard: ${t.topics[1]}.` : ""}`);
  };
  const quizMe = async () => {
    if (!cur) return;
    setBusy("quiz"); setReview(null);
    const r = await api<any>("/api/notebook", { mode: "quiz", subject: cur.subject, topic: cur.topics[0], level: cur.level, struggle: cur.topics[1], weak: weakOf(cur), count: 5 });
    setBusy(null);
    if (r.ok && r.questions.length) setQuiz(r.questions); else toast.error(r.error || "A quiz couldn't be made.");
  };
  const finished = async (score: number, wrong: QuizQ[]) => {
    if (!cur) return;
    const total = quiz!.length;
    const r = await api<any>("/api/notebook", { mode: "review", subject: cur.subject, topic: cur.topics[0], level: cur.level, score, total, wrong: wrong.map((w) => ({ q: w.q, skill: w.skill })), history: cur.quizzes.slice(-5).map((q) => `${q.score}/${q.total}`) });
    const weak = r.ok ? r.weak || [] : wrong.map((w) => w.skill).filter(Boolean);
    update(cur.id, (x) => ({ ...x, quizzes: [...x.quizzes, { id: newId("qz_"), topic: x.topics[0], score, total, weak, at: new Date().toISOString() }] }));
    setReview(r.ok ? r : { weak });
  };

  if (creating || !cur) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
        <section className="rounded-2xl bg-paper border border-line p-5 md:p-6">
          <h2 className="t-h3">What would you like help with?</h2>
          <p className="text-[13px] text-muted mt-1">Tell me the subject and what feels difficult. I&apos;ll teach it step by step, then quiz you and track how you improve.</p>
          <div className="space-y-4 mt-5">
            <Field label="Subject"><input className={inputCls} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Mathematics" /></Field>
            <div className="flex flex-wrap gap-1.5">{SUGGEST.map((s) => <Option key={s} variant="chip" selected={form.subject === s} onClick={() => setForm({ ...form, subject: s })}>{s}</Option>)}</div>
            <div><p className="text-[13px] font-medium mb-1.5">Level</p><div role="radiogroup" className="flex flex-wrap gap-1.5">{LEVELS.map((l) => <Option key={l} variant="chip" selected={form.level === l} onClick={() => setForm({ ...form, level: l })}>{l}</Option>)}</div></div>
            <Field label="Topic"><input className={inputCls} value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Quadratic equations" /></Field>
            <Field label="What do you find difficult? (optional)"><textarea className={textareaCls + " min-h-[88px]"} value={form.struggle} onChange={(e) => setForm({ ...form, struggle: e.target.value })} placeholder="e.g. I don't understand when to use the formula" /></Field>
            <div className="flex gap-2">{nb.tutor.length > 0 && <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>}<Button onClick={start} disabled={!form.subject.trim()}>Start tutoring</Button></div>
          </div>
        </section>
        {nb.tutor.length > 0 && (
          <aside className="rounded-2xl bg-paper border border-line p-4">
            <p className="text-sm font-medium mb-2">Your subjects</p>
            <ul className="space-y-1">{nb.tutor.map((t) => { const q = t.quizzes.at(-1); return (
              <li key={t.id}><button onClick={() => { setOpenId(t.id); setCreating(false); setQuiz(null); setReview(null); }} className="w-full text-left rounded-xl px-3 py-2 hover:bg-cream/60">
                <span className="block text-[14px]">{t.subject}</span><span className="block text-[11.5px] text-muted">{t.topics[0]}{q ? ` · last quiz ${q.score}/${q.total}` : ""}</span>
              </button></li>); })}</ul>
          </aside>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
      <section className="space-y-4 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => setOpenId(null)} className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink"><ChevronLeft className="w-4 h-4" />All subjects</button>
          <div className="flex gap-2"><Button size="sm" onClick={quizMe} loading={busy === "quiz"}><Sparkles className="w-4 h-4" />Quiz me</Button><button onClick={() => setDel(cur)} aria-label="Delete subject" className="w-9 h-9 rounded-full hover:bg-cream inline-flex items-center justify-center text-muted"><Trash2 className="w-4 h-4" /></button></div>
        </div>
        <div><h2 className="font-serif text-2xl">{cur.subject}</h2><p className="text-[12.5px] text-muted">{cur.topics[0]} · {cur.level}</p></div>

        {quiz && (
          <div className="rounded-2xl bg-paper border border-line p-5">
            <Quiz questions={quiz} onDone={finished} onClose={() => { setQuiz(null); }} />
            {review && (
              <div className="mt-4 rounded-2xl bg-cream/50 border border-cream-line p-4 text-[13.5px] space-y-2">
                {review.improving && <p className="text-success">{review.improving}</p>}
                {review.weak?.length > 0 && <p><span className="text-muted">Let&apos;s practise:</span> {review.weak.join(", ")}</p>}
                {review.next && <p>{review.next}</p>}
                <Button size="sm" variant="outline" onClick={() => { setQuiz(null); say(cur, `Please help me with the parts I got wrong: ${(review.weak || []).join(", ")}.`); }}>Go over my mistakes</Button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          {cur.chat.map((m, i) => m.role === "user"
            ? <div key={i} className="flex justify-end"><div className="bg-ink text-white rounded-2xl rounded-br-md px-4 py-2.5 text-[13.5px] max-w-[85%]">{m.content}</div></div>
            : <div key={i} className="rounded-2xl bg-paper border border-line px-4 py-3 text-[14px] leading-relaxed"><Markdown text={m.content} /></div>)}
          {busy === "chat" && <p className="text-sm text-muted inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Your tutor is thinking…</p>}
        </div>
        <div className="flex gap-2">
          <label htmlFor="tu-msg" className="sr-only">Reply to your tutor</label>
          <input id="tu-msg" className={inputCls} placeholder="Answer the question, or ask anything…" value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && msg.trim()) { say(cur, msg); setMsg(""); } }} />
          <Button onClick={() => { if (msg.trim()) { say(cur, msg); setMsg(""); } }} disabled={!msg.trim() || busy === "chat"} aria-label="Send"><Send className="w-4 h-4" /></Button>
        </div>
      </section>
      <aside className="space-y-3">
        <Progress s={cur} />
        <Button variant="outline" className="w-full" onClick={() => setCreating(true)}><Plus className="w-4 h-4" />Another subject</Button>
      </aside>
      <ConfirmDialog open={!!del} danger title="Delete this subject?" body="Its lessons and quiz history will be removed." confirmLabel="Delete"
        onCancel={() => setDel(null)} onConfirm={() => { patchNotebook((d) => ({ ...d, tutor: d.tutor.filter((t) => t.id !== del!.id) })); setOpenId(null); setDel(null); }} />
    </div>
  );
}
