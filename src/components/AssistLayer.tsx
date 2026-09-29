"use client";
import { useEffect, useRef, useState } from "react";

const TARGETS = 'button, a[href], [role="button"], [role="tab"], [role="radio"], [role="switch"], [role="checkbox"], select, summary';
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

function labelOf(el: HTMLElement) {
  const t = el.dataset.tip || el.getAttribute("aria-label") || el.dataset.tipTitle || el.getAttribute("title") || el.innerText || "";
  const s = clean(t.split("\n")[0]);
  return s.length > 70 ? s.slice(0, 67) + "…" : s;
}

function scrollableX(start: HTMLElement | null) {
  for (let el = start; el && el !== document.body; el = el.parentElement) {
    const ox = getComputedStyle(el).overflowX;
    if ((ox === "auto" || ox === "scroll") && el.scrollWidth > el.clientWidth + 2) return el;
  }
  return null;
}
const skip = (el: HTMLElement | null) => !!el?.closest('input, textarea, [contenteditable="true"], .gm-style, .maplibregl-map, [data-no-drag]');

/**
 * App-wide helpers: hover tooltips that name each action, and drag-to-scroll
 * (with a grab hand) for anything that scrolls sideways.
 */
export function AssistLayer() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number; below: boolean } | null>(null);
  const timer = useRef<any>(null);
  const cur = useRef<HTMLElement | null>(null);

  // ---------- Tooltips ----------
  useEffect(() => {
    const canHover = window.matchMedia("(hover: hover)").matches;
    const hide = () => {
      clearTimeout(timer.current);
      if (cur.current?.dataset.tipTitle) { cur.current.setAttribute("title", cur.current.dataset.tipTitle); delete cur.current.dataset.tipTitle; }
      cur.current = null;
      setTip(null);
    };
    const show = (el: HTMLElement, delay: number) => {
      if (el.closest("[data-no-tip], .gm-style")) return;
      hide();
      cur.current = el;
      const title = el.getAttribute("title");
      if (title) { el.dataset.tipTitle = title; el.removeAttribute("title"); } // avoid a second, browser tooltip
      timer.current = setTimeout(() => {
        const text = labelOf(el);
        if (!text || !el.isConnected) return;
        const r = el.getBoundingClientRect();
        const below = r.top < 44;
        setTip({ text, x: Math.min(window.innerWidth - 12, Math.max(12, r.left + r.width / 2)), y: below ? r.bottom + 8 : r.top - 8, below });
      }, delay);
    };
    const over = (e: PointerEvent) => {
      if (!canHover || e.pointerType !== "mouse") return;
      const el = (e.target as HTMLElement)?.closest?.(TARGETS) as HTMLElement | null;
      if (el && el !== cur.current) show(el, 450);
      else if (!el && cur.current) hide();
    };
    const focus = (e: FocusEvent) => {
      const el = (e.target as HTMLElement)?.closest?.(TARGETS) as HTMLElement | null;
      if (el && el.matches(":focus-visible")) show(el, 250);
    };
    document.addEventListener("pointerover", over, true);
    document.addEventListener("focusin", focus, true);
    document.addEventListener("focusout", hide, true);
    document.addEventListener("pointerdown", hide, true);
    window.addEventListener("scroll", hide, true);
    const key = (e: KeyboardEvent) => e.key === "Escape" && hide();
    window.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerover", over, true); document.removeEventListener("focusin", focus, true);
      document.removeEventListener("focusout", hide, true); document.removeEventListener("pointerdown", hide, true);
      window.removeEventListener("scroll", hide, true); window.removeEventListener("keydown", key);
    };
  }, []);

  // ---------- Drag to scroll ----------
  useEffect(() => {
    let box: HTMLElement | null = null, startX = 0, startLeft = 0, moved = false, snap = "";
    const mark = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = scrollableX(e.target as HTMLElement);
      if (el && !el.hasAttribute("data-drag-scroll") && !skip(e.target as HTMLElement)) el.setAttribute("data-drag-scroll", "");
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0 || skip(e.target as HTMLElement)) return;
      box = scrollableX(e.target as HTMLElement);
      if (!box) return;
      startX = e.clientX; startLeft = box.scrollLeft; moved = false;
    };
    const move = (e: PointerEvent) => {
      if (!box) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 6) { moved = true; snap = box.style.scrollSnapType; box.style.scrollSnapType = "none"; box.setAttribute("data-dragging", ""); }
      if (moved) { box.scrollLeft = startLeft - dx; e.preventDefault(); }
    };
    const up = () => {
      if (!box) return;
      if (moved) {
        const b = box;
        b.removeAttribute("data-dragging");
        setTimeout(() => { b.style.scrollSnapType = snap; }, 50);
        // A drag shouldn't also count as a click on whatever was under the pointer.
        const stop = (ev: MouseEvent) => { ev.stopPropagation(); ev.preventDefault(); };
        window.addEventListener("click", stop, { capture: true, once: true });
        setTimeout(() => window.removeEventListener("click", stop, true), 60);
      }
      box = null;
    };
    const noGhost = (e: DragEvent) => { if ((e.target as HTMLElement)?.closest?.("[data-drag-scroll]")) e.preventDefault(); };
    document.addEventListener("pointerover", mark, true);
    document.addEventListener("pointerdown", down, true);
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up, true);
    document.addEventListener("dragstart", noGhost, true);
    return () => {
      document.removeEventListener("pointerover", mark, true); document.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up, true); document.removeEventListener("dragstart", noGhost, true);
    };
  }, []);

  if (!tip) return null;
  return (
    <div role="tooltip" translate="no" className="fixed z-[120] pointer-events-none px-2.5 py-1.5 rounded-lg bg-[#1C1B19] text-white text-[12px] leading-tight shadow-lift max-w-[260px] text-center animate-fadeUp"
      style={{ left: tip.x, top: tip.y, transform: `translate(-50%, ${tip.below ? "0" : "-100%"})` }}>
      {tip.text}
    </div>
  );
}
