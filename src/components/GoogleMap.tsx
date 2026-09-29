"use client";
import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { loadGoogleMaps } from "@/lib/googleMaps";
import { cx } from "@/lib/util";

export type MapPinData = { id?: string; name: string; lat: number; lng: number; note?: string };

const PIN_CSS = `
.seb-gpin{display:inline-flex;align-items:center;gap:6px;cursor:pointer;transform:translateY(-4px)}
.seb-gpin .dot{width:14px;height:14px;border-radius:999px;background:#B8823A;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)}
.seb-gpin .lbl{font:500 11.5px Poppins,system-ui,sans-serif;background:#fff;color:#1C1B19;padding:3px 8px;border-radius:999px;box-shadow:0 1px 4px rgba(0,0,0,.2);white-space:nowrap;max-width:180px;overflow:hidden;text-overflow:ellipsis}
.seb-gpin:hover .lbl{background:#F7EFE4}
.seb-gpin.on .dot{background:#1C1B19;width:16px;height:16px}.seb-gpin.on .lbl{background:#1C1B19;color:#fff}
`;

/**
 * Google map with Sebastian's gold pins. The page keeps scrolling normally over it:
 * zoom with Ctrl + scroll (or two fingers on a phone).
 */
export function GoogleMap({ pins, center, zoom = 12, selected, onPick, fit = false, className, onReady, labels = true }: {
  pins: MapPinData[]; center?: { lat: number; lng: number } | null; zoom?: number; selected?: string; onPick?: (p: MapPinData) => void; fit?: boolean; className?: string; onReady?: (map: any) => void; labels?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const lib = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const pick = useRef(onPick);
  pick.current = onPick;
  const [state, setState] = useState<"loading" | "ready" | "no-key" | "failed">("loading");

  useEffect(() => {
    let dead = false;
    const onAuth = () => setState("failed");
    window.addEventListener("sebastian-maps-auth", onAuth);
    loadGoogleMaps().then(async (g) => {
      if (dead || !box.current) return;
      const [{ Map }, marker] = await Promise.all([g.maps.importLibrary("maps"), g.maps.importLibrary("marker")]);
      lib.current = marker;
      const c = center || (pins[0] ? { lat: pins[0].lat, lng: pins[0].lng } : { lat: 10, lng: 20 });
      map.current = new Map(box.current, {
        center: c, zoom: center || pins.length ? zoom : 2, mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID",
        gestureHandling: "cooperative", streetViewControl: false, mapTypeControl: false, fullscreenControl: true, clickableIcons: false,
      });
      setState("ready");
      onReady?.(map.current);
    }).catch((e) => !dead && setState(e?.message === "no-key" ? "no-key" : "failed"));
    return () => { dead = true; window.removeEventListener("sebastian-maps-auth", onAuth); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state !== "ready" || !map.current || !lib.current) return;
    markers.current.forEach((m) => (m.map = null));
    markers.current = pins.map((p) => {
      const el = document.createElement("div");
      el.className = `seb-gpin${p.name === selected ? " on" : ""}`;
      el.innerHTML = `<span class="dot"></span>${labels ? `<span class="lbl"></span>` : ""}`;
      const lbl = el.querySelector(".lbl") as HTMLElement | null;
      if (lbl) lbl.textContent = p.name.split(",")[0];
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", `Choose ${p.name}`);
      el.addEventListener("click", (ev) => { ev.stopPropagation(); pick.current?.(p); });
      return new lib.current.AdvancedMarkerElement({ map: map.current, position: { lat: p.lat, lng: p.lng }, content: el, title: p.name });
    });
    if (fit && pins.length > 1) {
      const g = (window as any).google;
      const b = new g.maps.LatLngBounds();
      pins.forEach((p) => b.extend({ lat: p.lat, lng: p.lng }));
      map.current.fitBounds(b, 50);
    }
  }, [pins, selected, state, fit, labels]);

  useEffect(() => { if (state === "ready" && center && map.current && !fit) { map.current.panTo(center); map.current.setZoom(zoom); } }, [center?.lat, center?.lng, state]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cx("relative overflow-hidden bg-[#e8eef3] dark:bg-[#1b2a36]", className)}>
      <style dangerouslySetInnerHTML={{ __html: PIN_CSS }} />
      <div ref={box} className="absolute inset-0" />
      {state === "loading" && <div className="absolute inset-0 flex items-center justify-center text-sm text-muted gap-2"><Loader2 className="w-4 h-4 animate-spin" />Loading map…</div>}
      {(state === "no-key" || state === "failed") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-5 bg-paper">
          <MapPin className="w-6 h-6 text-gold" aria-hidden />
          <p className="text-[13px] text-muted mt-2 max-w-xs">{state === "no-key" ? "The map needs a Google Maps browser key (NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY)." : "Google Maps couldn't load. Check the browser key and that the Maps JavaScript API is enabled."}</p>
          {pins.length > 0 && onPick && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-3 max-h-40 overflow-y-auto">
              {pins.slice(0, 24).map((p) => <button key={p.name} onClick={() => onPick(p)} className="h-8 px-3 rounded-pill border border-line text-[12px] hover:bg-cream/60">{p.name.split(",")[0]}</button>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
