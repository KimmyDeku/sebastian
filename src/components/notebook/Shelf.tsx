"use client";
import { useEffect, useState } from "react";
import { FlaskConical, ClipboardList, Code2, Languages, GraduationCap } from "lucide-react";

export const SECTIONS = [
  { key: "research", title: "Research", blurb: "Add your sources and ask questions. Every answer cites them.", icon: FlaskConical, color: ["#2F4A3A", "#3E6250"], h: 250 },
  { key: "assignments", title: "Assignments", blurb: "Turn a brief into a plan, milestones and draft feedback.", icon: ClipboardList, color: ["#7A3B2E", "#9C4E3D"], h: 280 },
  { key: "coding", title: "Coding", blurb: "Write, fix and understand code with a patient engineer.", icon: Code2, color: ["#1F2A44", "#2D3C5E"], h: 236 },
  { key: "languages", title: "Languages", blurb: "Bite-sized lessons, listening practice, streaks and XP.", icon: Languages, color: ["#8A6420", "#B8823A"], h: 268 },
  { key: "tutor", title: "Tutoring", blurb: "A tutor for any subject, with quizzes that track your progress.", icon: GraduationCap, color: ["#4B3566", "#644886"], h: 256 },
] as const;

// Decorative spines between the real books.
const FILL = [["#D9C6A5", 170], ["#A9B8A6", 205], ["#C98F6B", 150], ["#8FA3B8", 190], ["#E4D3B4", 160], ["#B7A07A", 214], ["#C4B2CF", 176]] as const;

/** A library bookshelf: each of the five large books opens a section. */
export function Shelf({ onOpen }: { onOpen: (key: string) => void }) {
  // Scale the shelf so all five books fit on any screen.
  const [k, setK] = useState(1);
  useEffect(() => { const f = () => setK(window.innerWidth < 640 ? 0.58 : window.innerWidth < 1024 ? 0.82 : 1); f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, []);
  const small = k < 0.7;
  const order: (typeof SECTIONS[number] | (typeof FILL)[number])[] = small
    ? [FILL[0], SECTIONS[0], SECTIONS[1], FILL[2], SECTIONS[2], SECTIONS[3], FILL[5], SECTIONS[4]]
    : [FILL[0], SECTIONS[0], FILL[1], SECTIONS[1], FILL[2], FILL[3], SECTIONS[2], FILL[4], SECTIONS[3], FILL[5], SECTIONS[4], FILL[6]];
  return (
    <div className="relative rounded-[28px] overflow-hidden border border-line" style={{ background: "linear-gradient(180deg,#F7EFE4 0%,#EFE3D2 100%)" }}>
      {/* soft window light */}
      <div aria-hidden className="absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[260px] rounded-full" style={{ background: "radial-gradient(closest-side, rgba(255,255,255,.75), rgba(255,255,255,0))" }} />
      <div className="relative overflow-x-auto no-scrollbar px-4 sm:px-6 pt-10">
        <div className="flex items-end justify-center min-w-max mx-auto" style={{ gap: small ? 4 : 6 }}>
          {order.map((b, i) => {
            if (Array.isArray(b)) {
              const [c, h] = b as unknown as [string, number];
              return <span key={i} aria-hidden className="rounded-t-[6px] shadow-[inset_-3px_0_0_rgba(0,0,0,.08)]" style={{ width: (26 + (i % 3) * 6) * k, height: h * k, background: c }} />;
            }
            const s = b as (typeof SECTIONS)[number];
            return (
              <button key={s.key} onClick={() => onOpen(s.key)} aria-label={`Open ${s.title}`}
                className="group relative rounded-t-[8px] text-white transition-transform duration-300 hover:-translate-y-3 focus-visible:-translate-y-3 shadow-[inset_-6px_0_0_rgba(0,0,0,.18),0_6px_14px_-6px_rgba(0,0,0,.4)]"
                style={{ width: 84 * k, height: s.h * k, background: `linear-gradient(90deg, ${s.color[0]}, ${s.color[1]} 55%, ${s.color[0]})` }}>
                <span aria-hidden className="absolute inset-x-0 h-[3px] bg-[#E6C98F]/80" style={{ top: 20 * k }} />
                <span aria-hidden className="absolute inset-x-0 h-px bg-[#E6C98F]/60" style={{ top: 26 * k }} />
                <span aria-hidden className="absolute inset-x-0 h-[3px] bg-[#E6C98F]/80" style={{ bottom: 24 * k }} />
                <s.icon className="absolute left-1/2 -translate-x-1/2 text-[#F3E3C3]" style={{ top: 40 * k, width: 24 * Math.max(k, 0.75), height: 24 * Math.max(k, 0.75) }} aria-hidden />
                <span className="absolute left-1/2 -translate-x-1/2 font-serif tracking-wide text-[#FBF3E4] whitespace-nowrap" style={{ top: 84 * k, fontSize: 21 * Math.max(k, 0.7), writingMode: "vertical-rl", transform: "translateX(-50%) rotate(180deg)" }}>{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>
      {/* the shelf */}
      <div aria-hidden className="relative h-5 mx-3 rounded-sm" style={{ background: "linear-gradient(180deg,#9C6B3F,#7A5230)", boxShadow: "0 8px 16px -6px rgba(60,35,10,.45)" }} />
      <div aria-hidden className="h-6" />
    </div>
  );
}
