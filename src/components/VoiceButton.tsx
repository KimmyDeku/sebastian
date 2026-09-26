"use client";
import { Mic, MicOff, Square } from "lucide-react";
import { useEffect } from "react";
import { useSpeechRecognition, voiceMessage } from "@/lib/voice";
import { cx } from "@/lib/util";
import { Waveform } from "./SebastianMark";

/** Mic control with visible listening / denied / unsupported feedback. */
export function VoiceButton({ onText, className, continuous, onStateChange, size = 40 }: { onText: (t: string) => void; className?: string; continuous?: boolean; onStateChange?: (s: string) => void; size?: number }) {
  const v = useSpeechRecognition(onText, { continuous });
  useEffect(() => { onStateChange?.(v.state); }, [v.state, onStateChange]);
  const listening = v.state === "listening";
  const problem = ["denied", "unsupported", "no-speech", "error"].includes(v.state);
  return (
    <span className={cx("relative inline-flex items-center gap-2", className)}>
      <button type="button" onClick={() => (listening ? v.stop() : v.start())}
        aria-label={listening ? "Stop listening" : "Speak to Sebastian"} aria-pressed={listening}
        className={cx("inline-flex items-center justify-center rounded-full border transition-colors", listening ? "bg-glow text-white border-glow shadow-thinking" : "bg-paper border-line text-ink hover:bg-cream/70")}
        style={{ width: size, height: size }}>
        {listening ? <Square className="w-4 h-4" /> : v.state === "denied" ? <MicOff className="w-[18px] h-[18px] text-danger" /> : <Mic className="w-[18px] h-[18px]" />}
      </button>
      {listening && <span className="inline-flex items-center gap-2 text-xs text-glow"><Waveform active /> <span className="hidden sm:inline">{v.interim || "Listening…"}</span></span>}
      <span className="sr-only" aria-live="polite">{voiceMessage[v.state]}</span>
      {problem && (
        <span role="alert" className="absolute z-30 top-full mt-2 right-0 w-64 text-xs bg-paper border border-line shadow-lift rounded-xl p-3 text-muted">
          {voiceMessage[v.state]}
          <button className="block mt-1 text-ink underline" onClick={() => v.setState("idle")}>Dismiss</button>
        </span>
      )}
    </span>
  );
}
