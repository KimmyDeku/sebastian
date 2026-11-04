"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Wordmark } from "../SebastianMark";
import { LanguageMenu } from "../LanguageMenu";
import { SUPPORT } from "@/lib/support";
import { LANDING } from "@/lib/landing";
import { cx } from "@/lib/util";

const LINKS: [string, string][] = [["Demo", "/welcome#demo"], ["Services", "/welcome#services"], ["News", "/blog"], ["Contact", "/welcome#contact"]];

/** The public site's header (landing page and News), with a phone menu. */
export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 bg-canvas/85 backdrop-blur border-b border-line">
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
        <Link href="/welcome" aria-label="Sebastian"><Wordmark /></Link>
        <nav className="hidden md:flex items-center gap-6 text-[14px] text-muted" aria-label="Site">
          {LINKS.map(([l, h]) => <Link key={l} href={h} className={cx("hover:text-ink", h === "/blog" && path.startsWith("/blog") && "text-ink font-medium")}>{l}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex"><LanguageMenu /></span>
          <Link href="/login" className="h-10 px-4 rounded-pill text-[14px] inline-flex items-center hover:bg-cream">Log in</Link>
          <Link href="/welcome#waitlist" className="h-10 px-4 rounded-pill bg-ink text-white text-[14px] hidden sm:inline-flex items-center">Join the waitlist</Link>
          <button onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} className="md:hidden w-10 h-10 rounded-full hover:bg-cream inline-flex items-center justify-center">{open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
        </div>
      </div>
      {open && (
        <nav className="md:hidden border-t border-line bg-canvas px-5 py-3 flex flex-col" aria-label="Site">
          {LINKS.map(([l, h]) => <Link key={l} href={h} onClick={() => setOpen(false)} className="py-3 text-[15px] border-b border-line last:border-0">{l}</Link>)}
          <Link href="/welcome#waitlist" onClick={() => setOpen(false)} className="mt-3 h-11 rounded-pill bg-ink text-white text-[14px] inline-flex items-center justify-center">Join the waitlist</Link>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="max-w-6xl mx-auto px-5 py-8 flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted">
        <span>© {new Date().getFullYear()} {SUPPORT.company.startsWith("[") ? "Sebastian" : SUPPORT.company}</span>
        <span className="flex flex-wrap gap-4"><Link href="/blog" className="hover:text-ink">News</Link><Link href="/privacy" className="hover:text-ink">Privacy policy</Link><Link href="/login" className="hover:text-ink">Log in</Link>{LANDING.openSignups && <Link href="/signup" className="hover:text-ink">Sign up</Link>}</span>
      </div>
    </footer>
  );
}
