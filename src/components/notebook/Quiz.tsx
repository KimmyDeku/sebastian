"use client";
import { useState } from "react";
import { Check, X, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "../ui/Button";
import { cx } from "@/lib/util";

export type QuizQ = { q: string; options: string[]; answer: number; explain?: string; skill?: string };

/** Multiple-choice quiz: one question at a time, with an explanation after each answer. */
export function Quiz({ questions, onDone, onClose }: { questions: QuizQ[]; onDone: (score: number, wrong: QuizQ[]) => void; onClose?: () => void }) {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState<QuizQ[]>([]);
  const [done, setDone] = useState(false);
  const q = questions[i];

  const choose = (k: number) => {
    if (pick != null) return;
    setPick(k);
    if (k === q.answer) setScore((s) => s + 1); else setWrong((w) => [...w, q]);
  };
  const next = () => {
    if (i + 1 < questions.length) { setI(i + 1); setPick(null); return; }
    setDone(true);
    onDone(score, wrong);
  };

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="text-center py-4">
        <p className="font-serif text-5xl">{score}/{questions.length}</p>
        <p className="text-sm text-muted mt-2">{pct >= 80 ? "Excellent work." : pct >= 50 ? "Good effort. A little more practice and you'll have it." : "A tricky one. Let's go over it together."}</p>
        {onClose && <Button className="mt-5" variant="outline" onClick={onClose}>Close</Button>}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between text-[12px] text-muted"><span>Question {i + 1} of {questions.length}</span><span>Score {score}</span></div>
      <div className="h-1 bg-line rounded-full mt-2 overflow-hidden"><div className="h-full bg-gold transition-all" style={{ width: `${(i / questions.length) * 100}%` }} /></div>
      <p className="font-serif text-xl mt-5 leading-snug">{q.q}</p>
      <div className="mt-4 space-y-2" role="radiogroup" aria-label="Answers">
        {q.options.map((o, k) => {
          const state = pick == null ? "" : k === q.answer ? "right" : k === pick ? "wrong" : "";
          return (
            <button key={k} role="radio" aria-checked={pick === k} onClick={() => choose(k)} disabled={pick != null}
              className={cx("w-full text-left rounded-2xl border px-4 py-3 text-[14px] flex items-center gap-3 transition-colors",
                state === "right" ? "border-success bg-[#EFF5F1] text-[#1C1B19]" : state === "wrong" ? "border-danger bg-[#FBF3F1] text-[#1C1B19]" : "border-line hover:border-cream-line bg-paper")}>
              <span className={cx("w-7 h-7 rounded-full border inline-flex items-center justify-center text-[12px] shrink-0", state === "right" ? "bg-success border-success text-white" : state === "wrong" ? "bg-danger border-danger text-white" : "border-line")}>
                {state === "right" ? <Check className="w-4 h-4" /> : state === "wrong" ? <X className="w-4 h-4" /> : String.fromCharCode(65 + k)}
              </span>{o}
            </button>
          );
        })}
      </div>
      {pick != null && (
        <div className="mt-4 rounded-2xl bg-canvas border border-line p-4 text-[13.5px] animate-fadeUp">
          <p className="font-medium">{pick === q.answer ? "That's right." : "Not quite."}</p>
          {q.explain && <p className="text-muted mt-1">{q.explain}</p>}
          <Button size="sm" className="mt-3" onClick={next}>{i + 1 < questions.length ? <>Next question<ArrowRight className="w-4 h-4" /></> : "See my score"}</Button>
        </div>
      )}
    </div>
  );
}

export function RetryHint({ onRetry }: { onRetry: () => void }) {
  return <button onClick={onRetry} className="inline-flex items-center gap-1 text-[12px] text-muted underline"><RotateCcw className="w-3 h-3" />Try another quiz</button>;
}
