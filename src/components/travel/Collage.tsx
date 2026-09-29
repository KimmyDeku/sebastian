"use client";
import { Check } from "lucide-react";
import { COLLAGE_SPOTS } from "./destinations";
import { cx } from "@/lib/util";

/** The colourful travel collage. Each photo is a tappable interest. */
export function Collage({ selected, onToggle }: { selected: string[]; onToggle: (key: string) => void }) {
  return (
    <div className="relative w-full select-none" style={{ aspectRatio: "900 / 1081" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/travel-collage.jpg" alt="Travellers enjoying beaches, wildlife, food, diving, hiking, culture and wellness" className="absolute inset-0 w-full h-full object-contain" draggable={false} />
      {COLLAGE_SPOTS.map((s) => {
        const on = selected.includes(s.key);
        return (
          <button key={s.key} type="button" onClick={() => onToggle(s.key)} aria-pressed={on} aria-label={`${on ? "Remove" : "Add"} ${s.label}`}
            className="group absolute rounded-full focus-visible:outline-none"
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.r * 2}%`, aspectRatio: "1", transform: "translate(-50%, -50%)" }}>
            <span className={cx("absolute inset-0 rounded-full transition-all duration-300", on ? "ring-4 ring-gold ring-offset-2 ring-offset-transparent" : "group-hover:ring-2 group-hover:ring-white/90 group-focus-visible:ring-2 group-focus-visible:ring-gold")} />
            <span className={cx("absolute left-1/2 -translate-x-1/2 -bottom-2 whitespace-nowrap inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[11px] font-medium shadow-soft transition-all",
              on ? "bg-gold text-white" : "bg-white/95 text-[#1C1B19] opacity-90 group-hover:opacity-100")}>
              {on && <Check className="w-3 h-3" aria-hidden />}{s.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
