"use client";
import { useEffect, useState } from "react";
import { cx } from "@/lib/util";

/**
 * An image that tries its source, then a fallback, before showing a placeholder.
 * Pass `food` to look up a real photo of a dish when there's no image, and `place` (a name and,
 * ideally, the town) to find a good photo of a place when its own photo is missing or won't load.
 */
export function Img({ src, fallback, food, place, generic, alt, className, label }: { src?: string; fallback?: string; food?: string; place?: { name: string; near?: string }; generic?: { topic: string; seed?: string }; alt: string; className?: string; label?: string }) {
  const [found, setFound] = useState<string | undefined>();
  const [placeHit, setPlaceHit] = useState<{ url: string; credit?: string } | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  useEffect(() => { setFailed([]); setPlaceHit(null); }, [src, place?.name, place?.near]);
  useEffect(() => {
    if (!food || src) return;
    let dead = false;
    foodPhoto(food).then((u) => { if (!dead && u) setFound(u); });
    return () => { dead = true; };
  }, [food, src]);
  const needPlace = !!place?.name && (!src || failed.includes(src));
  useEffect(() => {
    if (!needPlace || !place) return;
    let dead = false;
    placePhoto(place.name, place.near).then((p) => { if (!dead && p) setPlaceHit(p); });
    return () => { dead = true; };
  }, [needPlace, place?.name, place?.near]); // eslint-disable-line react-hooks/exhaustive-deps
  // Last resort before a blank: a real photo of that kind of thing (a cinema, a dessert), varied by seed.
  const genericUrl = generic?.topic ? `/api/images/generic?topic=${encodeURIComponent(generic.topic)}&seed=${encodeURIComponent(generic.seed || alt)}` : undefined;
  const chain = [src, placeHit?.url, found, fallback, genericUrl].filter(Boolean) as string[];
  const current = chain.find((u) => !failed.includes(u));
  if (!current)
    return (
      <div className={cx("img-fallback flex items-center justify-center", className)} role="img" aria-label={alt}>
        {label !== "" && !generic && <span className="font-serif italic text-muted-soft text-sm px-4 text-center">{label || "Image unavailable"}</span>}
      </div>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={current} alt={alt} title={current === placeHit?.url ? placeHit?.credit : undefined} className={cx("object-cover", className)} loading="lazy" onError={() => setFailed((f) => [...f, current])} />;
}

/* Place photos are looked up once per place and remembered on this device. */
const placeMemo = new Map<string, Promise<{ url: string; credit?: string } | null>>();
export function placePhoto(name: string, near = ""): Promise<{ url: string; credit?: string } | null> {
  const key = `${name}|${near}`.trim().toLowerCase();
  try { const c = localStorage.getItem(`sebastian-place-${key}`); if (c) return Promise.resolve(JSON.parse(c)); } catch {}
  if (!placeMemo.has(key)) {
    placeMemo.set(key, fetch(`/api/images/place?name=${encodeURIComponent(name)}&near=${encodeURIComponent(near)}`).then((r) => r.json()).then((j) => {
      if (!j.ok || !j.url) return null;
      const v = { url: j.url as string, credit: j.credit as string | undefined };
      try { localStorage.setItem(`sebastian-place-${key}`, JSON.stringify(v)); } catch {}
      return v;
    }).catch(() => null));
  }
  return placeMemo.get(key)!;
}

/* Food photos are looked up once per dish and remembered on this device. */
const memo = new Map<string, Promise<string | null>>();
export function foodPhoto(dish: string): Promise<string | null> {
  const key = dish.trim().toLowerCase();
  if (!key) return Promise.resolve(null);
  try { const c = localStorage.getItem(`sebastian-food-${key}`); if (c) return Promise.resolve(c); } catch {}
  if (!memo.has(key)) {
    memo.set(key, fetch(`/api/images/food?q=${encodeURIComponent(dish)}`).then((r) => r.json()).then((j) => {
      if (j.ok && j.url) { try { localStorage.setItem(`sebastian-food-${key}`, j.url); if (j.credit) localStorage.setItem(`sebastian-food-credit-${key}`, j.credit); } catch {} return j.url as string; }
      return null;
    }).catch(() => null));
  }
  return memo.get(key)!;
}

/** The credit for a dish's photo (for example "Photo by … on Unsplash"), once it has been found. */
export function foodCredit(dish: string): string | null {
  try { return localStorage.getItem(`sebastian-food-credit-${dish.trim().toLowerCase()}`); } catch { return null; }
}
