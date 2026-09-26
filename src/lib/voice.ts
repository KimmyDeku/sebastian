"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceState = "idle" | "listening" | "processing" | "denied" | "unsupported" | "no-speech" | "error";

export function useSpeechRecognition(onFinal: (text: string) => void, opts: { continuous?: boolean } = {}) {
  const [state, setState] = useState<VoiceState>("idle");
  const [interim, setInterim] = useState("");
  const rec = useRef<any>(null);
  const cb = useRef(onFinal);
  cb.current = onFinal;
  const wantOn = useRef(false);

  const supported = typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const stop = useCallback(() => { wantOn.current = false; try { rec.current?.stop(); } catch {} setState((s) => (s === "listening" ? "idle" : s)); }, []);

  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setState("unsupported"); return; }
    if (typeof navigator !== "undefined" && !navigator.onLine) { setState("error"); return; }
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = true;
    r.continuous = !!opts.continuous;
    r.onstart = () => setState("listening");
    r.onresult = (ev: any) => {
      let fin = "", mid = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) fin += t; else mid += t;
      }
      setInterim(mid);
      if (fin.trim()) { setInterim(""); cb.current(fin.trim()); }
    };
    r.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") { wantOn.current = false; setState("denied"); }
      else if (e.error === "no-speech") setState("no-speech");
      else if (e.error !== "aborted") setState("error");
    };
    r.onend = () => {
      if (wantOn.current && opts.continuous) { try { r.start(); return; } catch {} }
      setState((s) => (s === "listening" ? "idle" : s));
    };
    rec.current = r;
    wantOn.current = true;
    try { r.start(); } catch { setState("error"); }
  }, [opts.continuous]);

  useEffect(() => () => { wantOn.current = false; try { rec.current?.abort(); } catch {} }, []);
  return { state, interim, start, stop, supported, setState };
}

// null = not checked yet, true = custom voice works, false = not configured (use the browser voice)
let serverVoice: boolean | null = null;

export function useSpeaker() {
  const [speaking, setSpeaking] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const job = useRef(0);

  // The browser's built-in voice, used as a fallback.
  const browserSpeak = useCallback((text: string, voiceName?: string, onEnd?: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[*_#>`]/g, ""));
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find((x) => x.name === voiceName) || voices.find((x) => /en-GB/i.test(x.lang) && /male|daniel|arthur|george|ryan/i.test(x.name)) || voices.find((x) => /en-GB/i.test(x.lang));
    if (v) u.voice = v;
    u.rate = 0.98; u.pitch = 0.95;
    u.onstart = () => setSpeaking(true);
    u.onend = () => { setSpeaking(false); onEnd?.(); };
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
    return true;
  }, []);

  const stopAll = useCallback(() => {
    job.current++;
    audio.current?.pause();
    audio.current = null;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  const speak = useCallback((text: string, voiceName?: string, onEnd?: () => void) => {
    if (typeof window === "undefined") return false;
    stopAll();
    const my = job.current;
    if (serverVoice === false) return browserSpeak(text, voiceName, onEnd);

    setSpeaking(true);
    fetch("/api/tts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) })
      .then(async (r) => {
        if (my !== job.current) return;
        if (r.status === 503) { serverVoice = false; setSpeaking(false); browserSpeak(text, voiceName, onEnd); return; }
        if (!r.ok) throw new Error("tts failed");
        serverVoice = true;
        const url = URL.createObjectURL(await r.blob());
        if (my !== job.current) return;
        const a = new Audio(url);
        audio.current = a;
        a.onended = () => { URL.revokeObjectURL(url); setSpeaking(false); onEnd?.(); };
        a.onerror = () => setSpeaking(false);
        await a.play();
      })
      .catch(() => { if (my === job.current) { setSpeaking(false); browserSpeak(text, voiceName, onEnd); } });
    return true;
  }, [browserSpeak, stopAll]);

  const cancel = useCallback(() => { stopAll(); setSpeaking(false); }, [stopAll]);
  useEffect(() => () => stopAll(), [stopAll]);
  return { speak, cancel, speaking };
}

export const voiceMessage: Record<VoiceState, string> = {
  idle: "", listening: "Listening…", processing: "Understanding…",
  denied: "Microphone access was blocked. Allow it in your browser's site settings, or type instead.",
  unsupported: "Voice input isn't supported in this browser. Chrome, Edge and Safari support it.",
  "no-speech": "I didn't catch anything. Tap the microphone and try again.",
  error: "Voice recognition failed (it needs a connection). Please type instead.",
};
