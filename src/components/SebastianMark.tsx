"use client";
import { cx } from "@/lib/util";

export type MarkState = "idle" | "listening" | "thinking" | "speaking" | "processing" | "success" | "error";
const LABEL: Record<MarkState, string> = { idle: "Sebastian", listening: "Sebastian is listening", thinking: "Sebastian is thinking", speaking: "Sebastian is speaking", processing: "Sebastian is working", success: "Done", error: "Something went wrong" };

/** Victorian bowtie mark with semantic states. */
export function SebastianMark({ size = 40, state = "idle", className }: { size?: number; state?: MarkState; className?: string }) {
  const ring =
    state === "thinking" || state === "processing" ? "animate-pulseGlow" :
    state === "listening" ? "ring-2 ring-glow ring-offset-2 ring-offset-paper" :
    state === "success" ? "ring-2 ring-success/60 ring-offset-2" :
    state === "error" ? "ring-2 ring-danger/60 ring-offset-2" : "";
  return (
    <span role="img" aria-label={LABEL[state]} className={cx("relative inline-flex items-center justify-center rounded-full bg-ink shrink-0", ring, className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" width={size * 0.62} height={size * 0.62} aria-hidden>
        <g className={state === "speaking" ? "origin-center animate-[wave_1s_ease-in-out_infinite]" : ""} style={{ transformBox: "fill-box" }}>
          <path d="M6 16 L28 28 Q30 32 28 36 L6 48 Q3 32 6 16 Z" fill="#fff" />
          <path d="M58 16 L36 28 Q34 32 36 36 L58 48 Q61 32 58 16 Z" fill="#fff" />
        </g>
        <rect x="26.5" y="26" width="11" height="12" rx="3" fill="#fff" />
      </svg>
      {state === "listening" && <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-glow border-2 border-paper" aria-hidden />}
    </span>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-3">
      <SebastianMark size={44} />
      <span className="font-serif text-[1.75rem] leading-none tracking-tight">Sebastian</span>
    </span>
  );
}

export function Waveform({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-end gap-[3px] h-4" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className={cx("w-[3px] h-full rounded bg-glow origin-bottom", active ? "animate-wave" : "scale-y-[.3]")} style={{ animationDelay: `${i * 0.12}s` }} />
      ))}
    </span>
  );
}
