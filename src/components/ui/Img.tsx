"use client";
import { useState } from "react";
import { cx } from "@/lib/util";

export function Img({ src, alt, className, label }: { src?: string; alt: string; className?: string; label?: string }) {
  const [bad, setBad] = useState(!src);
  if (bad)
    return (
      <div className={cx("img-fallback flex items-center justify-center", className)} role="img" aria-label={alt}>
        {label !== "" && <span className="font-serif italic text-muted-soft text-sm px-4 text-center">{label || "Image unavailable"}</span>}
      </div>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={cx("object-cover", className)} loading="lazy" onError={() => setBad(true)} />;
}
