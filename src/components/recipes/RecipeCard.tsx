"use client";
import { Clock, Bookmark, BookmarkCheck, Users, Sparkles } from "lucide-react";
import { Img } from "../ui/Img";
import type { Recipe } from "@/lib/types";
import { normalizeRecipe } from "@/lib/util";

export function RecipeCard({ r: raw, saved, onOpen, onToggle }: { r: Recipe & { chefNote?: string }; saved: boolean; onOpen: () => void; onToggle: () => void }) {
  const r = normalizeRecipe(raw);
  return (
    <article className="relative w-full h-full bg-paper rounded-3xl border border-line overflow-hidden flex flex-col shadow-soft">
      <button onClick={onOpen} className="text-left flex-1 flex flex-col" aria-label={`Open ${r.title}`}>
        <Img src={r.image} food={r.title} alt={r.title} label="Photo unavailable" className="w-full aspect-[4/3]" />
        <div className="p-5 flex-1 flex flex-col">
          <p className="text-[11px] text-muted flex items-center gap-1.5">{r.generated && <Sparkles className="w-3 h-3 text-glow" aria-hidden />}{r.source}</p>
          <h3 className="t-h3 mt-1.5 line-clamp-2">{r.title}</h3>
          {(r as any).chefNote ? <p className="text-[13px] text-muted mt-2 line-clamp-3 italic font-serif text-[15px]">&ldquo;{(r as any).chefNote}&rdquo;</p>
            : r.summary && <p className="text-[13px] text-muted mt-2 line-clamp-3">{r.summary}</p>}
          <div className="mt-auto pt-4 flex items-center gap-4 text-xs text-muted">
            {r.totalTime && <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" aria-hidden />{r.totalTime}</span>}
            <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" aria-hidden />Serves {r.baseServings}</span>
          </div>
        </div>
      </button>
      <button onClick={onToggle} aria-pressed={saved} aria-label={saved ? "Remove from cookbook" : "Add to cookbook"}
        className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/95 shadow-soft inline-flex items-center justify-center">
        {saved ? <BookmarkCheck className="w-5 h-5 text-gold" /> : <Bookmark className="w-5 h-5" />}
      </button>
    </article>
  );
}
