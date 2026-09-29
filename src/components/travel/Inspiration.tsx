"use client";
import { useEffect, useState } from "react";
import { Check, Plus, ExternalLink, ArrowRight, Star, PlayCircle } from "lucide-react";
import { Img } from "../ui/Img";
import { Skeleton } from "../ui/States";
import { DESTINATIONS } from "./destinations";
import { cx } from "@/lib/util";

export type InspireData = { overview?: { title: string; text: string; image?: string; url?: string } | null; coords?: { lat: number; lng: number } | null; reels: any[]; sights: any[]; links: Record<string, string> };

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

const LINKS: [string, string][] = [["instagram", "Instagram"], ["tiktok", "TikTok"], ["youtube", "YouTube"], ["pinterest", "Pinterest"], ["blogs", "Travel blogs"]];

/** Travel inspiration for the chosen destination, scrolled sideways. */
export function Inspiration({ dest, data, loading, interests, mustSee, onToggleMustSee, onChoose }: {
  dest: string; data: InspireData | null; loading: boolean; interests: string[]; mustSee: string[]; onToggleMustSee: (name: string) => void; onChoose: (name: string) => void;
}) {
  const [play, setPlay] = useState<string | null>(null);
  const similar = DESTINATIONS.filter((d) => d.name !== dest).map((d) => ({ ...d, score: d.tags.filter((t) => interests.includes(t)).length })).sort((a, b) => b.score - a.score).slice(0, 4);
  const card = "shrink-0 snap-start rounded-2xl overflow-hidden border border-line bg-paper relative";

  return (
    <section aria-label={`Inspiration for ${dest}`}>
      <div className="flex items-center justify-between mb-2.5 px-1">
        <p className="text-sm font-medium">Inspiration</p>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {LINKS.map(([k, l]) => data?.links?.[k] && (
            <a key={k} href={data.links[k]} target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-pill border border-line text-[11.5px] hover:bg-cream/60">{l}<ExternalLink className="w-3 h-3" /></a>
          ))}
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto snap-row pb-2 no-scrollbar" tabIndex={0}>
        {loading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="shrink-0 w-56 h-[340px]" />)}

        {data?.overview && (
          <article className={cx(card, "w-64 h-[340px]")}>
            <Img src={data.overview.image} alt={dest} label="" className="absolute inset-0 w-full h-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" aria-hidden />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
              <p className="font-serif text-xl leading-tight">{dest.split(",")[0]}</p>
              <p className="text-[12px] text-white/85 mt-1 line-clamp-4">{data.overview.text}</p>
              {data.overview.url && <a href={data.overview.url} target="_blank" rel="noopener noreferrer" className="text-[11px] underline text-white/80 mt-1 inline-block">From Wikipedia</a>}
              <p className="mt-3 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-white text-[#1C1B19] text-[12.5px] font-medium"><Check className="w-4 h-4" />Your destination</p>
            </div>
          </article>
        )}

        {(data?.reels || []).map((r) => (
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

        {(data?.sights || []).map((s) => {
          const on = mustSee.includes(s.name);
          return (
            <article key={s.id} className={cx(card, "w-52 h-[340px] flex flex-col")}>
              <Img src={s.photo} alt={s.name} label="" className="w-full h-52" />
              <div className="p-3 flex-1 flex flex-col">
                <p className="text-[13px] font-medium line-clamp-2">{s.name}</p>
                {s.rating && <p className="text-[11.5px] text-muted mt-1 inline-flex items-center gap-1"><Star className="w-3 h-3 fill-gold text-gold" />{s.rating}</p>}
                <button onClick={() => onToggleMustSee(s.name)} aria-pressed={on} className={cx("mt-auto h-9 rounded-xl text-[12.5px] inline-flex items-center justify-center gap-1.5 border", on ? "bg-ink text-white border-ink" : "border-line hover:bg-cream/60")}>
                  {on ? <><Check className="w-4 h-4" />In your plan</> : <><Plus className="w-4 h-4" />Add to plan</>}
                </button>
              </div>
            </article>
          );
        })}

        {!loading && similar.map((d) => (
          <article key={d.name} className={cx(card, "w-52 h-[340px] flex flex-col bg-cream/50")}>
            <div className="p-4 flex-1">
              <p className="t-kicker text-muted">Also consider</p>
              <p className="font-serif text-xl mt-2 leading-tight">{d.name}</p>
              <p className="text-[12.5px] text-muted mt-2">{d.note}</p>
              <div className="flex flex-wrap gap-1 mt-3">{d.tags.slice(0, 3).map((t) => <span key={t} className="text-[10.5px] bg-paper rounded-full px-2 py-0.5">{t}</span>)}</div>
            </div>
            <div className="p-3"><button onClick={() => onChoose(d.name)} className="w-full h-9 rounded-xl bg-paper border border-line text-[12.5px] inline-flex items-center justify-center gap-1.5 hover:bg-cream">Choose instead<ArrowRight className="w-4 h-4" /></button></div>
          </article>
        ))}
      </div>
      {!loading && !data?.reels?.length && <p className="text-[11.5px] text-muted mt-1 px-1">Travel reels appear here when a YouTube API key is set up. Use the Instagram and TikTok links above for more.</p>}
    </section>
  );
}
