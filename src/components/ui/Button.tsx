"use client";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cx } from "@/lib/util";
import type { ReactNode } from "react";

type V = "primary" | "gold" | "outline" | "ghost" | "light" | "danger";
const base = "inline-flex items-center justify-center gap-2 rounded-pill font-sans font-normal transition-colors disabled:cursor-not-allowed select-none";
const variants: Record<V, string> = {
  primary: "bg-ink text-white hover:bg-ink-soft disabled:bg-[#8F8B85]",
  gold: "bg-gold text-white hover:bg-gold-deep disabled:opacity-50",
  outline: "border border-line bg-paper text-ink hover:border-cream-line hover:bg-cream/60 disabled:opacity-50",
  ghost: "text-muted hover:text-ink hover:bg-cream/60 disabled:opacity-40",
  light: "bg-white/95 text-ink hover:bg-white shadow-soft",
  danger: "bg-danger text-white hover:opacity-90 disabled:opacity-50",
};
const sizes = { sm: "h-9 px-4 text-[13px]", md: "h-11 px-6 text-sm", lg: "h-12 px-7 text-[15px]" };

interface P { children: ReactNode; variant?: V; size?: keyof typeof sizes; loading?: boolean; className?: string; href?: string; external?: boolean; disabled?: boolean; onClick?: (e: any) => void; type?: "button" | "submit"; "aria-label"?: string; title?: string }

export function Button({ children, variant = "primary", size = "md", loading, className, href, external, ...rest }: P) {
  const cls = cx(base, variants[variant], sizes[size], className);
  if (href) {
    if (external) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children}</a>;
    return <Link href={href} className={cls}>{children}</Link>;
  }
  return (
    <button type={rest.type || "button"} {...rest} disabled={rest.disabled || loading} aria-busy={loading || undefined} className={cls}>
      {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function IconButton({ label, children, className, ...rest }: { label: string; children: ReactNode; className?: string; onClick?: (e: any) => void; disabled?: boolean; pressed?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={rest.pressed} onClick={rest.onClick} disabled={rest.disabled}
      className={cx("inline-flex items-center justify-center w-10 h-10 rounded-full border border-line bg-paper text-ink hover:bg-cream/70 disabled:opacity-40", className)}>
      {children}
    </button>
  );
}
