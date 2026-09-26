"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, Volume2, Mic, Square, ListChecks, RotateCcw } from "lucide-react";
import type { Recipe } from "@/lib/types";
import { useSpeaker, useSpeechRecognition, voiceMessage } from "@/lib/voice";
import { SebastianMark, Waveform } from "../SebastianMark";
import { api } from "@/lib/api";
import { useData } from "@/lib/store";

/** Hands-free cooking: reads steps aloud and accepts voice commands. */
export function ChefMode({ recipe, onExit }: { recipe: Recipe; onExit: () => void }) {
  const [i, setI] = useState(0);
  const [showIng, setShowIng] = useState(false);
  const [answer, setAnswer] = useState("");
  const [thinking, setThinking] = useState(false);
  const { speak, cancel, speaking } = useSpeaker();
  const d = useData();
  const idx = useRef(0);
  idx.current = i;
  const n = recipe.steps.length;

  const readStep = useCallback((k: number) => speak(`Step ${k + 1}. ${recipe.steps[k]}`, d.prefs.voiceName), [recipe, speak, d.prefs.voiceName]);
  const go = useCallback((k: number) => { const t = Math.max(0, Math.min(n - 1, k)); setI(t); setAnswer(""); readStep(t); }, [n, readStep]);

  const askChef = useCallback(async (q: string) => {
    setThinking(true);
    const r = await api<{ reply: string }>("/api/chat", {
      messages: [{ role: "user", content: `I'm cooking "${recipe.title}" and I'm on step ${idx.current + 1}: "${recipe.steps[idx.current]}". Ingredients: ${recipe.ingredients.join("; ")}. As a friendly expert chef, answer briefly (2-3 sentences, no routing): ${q}` }],
      context: {},
    });
    setThinking(false);
    const text = r.ok ? r.reply : "I can't reach my kitchen notes right now. Say next, back, repeat or ingredients and I'll guide you.";
    setAnswer(text);
    speak(text, d.prefs.voiceName);
  }, [recipe, speak, d.prefs.voiceName]);

  const onVoice = useCallback((t: string) => {
    const s = t.toLowerCase();
    if (/\b(next|continue|done|go on)\b/.test(s)) go(idx.current + 1);
    else if (/\b(back|previous|go back)\b/.test(s)) go(idx.current - 1);
    else if (/\b(repeat|again|say that)\b/.test(s)) readStep(idx.current);
    else if (/\b(start over|restart|first step)\b/.test(s)) go(0);
    else if (/\bingredient/.test(s)) { setShowIng(true); speak("You'll need: " + recipe.ingredients.join(", "), d.prefs.voiceName); }
    else if (/\b(stop|exit|quit|finish)\b/.test(s)) { cancel(); onExit(); }
    else askChef(t);
  }, [go, readStep, askChef, cancel, onExit, recipe, speak, d.prefs.voiceName]);

  const mic = useSpeechRecognition(onVoice, { continuous: true });

  useEffect(() => {
    speak(`Let's cook ${recipe.title}. There are ${n} steps. Say next, back, repeat, ingredients, or ask me anything. Step 1. ${recipe.steps[0]}`, d.prefs.voiceName);
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "ArrowRight") go(idx.current + 1); if (e.key === "ArrowLeft") go(idx.current - 1); if (e.key === "Escape") { cancel(); onExit(); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [go, cancel, onExit]);

  const listening = mic.state === "listening";
  return (
    <div role="dialog" aria-modal="true" aria-label={`Chef mode: ${recipe.title}`} className="fixed inset-0 z-[75] bg-canvas flex flex-col">
      <div className="flex items-center justify-between px-5 md:px-10 h-20 border-b border-line">
        <div className="flex items-center gap-3 min-w-0">
          <SebastianMark size={40} state={thinking ? "thinking" : speaking ? "speaking" : listening ? "listening" : "idle"} />
          <div className="min-w-0"><p className="text-xs text-muted">Chef mode</p><p className="font-serif text-lg truncate">{recipe.title}</p></div>
        </div>
        <button onClick={() => { cancel(); mic.stop(); onExit(); }} className="inline-flex items-center gap-2 h-10 px-4 rounded-pill border border-line bg-paper text-sm"><X className="w-4 h-4" />Exit</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-10 md:py-16">
          <p className="text-sm text-muted">Step {i + 1} of {n}</p>
          <div className="h-1 bg-line rounded-full mt-3 overflow-hidden"><div className="h-full bg-gold transition-all" style={{ width: `${((i + 1) / n) * 100}%` }} /></div>
          <p className="font-serif text-2xl md:text-[2.2rem] leading-snug mt-10" aria-live="polite">{recipe.steps[i]}</p>
          {answer && <div className="mt-8 rounded-2xl bg-[#F4F1FC] border border-[#DCD3F6] p-5 text-[15px]"><p className="text-xs text-glow mb-1">Sebastian</p>{answer}</div>}
          {showIng && (
            <div className="mt-8 rounded-2xl bg-paper border border-line p-5">
              <div className="flex justify-between items-center"><h3 className="t-h3">Ingredients</h3><button onClick={() => setShowIng(false)} className="text-sm text-muted">Hide</button></div>
              <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">{recipe.ingredients.map((x, k) => <li key={k}>{x}</li>)}</ul>
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-line bg-paper pb-safe">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between gap-3">
          <button onClick={() => go(i - 1)} disabled={i === 0} className="h-12 px-5 rounded-pill border border-line inline-flex items-center gap-2 disabled:opacity-40"><ChevronLeft className="w-5 h-5" /><span className="hidden sm:inline">Back</span></button>
          <div className="flex items-center gap-2">
            <button onClick={() => (speaking ? cancel() : readStep(i))} aria-label={speaking ? "Stop reading" : "Read step aloud"} className="w-12 h-12 rounded-full border border-line inline-flex items-center justify-center">{speaking ? <Square className="w-4 h-4" /> : <Volume2 className="w-5 h-5" />}</button>
            <button onClick={() => (listening ? mic.stop() : mic.start())} aria-pressed={listening} aria-label={listening ? "Stop voice commands" : "Start voice commands"} className={`h-12 px-5 rounded-pill inline-flex items-center gap-2 ${listening ? "bg-glow text-white shadow-thinking" : "border border-line"}`}>
              {listening ? <><Waveform active /><span className="text-sm">Listening</span></> : <><Mic className="w-5 h-5" /><span className="text-sm hidden sm:inline">Voice</span></>}
            </button>
            <button onClick={() => setShowIng(!showIng)} aria-label="Show ingredients" className="w-12 h-12 rounded-full border border-line inline-flex items-center justify-center"><ListChecks className="w-5 h-5" /></button>
            <button onClick={() => go(0)} aria-label="Start over" className="w-12 h-12 rounded-full border border-line inline-flex items-center justify-center"><RotateCcw className="w-5 h-5" /></button>
          </div>
          <button onClick={() => (i === n - 1 ? (cancel(), onExit()) : go(i + 1))} className="h-12 px-6 rounded-pill bg-ink text-white inline-flex items-center gap-2">{i === n - 1 ? "Finish" : "Next"}<ChevronRight className="w-5 h-5" /></button>
        </div>
        {["denied", "unsupported", "error"].includes(mic.state) && <p className="text-center text-xs text-danger pb-3 px-4" role="alert">{voiceMessage[mic.state]}</p>}
      </div>
    </div>
  );
}
