"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { Search, Hand, Loader2, MapPin, ArrowRight } from "lucide-react";
import { cx } from "@/lib/util";

export type Pin = { name: string; lat: number; lng: number; note?: string; country?: string };

const PIN_CSS = `
.seb-pin{display:inline-flex;align-items:center;gap:6px;background:none;border:0;padding:0;cursor:pointer;transform:translateX(-7px)}
.seb-pin .dot{width:14px;height:14px;border-radius:999px;background:#B8823A;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)}
.seb-pin .lbl{font:500 11.5px Poppins,system-ui,sans-serif;background:#fff;color:#1C1B19;padding:3px 8px;border-radius:999px;box-shadow:0 1px 4px rgba(0,0,0,.18);white-space:nowrap}
.seb-pin:hover .lbl{background:#F7EFE4}
.seb-pin.on .dot{background:#1C1B19;width:16px;height:16px}
.seb-pin.on .lbl{background:#1C1B19;color:#fff}
.seb-globe .maplibregl-canvas{cursor:grab}.seb-globe .maplibregl-canvas:active{cursor:grabbing}
`;

/** A spinnable globe (drag with the hand cursor). Tap a pin or search to pick a destination. */
export function Globe({ pins, focus, selected, onPick }: { pins: Pin[]; focus?: { lat: number; lng: number } | null; selected?: string; onPick: (p: Pin) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const lib = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const pick = useRef(onPick);
  pick.current = onPick;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<Pin | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const ml = (await import("maplibre-gl")).default;
        if (dead || !box.current) return;
        lib.current = ml;
        const m = new ml.Map({ container: box.current, style: "https://tiles.openfreemap.org/styles/liberty", center: [22, 8], zoom: 1.2, attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false });
        m.addControl(new ml.NavigationControl({ showCompass: false }), "bottom-right");
        m.on("style.load", () => { try { m.setProjection({ type: "globe" }); } catch {} setReady(true); });
        m.on("error", () => { if (!m.isStyleLoaded()) setFailed(true); });
        map.current = m;
      } catch { setFailed(true); }
    })();
    return () => { dead = true; try { map.current?.remove(); } catch {} };
  }, []);

  useEffect(() => {
    const ml = lib.current, m = map.current;
    if (!ml || !m || !ready) return;
    markers.current.forEach((x) => x.remove());
    const all = [...pins, ...(found && !pins.some((p) => p.name === found.name) ? [found] : [])];
    markers.current = all.map((p) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = `seb-pin${p.name === selected ? " on" : ""}`;
      el.setAttribute("aria-label", `Choose ${p.name}`);
      el.innerHTML = `<span class="dot"></span><span class="lbl"></span>`;
      (el.querySelector(".lbl") as HTMLElement).textContent = p.name.split(",")[0];
      el.addEventListener("click", (ev) => { ev.stopPropagation(); pick.current(p); });
      return new ml.Marker({ element: el, anchor: "left" }).setLngLat([p.lng, p.lat]).addTo(m);
    });
  }, [pins, found, selected, ready]);

  useEffect(() => { if (focus && map.current && ready) map.current.flyTo({ center: [focus.lng, focus.lat], zoom: 3.4, speed: 0.9 }); }, [focus, ready]);

  const search = async () => {
    if (!q.trim()) return;
    setBusy(true); setErr("");
    const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`).then((x) => x.json()).catch(() => ({ ok: false, error: "Search needs a connection." }));
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    const p = { name: r.name, lat: r.lat, lng: r.lng, country: r.country };
    setFound(p);
    map.current?.flyTo({ center: [p.lng, p.lat], zoom: 4, speed: 0.9 });
  };

  return (
    <div className="seb-globe relative w-full h-full rounded-3xl overflow-hidden border border-line bg-[#dcebf7] dark:bg-[#1b2a36]">
      <style dangerouslySetInnerHTML={{ __html: PIN_CSS }} />
      <div ref={box} className="absolute inset-0" aria-label="Interactive globe. Drag to spin." />
      {!ready && !failed && <div className="absolute inset-0 flex items-center justify-center text-sm text-muted gap-2"><Loader2 className="w-4 h-4 animate-spin" />Loading the globe…</div>}
      {failed && (
        <div className="absolute inset-0 overflow-y-auto p-5 pt-20 bg-paper">
          <p className="text-sm text-muted mb-3">The map couldn&apos;t load right now. Choose a destination here instead:</p>
          <div className="flex flex-wrap gap-2">{pins.map((p) => <button key={p.name} onClick={() => onPick(p)} className="h-9 px-3 rounded-pill border border-line text-[13px] inline-flex items-center gap-1.5 hover:bg-cream/60"><MapPin className="w-3.5 h-3.5 text-gold" />{p.name}</button>)}</div>
        </div>
      )}
      <div className="absolute top-3 left-3 right-3 sm:right-auto sm:w-80 z-10">
        <div className="flex items-center gap-1 bg-paper/95 backdrop-blur rounded-pill border border-line shadow-soft pl-4 pr-1 h-11">
          <Search className="w-4 h-4 text-muted shrink-0" aria-hidden />
          <label htmlFor="globe-q" className="sr-only">Search for a destination</label>
          <input id="globe-q" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Search a city or country" className="flex-1 min-w-0 bg-transparent outline-none text-base md:text-[13px]" />
          <button onClick={search} disabled={busy || !q.trim()} className="h-9 px-3 rounded-pill bg-ink text-white text-[12px] disabled:opacity-40 inline-flex items-center gap-1">{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Find"}</button>
        </div>
        {err && <p className="mt-2 text-[12px] bg-paper/95 rounded-xl px-3 py-2 text-danger">{err}</p>}
        {found && (
          <div className="mt-2 bg-paper/95 backdrop-blur rounded-2xl border border-line shadow-soft p-3 flex items-center gap-3">
            <MapPin className="w-4 h-4 text-gold shrink-0" aria-hidden /><span className="flex-1 text-[13px] truncate">{found.name}</span>
            <button onClick={() => onPick(found)} className="h-8 px-3 rounded-pill bg-gold text-white text-[12px] inline-flex items-center gap-1">Choose<ArrowRight className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>
      {ready && <p className={cx("absolute bottom-3 left-3 z-10 inline-flex items-center gap-1.5 h-8 px-3 rounded-pill bg-paper/90 text-[11.5px] text-muted shadow-soft")}><Hand className="w-3.5 h-3.5" aria-hidden />Drag to spin the globe</p>}
    </div>
  );
}
