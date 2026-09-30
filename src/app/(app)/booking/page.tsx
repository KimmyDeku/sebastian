"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BedDouble, Plane, Car, Ticket, CarTaxiFront, Bus, Sparkles } from "lucide-react";
import { Container, PageHeader } from "@/components/ui/Page";
import { FilterBar, validate, type BookingType } from "@/components/booking/Filters";
import { Autopilot } from "@/components/booking/Autopilot";
import { Results } from "@/components/booking/Results";
import { GuestForm } from "@/components/booking/GuestForm";
import { Img } from "@/components/ui/Img";
import { ErrorState, Notice } from "@/components/ui/States";
import { IMG } from "@/lib/images";
import { TASKS } from "@/lib/agentTasks";
import { api } from "@/lib/api";
import { useUI } from "@/lib/ui";
import { fmtDate, cx } from "@/lib/util";

const BUS_IMG = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1400&q=70";
const TYPES: { key: BookingType; label: string; icon: any; img: string; blurb: string; hero: string }[] = [
  { key: "stays", label: "Stays", icon: BedDouble, img: IMG.bookingPool, blurb: "Hotels, lodges and B&Bs", hero: "Find your next stay" },
  { key: "flights", label: "Flights", icon: Plane, img: IMG.flights, blurb: "Compare fares on trusted sites", hero: "Search flights at once" },
  { key: "cars", label: "Car rental", icon: Car, img: IMG.car, blurb: "Wheels for the road ahead", hero: "Rent the right car" },
  { key: "attractions", label: "Attractions", icon: Ticket, img: IMG.attractions, blurb: "Tours, museums, experiences", hero: "Things worth doing" },
  { key: "taxis", label: "Airport taxis", icon: CarTaxiFront, img: IMG.travelPlan, blurb: "Transfers to and from the airport", hero: "Arrive without the fuss" },
  { key: "bus", label: "Other transport", icon: Bus, img: BUS_IMG, blurb: "Buses, coaches, trains and ferries", hero: "Buses, trains and more" },
];
const FALLBACK: Record<BookingType, string[]> = { stays: [IMG.booking, IMG.bookingPool], flights: [IMG.flights], cars: [IMG.car], attractions: [IMG.attractions, IMG.travel], taxis: [IMG.car], bus: [BUS_IMG] };

const defaults = (sp: URLSearchParams) => ({
  dest: sp.get("dest") || "", checkin: sp.get("checkin") || "", checkout: sp.get("checkout") || "", adults: Number(sp.get("adults")) || 2, children: 0, rooms: 1,
  from: sp.get("from") || "", to: sp.get("to") || "", depart: sp.get("checkin") || "", ret: sp.get("checkout") || "", trip: "round", cabin: "Economy",
  where: sp.get("dest") || "", pickup: "", dropoff: "", age: 30, date: sp.get("checkin") || "", time: "", passengers: 1, mode: "Any",
});

function summaryRows(type: BookingType, f: any): [string, string][] {
  switch (type) {
    case "stays": return [["Destination", f.dest], ["Check-in", fmtDate(f.checkin)], ["Check-out", fmtDate(f.checkout)], ["Guests", `${f.adults} adult${f.adults === 1 ? "" : "s"}, ${f.children} ${f.children === 1 ? "child" : "children"}, ${f.rooms} room${f.rooms > 1 ? "s" : ""}`]];
    case "flights": return [["Route", `${f.from} → ${f.to}`], ["Departure", fmtDate(f.depart)], ...(f.trip === "round" ? [["Return", fmtDate(f.ret)] as [string, string]] : []), ["Travellers", `${f.adults}, ${String(f.cabin).replace("_", " ")}`]];
    case "cars": return [["Pick-up", `${f.where}, ${String(f.pickup).replace("T", " ")}`], ["Drop-off", String(f.dropoff).replace("T", " ")], ["Driver age", String(f.age)]];
    case "attractions": return [["Where", f.where], ["Date", fmtDate(f.date)]];
    case "taxis": return [["Route", `${f.from} → ${f.to}`], ["When", `${fmtDate(f.date)} ${f.time}`], ["Passengers", String(f.passengers)]];
    case "bus": return [["Route", `${f.from} → ${f.to}`], ["Date", fmtDate(f.date)], ["Passengers", String(f.passengers)], ["Transport", f.mode || "Any"]];
  }
}
const whereOf = (type: BookingType, f: any) => (type === "stays" ? f.dest : type === "flights" || type === "taxis" || type === "bus" ? `${f.from} → ${f.to}` : f.where);

function BookingInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const setSidebar = useUI((s) => s.setSidebar);
  const [type, setType] = useState<BookingType | null>((sp.get("type") as BookingType) || null);
  const [f, setF] = useState<any>(() => defaults(sp));
  const [view, setView] = useState<"form" | "results" | "details">("form");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<any>(null);
  const [pick, setPick] = useState<any>(null);
  const [autopilot, setAutopilot] = useState(false);
  const lastQuery = useRef<any>(null);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const meta = TYPES.find((t) => t.key === type);

  const choose = (t: BookingType | null) => { setType(t); setView("form"); setRes(null); setErr(null); setPick(null); router.replace(t ? `/booking?type=${t}` : "/booking"); };

  const run = useCallback(async (q: any, quiet = false) => {
    if (!quiet) { setBusy(true); setErr(null); }
    const r = await api("/api/booking", q);
    if (!quiet) setBusy(false);
    if (r.ok) setRes(r); else if (!quiet) setErr(r.error || "Search failed.");
  }, []);

  const search = () => {
    const v = validate(type!, f);
    if (v) { setErr(v); return; }
    const q = { type, ...f };
    lastQuery.current = q;
    setRes(null); setView("results"); setSidebar(false);
    run(q);
  };

  // Keep results fresh while the page is open.
  useEffect(() => {
    if (view !== "results" || !lastQuery.current) return;
    const t = setInterval(() => run(lastQuery.current, true), 10 * 60000);
    return () => clearInterval(t);
  }, [view, run]);

  if (!type)
    return (
      <Container>
        <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Booking" }]} title="What would you like to book?" subtitle="Choose one and I'll show only the filters that matter for it." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TYPES.map((t) => (
            <button key={t.key} onClick={() => choose(t.key)} className="group relative overflow-hidden rounded-3xl min-h-[200px] text-left border border-line">
              <Img src={t.img} alt="" label="" className="absolute inset-0 w-full h-full group-hover:scale-[1.03] transition-transform duration-700" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" aria-hidden />
              <span className="relative h-full flex flex-col justify-end p-6 text-white min-h-[200px]">
                <t.icon className="w-6 h-6" strokeWidth={1.4} aria-hidden />
                <span className="font-serif text-2xl mt-2">{t.label}</span>
                <span className="text-sm text-white/85">{t.blurb}</span>
              </span>
            </button>
          ))}
        </div>
      </Container>
    );

  const autopilotButton = (
    <div className="flex justify-end mb-3">
      <button type="button" onClick={() => setAutopilot(true)} title="Let Sebastian fill in the search by voice"
        className="glow-gold inline-flex items-center gap-2 h-10 px-5 rounded-pill bg-paper border border-gold/60 text-[13px] text-ink hover:bg-gold-soft/40 transition-colors">
        <Sparkles className="w-4 h-4 text-gold" aria-hidden />Autopilot<span className="hidden sm:inline text-muted">· fill this in by voice</span>
      </button>
    </div>
  );

  const tabs = (
    <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 -mx-5 px-5 md:mx-0 md:px-0" role="tablist">
      {TYPES.map((t) => (
        <button key={t.key} role="tab" aria-selected={type === t.key} onClick={() => choose(t.key)}
          className={cx("shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-pill border text-[13px]", type === t.key ? "bg-ink text-white border-ink" : "bg-paper border-line hover:bg-cream/60")}>
          <t.icon className="w-4 h-4" aria-hidden />{t.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto w-full px-5 md:px-10 pt-6 md:pt-10 pb-32 md:pb-20">
      {view === "form" && <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Booking", onClick: () => choose(null) }, { label: meta!.label }]} title={meta!.hero}
        subtitle="Fill it in yourself, or let Autopilot ask you by voice. A booking assistant with three decades of experience does the rest." onBack={() => choose(null)} />}
      {view !== "details" && (
        <>
          {autopilotButton}
          {tabs}
          <FilterBar type={type} f={f} set={set} onSearch={search} busy={busy} />
          {err && !busy && <div className="mt-4"><Notice tone="warning">{err}</Notice></div>}
        </>
      )}

      {view === "form" && (
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {["Tap Autopilot and just say where and when. Sebastian fills in each box as you speak.", "Prices are Sebastian's estimates; the provider confirms the final price before you pay.", "Once you've booked, the dates go straight into your schedule and Google Calendar."].map((t) => (
            <div key={t} className="rounded-2xl bg-paper border border-line p-5 text-sm text-muted">{t}</div>
          ))}
        </div>
      )}

      {view === "results" && (err && !res ? <div className="mt-6"><ErrorState body={err} onRetry={search} /></div>
        : <Results type={type} where={whereOf(type, f)} res={res} loading={busy} onPick={(it) => { setPick(it); setView("details"); window.scrollTo({ top: 0 }); }} onRefresh={() => lastQuery.current && run(lastQuery.current)} fallbackImg={FALLBACK[type]} />)}

      {view === "details" && pick && <GuestForm type={type} item={pick} search={f} summary={summaryRows(type, f)} onBack={() => setView("results")} />}

      <Autopilot open={autopilot} title={`${meta!.label} search`} fields={TASKS[type === "bus" ? "bus" : type].slots.map((s) => ({ key: s.key, label: s.label, ask: s.ask, hint: s.hint, required: typeof s.required === "function" ? s.required(f) : !!s.required }))}
        values={f} onValues={(p) => setF((x: any) => ({ ...x, ...p }))} onClose={() => setAutopilot(false)} />
    </div>
  );
}

export default function BookingPage() { return <Suspense><BookingInner /></Suspense>; }
