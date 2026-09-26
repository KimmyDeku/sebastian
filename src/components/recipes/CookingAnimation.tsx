"use client";
import { useEffect, useState } from "react";

const LINES = ["Warming the pan…", "Consulting the pantry…", "Tasting for seasoning…", "Plating with care…"];

export function CookingAnimation({ longWait }: { longWait?: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % LINES.length), 1250); return () => clearInterval(t); }, []);
  return (
    <div className="bg-paper rounded-3xl border border-line shadow-soft py-16 px-6 text-center" role="status" aria-live="polite">
      <svg viewBox="0 0 200 150" className="w-48 h-36 mx-auto" aria-hidden>
        {[70, 100, 130].map((x, k) => (
          <path key={x} d={`M${x} 60 q-8 -12 0 -24 q8 -12 0 -24`} stroke="#B8823A" strokeWidth="3" fill="none" strokeLinecap="round" className="animate-steam" style={{ animationDelay: `${k * 0.45}s`, transformBox: "fill-box" }} />
        ))}
        <g className="animate-stir" style={{ transformOrigin: "120px 80px" }}>
          <rect x="116" y="30" width="7" height="60" rx="3.5" fill="#94662A" />
          <ellipse cx="119.5" cy="90" rx="9" ry="5" fill="#94662A" />
        </g>
        <path d="M35 80 h130 v8 q0 42 -45 42 h-40 q-45 0 -45 -42 z" fill="#1C1B19" />
        <rect x="22" y="82" width="18" height="6" rx="3" fill="#1C1B19" />
        <rect x="160" y="82" width="18" height="6" rx="3" fill="#1C1B19" />
        <rect x="30" y="74" width="140" height="8" rx="4" fill="#3A3833" />
      </svg>
      <p className="t-h3 mt-6">{LINES[i]}</p>
      <p className="text-sm text-muted mt-2">{longWait ? "Still simmering — I'm reading the recipe sites and checking your restrictions." : "Sebastian is preparing ten recipes for you."}</p>
    </div>
  );
}
