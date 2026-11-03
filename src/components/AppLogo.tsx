"use client";
import { useState } from "react";

/**
 * Shows an app or service's official logo from /public/logos/<key>.svg (or .png) when it has
 * been added, and otherwise a neat tile with its initials.
 */
export function AppLogo({ k, name, size = 40 }: { k: string; name: string; size?: number }) {
  const [stage, setStage] = useState(0); // 0: svg, 1: png, 2: initials
  const initials = name.replace(/\(.*?\)/g, "").split(/[\s/+.-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  if (stage < 2) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/logos/${k}.${stage === 0 ? "svg" : "png"}`} alt="" aria-hidden width={size} height={size} onError={() => setStage(stage + 1)}
      className="rounded-xl object-contain bg-white border border-line shrink-0" style={{ width: size, height: size, padding: size * 0.14 }} />
  );
  return <span aria-hidden className="rounded-xl bg-cream text-ink font-medium inline-flex items-center justify-center shrink-0" style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials || "?"}</span>;
}
