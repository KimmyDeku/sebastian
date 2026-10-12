"use client";
import { useEffect, useState } from "react";
import { Check, Plus, ExternalLink, ArrowRight, Star, PlayCircle, Clapperboard, Instagram as InstagramIcon, Link2, BedDouble, Loader2, MapPin } from "lucide-react";
import { api } from "@/lib/api";
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

const FILTERS: [string, string][] = [["all", "All"], ["youtube", "YouTube"], ["instagram", "Instagram"], ["tiktok", "TikTok"], ["pinterest", "Pinterest"], ["stays", "Accommodation"]];

function Note({ text, href, label, icon: I = ExternalLink, internal }: { text: string; href?: string; label: string; icon?: any; internal?: boolean }) {
  return (
    <div className="shrink-0 w-72 rounded-2xl border border-line bg-cream/40 p-4">
      <I className="w-5 h-5 text-gold" aria-hidden />
      <p className="text-[12.5px] text-muted mt-2">{text}</p>
      {href && <a href={href} target={internal ? undefined : "_blank"} rel={internal ? undefined : "noopener noreferrer"} className="mt-3 h-9 px-3 rounded-xl border border-line bg-paper text-[12.5px] inline-flex items-center gap-1.5">{label}{!internal && <ExternalLink className="w-3.5 h-3.5" />}</a>}
    </div>
  );
}

/** Travel inspiration for the chosen destination, scrolled sideways. */
export function Inspiration({ dest, data, loading, interests, mustSee, onToggleMustSee, onChoose, start, end, travellers = 2 }: {
  dest: string; data: InspireData | null; loading: boolean; interests: string[]; mustSee: string[]; onToggleMustSee: (name: string) => void; onChoose: (name: string) => void;
  start?: string; end?: string; travellers?: number;
}) {
  const [filter, setFilter] = useState("all");
  const [ig, setIg] = useState<any>(null);
  const [stays, setStays] = useState<any>(null);
  const [tkLink, setTkLink] = useState("");
  const [tk, setTk] = useState<any[]>([]);
  const [tkBusy, setTkBusy] = useState(false);
  const [tkErr, setTkErr] = useState("");
  useEffect(() => { setIg(null); setStays(null); setTk([]); }, [dest]);
  useEffect(() => {
    if (filter === "instagram" && !ig && dest) fetch(`/api/travel/social?platform=instagram&dest=${encodeURIComponent(dest)}`).then((r) => r.json()).then(setIg).catch(() => setIg({ ok: false, code: "error" }));
    if (filter === "stays" && !stays && dest) {
      setStays({ loading: true });
      api<any>("/api/booking", { type: "stays", dest, checkin: start, checkout: end, adults: travellers, children: 0, rooms: 1 }).then((r) => setStays(r)).catch(() => setStays({ ok: false }));
    }
  }, [filter, dest]); // eslint-disable-line react-hooks/exhaustive-deps
  const addTikTok = async () => {
    setTkBusy(true); setTkErr("");
    const r = await fetch(`/api/travel/social?platform=tiktok&url=${encodeURIComponent(tkLink.trim())}`).then((x) => x.json()).catch(() => ({ ok: false, error: "Please check your connection." }));
    setTkBusy(false);
    if (!r.ok) { setTkErr(r.error || "That TikTok couldn't be played."); return; }
    setTk((x) => [r, ...x.filter((v) => v.id !== r.id)]); setTkLink("");
  };
  const bookHref = `/booking?type=stays&dest=${encodeURIComponent(dest)}${start ? `&checkin=${start}` : ""}${end ? `&checkout=${end}` : ""}&adults=${travellers}`;
  const [play, setPlay] = useState<string | null>(null);
  const [allReels, setAllReels] = useState(false);
  const reels: any[] = data?.reels || [];
  const shownReels = allReels ? reels : reels.slice(0, 5);
  const similar = DESTINATIONS.filter((d) => d.name !== dest).map((d) => ({ ...d, score: d.tags.filter((t) => interests.includes(t)).length })).sort((a, b) => b.score - a.score).slice(0, 4);
  const card = "shrink-0 snap-start rounded-2xl overflow-hidden border border-line bg-paper relative";

  return (
    <section aria-label={`Inspiration for ${dest}`}>
      <div className="flex items-center justify-between mb-2.5 px-1">
        <p className="text-sm font-medium">Inspiration</p>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar" role="tablist" aria-label="Show">
          {FILTERS.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
              className={cx("shrink-0 inline-flex items-center gap-1 h-7 px-3 rounded-pill border text-[11.5px] transition-colors", filter === k ? "bg-ink text-white border-ink" : "border-line hover:bg-cream/60")}>
              {k === "stays" && <BedDouble className="w-3 h-3" aria-hidden />}{l}
            </button>
          ))}
        </div>
      </div>

      {/* YouTube */}
      {filter === "youtube" && (
        <div className="flex gap-3 overflow-x-auto snap-row pb-2 no-scrollbar">
          {loading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="shrink-0 w-52 h-[340px]" />)}
          {reels.map((r) => (
            <article key={r.id} className={cx(card, "w-52 h-[340px] bg-black")}>
              {play === r.id ? <iframe className="w-full h-full" src={`https://www.youtube-nocookie.com/embed/${r.id}?autoplay=1`} title={r.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
                : <button onClick={() => setPlay(r.id)} className="block w-full h-full text-left" aria-label={`Play ${r.title}`}><Img src={r.thumb} alt="" label="" className="absolute inset-0 w-full h-full" /><span className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" aria-hidden /><PlayCircle className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-white/90" aria-hidden /><span className="absolute bottom-0 inset-x-0 p-3 text-white text-[12px] line-clamp-3">{r.title}<span className="block text-white/70 text-[11px] mt-0.5">{r.channel}</span></span></button>}
            </article>
          ))}
          {!loading && !reels.length && <Note text="YouTube travel videos appear here when a YouTube API key is set up." href={data?.links?.youtube} label="Search YouTube" />}
          {reels.length > 0 && data?.links?.youtube && <a href={data.links.youtube} target="_blank" rel="noopener noreferrer" className={cx(card, "w-44 h-[340px] bg-cream/60 flex flex-col items-center justify-center text-center p-4")}><Clapperboard className="w-8 h-8 text-gold" /><span className="font-serif text-lg mt-3">More on YouTube</span><ExternalLink className="w-4 h-4 mt-2 text-muted" /></a>}
        </div>
      )}

      {/* Instagram */}
      {filter === "instagram" && (
        <div className="flex gap-3 overflow-x-auto snap-row pb-2 no-scrollbar">
          {!ig && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="shrink-0 w-56 h-[340px]" />)}
          {ig?.ok && ig.items.map((m: any) => (
            <article key={m.id} className={cx(card, "w-56 h-[340px] bg-black flex flex-col")}>
              {m.type === "VIDEO" ? <video src={m.url} className="w-full flex-1 min-h-0 object-cover" controls playsInline preload="metadata" />
                // eslint-disable-next-line @next/next/no-img-element
                : <img src={m.url} alt={m.caption || `#${ig.tag} on Instagram`} className="w-full flex-1 min-h-0 object-cover" loading="lazy" />}
              <div className="bg-paper p-2.5"><p className="text-[11.5px] line-clamp-2">{m.caption || `#${ig.tag}`}</p><a href={m.permalink} target="_blank" rel="noopener noreferrer" className="text-[11px] underline text-muted inline-flex items-center gap-1 mt-1">View on Instagram<ExternalLink className="w-3 h-3" /></a></div>
            </article>
          ))}
          {ig && (!ig.ok || !ig.items?.length) && <Note icon={InstagramIcon} text={ig.code === "not_configured" ? `See the latest #${ig.tag} posts on Instagram. (Posts can show here once Sebastian's Instagram connection is approved.)` : `No #${ig.tag || ""} posts could be loaded right now.`} href={ig.openUrl} label={`Open #${ig.tag || "travel"} on Instagram`} />}
        </div>
      )}

      {/* TikTok */}
      {filter === "tiktok" && (
        <div className="flex gap-3 overflow-x-auto snap-row pb-2 no-scrollbar items-start">
          <div className={cx(card, "w-72 p-4 bg-cream/40")}>
            <p className="text-[13px] font-medium">Watch a TikTok here</p>
            <p className="text-[12px] text-muted mt-1">TikTok doesn&apos;t let apps search its videos. Find one on TikTok, copy its link, and paste it here to watch it in Sebastian.</p>
            {data?.links?.tiktok && <a href={data.links.tiktok} target="_blank" rel="noopener noreferrer" className="mt-3 h-9 px-3 rounded-xl border border-line bg-paper text-[12.5px] inline-flex items-center gap-1.5">Search {dest.split(",")[0]} on TikTok<ExternalLink className="w-3.5 h-3.5" /></a>}
            <div className="flex gap-1.5 mt-3"><label htmlFor="tk-link" className="sr-only">TikTok link</label><input id="tk-link" value={tkLink} onChange={(e) => setTkLink(e.target.value)} onKeyDown={(e) => e.key === "Enter" && tkLink.trim() && addTikTok()} placeholder="Paste a TikTok link" className="flex-1 min-w-0 h-9 px-3 rounded-xl border border-line bg-paper text-base md:text-[12.5px] outline-none focus:border-gold" />
              <button onClick={addTikTok} disabled={!tkLink.trim() || tkBusy} aria-label="Play this TikTok" className="h-9 w-9 rounded-xl bg-ink text-white inline-flex items-center justify-center disabled:opacity-40">{tkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}</button></div>
            {tkErr && <p className="text-[11.5px] text-danger mt-2">{tkErr}</p>}
          </div>
          {tk.map((v) => (
            <article key={v.id} className={cx(card, "w-[325px] h-[580px] bg-black")}>
              <iframe className="w-full h-full" src={`https://www.tiktok.com/embed/v2/${v.id}`} title={v.title} allow="encrypted-media; picture-in-picture" allowFullScreen />
            </article>
          ))}
        </div>
      )}

      {/* Pinterest */}
      {filter === "pinterest" && (
        <div className="flex gap-3 pb-2"><Note text={`Pinterest only lets apps show the connected account's own pins, so Sebastian can't search it. Browse ${dest.split(",")[0]} travel ideas on Pinterest instead.`} href={data?.links?.pinterest} label={`Open ${dest.split(",")[0]} on Pinterest`} /></div>
      )}

      {/* Accommodation */}
      {filter === "stays" && (
        <div>
          <div className="flex gap-3 overflow-x-auto snap-row pb-2 no-scrollbar">
            {(!stays || stays.loading) && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="shrink-0 w-60 h-[340px]" />)}
            {stays?.ok && (stays.items || []).map((h: any) => (
              <article key={h.id} className={cx(card, "w-60 h-[340px] flex flex-col")}>
                <Img src={h.photo || h.ta?.photo} alt={h.name} label="" className="w-full h-36 shrink-0" />
                <div className="p-3 flex-1 flex flex-col min-h-0">
                  <p className="text-[14px] font-medium line-clamp-2">{h.name}</p>
                  {(h.ta?.rating || h.rating) && <p className="text-[11.5px] mt-1 inline-flex items-center gap-1"><Star className="w-3 h-3 fill-gold text-gold" />{Number(h.ta?.rating || h.rating).toFixed(1)}{(h.ta?.reviews || h.reviews) ? <span className="text-muted">· {Number(h.ta?.reviews || h.reviews).toLocaleString()} reviews</span> : null}</p>}
                  {h.area && <p className="text-[11.5px] text-muted mt-1 line-clamp-1 inline-flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{h.area}</p>}
                  {h.priceEstimate && <p className="text-[12.5px] mt-1.5"><span className="text-muted text-[10.5px]">Estimate </span>{h.priceEstimate}</p>}
                  <div className="mt-auto flex gap-1.5">
                    {h.link && <a href={h.link} target="_blank" rel="noopener noreferrer" className="flex-1 h-8 rounded-lg border border-line text-[11.5px] inline-flex items-center justify-center gap-1 hover:bg-cream/60">Booking.com<ExternalLink className="w-3 h-3" /></a>}
                    <a href={bookHref.replace(`dest=${encodeURIComponent(dest)}`, `dest=${encodeURIComponent(`${h.name}, ${dest.split(",")[0]}`)}`)} className="flex-1 h-8 rounded-lg bg-ink text-white text-[11.5px] inline-flex items-center justify-center">Book</a>
                  </div>
                </div>
              </article>
            ))}
            {stays && !stays.loading && (!stays.ok || !(stays.items || []).length) && <Note icon={BedDouble} text={stays.error || "No places to stay were found for this area just now."} href={bookHref} label="Search stays in Booking" internal />}
          </div>
          {stays?.ok && (stays.items || []).length > 0 && <p className="text-[11.5px] text-muted mt-1 px-1">Prices are estimates; the provider confirms the final price. {start && end ? "" : "Choose your dates for more accurate prices."} <a href={bookHref} className="underline">See all stays</a></p>}
        </div>
      )}

      {filter === "all" && (
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
            <p className="text-[12px] text-muted mt-1">{allReels || reels.length <= 5 ? `Watch more ${dest.split(",")[0]} reels on YouTube` : `${reels.length - 5} more here, and plenty on YouTube`}</p>
            {!allReels && reels.length > 5 && <button onClick={() => setAllReels(true)} className="mt-4 h-9 px-4 rounded-xl bg-ink text-white text-[12.5px]">Show {reels.length - 5} more</button>}
            {data?.links?.youtube && <a href={data.links.youtube} target="_blank" rel="noopener noreferrer" className="mt-2 h-9 px-4 rounded-xl border border-line bg-paper text-[12.5px] inline-flex items-center gap-1.5">Open YouTube<ExternalLink className="w-3.5 h-3.5" /></a>}
          </article>
        )}

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
      )}
      {filter === "all" && !loading && !data?.reels?.length && <p className="text-[11.5px] text-muted mt-1 px-1">Travel reels appear here when a YouTube API key is set up. Use the Instagram and TikTok links above for more.</p>}
    </section>
  );
}
