"use client";
import { useEffect, useState } from "react";
import { cx } from "@/lib/util";

/**
 * An image that tries its source, then a fallback, before showing a placeholder.
 * Pass `food` to look up a real photo of a dish when there's no image.
 */
export function Img({ src, fallback, food, alt, className, label }: { src?: string; fallback?: string; food?: string; alt: string; className?: string; label?: string }) {
  const [found, setFound] = useState<string | undefined>();
  const chain = [src, found, fallback].filter(Boolean) as string[];
  const [stage, setStage] = useState(0);
  useEffect(() => { setStage(0); }, [src, fallback, found]);
  useEffect(() => {
    if (!food || src) return;
    let dead = false;
    foodPhoto(food).then((u) => { if (!dead && u) setFound(u); });
    return () => { dead = true; };
  }, [food, src]);
  const current = chain[stage];
  if (!current)
    return (
      <div className={cx("img-fallback flex items-center justify-center", className)} role="img" aria-label={alt}>
        {label !== "" && <span className="font-serif italic text-muted-soft text-sm px-4 text-center">{label || "Image unavailable"}</span>}
      </div>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={current} alt={alt} className={cx("object-cover", className)} loading="lazy" onError={() => setStage((n) => n + 1)} />;
}

/* Food photos are looked up once per dish and remembered on this device. */
const memo = new Map<string, Promise<string | null>>();
export function foodPhoto(dish: string): Promise<string | null> {
  const key = dish.trim().toLowerCase();
  if (!key) return Promise.resolve(null);
  try { const c = localStorage.getItem(`sebastian-food-${key}`); if (c) return Promise.resolve(c); } catch {}
  if (!memo.has(key)) {
    memo.set(key, fetch(`/api/images/food?q=${encodeURIComponent(dish)}`).then((r) => r.json()).then((j) => {
      if (j.ok && j.url) { try { localStorage.setItem(`sebastian-food-${key}`, j.url); } catch {} return j.url as string; }
      return null;
    }).catch(() => null));
  }
  return memo.get(key)!;
}
