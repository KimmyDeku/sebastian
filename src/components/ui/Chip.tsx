"use client";
import { cx } from "@/lib/util";
import type { ReactNode } from "react";

/** Selectable option — pill (wizard answers) or row (radio list). */
export function Option({ selected, onClick, children, variant = "pill", icon, role = "radio" }: { selected: boolean; onClick: () => void; children: ReactNode; variant?: "pill" | "row" | "chip"; icon?: ReactNode; role?: "radio" | "checkbox" }) {
  if (variant === "chip")
    return (
      <button type="button" role={role} aria-checked={selected} onClick={onClick}
        className={cx("h-9 px-4 rounded-pill border text-[13px] transition-colors inline-flex items-center gap-2", selected ? "bg-ink text-white border-ink" : "bg-paper border-line text-ink hover:border-cream-line")}>
        {icon}{children}
      </button>
    );
  if (variant === "row")
    return (
      <button type="button" role={role} aria-checked={selected} onClick={onClick}
        className={cx("w-full flex items-center gap-3 px-4 min-h-[52px] rounded-xl border text-left text-sm transition-colors", selected ? "bg-ink text-white border-ink" : "bg-paper border-line hover:border-cream-line")}>
        <span aria-hidden className={cx("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0", selected ? "border-white" : "border-muted-soft")}>
          {selected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
        </span>
        {icon}
        <span className="flex-1">{children}</span>
      </button>
    );
  return (
    <button type="button" role={role} aria-checked={selected} onClick={onClick}
      className={cx("w-full h-12 px-5 rounded-pill border text-left text-sm transition-colors flex items-center gap-2", selected ? "bg-ink text-white border-ink" : "bg-paper border-cream-line/70 hover:border-gold/60")}>
      {icon}{children}
    </button>
  );
}

export function Field({ label, children, hint, error, htmlFor }: { label: string; children: ReactNode; hint?: string; error?: string; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink">{label}</label>
      {children}
      {error ? <p className="text-xs text-danger" role="alert">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export const inputCls = "w-full h-12 px-4 rounded-xl border border-line bg-paper text-sm text-ink placeholder:text-muted-soft focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 disabled:bg-canvas";
export const textareaCls = "w-full min-h-[110px] p-4 rounded-xl border border-line bg-paper text-sm text-ink placeholder:text-muted-soft focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 resize-y";
