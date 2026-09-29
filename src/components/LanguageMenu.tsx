"use client";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { LANGUAGES, getLang, setLang } from "@/lib/i18n";
import { cx } from "@/lib/util";

/** Language names are shown in their own language and never translated. */
export function LanguageList({ onPick }: { onPick?: () => void }) {
  const [cur, setCur] = useState("en");
  useEffect(() => setCur(getLang()), []);
  return (
    <div translate="no" role="radiogroup" aria-label="Language" className="grid sm:grid-cols-2 gap-2">
      {LANGUAGES.map((l) => (
        <button key={l.code} type="button" role="radio" aria-checked={cur === l.code} onClick={() => { setLang(l.code); setCur(l.code); onPick?.(); }}
          className={cx("flex items-center justify-between gap-3 h-12 px-4 rounded-xl border text-left text-sm transition-colors", cur === l.code ? "bg-ink text-white border-ink" : "bg-paper border-line hover:border-cream-line")}>
          <span><span className="font-medium">{l.native}</span>{l.native !== l.name && <span className={cx("ml-2 text-xs", cur === l.code ? "opacity-70" : "text-muted")}>{l.name}</span>}</span>
          {cur === l.code && <Check className="w-4 h-4" aria-hidden />}
        </button>
      ))}
    </div>
  );
}

/** Compact picker for the login and sign-up pages. */
export function LanguageMenu() {
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState("en");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { setCur(getLang()); const f = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false); document.addEventListener("mousedown", f); return () => document.removeEventListener("mousedown", f); }, []);
  const l = LANGUAGES.find((x) => x.code === cur) || LANGUAGES[0];
  return (
    <div ref={ref} translate="no" className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Change language" className="inline-flex items-center gap-2 h-9 px-3 rounded-pill border border-line bg-paper text-[13px] hover:bg-cream/60">
        <Globe className="w-4 h-4 text-gold" aria-hidden />{l.native}<ChevronDown className="w-3.5 h-3.5 text-muted" aria-hidden />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-paper border border-line rounded-2xl shadow-lift p-1.5 z-50">
          {LANGUAGES.map((x) => (
            <button key={x.code} type="button" onClick={() => { setLang(x.code); setCur(x.code); setOpen(false); }} className={cx("w-full flex items-center justify-between h-9 px-3 rounded-xl text-[13px] hover:bg-cream/60", cur === x.code && "bg-cream")}>
              {x.native}{cur === x.code && <Check className="w-3.5 h-3.5 text-gold" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
