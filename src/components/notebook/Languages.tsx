"use client";
import { useState } from "react";
import { Flame, Star, Volume2, Check, X, ArrowRight, BookOpen, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "../ui/Button";
import { inputCls, Option } from "../ui/Chip";
import { ErrorState } from "../ui/States";
import { useNotebook, patchNotebook, type LangState } from "@/lib/notebook";
import { api } from "@/lib/api";
import { cx } from "@/lib/util";

export const LEARN = [
  { name: "Spanish", flag: "🇪🇸", voice: "es-ES" }, { name: "French", flag: "🇫🇷", voice: "fr-FR" }, { name: "German", flag: "🇩🇪", voice: "de-DE" },
  { name: "Portuguese", flag: "🇵🇹", voice: "pt-PT" }, { name: "Italian", flag: "🇮🇹", voice: "it-IT" }, { name: "Japanese", flag: "🇯🇵", voice: "ja-JP" },
  { name: "Chinese (Mandarin)", flag: "🇨🇳", voice: "zh-CN" }, { name: "Korean", flag: "🇰🇷", voice: "ko-KR" }, { name: "Arabic", flag: "🇸🇦", voice: "ar-SA" },
  { name: "Swahili", flag: "🇰🇪", voice: "sw-KE" }, { name: "Shona", flag: "🇿🇼", voice: "" }, { name: "Ndebele", flag: "🇿🇼", voice: "" },
];
const LEVELS = ["Beginner", "Elementary", "Intermediate", "Advanced"];
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();
const dayKey = () => new Date().toISOString().slice(0, 10);

function speakIn(text: string, voice: string) {
  if (!voice || typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice; u.rate = 0.85;
  const v = window.speechSynthesis.getVoices().find((x) => x.lang.toLowerCase().startsWith(voice.slice(0, 2)));
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
  return true;
}

function Lesson({ lesson, voice, onFinish, onExit }: { lesson: any; voice: string; onFinish: (correct: number, total: number) => void; onExit: () => void }) {
  const canListen = !!voice && typeof window !== "undefined" && "speechSynthesis" in window;
  const exercises: any[] = (lesson.exercises || []).filter((e: any) => canListen || e.type !== "listen");
  const [stage, setStage] = useState<"vocab" | "ex" | "done">("vocab");
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState("");
  const [pick, setPick] = useState<number | null>(null);
  const [result, setResult] = useState<null | boolean>(null);
  const [correct, setCorrect] = useState(0);
  const e = exercises[i];

  const check = () => {
    const ok = e.type === "choose" ? pick === e.answer : (e.answers || []).some((a: string) => norm(a) === norm(typed));
    setResult(ok);
    if (ok) setCorrect((c) => c + 1);
  };
  const next = () => {
    if (i + 1 < exercises.length) { setI(i + 1); setTyped(""); setPick(null); setResult(null); return; }
    setStage("done");
    onFinish(correct, exercises.length);
  };

  if (stage === "vocab") return (
    <div className="rounded-2xl bg-paper border border-line p-5 md:p-6">
      <p className="t-kicker text-muted">New words</p>
      <h3 className="font-serif text-2xl mt-1">{lesson.topic}</h3>
      {lesson.intro && <p className="text-[13.5px] text-muted mt-1">{lesson.intro}</p>}
      <ul className="grid sm:grid-cols-2 gap-2 mt-4">
        {(lesson.vocab || []).map((v: any) => (
          <li key={v.word} className="rounded-2xl bg-canvas border border-line p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0"><p className="text-[16px] font-medium">{v.word}</p><p className="text-[12.5px] text-muted">{v.meaning}{v.say ? ` · ${v.say}` : ""}</p></div>
            {canListen && <button onClick={() => speakIn(v.word, voice)} aria-label={`Hear ${v.word}`} className="w-9 h-9 rounded-full border border-line inline-flex items-center justify-center"><Volume2 className="w-4 h-4" /></button>}
          </li>
        ))}
      </ul>
      <div className="flex justify-between mt-5"><Button variant="ghost" onClick={onExit}>Exit</Button><Button onClick={() => setStage("ex")}>Start practice<ArrowRight className="w-4 h-4" /></Button></div>
    </div>
  );

  if (stage === "done") {
    const pct = Math.round((correct / Math.max(1, exercises.length)) * 100);
    return (
      <div className="rounded-2xl bg-paper border border-line p-8 text-center">
        <p className="text-4xl">{pct >= 80 ? "🎉" : pct >= 50 ? "👏" : "💪"}</p>
        <p className="font-serif text-3xl mt-3">{correct}/{exercises.length} correct</p>
        <p className="text-sm text-muted mt-1">+{correct * 10} XP</p>
        <Button className="mt-5" onClick={onExit}>Back to my course</Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-paper border border-line p-5 md:p-6">
      <div className="flex items-center gap-3">
        <button onClick={onExit} aria-label="Exit lesson" className="w-8 h-8 rounded-full hover:bg-cream inline-flex items-center justify-center"><X className="w-4 h-4" /></button>
        <div className="flex-1 h-2.5 bg-line rounded-full overflow-hidden"><div className="h-full bg-success transition-all" style={{ width: `${(i / exercises.length) * 100}%` }} /></div>
      </div>
      <p className="text-[12px] text-muted mt-5">{e.type === "choose" ? "Choose the right answer" : e.type === "listen" ? "Listen and write what you hear" : "Translate"}</p>
      {e.type === "listen" ? (
        <div className="mt-3 flex items-center gap-3"><button onClick={() => speakIn(e.text, voice)} className="w-16 h-16 rounded-2xl bg-gold text-white inline-flex items-center justify-center" aria-label="Play the phrase"><Volume2 className="w-7 h-7" /></button><p className="text-[13px] text-muted">Tap to listen again</p></div>
      ) : <p className="font-serif text-2xl mt-2 leading-snug">{e.prompt}</p>}

      {e.type === "choose" ? (
        <div className="grid sm:grid-cols-2 gap-2 mt-4" role="radiogroup">{e.options.map((o: string, k: number) => <Option key={k} variant="row" selected={pick === k} onClick={() => result == null && setPick(k)}>{o}</Option>)}</div>
      ) : (
        <input autoFocus className={inputCls + " mt-4"} value={typed} onChange={(ev) => setTyped(ev.target.value)} onKeyDown={(ev) => ev.key === "Enter" && result == null && typed.trim() && check()} placeholder={e.type === "listen" ? "Type what you hear" : "Type your answer"} disabled={result != null} />
      )}

      {result == null ? (
        <div className="flex justify-end mt-5"><Button onClick={check} disabled={e.type === "choose" ? pick == null : !typed.trim()}>Check</Button></div>
      ) : (
        <div className={cx("mt-5 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3", result ? "bg-[#EFF5F1]" : "bg-[#FBF3F1]")}>
          <div className="text-[#1C1B19]">
            <p className="font-medium inline-flex items-center gap-1.5">{result ? <><Check className="w-4 h-4 text-success" />Correct!</> : <><X className="w-4 h-4 text-danger" />Not quite</>}</p>
            {!result && <p className="text-[13px] mt-0.5">Answer: {e.type === "choose" ? e.options[e.answer] : e.answers?.[0]}</p>}
            {e.type === "listen" && e.meaning && <p className="text-[12.5px] opacity-70 mt-0.5">Meaning: {e.meaning}</p>}
          </div>
          <Button onClick={next}>{i + 1 < exercises.length ? "Continue" : "Finish"}</Button>
        </div>
      )}
    </div>
  );
}

export function Languages() {
  const nb = useNotebook();
  const [active, setActive] = useState<string | null>(nb.langs[0]?.language || null);
  const [choosing, setChoosing] = useState(!nb.langs.length);
  const [pickLang, setPickLang] = useState(""); const [pickLevel, setPickLevel] = useState(LEVELS[0]);
  const [lesson, setLesson] = useState<any>(null);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const st = nb.langs.find((l) => l.language === active) || null;
  const meta = LEARN.find((l) => l.name === active);

  const save = (lang: string, fn: (l: LangState) => LangState) => patchNotebook((d) => ({ ...d, langs: d.langs.map((l) => (l.language === lang ? fn(l) : l)) }));
  const begin = () => {
    if (!nb.langs.some((l) => l.language === pickLang)) patchNotebook((d) => ({ ...d, langs: [...d.langs, { language: pickLang, level: pickLevel, xp: 0, streak: 0, lastDay: "", lessons: 0, history: [] }] }));
    setActive(pickLang); setChoosing(false);
  };
  const startLesson = async () => {
    if (!st) return;
    setBusy(true); setErr("");
    const r = await api<any>("/api/notebook", { mode: "lesson", language: st.language, level: st.level, n: st.lessons + 1, recent: st.history.slice(-4).map((h) => h.topic) });
    setBusy(false);
    if (r.ok && r.lesson?.exercises?.length) setLesson(r.lesson); else setErr(r.error || "The lesson couldn't be prepared.");
  };
  const finish = (correct: number, total: number) => {
    if (!st) return;
    const today = dayKey();
    const y = new Date(); y.setDate(y.getDate() - 1);
    const streak = st.lastDay === today ? st.streak : st.lastDay === y.toISOString().slice(0, 10) ? st.streak + 1 : 1;
    save(st.language, (l) => ({ ...l, xp: l.xp + correct * 10, streak, lastDay: today, lessons: l.lessons + 1, history: [...l.history, { at: new Date().toISOString(), correct, total, topic: lesson.topic }].slice(-60) }));
  };

  if (choosing) return (
    <div className="rounded-2xl bg-paper border border-line p-5 md:p-6">
      {nb.langs.length > 0 && <button onClick={() => setChoosing(false)} className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink mb-3"><ChevronLeft className="w-4 h-4" />Back</button>}
      <h2 className="t-h3">Which language would you like to learn?</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-4" role="radiogroup">
        {LEARN.map((l) => (
          <button key={l.name} role="radio" aria-checked={pickLang === l.name} onClick={() => setPickLang(l.name)}
            className={cx("rounded-2xl border p-4 text-left transition-colors", pickLang === l.name ? "border-gold bg-gold-soft/40" : "border-line hover:border-cream-line")}>
            <span className="text-2xl" aria-hidden>{l.flag}</span><span className="block text-[14px] mt-1">{l.name}</span>
          </button>
        ))}
      </div>
      <p className="text-[13px] font-medium mt-5 mb-2">Your level</p>
      <div className="flex flex-wrap gap-1.5" role="radiogroup">{LEVELS.map((l) => <Option key={l} variant="chip" selected={pickLevel === l} onClick={() => setPickLevel(l)}>{l}</Option>)}</div>
      {pickLang && !LEARN.find((l) => l.name === pickLang)?.voice && <p className="text-[12px] text-muted mt-3">Listening exercises aren&apos;t available for {pickLang} yet, as browsers don&apos;t have a voice for it. Reading and translation still work.</p>}
      <Button className="mt-5" onClick={begin} disabled={!pickLang}>Start learning</Button>
    </div>
  );

  if (!st) return null;
  if (lesson) return <Lesson lesson={lesson} voice={meta?.voice || ""} onFinish={finish} onExit={() => setLesson(null)} />;

  const recent = st.history.slice(-7);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
      <section className="rounded-2xl bg-paper border border-line p-5 md:p-6">
        <div className="flex items-center gap-3"><span className="text-4xl" aria-hidden>{meta?.flag}</span><div><h2 className="font-serif text-2xl">{st.language}</h2><p className="text-[12.5px] text-muted">{st.level} · {st.lessons} lesson{st.lessons === 1 ? "" : "s"} completed</p></div></div>
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="rounded-2xl bg-canvas border border-line p-3 text-center"><Flame className="w-5 h-5 mx-auto text-[#E07A2E]" /><p className="font-serif text-2xl mt-1">{st.streak}</p><p className="text-[11px] text-muted">day streak</p></div>
          <div className="rounded-2xl bg-canvas border border-line p-3 text-center"><Star className="w-5 h-5 mx-auto text-gold" /><p className="font-serif text-2xl mt-1">{st.xp}</p><p className="text-[11px] text-muted">XP</p></div>
          <div className="rounded-2xl bg-canvas border border-line p-3 text-center"><BookOpen className="w-5 h-5 mx-auto text-success" /><p className="font-serif text-2xl mt-1">{st.lessons}</p><p className="text-[11px] text-muted">lessons</p></div>
        </div>
        {err && <div className="mt-4"><ErrorState body={err} onRetry={startLesson} /></div>}
        <Button className="mt-5 w-full" size="lg" onClick={startLesson} loading={busy}>{busy ? "Preparing your lesson…" : st.lastDay === dayKey() ? "Practise another lesson" : "Start today's lesson"}</Button>
        {recent.length > 0 && (
          <div className="mt-5"><p className="text-[12px] text-muted mb-2">Recent lessons</p>
            <ul className="space-y-1.5">{recent.reverse().map((h) => <li key={h.at} className="flex justify-between text-[13px]"><span>{h.topic}</span><span className="text-muted">{h.correct}/{h.total}</span></li>)}</ul>
          </div>
        )}
      </section>
      <aside className="rounded-2xl bg-paper border border-line p-4 space-y-2">
        <p className="text-sm font-medium">Your languages</p>
        {nb.langs.map((l) => { const m = LEARN.find((x) => x.name === l.language); return (
          <button key={l.language} onClick={() => setActive(l.language)} className={cx("w-full text-left rounded-xl px-3 py-2 flex items-center gap-2", l.language === active ? "bg-cream" : "hover:bg-cream/50")}>
            <span aria-hidden>{m?.flag}</span><span className="flex-1 text-[13.5px]">{l.language}</span><span className="text-[11.5px] text-muted">{l.xp} XP</span>
          </button>); })}
        <Button size="sm" variant="outline" className="w-full" onClick={() => { setPickLang(""); setChoosing(true); }}>Add a language</Button>
      </aside>
    </div>
  );
}
