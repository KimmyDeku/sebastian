"use client";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function Breadcrumbs({ items }: { items: { label: string; href?: string; onClick?: () => void }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-1 text-[12.5px] text-muted">
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-soft" aria-hidden />}
          {it.href ? <Link href={it.href} className="hover:text-ink">{it.label}</Link>
            : it.onClick ? <button onClick={it.onClick} className="hover:text-ink">{it.label}</button>
            : <span aria-current="page" className="text-ink">{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function BackButton({ onClick, label = "Back" }: { onClick?: () => void; label?: string }) {
  const router = useRouter();
  return (
    <button onClick={onClick || (() => router.back())} className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink h-9 -ml-1 pr-2">
      <ChevronLeft className="w-4 h-4" aria-hidden />{label}
    </button>
  );
}

export function PageHeader({ crumbs, title, subtitle, right, onBack }: { crumbs: { label: string; href?: string; onClick?: () => void }[]; title: string; subtitle?: string; right?: ReactNode; onBack?: () => void }) {
  return (
    <header className="mb-6 md:mb-7">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <BackButton onClick={onBack} />
          <span className="w-px h-4 bg-line hidden sm:block" aria-hidden />
          <div className="hidden sm:block"><Breadcrumbs items={crumbs} /></div>
        </div>
        {right}
      </div>
      <h1 className="t-h1">{title}</h1>
      {subtitle && <p className="text-muted mt-1.5 max-w-2xl text-sm">{subtitle}</p>}
    </header>
  );
}

export function Container({ children, narrow }: { children: ReactNode; narrow?: boolean }) {
  return <div className={`${narrow ? "max-w-3xl" : "max-w-6xl"} mx-auto w-full px-5 md:px-10 pt-6 md:pt-10 pb-32 md:pb-20`}>{children}</div>;
}
