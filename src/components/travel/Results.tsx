"use client";
import { Cloud, Download, CalendarPlus, Save, ExternalLink, AlertTriangle, Check } from "lucide-react";
import { Button } from "../ui/Button";
import { Notice } from "../ui/States";
import { money, cx } from "@/lib/util";

export const STAGES = ["Destination", "Weather", "Activities", "Accommodation", "Flights", "Budget", "Itinerary", "Save to Schedule", "Download PDF"];

export function StageTracker({ done }: { done: number }) {
  return (
    <ol className="flex gap-2 overflow-x-auto no-scrollbar pb-2" aria-label="Trip planning progress">
      {STAGES.map((s, i) => (
        <li key={s} className={cx("shrink-0 inline-flex items-center gap-2 h-9 px-3.5 rounded-pill text-[12.5px] border", i < done ? "bg-ink text-white border-ink" : "bg-paper border-line text-muted")} aria-current={i === done ? "step" : undefined}>
          {i < done ? <Check className="w-3.5 h-3.5" aria-hidden /> : <span className="w-4 text-center">{i + 1}</span>}{s}
        </li>
      ))}
    </ol>
  );
}

export function WeatherCard({ w }: { w: any }) {
  if (!w) return <Notice tone="warning">Weather couldn&apos;t be retrieved for this destination right now.</Notice>;
  return (
    <div className="rounded-3xl bg-paper border border-line p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted">Now in {w.place}{w.country ? `, ${w.country}` : ""}</p>
          <p className="font-serif text-4xl mt-1">{Math.round(w.current.temp)}°C</p>
          <p className="text-sm text-muted">{w.current.label} · wind {Math.round(w.current.wind)} km/h · humidity {Math.round(w.current.humidity)}%</p>
        </div>
        <Cloud className="w-10 h-10 text-gold" strokeWidth={1.2} aria-hidden />
      </div>
      <div className="mt-5 grid grid-cols-4 sm:grid-cols-7 gap-2">
        {w.days.map((d: any) => (
          <div key={d.date} className="rounded-xl bg-canvas p-2.5 text-center">
            <p className="text-[11px] text-muted">{new Date(d.date + "T00:00").toLocaleDateString("en-GB", { weekday: "short" })}</p>
            <p className="text-sm mt-1">{Math.round(d.max)}°</p>
            <p className="text-[11px] text-muted">{Math.round(d.min)}°</p>
            <p className="text-[10px] text-muted mt-1 line-clamp-1">{d.precip}% rain</p>
          </div>
        ))}
      </div>
      {w.alerts?.length > 0 && (
        <div className="mt-4 space-y-2">
          {w.alerts.map((a: string) => <p key={a} className="text-[13px] flex gap-2"><AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" aria-hidden />{a}</p>)}
          <p className="text-[11px] text-muted">Advisories are Sebastian&apos;s reading of the forecast, not official warnings. Follow local authorities.</p>
        </div>
      )}
      <p className="text-[11px] text-muted mt-3">Source: {w.provider}, retrieved {new Date(w.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. The 7-day forecast may not cover your travel dates; weather can change, so check again before you go.</p>
    </div>
  );
}

export function TripResult({ data, trip, onSave, onSchedule, onPdf, saved, scheduled }: any) {
  const it = data.itinerary;
  const total = (it.budgetBreakdown || []).reduce((s: number, b: any) => s + (+b.amount || 0), 0);
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap gap-2">
        <Button onClick={onSave} variant={saved ? "outline" : "primary"}><Save className="w-4 h-4" />{saved ? "Trip saved" : "Save trip"}</Button>
        <Button onClick={onSchedule} variant="outline"><CalendarPlus className="w-4 h-4" />{scheduled ? "In your schedule" : "Save to Schedule"}</Button>
        <Button onClick={onPdf} variant="outline"><Download className="w-4 h-4" />Download PDF</Button>
      </div>
      <p className="font-serif text-2xl leading-snug max-w-3xl">{it.summary}</p>

      <section><h2 className="t-h2 mb-4">Weather</h2><WeatherCard w={data.weather} /></section>

      <section>
        <h2 className="t-h2 mb-4">Your itinerary</h2>
        <ol className="space-y-4">
          {it.days.map((d: any) => (
            <li key={d.day} className="rounded-3xl bg-paper border border-line p-6 grid md:grid-cols-[140px_1fr] gap-4">
              <div><p className="font-serif text-3xl text-gold">Day {d.day}</p>{d.date && <p className="text-xs text-muted mt-1">{d.date}</p>}{d.estCost ? <p className="text-xs text-muted mt-1">~{money(d.estCost)}</p> : null}</div>
              <div>
                <h3 className="t-h3">{d.title}</h3>
                <dl className="mt-3 grid sm:grid-cols-3 gap-4 text-sm">
                  {[["Morning", d.morning], ["Afternoon", d.afternoon], ["Evening", d.evening]].map(([k, v]) => <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="mt-1 leading-relaxed">{v}</dd></div>)}
                </dl>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-paper border border-line p-6">
          <h2 className="t-h3">Attractions worth your time</h2>
          <ul className="mt-4 space-y-3 text-sm">{it.attractions.map((a: any) => <li key={a.name}><span className="text-ink">{a.name}</span><span className="text-muted"> — {a.why}</span></li>)}</ul>
        </div>
        <div className="rounded-3xl bg-paper border border-line p-6">
          <h2 className="t-h3">Budget</h2>
          <ul className="mt-4 divide-y divide-line text-sm">{it.budgetBreakdown.map((b: any) => <li key={b.item} className="flex justify-between py-2"><span>{b.item}</span><span>{money(+b.amount)}</span></li>)}</ul>
          <p className={cx("mt-3 text-sm", total > trip.budget ? "text-danger" : "text-success")}>Estimated {money(total)} of your {money(trip.budget)} budget.</p>
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-cream/50 border border-cream-line p-6">
          <h2 className="t-h3">Accommodation</h2>
          <p className="text-sm text-muted mt-1">Opens a live search with your dates. Nothing is booked until you confirm on the provider&apos;s site.</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button size="sm" href={`/booking?type=stays&dest=${encodeURIComponent(trip.destination)}&checkin=${trip.start}&checkout=${trip.end}&adults=${trip.travellers}`}>Find stays in Sebastian</Button>
            {Object.entries(data.stays || {}).map(([k, v]) => <Button key={k} size="sm" variant="outline" href={v as string} external>{k === "booking" ? "Booking.com" : k === "agoda" ? "Agoda" : "Tripadvisor"}<ExternalLink className="w-3.5 h-3.5" /></Button>)}
          </div>
        </div>
        <div className="rounded-3xl bg-cream/50 border border-cream-line p-6">
          <h2 className="t-h3">Flights</h2>
          <p className="text-sm text-muted mt-1">{trip.origin ? `From ${trip.origin}.` : "Add your home city in the planner for a pre-filled route."} Fares change constantly; compare before paying.</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button size="sm" href={`/booking?type=flights&from=${encodeURIComponent(trip.origin || "")}&to=${encodeURIComponent(trip.destination)}&checkin=${trip.start}&checkout=${trip.end}&adults=${trip.travellers}`}>Search in Sebastian</Button>
            {Object.entries(data.flights || {}).filter(([, v]) => v).map(([k, v]) => <Button key={k} size="sm" variant="outline" href={v as string} external>{({ booking: "Booking.com", flightFare: "Flight-Fare", agoda: "Agoda", airZimbabwe: "Air Zimbabwe", tripadvisor: "Tripadvisor" } as any)[k]}<ExternalLink className="w-3.5 h-3.5" /></Button>)}
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-paper border border-line p-6">
        <h2 className="t-h3">Advisor&apos;s tips</h2>
        <ul className="mt-3 space-y-2 text-sm list-disc pl-5">{it.tips.map((t: string) => <li key={t}>{t}</li>)}</ul>
      </section>
    </div>
  );
}
