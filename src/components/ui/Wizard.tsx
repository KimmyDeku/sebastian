"use client";
import type { ReactNode } from "react";
import { Button } from "./Button";

/** Step card matching the reference workflow screenshots. */
export function WizardCard({ label, step, total, title, subtitle, children, onBack, onNext, nextLabel = "Continue", nextDisabled, nextIcon, busy, footer }: {
  label: string; step: number; total: number; title: string; subtitle?: string; children: ReactNode;
  onBack?: () => void; onNext?: () => void; nextLabel?: string; nextDisabled?: boolean; nextIcon?: ReactNode; busy?: boolean; footer?: ReactNode;
}) {
  return (
    <section className="bg-paper rounded-3xl shadow-soft border border-line/70 p-6 md:p-9 animate-fadeUp" aria-labelledby="wiz-title">
      <div className="flex items-center justify-between text-[11px] tracking-[.14em] uppercase text-muted font-medium">
        <span>{label}</span><span>Step {step} of {total}</span>
      </div>
      <div className="h-[3px] bg-line rounded-full mt-3 mb-7 overflow-hidden" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step} aria-label={`Step ${step} of ${total}`}>
        <div className="h-full bg-ink rounded-full transition-all duration-500" style={{ width: `${(step / total) * 100}%` }} />
      </div>
      <h2 id="wiz-title" className="t-h2">{title}</h2>
      {subtitle && <p className="text-[13px] text-muted mt-1.5">{subtitle}</p>}
      <div className="mt-7">{children}</div>
      {footer}
      <div className="flex items-center justify-between mt-9">
        <Button variant="ghost" onClick={onBack} disabled={!onBack}>Back</Button>
        {onNext && <Button onClick={onNext} disabled={nextDisabled} loading={busy}>{nextIcon}{nextLabel}</Button>}
      </div>
    </section>
  );
}

export function Progress({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2 bg-cream rounded-full overflow-hidden" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <div className="h-full bg-ink rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
    </div>
  );
}
