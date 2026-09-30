"use client";
import "@/lib/polyfills";
import { useEffect, useState } from "react";
import { Languages } from "lucide-react";
import { applyLanguage, onTranslateBusy, onTranslateError, startTranslator } from "@/lib/translator";
import { toast } from "./ui/Toast";

/** Mounted once in the root layout. Translates every screen into the chosen language. */
export function LiveTranslator() {
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let warned = false;
    onTranslateBusy(setBusy);
    onTranslateError((m) => { if (!warned) { warned = true; toast.error(`Some text couldn't be translated: ${m}`); } });
    startTranslator();
    const onChange = (e: Event) => { warned = false; applyLanguage((e as CustomEvent).detail); };
    window.addEventListener("sebastian-lang", onChange);
    return () => window.removeEventListener("sebastian-lang", onChange);
  }, []);
  if (!busy) return null;
  return (
    <div translate="no" role="status" className="fixed z-[95] top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 h-8 px-3.5 rounded-pill bg-paper border border-line shadow-soft text-[12px] text-muted">
      <Languages className="w-3.5 h-3.5 text-gold animate-pulse" aria-hidden />Translating…
    </div>
  );
}
