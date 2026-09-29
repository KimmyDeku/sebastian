"use client";
import { useMemo, useState } from "react";
import { Heart, MapPin, Star, LayoutGrid, List, SlidersHorizontal, RefreshCw, ExternalLink, Sparkles } from "lucide-react";
import { Img } from "../ui/Img";
import { GoogleMap } from "../GoogleMap";
import { Button } from "../ui/Button";
import { Notice, Skeleton, EmptyState } from "../ui/States";
import { actions, useData } from "@/lib/store";
import { relTime, cx } from "@/lib/util";

export const priceOf = (s?: string) => { const m = String(s || "").replace(/,/g, "").match(/\d+(\.\d+)?/); return m ? Number(m[0]) : null; };
const PROVIDER: Record<string, string> = { booking: "Booking.com", agoda: "Agoda", tripadvisor: "Tripadvisor", flightFare: "Flight-Fare", airZimbabwe: "Air Zimbabwe", busbud: "Busbud", checkmybus: "CheckMyBus", omio: "Omio", "12go": "12Go", intercape: "Intercape" };

function RatingBadge({ it }: { it: any }) {
  const r = it.ta?.rating ?? it.rating;
  if (!r) return null;
  const n = it.ta?.reviews ?? it.reviews;
  const label = r >= 4.5 ? "Excellent" : r >= 4 ? "Very good" : r >= 3.5 ? "Good" : "Pleasant";
  return (
    <p className="flex items-center gap-2 text-[12.5px] mt-1.5">
      <span className="inline-flex items-center justify-center min-w-8 h-7 px-1.5 rounded-lg rounded-bl-none bg-ink text-white text-[12px] font-medium">{Number(r).toFixed(1)}</span>
      <span className="font-medium">{label}</span>
      {n ? <span className="text-muted">· {Number(n).toLocaleString()} reviews{it.ta ? " on Tripadvisor" : ""}</span> : null}
    </p>
  );
}

export function Results({ type, where, res, loading, onPick, onRefresh, fallbackImg }: {
  type: string; where: string; res: any; loading: boolean; onPick: (it: any) => void; onRefresh: () => void; fallbackImg: string[];
}) {
  const d = useData();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState("top");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const items: any[] = res?.items || [];
  const prices = items.map((i) => priceOf(i.priceEstimate)).filter((x): x is number => x != null);
  const ceiling = prices.length ? Math.ceil(Math.max(...prices) / 10) * 10 : 0;
  const saved = new Set(d.places.map((p) => p.id));
  const placeLike = type === "stays" || type === "attractions";

  const shown = useMemo(() => {
    let list = items.filter((i) => (maxPrice == null || (priceOf(i.priceEstimate) ?? 0) <= maxPrice) && ((i.ta?.rating ?? i.rating ?? 0) >= minRating || !minRating));
    if (sort === "price") list = [...list].sort((a, b) => (priceOf(a.priceEstimate) ?? 1e9) - (priceOf(b.priceEstimate) ?? 1e9));
    if (sort === "rating") list = [...list].sort((a, b) => (b.ta?.rating ?? b.rating ?? 0) - (a.ta?.rating ?? a.rating ?? 0));
    if (sort === "reviews") list = [...list].sort((a, b) => (b.ta?.reviews ?? b.reviews ?? 0) - (a.ta?.reviews ?? a.reviews ?? 0));
    return list;
  }, [items, maxPrice, minRating, sort]);

  const save = (it: any) => actions.togglePlace({ id: it.id, name: it.name, address: it.area, category: type === "stays" ? "Stay" : "Attraction", photo: it.photo, mapsUrl: it.mapsUrl || `https://www.google.com/maps/search/${encodeURIComponent(`${it.name} ${where}`)}`, rating: it.ta?.rating ?? it.rating });

  const filters = (
    <div className="space-y-5">
      {items.some((i) => i.lat != null) ? (
        <div>
          <GoogleMap className="h-48 rounded-2xl border border-line" fit labels={false}
            pins={items.filter((i) => i.lat != null).map((i) => ({ id: i.id, name: i.name, lat: i.lat, lng: i.lng }))}
            onPick={(pin) => { const hit = items.find((x) => x.id === pin.id); if (hit) onPick(hit); }} />
          <a href={`https://www.google.com/maps/search/${encodeURIComponent(where)}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-ink"><MapPin className="w-3.5 h-3.5" />Open in Google Maps</a>
        </div>
      ) : (
        <a href={`https://www.google.com/maps/search/${encodeURIComponent(where)}`} target="_blank" rel="noopener noreferrer" className="relative block h-32 rounded-2xl overflow-hidden border border-line img-fallback">
          <span className="absolute inset-0 flex items-center justify-center"><span className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-ink text-white text-sm"><MapPin className="w-4 h-4" />Show on map</span></span>
        </a>
      )}
      <div className="rounded-2xl border border-line bg-paper p-4">
        <p className="text-sm font-medium">Filter by</p>
        {ceiling > 0 && (
          <div className="mt-4">
            <p className="text-[13px]">Your budget {type === "stays" ? "(per night)" : ""}</p>
            <p className="text-xs text-muted mt-0.5">Up to ${maxPrice ?? ceiling} · estimates</p>
            <input type="range" className="range w-full mt-3" min={Math.max(0, Math.floor(Math.min(...prices) / 10) * 10)} max={ceiling} step={5} value={maxPrice ?? ceiling} onChange={(e) => setMaxPrice(+e.target.value)} aria-label="Maximum price" />
          </div>
        )}
        {items.some((i) => i.rating || i.ta?.rating) && (
          <div className="mt-5">
            <p className="text-[13px] mb-2">Guest rating</p>
            <div className="flex flex-wrap gap-1.5">
              {[[0, "Any"], [3.5, "3.5+"], [4, "4+"], [4.5, "4.5+"]].map(([v, l]) => (
                <button key={l} onClick={() => setMinRating(v as number)} className={cx("h-8 px-3 rounded-pill border text-[12px]", minRating === v ? "bg-ink text-white border-ink" : "border-line")}>{l}</button>
              ))}
            </div>
          </div>
        )}
        {(maxPrice != null || minRating > 0) && <button onClick={() => { setMaxPrice(null); setMinRating(0); }} className="mt-4 text-xs underline text-muted">Clear filters</button>}
      </div>
      <div className="rounded-2xl border border-line bg-paper p-4">
        <p className="text-sm font-medium mb-2">Search directly on</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(res?.links || {}).filter(([, v]) => v).map(([k, v]) => (
            <a key={k} href={v as string} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 h-8 px-3 rounded-pill border border-line text-[12px] hover:bg-cream/60">{PROVIDER[k] || k}<ExternalLink className="w-3 h-3" /></a>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-6 mt-6">
      <aside className="hidden lg:block">{filters}</aside>
      <section aria-live="polite" className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl">{where}: {loading && !items.length ? "searching…" : `${shown.length} ${shown.length === 1 ? "option" : "options"} found`}</h2>
            <p className="text-[12px] text-muted mt-0.5 inline-flex items-center gap-1.5">
              {res?.updatedAt && <>Updated {relTime(res.updatedAt)} · refreshes automatically</>}
              {res?.sources?.length ? <> · from {res.sources.join(", ")}</> : null}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters(!showFilters)} className="lg:hidden inline-flex items-center gap-1.5 h-9 px-3 rounded-pill border border-line text-[13px]"><SlidersHorizontal className="w-4 h-4" />Filters</button>
            <label className="sr-only" htmlFor="sort">Sort by</label>
            <select id="sort" value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 px-3 rounded-pill border border-line bg-paper text-[13px]">
              <option value="top">Sort: Top picks</option><option value="price">Price (lowest first)</option>
              {placeLike && <><option value="rating">Guest rating</option><option value="reviews">Most reviewed</option></>}
            </select>
            <div className="hidden sm:inline-flex rounded-pill border border-line p-0.5" role="radiogroup" aria-label="Layout">
              <button role="radio" aria-checked={view === "list"} onClick={() => setView("list")} aria-label="List" className={cx("w-8 h-8 rounded-pill inline-flex items-center justify-center", view === "list" && "bg-cream")}><List className="w-4 h-4" /></button>
              <button role="radio" aria-checked={view === "grid"} onClick={() => setView("grid")} aria-label="Grid" className={cx("w-8 h-8 rounded-pill inline-flex items-center justify-center", view === "grid" && "bg-cream")}><LayoutGrid className="w-4 h-4" /></button>
            </div>
            <button onClick={onRefresh} disabled={loading} aria-label="Refresh results" className="w-9 h-9 rounded-full border border-line inline-flex items-center justify-center disabled:opacity-40"><RefreshCw className={cx("w-4 h-4", loading && "animate-spin")} /></button>
          </div>
        </div>
        {showFilters && <div className="lg:hidden mt-4">{filters}</div>}

        <Notice className="mt-4"><span className="font-medium">Prices are Sebastian&apos;s estimates, not live quotes.</span> Choose an option to fill in your details, then confirm availability and pay with the provider. {res?.advice}</Notice>
        {res?.aiUnavailable && <Notice tone="ai" className="mt-3">{res.advice}</Notice>}

        {loading && !items.length && <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-5">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-80" />)}</div>}
        {!loading && !shown.length && !res?.aiUnavailable && <div className="mt-5"><EmptyState title="Nothing matches those filters" body="Try a higher budget or any rating." /></div>}

        <div className={cx("mt-5 gap-4", view === "grid" ? "grid sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col")}>
          {shown.map((it, i) => (
            <article key={it.id} className={cx("bg-paper rounded-2xl border border-line overflow-hidden flex hover:border-cream-line transition-colors", view === "grid" ? "flex-col" : "flex-col sm:flex-row")}>
              <div className={cx("relative shrink-0", view === "list" && "sm:w-64")}>
                <Img src={it.photo || it.ta?.photo} fallback={fallbackImg[i % fallbackImg.length]} alt={it.name} label="" className={cx("w-full", view === "grid" ? "h-48" : "h-48 sm:h-full")} />
                {!it.photo && !it.ta?.photo && <span className="absolute bottom-2 left-2 text-[10px] bg-white/90 text-ink rounded-full px-2 py-0.5">Illustrative photo</span>}
                {placeLike && <button onClick={() => save(it)} aria-pressed={saved.has(it.id)} aria-label={saved.has(it.id) ? "Remove from saved" : "Save"} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 shadow-soft inline-flex items-center justify-center"><Heart className={cx("w-4 h-4 text-gold", saved.has(it.id) && "fill-gold")} /></button>}
              </div>
              <div className="p-4 flex-1 flex flex-col min-w-0">
                <p className="text-[11px] text-muted inline-flex items-center gap-1">{it.source === "Sebastian" && <Sparkles className="w-3 h-3 text-glow" />}{[it.kind, it.source === "Google" ? "Google Maps" : it.source === "Sebastian" ? "Sebastian's suggestion" : null].filter(Boolean).join(" · ")}</p>
                <h3 className="font-medium text-[15px] text-gold-deep dark:text-gold mt-0.5 line-clamp-2">{it.name}</h3>
                <RatingBadge it={it} />
                {it.area && <p className="text-[12px] text-muted mt-1.5 line-clamp-1 inline-flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{it.area}</p>}
                {it.ta?.ranking && <p className="text-[11.5px] text-muted mt-1">{it.ta.ranking}</p>}
                {it.why && <p className="text-[12.5px] mt-2 line-clamp-2">{it.why}</p>}
                {it.amenities?.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{it.amenities.slice(0, 4).map((a: string) => <span key={a} className="text-[10.5px] bg-cream rounded-full px-2 py-0.5">{a}</span>)}</div>}
                <div className="mt-auto pt-4 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    {it.priceEstimate && <><p className="text-[10.5px] text-muted">Estimate</p><p className="font-serif text-lg leading-tight">{it.priceEstimate}</p></>}
                    {it.ta?.url && <a href={it.ta.url} target="_blank" rel="noopener noreferrer" className="text-[11px] underline text-muted">View on Tripadvisor</a>}
                  </div>
                  <Button size="sm" onClick={() => onPick(it)} className="shrink-0">See availability</Button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {res?.sources?.includes("Tripadvisor") && <p className="text-[11px] text-muted mt-4">Ratings and reviews marked Tripadvisor are provided by Tripadvisor.</p>}
      </section>
    </div>
  );
}
