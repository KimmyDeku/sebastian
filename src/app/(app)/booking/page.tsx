"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BedDouble, Plane, Car, Ticket, CarTaxiFront, ExternalLink, Info, CalendarPlus, Sparkles } from "lucide-react";
import { Container, PageHeader } from "@/components/ui/Page";
import { FilterBar, validate, type BookingType } from "@/components/booking/Filters";
import { Img } from "@/components/ui/Img";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { ErrorState, Notice, Skeleton, EmptyState } from "@/components/ui/States";
import { toast } from "@/components/ui/Toast";
import { IMG } from "@/lib/images";
import { api } from "@/lib/api";
import { actions } from "@/lib/store";
import { googleCalendarUrl } from "@/lib/calendar";
import { fmtDate } from "@/lib/util";
import type { ScheduleEvent } from "@/lib/types";

const TYPES: { key: BookingType; label: string; icon: any; img: string; blurb: string; hero: string }[] = [
  { key: "stays", label: "Stays", icon: BedDouble, img: IMG.bookingPool, blurb: "Hotels, lodges and B&Bs", hero: "Find your next stay" },
  { key: "flights", label: "Flights", icon: Plane, img: IMG.flights, blurb: "Compare fares on trusted sites", hero: "Search flights at once" },
  { key: "cars", label: "Car rental", icon: Car, img: IMG.car, blurb: "Wheels for the road ahead", hero: "Rent the right car" },
  { key: "attractions", label: "Attractions", icon: Ticket, img: IMG.attractions, blurb: "Tours, museums, experiences", hero: "Things worth doing" },
  { key: "taxis", label: "Airport taxis", icon: CarTaxiFront, img: IMG.travelPlan, blurb: "Transfers to and from the airport", hero: "Arrive without the fuss" },
];
const FALLBACK: Record<BookingType, string[]> = { stays: [IMG.booking, IMG.bookingPool], flights: [IMG.flights], cars: [IMG.car], attractions: [IMG.attractions, IMG.travel], taxis: [IMG.car] };
const PROVIDER: Record<string, string> = { booking: "Booking.com", agoda: "Agoda", tripadvisor: "Tripadvisor", flightFare: "Flight-Fare", airZimbabwe: "Air Zimbabwe" };

const defaults = (sp: URLSearchParams) => ({
  dest: sp.get("dest") || "", checkin: sp.get("checkin") || "", checkout: sp.get("checkout") || "", adults: Number(sp.get("adults")) || 2, children: 0, rooms: 1,
  from: sp.get("from") || "", to: sp.get("to") || "", depart: sp.get("checkin") || "", ret: sp.get("checkout") || "", trip: "round", cabin: "Economy",
  where: sp.get("dest") || "", pickup: "", dropoff: "", age: 30, date: "", time: "", passengers: 2,
});

function BookingInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [type, setType] = useState<BookingType | null>((sp.get("type") as BookingType) || null);
  const [f, setF] = useState<any>(() => defaults(sp));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<any>(null);
  const [pick, setPick] = useState<any>(null);
  const [handed, setHanded] = useState<ScheduleEvent | null>(null);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  useEffect(() => { setRes(null); setErr(null); setHanded(null); }, [type]);
  const meta = TYPES.find((t) => t.key === type);

  const search = async () => {
    const v = validate(type!, f);
    if (v) { setErr(v); return; }
    setErr(null); setBusy(true); setRes(null);
    const r = await api("/api/booking", { type, ...f });
    setBusy(false);
    if (r.ok) setRes(r); else setErr(r.error || "Search failed.");
  };

  const onVoice = async (text: string) => {
    toast.info(`Heard: "${text}"`);
    const m = text.match(/from\s+([a-z\s]+?)\s+to\s+([a-z\s]+?)(?:\s+on|\s+for|$)/i);
    if (type === "flights" && m) { set("from", m[1].trim()); set("to", m[2].trim()); }
    const r = await api<any>("/api/travel/parse", { text, today: new Date().toISOString().slice(0, 10), address: "" });
    if (r.ok) {
      if (r.destination) { set("dest", r.destination); set("where", r.destination); if (type === "flights" && !m) set("to", r.destination); }
      if (r.start) { set("checkin", r.start); set("depart", r.start); set("date", r.start); }
      if (r.end) { set("checkout", r.end); set("ret", r.end); }
      if (r.travellers) { set("adults", r.travellers); set("passengers", r.travellers); }
    } else if (!m) { set("dest", text); set("where", text); }
  };

  const summaryRows = (it: any): [string, string][] => {
    const rows: [string, string][] = [["Selection", it.name], ["Type", it.kind || meta!.label]];
    if (type === "stays") rows.push(["Destination", f.dest], ["Dates", `${fmtDate(f.checkin)} → ${fmtDate(f.checkout)}`], ["Guests", `${f.adults} adults, ${f.children} children, ${f.rooms} room(s)`]);
    if (type === "flights") rows.push(["Route", `${f.from} → ${f.to}`], ["Dates", f.trip === "round" ? `${fmtDate(f.depart)} → ${fmtDate(f.ret)}` : fmtDate(f.depart)], ["Travellers", `${f.adults}, ${f.cabin.replace("_", " ")}`]);
    if (type === "cars") rows.push(["Pick-up", `${f.where}, ${f.pickup.replace("T", " ")}`], ["Drop-off", f.dropoff.replace("T", " ")], ["Driver age", String(f.age)]);
    if (type === "attractions") rows.push(["Where", f.where], ["Date", fmtDate(f.date)]);
    if (type === "taxis") rows.push(["Route", `${f.from} → ${f.to}`], ["When", `${fmtDate(f.date)} ${f.time}`], ["Passengers", String(f.passengers)]);
    rows.push(["Estimated price", it.priceEstimate || "See provider"], ["Provider", "Booking.com (opens in a new tab)"]);
    return rows;
  };

  const confirmHandoff = () => {
    const it = pick;
    window.open(it.link, "_blank", "noopener,noreferrer");
    const start = type === "stays" ? f.checkin : type === "flights" ? f.depart : type === "cars" ? f.pickup : f.date + (type === "taxis" && f.time ? `T${f.time}` : "");
    const end = type === "stays" ? f.checkout : type === "flights" && f.trip === "round" ? f.ret : type === "cars" ? f.dropoff : undefined;
    const ev = {
      kind: "booking" as const, title: `${meta!.label}: ${it.name}`, start: new Date(start.length === 10 ? start + "T12:00" : start).toISOString(), end: end ? new Date(end.length === 10 ? end + "T12:00" : end).toISOString() : undefined,
      remindMinutes: 1440, notes: `Planned via Sebastian. Opened on Booking.com; Sebastian did not make this reservation. Confirm and pay on the provider's site. Estimate: ${it.priceEstimate || "n/a"}.`,
      source: { type: "booking" as const, ref: `booking:${type}:${it.name}:${start}`, provider: "Booking.com" },
    };
    const id = actions.addEvent(ev);
    setHanded({ ...ev, id, createdAt: new Date().toISOString() });
    setPick(null);
    toast.success("Opened Booking.com and added these dates to your Schedule as a planned booking.");
  };

  if (!type)
    return (
      <Container>
        <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Booking" }]} title="What would you like to book?" subtitle="Choose one and I'll show only the filters that matter for it." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TYPES.map((t) => (
            <button key={t.key} onClick={() => { setType(t.key); router.replace(`/booking?type=${t.key}`); }} className="group relative overflow-hidden rounded-3xl min-h-[220px] text-left border border-line">
              <Img src={t.img} alt="" className="absolute inset-0 w-full h-full group-hover:scale-[1.03] transition-transform duration-700" />
              <span className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-transparent" aria-hidden />
              <span className="relative h-full flex flex-col justify-end p-6 text-white min-h-[220px]">
                <t.icon className="w-7 h-7" strokeWidth={1.4} aria-hidden />
                <span className="font-serif text-2xl mt-3">{t.label}</span>
                <span className="text-sm text-white/85">{t.blurb}</span>
              </span>
            </button>
          ))}
        </div>
      </Container>
    );

  return (
    <Container>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Booking", onClick: () => { setType(null); router.replace("/booking"); } }, { label: meta!.label }]} title={meta!.hero}
        subtitle="Filtered by a booking assistant with three decades of finding the best-value reservations." onBack={() => { setType(null); router.replace("/booking"); }} />
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 -mx-5 px-5 md:mx-0 md:px-0" role="tablist">
        {TYPES.map((t) => (
          <button key={t.key} role="tab" aria-selected={type === t.key} onClick={() => { setType(t.key); router.replace(`/booking?type=${t.key}`); }}
            className={`shrink-0 inline-flex items-center gap-2 h-11 px-5 rounded-pill border text-sm ${type === t.key ? "bg-ink text-white border-ink" : "bg-paper border-line hover:bg-cream/60"}`}>
            <t.icon className="w-4 h-4" aria-hidden />{t.label}
          </button>
        ))}
      </div>
      <FilterBar type={type} f={f} set={set} onSearch={search} busy={busy} onVoice={onVoice} />
      {err && !busy && <div className="mt-5"><Notice tone="warning">{err}</Notice></div>}

      {handed && (
        <div className="mt-8 rounded-3xl border border-[#CFE2D6] bg-[#EFF5F1] p-6">
          <p className="font-serif text-xl">Booking.com is open in a new tab</p>
          <p className="text-sm text-muted mt-1">Nothing has been reserved yet. Please confirm your details and pay on Booking.com. I&apos;ve added <b>{handed.title}</b> to your Schedule so the dates are held in your plans.</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button size="sm" href={googleCalendarUrl(handed)} external><CalendarPlus className="w-4 h-4" />Save to Google Calendar</Button>
            <Button size="sm" variant="outline" href="/schedule">View schedule</Button>
          </div>
        </div>
      )}

      <section className="mt-10" aria-live="polite">
        {busy && <div className="grid md:grid-cols-2 gap-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-44" />)}</div>}
        {res && (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span className="text-sm text-muted mr-1">Search directly on:</span>
              {Object.entries(res.links || {}).filter(([, v]) => v).map(([k, v]) => (
                <Button key={k} size="sm" variant="outline" href={v as string} external>{PROVIDER[k] || k}<ExternalLink className="w-3.5 h-3.5" /></Button>
              ))}
            </div>
            {res.aiUnavailable ? <Notice tone="ai">{res.advice}</Notice> : (
              <>
                <Notice className="mb-6"><span className="inline-flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-glow" />Suggestions from Sebastian.</span> Prices are typical estimates, not live quotes, and availability isn&apos;t guaranteed. Confirm everything with the provider before paying. {res.advice}</Notice>
                {res.items?.length === 0 ? <EmptyState title="No suggestions" body="Try different dates or a nearby area." /> : (
                  <div className="grid md:grid-cols-2 gap-5">
                    {res.items.map((it: any, i: number) => (
                      <article key={it.id} className="bg-paper rounded-3xl border border-line overflow-hidden flex flex-col sm:flex-row">
                        <div className="relative sm:w-44 shrink-0">
                          <Img src={it.photo || FALLBACK[type][i % FALLBACK[type].length]} alt={it.name} className="w-full h-40 sm:h-full" />
                          {!it.photo && <span className="absolute bottom-2 left-2 text-[10px] bg-white/90 rounded-full px-2 py-0.5">Illustrative photo</span>}
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                          <p className="text-[11px] text-muted">{it.kind}{it.area ? ` · ${it.area}` : ""}</p>
                          <h3 className="t-h3 mt-1">{it.name}</h3>
                          <p className="text-[13px] text-muted mt-1.5">{it.why}</p>
                          {it.amenities?.length > 0 && <div className="flex flex-wrap gap-1.5 mt-3">{it.amenities.map((a: string) => <span key={a} className="text-[11px] bg-cream rounded-full px-2.5 py-1">{a}</span>)}</div>}
                          <div className="mt-auto pt-4 flex items-end justify-between gap-3">
                            <div><p className="text-[11px] text-muted inline-flex items-center gap-1"><Info className="w-3 h-3" />Estimate</p><p className="font-serif text-lg">{it.priceEstimate}</p></div>
                            <Button size="sm" onClick={() => setPick(it)}>View on Booking.com</Button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
        {!res && !busy && !handed && (
          <div className="grid md:grid-cols-3 gap-5 mt-4">
            {["Confirm your details before paying on any provider site.", "Prices change quickly; Sebastian's figures are estimates.", "Dates you hand off are added to your Schedule automatically."].map((t) => (
              <div key={t} className="rounded-2xl bg-paper border border-line p-5 text-sm text-muted">{t}</div>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog open={!!pick} title="Please confirm your details" rows={pick ? summaryRows(pick) : []} confirmLabel="Open Booking.com" onCancel={() => setPick(null)} onConfirm={confirmHandoff}
        body="I'll open Booking.com with this search so you can check live availability and complete the reservation yourself. Sebastian does not make or pay for bookings." />
    </Container>
  );
}

export default function BookingPage() { return <Suspense><BookingInner /></Suspense>; }
