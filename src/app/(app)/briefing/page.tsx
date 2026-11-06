"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Play, Square, RefreshCw, Target, ArrowRight, Settings as Cog } from "lucide-react";
import { Container, PageHeader } from "@/components/ui/Page";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/States";
import { useBriefing, buildBriefing, localDate, useBriefingSettings, nextBriefing } from "@/lib/briefing";
import { useSpeaker } from "@/lib/voice";
import { useData } from "@/lib/store";
import { relTime } from "@/lib/util";
import { toast } from "@/components/ui/Toast";

export default function BriefingPage() {
  const b = useBriefing();
  const s = useBriefingSettings();
  const d = useData();
  const { speak, cancel, speaking } = useSpeaker();
  const [busy, setBusy] = useState(false);
  const autoplayed = useRef(false);
  const fresh = b && b.date === localDate();
  const play = (x = b) => { if (x) speak(`${x.greeting} ${x.narration}`, d.prefs.voiceName); };
  const prepare = async () => { setBusy(true); const x = await buildBriefing().catch(() => null); setBusy(false); if (x) play(x); else toast.error("Sebastian couldn't prepare your briefing just now."); };
  useEffect(() => {
    if (autoplayed.current) return; autoplayed.current = true;
    const wantsPlay = new URLSearchParams(window.location.search).get("play") === "1";
    if (!fresh) { if (wantsPlay) prepare(); } else if (wantsPlay) setTimeout(() => play(), 600);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const next = nextBriefing(s);

  return (
    <Container>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Daily briefing" }]} title="Daily briefing" subtitle="Your follow-ups, plans, payments and the news you care about, gathered and read to you by Sebastian."
        right={<Button variant="outline" onClick={prepare} loading={busy}><RefreshCw className="w-4 h-4" />{fresh ? "Prepare a fresh briefing" : "Prepare my briefing"}</Button>} />

      {busy && !b && <div className="space-y-3 max-w-3xl"><Skeleton className="h-40" /><Skeleton className="h-28" /></div>}
      {!b && !busy && (
        <div className="rounded-3xl bg-paper border border-line p-6 max-w-3xl">
          <p className="font-serif text-2xl">No briefing yet</p>
          <p className="text-muted mt-1.5">Tap Prepare my briefing, or {s.enabled ? `wait for ${next?.toLocaleString("en-GB", { weekday: "long", hour: "2-digit", minute: "2-digit" })}` : "choose a time in Settings"} and Sebastian will have it ready.</p>
        </div>
      )}
      {b && (
        <div className="max-w-3xl space-y-6">
          <section className="rounded-3xl bg-ink text-white p-6 md:p-8">
            <p className="text-[11px] tracking-[.2em] uppercase text-white/60">{fresh ? "Today" : `From ${new Date(b.at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}`} · prepared {relTime(b.at)}</p>
            <h2 className="font-serif text-3xl md:text-4xl mt-2">{b.greeting}</h2>
            <p className="text-white/80 mt-4 leading-relaxed">{b.narration}</p>
            <div className="mt-6 flex gap-2">
              {speaking ? <button onClick={cancel} className="h-11 px-5 rounded-pill bg-white text-ink text-[14px] inline-flex items-center gap-2"><Square className="w-4 h-4" />Stop</button>
                : <button onClick={() => play()} className="h-11 px-5 rounded-pill bg-white text-ink text-[14px] inline-flex items-center gap-2"><Play className="w-4 h-4" />Read it to me</button>}
            </div>
          </section>

          {b.focus.length > 0 && (
            <section aria-label="Focus on today">
              <h2 className="t-h3 mb-3 inline-flex items-center gap-2"><Target className="w-5 h-5 text-gold" />Focus on today</h2>
              <ol className="grid sm:grid-cols-3 gap-3">
                {b.focus.map((f, i) => <li key={i} className="rounded-2xl bg-paper border border-line p-4"><span className="font-serif text-2xl text-gold">{i + 1}</span><p className="text-[14px] mt-1">{f}</p></li>)}
              </ol>
            </section>
          )}

          {b.sections.map((sec) => (
            <section key={sec.title} aria-label={sec.title}>
              <h2 className="t-h3 mb-2">{sec.title}</h2>
              <ul className="rounded-2xl bg-paper border border-line divide-y divide-line">
                {sec.items.map((it, i) => (
                  <li key={i}>{it.href ? (
                    <Link href={it.href} target={it.href.startsWith("http") ? "_blank" : undefined} className="flex items-center gap-3 px-4 py-3 text-[14px] hover:bg-cream/40"><span className="flex-1">{it.text}</span><ArrowRight className="w-4 h-4 text-muted shrink-0" /></Link>
                  ) : <p className="px-4 py-3 text-[14px]">{it.text}</p>}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <p className="text-[12.5px] text-muted mt-8 inline-flex items-center gap-1.5"><Cog className="w-4 h-4" />{s.enabled ? `Your briefing arrives ${s.days === "weekdays" ? "on weekdays" : "every day"} at ${s.time}.` : "Daily briefings are off."} <Link href="/settings#briefing" className="underline">Change this in Settings</Link></p>
    </Container>
  );
}
