"use client";
import { useRef, useState } from "react";
import { Search, Loader2, MapPin, ArrowRight, Globe2, LocateFixed, Hand } from "lucide-react";
import { GoogleMap, type MapPinData } from "../GoogleMap";

export type Pin = MapPinData & { country?: string };

/** Travel map (Google Maps): opens on the destination; zoom out to choose somewhere else. */
export function Globe({ pins, focus, selected, onPick }: { pins: Pin[]; focus?: { lat: number; lng: number } | null; selected?: string; onPick: (p: Pin) => void }) {
  const map = useRef<any>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [found, setFound] = useState<Pin | null>(null);
  const [err, setErr] = useState("");
  const [world, setWorld] = useState(!focus);

  const search = async () => {
    if (!q.trim()) return;
    setBusy(true); setErr("");
    const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`).then((x) => x.json()).catch(() => ({ ok: false, error: "Search needs a connection." }));
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    const p = { name: r.name, lat: r.lat, lng: r.lng, country: r.country };
    setFound(p);
    map.current?.panTo({ lat: p.lat, lng: p.lng }); map.current?.setZoom(9);
  };
  const worldView = () => { map.current?.setZoom(2); setWorld(true); };
  const backHome = () => { if (focus) { map.current?.panTo(focus); map.current?.setZoom(11); setWorld(false); } };
  const all = [...pins, ...(found && !pins.some((p) => p.name === found.name) ? [found] : [])];

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden border border-line">
      <GoogleMap className="absolute inset-0" pins={all} center={focus} zoom={11} selected={selected} onPick={(p) => onPick(p as Pin)}
        onReady={(m) => { map.current = m; m.addListener("zoom_changed", () => setWorld(m.getZoom() < 5)); }} />
      <div className="absolute top-3 left-3 right-3 sm:right-auto sm:w-80 z-10">
        <div className="flex items-center gap-1 bg-paper/95 backdrop-blur rounded-pill border border-line shadow-soft pl-4 pr-1 h-11">
          <Search className="w-4 h-4 text-muted shrink-0" aria-hidden />
          <label htmlFor="globe-q" className="sr-only">Search for a destination</label>
          <input id="globe-q" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="Search a city or country" className="flex-1 min-w-0 bg-transparent outline-none text-base md:text-[13px]" />
          <button onClick={search} disabled={busy || !q.trim()} aria-label="Find this place" className="h-9 px-3 rounded-pill bg-ink text-white text-[12px] disabled:opacity-40 inline-flex items-center gap-1">{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Find"}</button>
        </div>
        {err && <p className="mt-2 text-[12px] bg-paper/95 rounded-xl px-3 py-2 text-danger">{err}</p>}
        {found && (
          <div className="mt-2 bg-paper/95 backdrop-blur rounded-2xl border border-line shadow-soft p-3 flex items-center gap-3">
            <MapPin className="w-4 h-4 text-gold shrink-0" aria-hidden /><span className="flex-1 text-[13px] truncate">{found.name}</span>
            <button onClick={() => onPick(found)} aria-label={`Plan a trip to ${found.name}`} className="h-8 px-3 rounded-pill bg-gold text-white text-[12px] inline-flex items-center gap-1">Choose<ArrowRight className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>
      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-2">
        {world
          ? focus && <button onClick={backHome} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-pill bg-paper/95 text-[12px] shadow-soft border border-line"><LocateFixed className="w-4 h-4 text-gold" />Back to {selected?.split(",")[0]}</button>
          : <button onClick={worldView} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-pill bg-paper/95 text-[12px] shadow-soft border border-line"><Globe2 className="w-4 h-4 text-gold" />World view · choose another</button>}
        <span className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-pill bg-paper/80 text-[11.5px] text-muted"><Hand className="w-3.5 h-3.5" aria-hidden />Drag to explore · Ctrl + scroll to zoom</span>
      </div>
    </div>
  );
}
