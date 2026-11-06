"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UtensilsCrossed, Plane, Compass, PartyPopper, ThumbsUp, ThumbsDown, RefreshCw, ExternalLink, ArrowRight } from "lucide-react";
import { Container, PageHeader } from "@/components/ui/Page";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/States";
import { Verified } from "@/components/news/Verified";
import { useRecs, refreshRecs, feedback, markRecsSeen, type Rec } from "@/lib/recommend";
import { startTask } from "@/lib/agent";
import { relTime } from "@/lib/util";
import { toast } from "@/components/ui/Toast";

const TYPE = { recipe: { icon: UtensilsCrossed, label: "Recipe", action: "See recipes" }, destination: { icon: Plane, label: "Destination", action: "Plan a trip" }, activity: { icon: Compass, label: "Something to do", action: "Find it for me" }, event: { icon: PartyPopper, label: "Event", action: "Find it for me" } } as const;

export default function ForYou() {
  const router = useRouter();
  const recs = useRecs();
  const [busy, setBusy] = useState(false);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  useEffect(() => { if (!recs.items.length && !recs.date) { setBusy(true); refreshRecs().finally(() => setBusy(false)); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Opening For you clears the green dot (including for suggestions that arrive while it's open).
  useEffect(() => { markRecsSeen(); }, [recs.at]);

  const act = (r: Rec) => {
    if (r.type === "recipe") router.push(`/recipes?category=Dinner&notes=${encodeURIComponent(`Recipe idea: ${r.query}`)}`);
    else if (r.type === "destination") router.push(`/travel?destination=${encodeURIComponent(r.query)}`);
    else { startTask(`Find ${r.query} near me, and tell me how to go about it.`, "you"); window.dispatchEvent(new Event("sebastian-open-tasks")); }
  };

  return (
    <Container>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "For you" }]} title="For you" subtitle="Chosen for you by Sebastian, from what he has learned you enjoy. Your thumbs up and down help him choose better."
        right={<Button variant="outline" onClick={async () => { setBusy(true); const ok = await refreshRecs(true); setBusy(false); if (!ok) toast.error("Sebastian couldn't find new suggestions just now."); }} loading={busy}><RefreshCw className="w-4 h-4" />New suggestions</Button>} />

      <section aria-label="Picked for you">
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {busy && !recs.items.length && Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-48" />)}
          {recs.items.map((r) => { const T = TYPE[r.type]; return (
            <article key={r.id} className="rounded-2xl bg-paper border border-line p-5 flex flex-col">
              <p className="text-[11.5px] text-gold-deep inline-flex items-center gap-1.5"><T.icon className="w-4 h-4" aria-hidden />{T.label}</p>
              <h2 className="font-serif text-xl mt-2">{r.title}</h2>
              <p className="text-[13px] text-muted mt-1.5 leading-relaxed flex-1">{r.why}</p>
              <div className="flex items-center gap-2 mt-4">
                <Button size="sm" onClick={() => act(r)}>{T.action}<ArrowRight className="w-3.5 h-3.5" /></Button>
                <button onClick={() => { feedback(r, true); setLiked((x) => ({ ...x, [r.id]: true })); toast.info("Noted. Sebastian will suggest more like this."); }} aria-label={`More like ${r.title}`} aria-pressed={!!liked[r.id]} className={`ml-auto w-9 h-9 rounded-full inline-flex items-center justify-center ${liked[r.id] ? "bg-ink text-white" : "hover:bg-cream text-muted"}`}><ThumbsUp className="w-4 h-4" /></button>
                <button onClick={() => { feedback(r, false); toast.info("Noted. Sebastian won't suggest that again."); }} aria-label={`Not interested in ${r.title}`} className="w-9 h-9 rounded-full hover:bg-cream inline-flex items-center justify-center text-muted"><ThumbsDown className="w-4 h-4" /></button>
              </div>
            </article>); })}
        </div>
        {!busy && !recs.items.length && <p className="text-[14px] text-muted">Sebastian is still getting to know you. Chat, plan a trip or save a recipe, then tap New suggestions.</p>}
        {recs.items.some((r) => r.type === "event") && <p className="text-[12px] text-muted mt-3">Event suggestions are ideas: check dates, venues and prices before you go.</p>}
      </section>

      {recs.news.length > 0 && (
        <section className="mt-10" aria-label="News from your sources">
          <div className="flex items-center justify-between mb-3"><h2 className="t-h3">From your news sources</h2><Link href="/news" className="text-[13px] underline">All news</Link></div>
          <ul className="rounded-2xl bg-paper border border-line divide-y divide-line">
            {recs.news.map((n) => (
              <li key={n.link}><a href={n.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-cream/40">
                <span className="flex-1 min-w-0"><span className="block text-[14px]">{n.title}</span><span className="text-[12px] text-muted inline-flex items-center gap-1">{n.source}<Verified size={12} />{n.published ? ` · ${relTime(n.published)}` : ""}</span></span>
                <ExternalLink className="w-4 h-4 text-muted shrink-0" /></a></li>
            ))}
          </ul>
        </section>
      )}
      {recs.at && <p className="text-[11.5px] text-muted mt-6">Updated {relTime(recs.at)}. A new set arrives each evening.</p>}
    </Container>
  );
}
