"use client";
import { AlertTriangle, Info, KeyRound, Lock, SearchX, WifiOff, ShieldCheck, RotateCcw } from "lucide-react";
import { Button } from "./Button";
import type { ReactNode } from "react";
import { cx } from "@/lib/util";

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-14 px-6 rounded-3xl border border-dashed border-cream-line bg-paper">
      <SearchX className="w-8 h-8 mx-auto text-gold" aria-hidden />
      <h3 className="t-h3 mt-4">{title}</h3>
      {body && <p className="text-sm text-muted mt-2 max-w-md mx-auto">{body}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "That didn't work", body, onRetry, offline }: { title?: string; body: string; onRetry?: () => void; offline?: boolean }) {
  const I = offline ? WifiOff : AlertTriangle;
  return (
    <div role="alert" className="rounded-3xl border border-danger/20 bg-[#FBF3F1] p-6 md:p-8">
      <div className="flex items-start gap-3">
        <I className={cx("w-6 h-6 shrink-0", offline ? "text-offline" : "text-danger")} aria-hidden />
        <div className="flex-1">
          <h3 className="t-h3">{offline ? "You're offline" : title}</h3>
          <p className="text-sm text-muted mt-1.5 leading-relaxed">{body}</p>
          {onRetry && <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}><RotateCcw className="w-4 h-4" />Try again</Button>}
        </div>
      </div>
    </div>
  );
}

type Tone = "info" | "warning" | "permission" | "offline" | "confirm" | "ai";
const TONES: Record<Tone, { i: any; cls: string }> = {
  info: { i: Info, cls: "bg-cream/60 border-cream-line text-ink" },
  warning: { i: AlertTriangle, cls: "bg-[#FBF5EA] border-[#EBD7AE] text-ink" },
  permission: { i: Lock, cls: "bg-[#F4F1FC] border-[#DCD3F6] text-ink" },
  offline: { i: WifiOff, cls: "bg-[#F1F2F4] border-[#DADDE2] text-ink" },
  confirm: { i: ShieldCheck, cls: "bg-[#EFF5F1] border-[#CFE2D6] text-ink" },
  ai: { i: KeyRound, cls: "bg-[#F4F1FC] border-[#DCD3F6] text-ink" },
};
export function Notice({ tone = "info", children, className, action }: { tone?: Tone; children: ReactNode; className?: string; action?: ReactNode }) {
  const { i: I, cls } = TONES[tone];
  return (
    <div className={cx("flex items-start gap-3 rounded-2xl border px-4 py-3 text-[13px] leading-relaxed", cls, className)} role={tone === "warning" ? "alert" : "note"}>
      <I className="w-4 h-4 mt-0.5 shrink-0 text-gold-deep" aria-hidden />
      <div className="flex-1">{children}</div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-2xl bg-cream/80", className)} aria-hidden />;
}
