"use client";
import { create } from "zustand";
import { CheckCircle2, AlertTriangle, Info, X, WifiOff } from "lucide-react";

type Tone = "success" | "error" | "info" | "offline";
interface T { id: number; tone: Tone; text: string }
const useToasts = create<{ list: T[]; push: (t: Omit<T, "id">) => void; drop: (id: number) => void }>((set) => ({
  list: [],
  push: (t) => { const id = Date.now() + Math.random(); set((s) => ({ list: [...s.list.slice(-3), { ...t, id }] })); setTimeout(() => set((s) => ({ list: s.list.filter((x) => x.id !== id) })), 5200); },
  drop: (id) => set((s) => ({ list: s.list.filter((x) => x.id !== id) })),
}));
export const toast = {
  success: (text: string) => useToasts.getState().push({ tone: "success", text }),
  error: (text: string) => useToasts.getState().push({ tone: "error", text }),
  info: (text: string) => useToasts.getState().push({ tone: "info", text }),
  offline: (text: string) => useToasts.getState().push({ tone: "offline", text }),
};
const ICON = { success: CheckCircle2, error: AlertTriangle, info: Info, offline: WifiOff };
const COLOR = { success: "text-success", error: "text-danger", info: "text-gold-deep", offline: "text-offline" };

export function ToastHost() {
  const { list, drop } = useToasts();
  return (
    <div aria-live="polite" className="fixed z-[80] bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 w-[min(92vw,420px)]">
      {list.map((t) => {
        const I = ICON[t.tone];
        return (
          <div key={t.id} role="status" className="animate-fadeUp flex items-start gap-3 bg-paper border border-line rounded-2xl shadow-lift px-4 py-3 text-sm">
            <I className={`w-5 h-5 shrink-0 mt-0.5 ${COLOR[t.tone]}`} aria-hidden />
            <p className="flex-1 text-ink">{t.text}</p>
            <button onClick={() => drop(t.id)} aria-label="Dismiss" className="text-muted hover:text-ink"><X className="w-4 h-4" /></button>
          </div>
        );
      })}
    </div>
  );
}
