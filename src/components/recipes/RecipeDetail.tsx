"use client";
import { useState } from "react";
import { ExternalLink, Minus, Plus, ChefHat, BookmarkPlus, BookmarkCheck, Sparkles } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Img } from "../ui/Img";
import { Notice } from "../ui/States";
import { scaleIngredient } from "@/lib/scale";
import type { Recipe } from "@/lib/types";
import { ChefMode } from "./ChefMode";
import { clamp, normalizeRecipe } from "@/lib/util";

export function RecipeDetail({ r: raw, initialServings, saved, onToggle, onClose }: { r: Recipe | null; initialServings?: number; saved: boolean; onToggle: () => void; onClose: () => void }) {
    const r = raw ? normalizeRecipe(raw) : null;
  const [serv, setServ] = useState(initialServings || r?.baseServings || 2);
  const [chef, setChef] = useState(false);
  if (!r) return null;
  const factor = serv / (r.baseServings || serv);
  const ings = r.ingredients.map((i) => scaleIngredient(i, factor));
  return (
    <>
      <Modal open={!!r && !chef} onClose={onClose} title={r.title} wide>
        <div className="grid md:grid-cols-[1fr_1.1fr] gap-7">
          <div>
            <Img src={r.image} alt={r.title} label={r.generated ? "Sebastian's own recipe" : "Photo unavailable"} className="w-full aspect-[4/3] rounded-2xl" />
            <p className="text-xs text-muted mt-3 flex items-center gap-1.5">{r.generated && <Sparkles className="w-3 h-3 text-glow" aria-hidden />}{r.source}{r.totalTime ? ` · ${r.totalTime}` : ""}</p>
            {r.generated && <Notice tone="ai" className="mt-3">This recipe was written by Sebastian rather than retrieved from a recipe site. Check quantities and cooking times as you go.</Notice>}
            {r.summary && <p className="text-sm text-muted mt-4 leading-relaxed">{r.summary}</p>}
            <div className="mt-6 flex items-center justify-between rounded-2xl border border-line p-3">
              <span className="text-sm pl-2">Servings</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setServ((s) => clamp(s - 1, 1, 100))} aria-label="Fewer servings" className="w-9 h-9 rounded-full border border-line inline-flex items-center justify-center"><Minus className="w-4 h-4" /></button>
                <span className="font-serif text-2xl w-10 text-center" aria-live="polite">{serv}</span>
                <button onClick={() => setServ((s) => clamp(s + 1, 1, 100))} aria-label="More servings" className="w-9 h-9 rounded-full border border-line inline-flex items-center justify-center"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => setChef(true)}><ChefHat className="w-4 h-4" />Chef mode</Button>
              <Button variant="outline" onClick={onToggle}>{saved ? <><BookmarkCheck className="w-4 h-4 text-gold" />In cookbook</> : <><BookmarkPlus className="w-4 h-4" />Add to cookbook</>}</Button>
              {r.url && <Button variant="ghost" href={r.url} external><ExternalLink className="w-4 h-4" />Original</Button>}
            </div>
          </div>
          <div>
            <h3 className="t-h3">Ingredients</h3>
            {factor !== 1 && <p className="text-xs text-muted mt-1">Quantities scaled from {r.baseServings} to {serv} servings.</p>}
            <ul className="mt-3 space-y-2 text-[14px]">
              {ings.map((i, k) => <li key={k} className="flex gap-3"><span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 shrink-0" aria-hidden />{i}</li>)}
            </ul>
            <h3 className="t-h3 mt-8">Method</h3>
            <ol className="mt-3 space-y-4 text-[14px] leading-relaxed">
              {r.steps.map((s, k) => <li key={k} className="flex gap-4"><span className="font-serif text-xl text-gold w-6 shrink-0">{k + 1}</span><span>{s}</span></li>)}
            </ol>
          </div>
        </div>
      </Modal>
      {chef && <ChefMode recipe={{ ...r, ingredients: ings }} onExit={() => setChef(false)} />}
    </>
  );
}
