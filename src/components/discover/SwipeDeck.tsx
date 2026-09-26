"use client";
import { useRef, useState } from "react";
import { Heart, X, Navigation, Star, Phone } from "lucide-react";
import { Img } from "../ui/Img";
import { cx } from "@/lib/util";

export function PlaceBody({ p, fav }: { p: any; fav: boolean }) {
  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-[15px]">{p.name}</h3>
        {fav && <span className="shrink-0 text-[10px] bg-gold text-white rounded-full px-2 py-0.5">Your choice</span>}
      </div>
      <p className="text-xs text-muted mt-1.5 flex items-center gap-1.5">
        {p.rating ? <><Star className="w-3 h-3 fill-gold text-gold" aria-hidden />{p.rating} ({p.ratingCount || 0})</> : null}
        {p.openNow != null && <span className={p.openNow ? "text-success" : "text-danger"}>{p.rating ? " · " : ""}{p.openNow ? "Open now" : "Closed"}</span>}
      </p>
      {p.address && <p className="text-xs text-muted mt-1">{p.address}</p>}
      {p.phone && <a href={`tel:${p.phone}`} className="text-xs text-ink mt-1 inline-flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone}</a>}
    </div>
  );
}

/** Tinder-style deck for mobile. Buttons provide the accessible alternative to swiping. */
export function SwipeDeck({ items, favs, onFav, onGo, fallbackImg }: { items: any[]; favs: Set<string>; onFav: (p: any) => void; onGo: (p: any) => void; fallbackImg: string }) {
  const [i, setI] = useState(0);
  const [dx, setDx] = useState(0);
  const start = useRef<number | null>(null);
  const p = items[i];
  if (!p) return (
    <div className="text-center py-12 rounded-3xl border border-dashed border-cream-line bg-paper">
      <p className="t-h3">That&apos;s everything nearby</p>
      <button onClick={() => setI(0)} className="mt-4 text-sm underline">Start again</button>
    </div>
  );
  const release = () => {
    if (dx > 90) { onGo(p); setDx(0); }
    else if (dx < -90) { setI(i + 1); setDx(0); }
    else setDx(0);
    start.current = null;
  };
  return (
    <div>
      <p className="text-xs text-muted text-center mb-3">{i + 1} of {items.length} · swipe right to go, left to skip</p>
      <div className="relative h-[430px]">
        {items[i + 1] && <div className="absolute inset-x-4 top-3 bottom-0 rounded-3xl bg-paper border border-line" aria-hidden />}
        <article
          className="absolute inset-0 rounded-3xl bg-paper border border-line shadow-lift overflow-hidden touch-pan-y select-none"
          style={{ transform: `translateX(${dx}px) rotate(${dx / 18}deg)`, transition: start.current == null ? "transform .25s" : "none" }}
          onPointerDown={(e) => { start.current = e.clientX; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); }}
          onPointerMove={(e) => start.current != null && setDx(e.clientX - start.current)}
          onPointerUp={release} onPointerCancel={release} aria-label={p.name}>
          <Img src={p.photo || fallbackImg} alt={p.name} className="w-full h-60 pointer-events-none" />
          {!p.photo && <span className="absolute top-3 left-3 text-[10px] bg-white/90 rounded-full px-2 py-0.5">Illustrative photo</span>}
          <PlaceBody p={p} fav={favs.has(p.id)} />
          <span className={cx("absolute top-6 right-6 rounded-xl border-2 px-3 py-1 font-medium rotate-12 transition-opacity", dx > 40 ? "opacity-100 border-success text-success" : "opacity-0")}>GO</span>
          <span className={cx("absolute top-6 left-6 rounded-xl border-2 px-3 py-1 font-medium -rotate-12 transition-opacity", dx < -40 ? "opacity-100 border-danger text-danger" : "opacity-0")}>SKIP</span>
        </article>
      </div>
      <div className="flex justify-center gap-5 mt-5">
        <button onClick={() => setI(i + 1)} aria-label="Skip" className="w-14 h-14 rounded-full bg-paper border border-line shadow-soft inline-flex items-center justify-center"><X className="w-6 h-6 text-danger" /></button>
        <button onClick={() => onFav(p)} aria-pressed={favs.has(p.id)} aria-label={favs.has(p.id) ? "Remove from your choices" : "Save as your choice"} className="w-14 h-14 rounded-full bg-paper border border-line shadow-soft inline-flex items-center justify-center"><Heart className={cx("w-6 h-6", favs.has(p.id) ? "fill-gold text-gold" : "text-gold")} /></button>
        <button onClick={() => onGo(p)} aria-label="Get directions" className="w-14 h-14 rounded-full bg-ink text-white shadow-soft inline-flex items-center justify-center"><Navigation className="w-6 h-6" /></button>
      </div>
    </div>
  );
}
