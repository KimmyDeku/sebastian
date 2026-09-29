import { claude, claudeJSON, errorResponse, SEBASTIAN_CORE } from "@/lib/server/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const TEACHER = `${SEBASTIAN_CORE}
Role: a patient, encouraging teacher and study coach. Explain clearly, check understanding, and adapt to the learner's level. Support learning rather than doing graded work for the student.`;

// Keep requests within the AI's limits: sources are trimmed to about 14,000 characters in total.
function packSources(sources: any[]) {
  let budget = 14000;
  return (sources || []).map((s: any, i: number) => {
    const text = String(s.text || "").slice(0, Math.max(0, budget));
    budget -= text.length;
    return `[${i + 1}] ${s.title}\n${text}`;
  }).filter((x: string) => x.length > 6).join("\n\n");
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const mode = String(b.mode);

    // ---------- Research: answers only from the user's sources ----------
    if (mode === "ask") {
      const out = await claude({
        system: `${TEACHER}
You are a research assistant working ONLY from the numbered sources below. Cite them inline like [1] or [2]. If the sources don't contain the answer, say so plainly and suggest what source to add. Use short paragraphs and bullet points where helpful.
SOURCES:
${packSources(b.sources)}`,
        messages: (b.history || []).slice(-8).concat([{ role: "user", content: b.question }]), maxTokens: 1400, temperature: 0.3,
      });
      return Response.json({ ok: true, reply: out.trim() });
    }
    if (mode === "guide") {
      const kind = b.kind as "summary" | "study" | "faq";
      const ask = kind === "summary" ? "Write a clear summary (about 200 words) followed by 5 key takeaways."
        : kind === "faq" ? "Write 8 frequently asked questions with concise answers."
        : "Write a study guide: key concepts with definitions, important facts or dates, and 5 short-answer review questions.";
      const out = await claude({ system: `${TEACHER}\nWork ONLY from these numbered sources and cite them like [1].\nSOURCES:\n${packSources(b.sources)}`, messages: [{ role: "user", content: ask }], maxTokens: 1800, temperature: 0.3 });
      return Response.json({ ok: true, reply: out.trim() });
    }
    if (mode === "flashcards") {
      const r = await claudeJSON<any>(`${TEACHER}\nWork ONLY from these sources.\nSOURCES:\n${packSources(b.sources)}`, `Create 10 flashcards. Return {"cards":[{"front":"question or term","back":"answer"}]}`, 1800);
      return Response.json({ ok: true, cards: r.cards || [] });
    }

    // ---------- Quizzes (research sources or a tutoring topic) ----------
    if (mode === "quiz") {
      const basis = b.sources?.length ? `Base every question ONLY on these sources:\n${packSources(b.sources)}` : `Subject: ${b.subject}. Topic: ${b.topic}. Level: ${b.level}. The learner finds this hard: ${b.struggle || "not stated"}. Previously weak points: ${(b.weak || []).join("; ") || "none yet"}.`;
      const r = await claudeJSON<any>(TEACHER, `${basis}
Write ${b.count || 5} multiple-choice questions at the right level, mixing recall and understanding, and include questions on any weak points.
Return {"questions":[{"q":"question","options":["A","B","C","D"],"answer":0,"explain":"one or two sentences","skill":"the specific skill or sub-topic tested"}]}`, 2500);
      return Response.json({ ok: true, questions: (r.questions || []).filter((q: any) => Array.isArray(q.options) && q.options.length >= 2) });
    }
    if (mode === "review") {
      const r = await claudeJSON<any>(TEACHER, `A learner studying ${b.subject} (${b.topic}, ${b.level}) scored ${b.score}/${b.total}. Questions they got wrong: ${JSON.stringify(b.wrong || [])}. Their earlier scores on this subject: ${JSON.stringify(b.history || [])}.
Return {"weak":["up to 3 specific sub-skills to practise"],"improving":"one sentence on where they're improving compared with earlier scores, or empty","next":"one encouraging sentence on what to do next"}`, 700);
      return Response.json({ ok: true, ...r });
    }

    // ---------- Tutoring conversation ----------
    if (mode === "tutor") {
      const out = await claude({
        system: `${TEACHER}
You are tutoring ${b.subject} at ${b.level} level. Current topic: ${b.topic || "to be chosen"}. The learner finds this difficult: ${b.struggle || "not stated"}. Known weak points: ${(b.weak || []).join("; ") || "none yet"}.
Teach step by step with a small worked example, then ask ONE short question to check understanding. Keep each reply under 220 words. Use Markdown, and fenced code blocks only for code.`,
        messages: (b.messages || []).slice(-12), maxTokens: 1000, temperature: 0.5,
      });
      return Response.json({ ok: true, reply: out.trim() });
    }

    // ---------- Language lessons ----------
    if (mode === "lesson") {
      const r = await claudeJSON<any>(TEACHER, `Create a short ${b.language} lesson for a ${b.level} learner whose own language is English. Lesson number ${b.n || 1}; build on these recent topics: ${(b.recent || []).join(", ") || "none"}.
Return {"topic":"short title","intro":"one sentence","vocab":[{"word":"in ${b.language}","meaning":"English","say":"simple pronunciation guide"}] (5 items),
"exercises":[ 8 items mixing these types:
 {"type":"choose","prompt":"What does \\"...\\" mean?","options":["...","...","...","..."],"answer":0},
 {"type":"translate","prompt":"Translate into ${b.language}: ...","answers":["accepted answer","another accepted answer"]},
 {"type":"listen","text":"a short ${b.language} phrase to be read aloud","answers":["the same phrase written out"],"meaning":"English meaning"} ]}
Keep answers short. Write ${b.language} in its usual script.`, 3200);
      return Response.json({ ok: true, lesson: r });
    }

    // ---------- Assignments ----------
    if (mode === "plan") {
      const r = await claudeJSON<any>(TEACHER, `A student has this assignment. Subject: ${b.subject}. Title: ${b.title}. Brief: ${b.brief}. Length or format: ${b.length || "not stated"}. Due: ${b.due || "not stated"}. Today: ${b.today}.
Help them plan it; do not write the assignment for them.
Return {"understanding":"what the task is really asking, in 2 sentences","outline":[{"section":"...","points":["..."]}],"research":["specific things to look up or read"],"milestones":[{"date":"YYYY-MM-DD before the due date","task":"..."}],"checklist":["quality checks before submitting"]}`, 2500);
      return Response.json({ ok: true, plan: r });
    }
    if (mode === "feedback") {
      const r = await claudeJSON<any>(TEACHER, `Give feedback on this draft for the assignment "${b.title}" (${b.subject}). Brief: ${b.brief}.
DRAFT:
"""${String(b.draft || "").slice(0, 12000)}"""
Be specific and kind. Don't rewrite it; point to where and how to improve.
Return {"overall":"2 sentences","strengths":["..."],"improve":[{"where":"quote or section","how":"specific suggestion"}],"scores":[{"criterion":"Argument|Structure|Evidence|Clarity|Referencing","score":1-5}]}`, 2000);
      return Response.json({ ok: true, feedback: r });
    }
    return Response.json({ ok: false, error: "Unknown request." }, { status: 400 });
  } catch (e) { return errorResponse(e); }
}
