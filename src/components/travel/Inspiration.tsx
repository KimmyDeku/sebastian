"use client";
import { useEffect, useState } from "react";
import { Check, Plus, ExternalLink, ArrowRight, Star, PlayCircle, Clapperboard, MapPin, Landmark, Ticket } from "lucide-react";
import { Img } from "../ui/Img";
import { Skeleton } from "../ui/States";
import { DESTINATIONS } from "./destinations";
import { cx } from "@/lib/util";

export type Place = { id: string; name: string; photo?: string; rating?: number; ratingCount?: number; area?: string; mapsUrl?: string };
export type InspireData = { overview?: { title: string; text: string; image?: string; url?: string } | null; coords?: { lat: number; lng: number } | null; reels: any[]; sights: Place[]; activities?: Place[]; links: Record<string, string> };

export function useInspiration(dest: string) {
  const [data, setData] = useState<InspireData | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!dest) return;
    let dead = false;
    setLoading(true); setData(null);
    fetch(`/api/travel/inspire?dest=${encodeURIComponent(dest)}`).then((r) => r.json()).then((j) => { if (!dead) setData(j.ok ? j : { reels: [], sights: [], links: {} }); })
      .catch(() => !dead && setData({ reels: [], sights: [], links: {} })).finally(() => !dead && setLoading(false));
    return () => { dead = true; };
  }, [dest]);
  return { data, loading };
}

/** Travel inspiration for the chosen destination: videos, then attractions and activities from Google Maps to add as must-sees. */
export function Inspiration({ dest, data, loading, interests, mustSee, onToggleMustSee, onChoose }: {
  dest: string; data: InspireData | null; loading: boolean; interests: string[]; mustSee: string[]; onToggleMustSee: (name: string) => void; onChoose: (name: string) => void;
  start?: string; end?: string; travellers?: number;
}) {
  const [play, setPlay] = useState<string | null>(null);
  const [allReels, setAllReels] = useState(false);
  const [kind, setKind] = useState<"sights" | "activities">("sights");
  useEffect(() => { setKind("sights"); setPlay(null); setAllReels(false); }, [dest]);
  const city = dest.split(",")[0];
  const reels: any[] = data?.reels || [];
  const shownReels = allReels ? reels : reels.slice(0, 5);
  const places: Place[] = (kind === "sights" ? data?.sights : data?.activities) || [];
  const added = mustSee.length;
  const similar = DESTINATIONS.filter((d) => d.name !== dest).map((d) => ({ ...d, score: d.tags.filter((t) => interests.includes(t)).length })).sort((a, b) => b.score - a.score).slice(0, 4);
  const card = "shrink-0 snap-start rounded-2xl overflow-hidden border border-line bg-paper relative";

  return (
    <section aria-label={`Inspiration for ${dest}`} className="space-y-6">
      {/* Videos */}
      <div>
        <p className="text-sm font-medium mb-2.5 px-1">Inspiration</p>
        <div className="flex gap-3 overflow-x-auto snap-row pb-2 no-scrollbar" tabIndex={0} aria-label="Travel videos">
          {loading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="shrink-0 w-52 h-[340px]" />)}
          {data?.overview && (
            <article className={cx(card, "w-64 h-[340px]")}>
              <Img src={data.overview.image} alt={dest} label="" className="absolute inset-0 w-full h-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" aria-hidden />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <p className="font-serif text-xl leading-tight">{city}</p>
                <p className="text-[12px] text-white/85 mt-1 line-clamp-4">{data.overview.text}</p>
                {data.overview.url && <a href={data.overview.url} target="_blank" rel="noopener noreferrer" className="text-[11px] underline text-white/80 mt-1 inline-block">From Wikipedia</a>}
                <p className="mt-3 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-white text-[#1C1B19] text-[12.5px] font-medium"><Check className="w-4 h-4" />Your destination</p>
              </div>
            </article>
          )}
          {shownReels.map((r) => (
            <article key={r.id} className={cx(card, "w-52 h-[340px] bg-black")}>
              {play === r.id ? (
                <iframe className="w-full h-full" src={`https://www.youtube-nocookie.com/embed/${r.id}?autoplay=1`} title={r.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
              ) : (
                <button onClick={() => setPlay(r.id)} className="block w-full h-full text-left" aria-label={`Play ${r.title}`}>
                  <Img src={r.thumb} alt="" label="" className="absolute inset-0 w-full h-full" />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" aria-hidden />
                  <PlayCircle className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-white/90" aria-hidden />
                  <span className="absolute bottom-0 inset-x-0 p-3 text-white text-[12px] line-clamp-3">{r.title}<span className="block text-white/70 text-[11px] mt-0.5">{r.channel}</span></span>
                </button>
              )}
            </article>
          ))}
          {reels.length > 0 && (
            <article className={cx(card, "w-44 h-[340px] bg-cream/60 flex flex-col items-center justify-center text-center p-4")}>
              <Clapperboard className="w-8 h-8 text-gold" aria-hidden />
              <p className="font-serif text-lg mt-3 leading-tight">More videos</p>
              <p className="text-[12px] text-muted mt-1">{allReels || reels.length <= 5 ? `Watch more ${city} videos on YouTube` : `${reels.length - 5} more here, and plenty on YouTube`}</p>
              {!allReels && reels.length > 5 && <button onClick={() => setAllReels(true)} className="mt-4 h-9 px-4 rounded-xl bg-ink text-white text-[12.5px]">Show {reels.length - 5} more</button>}
              {data?.links?.youtube && <a href={data.links.youtube} target="_blank" rel="noopener noreferrer" className="mt-2 h-9 px-4 rounded-xl border border-line bg-paper text-[12.5px] inline-flex items-center gap-1.5">YouTube<ExternalLink className="w-3.5 h-3.5" /></a>}
            </article>
          )}
          {!loading && similar.map((d) => (
            <article key={d.name} className={cx(card, "w-52 h-[340px] flex flex-col bg-cream/50")}>
              <div className="p-4 flex-1">
                <p className="t-kicker text-muted">Also consider</p>
                <p className="font-serif text-xl mt-2 leading-tight">{d.name}</p>
                <p className="text-[12.5px] text-muted mt-2">{d.note}</p>
                <div className="flex flex-wrap gap-1 mt-3">{d.tags.slice(0, 3).map((t) => <span key={t} className="text-[10.5px] bg-paper rounded-full px-2 py-0.5">{t}</span>)}</div>
              </div>
              <div className="p-3"><button onClick={() => onChoose(d.name)} className="w-full h-9 rounded-xl bg-paper border border-line text-[12.5px] inline-flex items-center justify-center gap-1.5 hover:bg-cream">Choose {d.name.split(",")[0]}<ArrowRight className="w-3.5 h-3.5" /></button></div>
            </article>
          ))}
        </div>
        {!loading && !reels.length && <p className="text-[11.5px] text-muted mt-1 px-1">Travel videos appear here when a YouTube API key is set up.</p>}
      </div>

      {/* Attractions and activities from Google Maps */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 px-1">
          <div>
            <p className="text-sm font-medium">Attractions and activities in {city}</p>
            <p className="text-[11.5px] text-muted">{added ? `${added} must-see${added === 1 ? "" : "s"} in your plan. ` : ""}Tap + to add a place to your itinerary.</p>
          </div>
          <div className="flex gap-1.5" role="tablist" aria-label="Show">
            {([["sights", "Attractions", Landmark], ["activities", "Activities", Ticket]] as const).map(([k, l, I]) => (
              <button key={k} role="tab" aria-selected={kind === k} onClick={() => setKind(k)}
                className={cx("inline-flex items-center gap-1.5 h-8 px-3.5 rounded-pill border text-[12px] transition-colors", kind === k ? "bg-ink text-white border-ink" : "border-line hover:bg-cream/60")}>
                <I className="w-3.5 h-3.5" aria-hidden />{l}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto snap-row pb-2 no-scrollbar" tabIndex={0} aria-label={kind === "sights" ? "Attractions" : "Activities"}>
          {loading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="shrink-0 w-56 h-[290px]" />)}
          {places.map((s) => {
            const on = mustSee.includes(s.name);
            return (
              <article key={s.id} className={cx(card, "w-56 h-[290px] flex flex-col", on && "border-ink")}>
                <div className="relative">
                  <Img src={s.photo} alt={s.name} label="" className="w-full h-40" />
                  <button onClick={() => onToggleMustSee(s.name)} aria-pressed={on} aria-label={on ? `Remove ${s.name} from your must-sees` : `Add ${s.name} to your must-sees`} title={on ? "In your plan" : "Add to your must-sees"}
                    className={cx("absolute top-2.5 right-2.5 w-10 h-10 rounded-full inline-flex items-center justify-center shadow-lift transition-colors", on ? "bg-ink text-white" : "bg-white text-ink hover:bg-cream")}>
                    {on ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </button>
                </div>
                <div className="p-3 flex-1 flex flex-col min-h-0">
                  <p className="text-[13.5px] font-medium line-clamp-2">{s.name}</p>
                  {s.rating && <p className="text-[11.5px] text-muted mt-1 inline-flex items-center gap-1"><Star className="w-3 h-3 fill-gold text-gold" />{Number(s.rating).toFixed(1)}{s.ratingCount ? ` (${s.ratingCount.toLocaleString()})` : ""}</p>}
                  {s.area && <p className="text-[11.5px] text-muted mt-0.5 line-clamp-1 inline-flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{s.area}</p>}
                  <div className="mt-auto flex items-center justify-between">
                    {s.mapsUrl ? <a href={s.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-[11.5px] underline inline-flex items-center gap-1">Google Maps<ExternalLink className="w-3 h-3" /></a> : <span />}
                    {on && <span className="text-[11px] text-gold-deep font-medium">In your plan</span>}
                  </div>
                </div>
              </article>
            );
          })}
          {!loading && !places.length && (
            <div className="shrink-0 w-72 rounded-2xl border border-line bg-cream/40 p-4">
              <MapPin className="w-5 h-5 text-gold" aria-hidden />
              <p className="text-[12.5px] text-muted mt-2">{kind === "sights" ? "Attractions" : "Activities"} from Google Maps appear here once Google Maps is set up for Sebastian. You can still type must-sees in your plan.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
