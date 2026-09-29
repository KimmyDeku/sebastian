"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Container } from "@/components/ui/Page";
import { Shelf, SECTIONS } from "@/components/notebook/Shelf";
import { Research } from "@/components/notebook/Research";
import { Assignments } from "@/components/notebook/Assignments";
import { Coding } from "@/components/notebook/Coding";
import { Languages } from "@/components/notebook/Languages";
import { Tutor } from "@/components/notebook/Tutor";
import { useNotebook } from "@/lib/notebook";
import { useAccount, useData } from "@/lib/store";
import { formOfAddress, partOfDay } from "@/lib/address";
import { fmtDate, cx } from "@/lib/util";

function NotebookInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const acc = useAccount();
  const d = useData();
  const nb = useNotebook();
  const section = sp.get("s");
  const open = (k: string | null) => router.push(k ? `/notebook?s=${k}` : "/notebook");
  const who = formOfAddress(acc, d.prefs);

  const month = new Date().toISOString().slice(0, 7);
  const nextDue = nb.assignments.filter((a) => a.due && a.due >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.due.localeCompare(b.due))[0];
  const bestStreak = Math.max(0, ...nb.langs.map((l) => l.streak));
  const lastQuiz = nb.tutor.flatMap((t) => t.quizzes.map((q) => ({ ...q, subject: t.subject }))).sort((a, b) => b.at.localeCompare(a.at))[0];
  const stat: Record<string, string> = {
    research: nb.notebooks.length ? `${nb.notebooks.length} notebook${nb.notebooks.length === 1 ? "" : "s"}` : "Start a notebook",
    assignments: nextDue ? `Next due ${fmtDate(nextDue.due)}` : nb.assignments.length ? `${nb.assignments.length} planned` : "Plan an assignment",
    coding: (() => { const n = nb.codingUsage.filter((u) => u.at.startsWith(month)).length; return `${n} request${n === 1 ? "" : "s"} this month`; })(),
    languages: nb.langs.length ? `${bestStreak}-day streak` : "Pick a language",
    tutor: lastQuiz ? `${lastQuiz.subject}: last quiz ${lastQuiz.score}/${lastQuiz.total}` : "Find a tutor",
  };

  if (section && SECTIONS.some((s) => s.key === section)) {
    const meta = SECTIONS.find((s) => s.key === section)!;
    return (
      <Container>
        <button onClick={() => open(null)} className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink mb-4"><ChevronLeft className="w-4 h-4" />Library</button>
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 -mx-5 px-5 md:mx-0 md:px-0" role="tablist">
          {SECTIONS.map((s) => (
            <button key={s.key} role="tab" aria-selected={s.key === section} onClick={() => open(s.key)}
              className={cx("shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-pill border text-[13px]", s.key === section ? "bg-ink text-white border-ink" : "bg-paper border-line hover:bg-cream/60")}>
              <s.icon className="w-4 h-4" aria-hidden />{s.title}
            </button>
          ))}
        </div>
        <h1 className="t-h1">{meta.title}</h1>
        <p className="text-muted text-sm mt-1.5 mb-6">{meta.blurb}</p>
        {section === "research" && <Research />}
        {section === "assignments" && <Assignments />}
        {section === "coding" && <Coding />}
        {section === "languages" && <Languages />}
        {section === "tutor" && <Tutor />}
      </Container>
    );
  }

  return (
    <Container>
      <header className="mb-7">
        <p className="t-kicker text-muted">Your notebook</p>
        <h1 className="t-display text-[2rem] sm:text-4xl xl:text-5xl mt-2" suppressHydrationWarning>{partOfDay(acc?.timezone)}{who ? `, ${who}` : ""}.</h1>
        <p className="text-muted mt-2 text-[15px]">Welcome to your library. What shall we learn today? Choose a book to begin.</p>
      </header>
      <Shelf onOpen={open} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-6">
        {SECTIONS.map((s) => (
          <button key={s.key} onClick={() => open(s.key)} className="text-left rounded-2xl bg-paper border border-line p-4 hover:border-cream-line transition-colors">
            <span className="w-9 h-9 rounded-xl inline-flex items-center justify-center" style={{ background: s.color[0] }}><s.icon className="w-4 h-4 text-[#F3E3C3]" aria-hidden /></span>
            <span className="block font-serif text-lg mt-3">{s.title}</span>
            <span className="block text-[12.5px] text-muted mt-1 leading-snug">{s.blurb}</span>
            <span className="block text-[11.5px] text-gold-deep mt-2">{stat[s.key]}</span>
          </button>
        ))}
      </div>
    </Container>
  );
}

export default function NotebookPage() { return <Suspense><NotebookInner /></Suspense>; }
