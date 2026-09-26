"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    setTimeout(() => ref.current?.querySelector<HTMLElement>("button, input, select, textarea, a")?.focus(), 20);
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = ""; prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title}
        className={`relative bg-paper w-full ${wide ? "md:max-w-3xl" : "md:max-w-lg"} max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-3xl shadow-lift animate-fadeUp pb-safe`}>
        <div className="sticky top-0 bg-paper/95 backdrop-blur flex items-center justify-between px-6 pt-5 pb-3 border-b border-line z-10">
          <h2 className="t-h3">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full hover:bg-cream flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, rows, body, confirmLabel, onConfirm, onCancel, danger, busy }: {
  open: boolean; title: string; rows?: [string, string][]; body?: ReactNode; confirmLabel: string; onConfirm: () => void; onCancel: () => void; danger?: boolean; busy?: boolean;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      {body && <div className="text-sm text-muted mb-4 leading-relaxed">{body}</div>}
      {rows && (
        <dl className="rounded-2xl bg-canvas border border-line divide-y divide-line text-sm mb-5">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 px-4 py-3"><dt className="text-muted">{k}</dt><dd className="text-right text-ink">{v || "—"}</dd></div>
          ))}
        </dl>
      )}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>Go back</Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={busy}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
