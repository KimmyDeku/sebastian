"use client";
import { useEffect, useRef, useState } from "react";
import { BadgeCheck } from "lucide-react";

const TEXT = "Every news source in Sebastian is screened and comes from a whitelist of established publishers, local and international, so you get timely news from trusted outlets. Stories link straight to the publisher's own website.";

/** Blue verified tick. Hover (or tap on a phone) for a short explanation. */
export function Verified({ size = 14 }: { size?: number }) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setPinned(false); } };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setPinned(false); } };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <span ref={ref} className="relative inline-flex align-middle" data-no-tip
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => !pinned && setOpen(false)}>
      <button type="button" aria-label="Verified source: what this means" aria-expanded={open} data-no-tip
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); const next = !pinned; setPinned(next); setOpen(next); }}
        className="inline-flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D8CF0]/50">
        <BadgeCheck aria-hidden className="text-white" style={{ width: size, height: size, fill: "#1D8CF0" }} strokeWidth={2.4} />
      </button>
      {open && (
        <span role="tooltip" className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-2 w-64 rounded-xl bg-[#1C1B19] text-white text-[12px] leading-snug p-3 shadow-lift text-left font-normal normal-case tracking-normal animate-fadeUp">
          <span className="flex items-center gap-1.5 font-medium mb-1"><BadgeCheck aria-hidden className="w-3.5 h-3.5 text-white" style={{ fill: "#1D8CF0" }} />Verified source</span>
          {TEXT}
        </span>
      )}
    </span>
  );
}
