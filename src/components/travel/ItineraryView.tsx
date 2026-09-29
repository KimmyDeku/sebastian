"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Pencil, Trash2, CalendarCheck, Sun, Moon, Sunrise, BedDouble, Plane, HandHeart, Lightbulb, Wallet, Star, CloudSun, ExternalLink, Loader2 } from "lucide-react";
import { Img } from "../ui/Img";
import { Button } from "../ui/Button";
import type { Trip } from "@/lib/types";
import { money, fmtDate, cx } from "@/lib/util";
import { toast } from "../ui/Toast";

async function downloadPdf(trip: Trip, who: string) {
  const r = await fetch("/api/travel/pdf", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ trip, who }) });
  if (!r.ok) { toast.error("The itinerary couldn't be downloaded."); return; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(await r.blob());
  a.download = `Sebastian-itinerary-${trip.destination.replace(/[^A-Za-z0-9]+/g, "-")}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Live forecast only. It isn't saved with the itinerary because it changes. */
function LiveWeather({ place }: { place: string }) {
  const [w, setW] = useState<any>(null);
  useEffect(() => { fetch(`/api/weather?place=${encodeURIComponent(place)}`).then((r) => r.json()).then((j) => j.ok && setW(j.weather)).catch(() => {}); }, [place]);
  if (!w) return null;
  return (
    <div className="rounded-2xl border border-line bg-paper p-4">
      <p className="text-[12px] text-muted inline-flex items-center gap-1.5"><CloudSun className="w-4 h-4 text-gold" />Live forecast · not saved with your itinerary</p>
      <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3">
        {w.days.slice(0, 7).map((d: any) => (
          <div key={d.date} className="shrink-0 w-16 rounded-xl bg-canvas p-2 text-center">
            <p className="text-[10.5px] text-muted">{new Date(d.date + "T00:00").toLocaleDateString("en-GB", { weekday: "short" })}</p>
            <p className="text-[13px] mt-0.5">{Math.round(d.max)}°</p><p className="text-[10.5px] text-muted">{Math.round(d.min)}°</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ItineraryView({ trip, who, onEdit, onDelete, replanning }: { trip: Trip; who: string; onEdit: () => void; onDelete: () => void; replanning?: boolean }) {
  const it = trip.itinerary!;
  const [busy, setBusy] = useState(false);
  const total = (it.budgetBreakdown || []).reduce((s, b) => s + (Number(b.amount) || 0), 0);
  const Section = ({ icon: I, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
    <section className="rounded-3xl bg-paper border border-line p-5 md:p-7">
      <h2 className="t-h3 inline-flex items-center gap-2"><I className="w-5 h-5 text-gold" aria-hidden />{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );

  return (
    <div className="space-y-5">
      <header className="relative overflow-hidden rounded-3xl min-h-[280px] md:min-h-[340px] border border-line">
        <Img src={trip.photo} alt={trip.destination} label="" className="absolute inset-0 w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" aria-hidden />
        <div className="relative h-full min-h-[280px] md:min-h-[340px] flex flex-col justify-end p-6 md:p-9 text-white">
          <p className="t-kicker text-white/80">Your itinerary</p>
          <h1 className="font-serif text-4xl md:text-5xl leading-none mt-2">{trip.destination}</h1>
          <p className="mt-3 text-white/85 text-sm">{fmtDate(trip.start)} to {fmtDate(trip.end)} · {it.days.length} days · {trip.travellers} {trip.travellers === 1 ? "traveller" : "travellers"} · {money(trip.budget)}</p>
          <div className="flex flex-wrap gap-2 mt-5">
            <button onClick={async () => { setBusy(true); await downloadPdf(trip, who); setBusy(false); }} className="h-10 px-4 rounded-pill bg-white text-[#1C1B19] text-[13px] font-medium inline-flex items-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}Download PDF</button>
            <button onClick={onEdit} className="h-10 px-4 rounded-pill bg-white/15 backdrop-blur border border-white/30 text-[13px] inline-flex items-center gap-2"><Pencil className="w-4 h-4" />Edit trip</button>
            <Link href="/schedule" className="h-10 px-4 rounded-pill bg-white/15 backdrop-blur border border-white/30 text-[13px] inline-flex items-center gap-2"><CalendarCheck className="w-4 h-4" />In your schedule</Link>
            <button onClick={onDelete} className="h-10 px-4 rounded-pill bg-white/15 backdrop-blur border border-white/30 text-[13px] inline-flex items-center gap-2"><Trash2 className="w-4 h-4" />Delete</button>
          </div>
        </div>
      </header>

      {replanning && <p className="text-sm text-muted inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Updating your itinerary for the new dates…</p>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          <p className="font-serif text-xl md:text-2xl leading-snug px-1">{it.summary}</p>
          <Section icon={Sunrise} title="Day by day">
            <ol className="relative border-l-2 border-cream-line ml-2 space-y-6">
              {it.days.map((d) => (
                <li key={d.day} className="pl-6 relative">
                  <span className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-gold text-white text-[11px] font-medium inline-flex items-center justify-center">{d.day}</span>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-serif text-lg">{d.title}</h3>
                    {d.date && <span className="text-[12px] text-muted">{new Date(d.date + "T00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}</span>}
                  </div>
                  <dl className="mt-3 grid sm:grid-cols-3 gap-3">
                    {([[Sunrise, "Morning", d.morning], [Sun, "Afternoon", d.afternoon], [Moon, "Evening", d.evening]] as [any, string, string][]).map(([I, k, v]) => v && (
                      <div key={k} className="rounded-2xl bg-canvas border border-line p-3">
                        <dt className="text-[11px] text-muted inline-flex items-center gap-1"><I className="w-3.5 h-3.5 text-gold" />{k}</dt>
                        <dd className="text-[13px] mt-1.5 leading-relaxed">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {d.estCost ? <p className="text-[11.5px] text-muted mt-2">Estimated spend {money(d.estCost)}</p> : null}
                </li>
              ))}
            </ol>
          </Section>

          {!!it.etiquette?.length && (
            <Section icon={HandHeart} title="Local etiquette">
              <ul className="grid sm:grid-cols-2 gap-3">{it.etiquette.map((e) => <li key={e} className="rounded-2xl bg-cream/50 border border-cream-line p-3 text-[13px] leading-relaxed">{e}</li>)}</ul>
              <p className="text-[11.5px] text-muted mt-3">
                {it.etiquetteSource ? <>Based on <a href={it.etiquetteSource.url} target="_blank" rel="noopener noreferrer" className="underline">Wikivoyage: {it.etiquetteSource.title}</a> (CC BY-SA).</> : "General guidance. Customs vary by region, so follow the lead of the people around you."}
              </p>
            </Section>
          )}

          {!!it.tips?.length && (
            <Section icon={Lightbulb} title="Good to know">
              <ul className="space-y-2">{it.tips.map((t) => <li key={t} className="flex gap-2.5 text-[13.5px]"><span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 shrink-0" />{t}</li>)}</ul>
            </Section>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6">
          {!!it.attractions?.length && (
            <Section icon={Star} title="Highlights">
              <ul className="space-y-3">{it.attractions.map((a) => <li key={a.name}><p className="text-[13.5px] font-medium">{a.name}</p><p className="text-[12.5px] text-muted mt-0.5">{a.why}</p></li>)}</ul>
            </Section>
          )}
          {!!it.budgetBreakdown?.length && (
            <Section icon={Wallet} title="Budget">
              <ul className="divide-y divide-line text-[13px]">{it.budgetBreakdown.map((b) => <li key={b.item} className="flex justify-between py-2"><span>{b.item}</span><span>{money(Number(b.amount) || 0)}</span></li>)}</ul>
              <p className={cx("mt-3 text-[13px] font-medium flex justify-between", total > trip.budget ? "text-danger" : "text-success")}><span>Estimated total</span><span>{money(total)} of {money(trip.budget)}</span></p>
            </Section>
          )}
          <LiveWeather place={trip.destination} />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" href={`/booking?type=stays&dest=${encodeURIComponent(trip.destination)}&checkin=${trip.start}&checkout=${trip.end}&adults=${trip.travellers}`}><BedDouble className="w-4 h-4" />Stays</Button>
            <Button variant="outline" href={`/booking?type=flights&from=${encodeURIComponent(trip.origin || "")}&to=${encodeURIComponent(trip.destination)}&checkin=${trip.start}&checkout=${trip.end}&adults=${trip.travellers}`}><Plane className="w-4 h-4" />Flights</Button>
          </div>
          <p className="text-[11.5px] text-muted px-1">Opening hours, prices and entry rules change. Please check before you travel.<a href="https://www.google.com/search?q=travel+advisory" target="_blank" rel="noopener noreferrer" className="sr-only"><ExternalLink /></a></p>
        </aside>
      </div>
    </div>
  );
}
