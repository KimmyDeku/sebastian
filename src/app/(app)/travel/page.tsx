"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Send, Sparkles, MapPin, Pencil, Trash2, RotateCcw, ChevronLeft, Plane } from "lucide-react";
import { Container, PageHeader } from "@/components/ui/Page";
import { Option, inputCls } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { ErrorState } from "@/components/ui/States";
import { Img } from "@/components/ui/Img";
import { SebastianMark } from "@/components/SebastianMark";
import { VoiceButton } from "@/components/VoiceButton";
import { DateRangePicker } from "@/components/booking/DateRangePicker";
import { Collage } from "@/components/travel/Collage";
import { Inspiration, useInspiration } from "@/components/travel/Inspiration";
import { ItineraryView } from "@/components/travel/ItineraryView";
import { ACTIVITIES, DESTINATIONS } from "@/components/travel/destinations";
import { actions, useAccount, useData, useStore } from "@/lib/store";
import { formOfAddress } from "@/lib/address";
import { useUI } from "@/lib/ui";
import { api } from "@/lib/api";
import { daysBetween, fmtDate, money, uid, cx } from "@/lib/util";
import { toast } from "@/components/ui/Toast";
import type { Trip } from "@/lib/types";

const Globe = dynamic(() => import("@/components/travel/Globe").then((m) => m.Globe), { ssr: false, loading: () => <div className="w-full h-full rounded-3xl border border-line bg-cream/40" /> });

type Stage = "start" | "creating" | "plan" | "result";
type Step = "dates" | "travellers" | "budget" | "interests" | "extras" | "ready";
const ORDER: Step[] = ["dates", "travellers", "budget", "interests", "extras", "ready"];
const Q: Record<Step, string> = {
  dates: "Lovely choice. When would you like to travel?", travellers: "Who's coming along?", budget: "What's your budget, not counting flights?",
  interests: "What would you love to do there?", extras: "How would you like to pace it, and where will you be flying from?", ready: "I have everything I need. Shall I create your itinerary?",
};
const addDays = (iso: string, n: number) => { const d = new Date(iso + "T00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const tripDays = (a: string, b: string) => Math.min(14, daysBetween(a, b) + 1);
const known = (name: string) => DESTINATIONS.find((d) => d.name.toLowerCase() === name.toLowerCase() || d.name.split(",")[0].toLowerCase() === name.toLowerCase());

function Bubble({ who, children }: { who: "s" | "u"; children: React.ReactNode }) {
  return who === "u"
    ? <div className="flex justify-end"><div className="bg-ink text-white rounded-2xl rounded-br-md px-4 py-2.5 text-[13.5px] max-w-[85%]">{children}</div></div>
    : <div className="flex gap-2.5"><SebastianMark size={28} /><div className="bg-canvas border border-line rounded-2xl rounded-tl-md px-4 py-2.5 text-[13.5px] max-w-[88%]">{children}</div></div>;
}

function TravelInner() {
  const sp = useSearchParams();
  const acc = useAccount();
  const d = useData();
  const who = formOfAddress(acc, d.prefs);
  const setSidebar = useUI((s) => s.setSidebar);
  const today = new Date().toISOString().slice(0, 10);

  const [stage, setStage] = useState<Stage>("start");
  const [dest, setDest] = useState(sp.get("destination") || "");
  const [country, setCountry] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [interests, setInterests] = useState<string[]>((sp.get("activities") || "").split(",").filter(Boolean));
  const [f, setF] = useState({ start: sp.get("start") || "", end: sp.get("end") || "", travellers: 2, group: "Couple", budget: Number(sp.get("budget")) || 1000, pace: "Balanced", origin: "", notes: "", mustSee: [] as string[] });
  const [step, setStep] = useState<Step>("dates");
  const [log, setLog] = useState<{ who: "s" | "u"; text: string }[]>([]);
  const [free, setFree] = useState("");
  const [talk, setTalk] = useState("");
  const [parsing, setParsing] = useState(false);
  const [gen, setGen] = useState<"idle" | "busy" | "error">("idle");
  const [genErr, setGenErr] = useState("");
  const [tripId, setTripId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Trip | null>(null);
  const [del, setDel] = useState<Trip | null>(null);
  const [replanning, setReplanning] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));
  const { data: insp, loading: inspLoading } = useInspiration(stage === "plan" ? dest : "");
  const trip = d.trips.find((t) => t.id === tripId) || null;

  useEffect(() => { if (insp?.coords && !coords) setCoords(insp.coords); }, [insp, coords]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [step, log.length]);

  // Recommendations: Trip DNA plus the interests picked on the collage.
  const hasDNA = d.prefs.personalization && Object.keys(d.tripDNA.activities).length > 0;
  const recs = useMemo(() => DESTINATIONS.map((x) => ({ ...x, score: x.tags.reduce((s, t) => s + (d.tripDNA.activities[t] || 0) + (interests.includes(t) ? 3 : 0), 0) - (d.tripDNA.destinations[x.name] ? 1 : 0) }))
    .sort((a, b) => b.score - a.score).slice(0, 6), [d.tripDNA, interests]);

  /* ---------- Start: choose a destination, then "Creating your destination" ---------- */
  const begin = async (name: string, extra: Partial<typeof f> = {}) => {
    const n = name.trim();
    if (!n) { toast.error("Tell me where you'd like to go."); return; }
    setStage("creating");
    setSidebar(false);
    const k = known(n);
    const [geo] = await Promise.all([
      k ? Promise.resolve({ ok: true, name: k.name, lat: k.lat, lng: k.lng, country: k.name.split(",").pop()!.trim() }) : fetch(`/api/geocode?q=${encodeURIComponent(n)}`).then((r) => r.json()).catch(() => ({ ok: false })),
      new Promise((r) => setTimeout(r, 1800)),
    ]);
    setDest(geo.ok ? geo.name : n);
    setCountry(geo.ok ? geo.country || "" : "");
    setCoords(geo.ok ? { lat: geo.lat, lng: geo.lng } : null);
    setF((p) => ({ ...p, ...extra, mustSee: [] }));
    const first: Step = extra.start && extra.end ? "travellers" : "dates";
    setStep(first);
    setLog([]);
    setStage("plan");
  };

  const parseFree = async (text: string, thenBegin: boolean) => {
    if (!text.trim()) return;
    setParsing(true);
    const r = await api<any>("/api/travel/parse", { text, today, address: who });
    setParsing(false);
    if (!r.ok) { toast.error(r.error || "I couldn't read that. Try naming the destination."); return; }
    const extra: any = {};
    if (r.start) extra.start = r.start;
    if (r.end) extra.end = r.end;
    if (r.start && !r.end && r.days) extra.end = addDays(r.start, r.days);
    if (r.budget) extra.budget = r.budget;
    if (r.travellers) extra.travellers = r.travellers;
    if (r.activities?.length) setInterests((p) => [...new Set([...p, ...r.activities.filter((a: string) => ACTIVITIES.includes(a))])]);
    if (thenBegin) { if (r.destination) begin(r.destination, extra); else toast.info(r.reply || "Where would you like to go?"); return; }
    setF((p) => ({ ...p, ...extra }));
    if (r.destination && r.destination.toLowerCase() !== dest.toLowerCase()) { setDest(r.destination); setCoords(null); }
    setLog((l) => [...l, { who: "u", text }, { who: "s", text: r.reply || "Noted." }]);
    const nextStep: Step = !(extra.start || f.start) ? "dates" : ORDER.find((s) => s !== "dates" && ORDER.indexOf(s) >= ORDER.indexOf(step)) || "ready";
    setStep(nextStep);
  };

  /* ---------- Generate, save and schedule ---------- */
  const scheduleTrip = (t: Trip) => {
    const ev = d.schedule.find((e) => e.source.ref === `trip:${t.id}`);
    const data = { kind: "trip" as const, title: `Trip to ${t.destination}`, start: new Date(t.start + "T09:00").toISOString(), end: new Date(t.end + "T18:00").toISOString(), remindMinutes: 1440,
      notes: `${t.itinerary?.days.length || tripDays(t.start, t.end)}-day itinerary by Sebastian · ${t.travellers} traveller(s) · budget ${money(t.budget)}`, source: { type: "trip" as const, ref: `trip:${t.id}` } };
    if (ev) actions.updateEvent(ev.id, data); else actions.addEvent(data);
  };

  const buildItinerary = async (t: Partial<Trip> & { destination: string; start: string; end: string }) => {
    const dna = d.prefs.personalization ? { destinations: Object.keys(d.tripDNA.destinations).slice(0, 5), activities: Object.entries(d.tripDNA.activities).sort((a, b) => b[1] - a[1]).slice(0, 5).map((x) => x[0]) } : {};
    return api<any>("/api/travel", { ...t, days: tripDays(t.start, t.end), dna });
  };

  const generate = async () => {
    setGen("busy"); setGenErr("");
    const r = await buildItinerary({ destination: dest, country, start: f.start, end: f.end, travellers: f.travellers, budget: f.budget, activities: interests, pace: f.pace, origin: f.origin, notes: f.notes, mustSee: f.mustSee });
    if (!r.ok) { setGen("error"); setGenErr(r.error || "The itinerary couldn't be created."); return; }
    const t: Trip = { id: uid("t_"), destination: dest, country, start: f.start, end: f.end, budget: f.budget, travellers: f.travellers, activities: interests, itinerary: r.itinerary,
      photo: insp?.overview?.image, pace: f.pace, origin: f.origin, notes: f.notes, mustSee: f.mustSee, createdAt: new Date().toISOString() };
    actions.saveTrip(t); // also teaches Trip DNA
    scheduleTrip(t);
    setTripId(t.id);
    setGen("idle");
    setStage("result");
    window.scrollTo({ top: 0 });
    toast.success(`Your ${dest.split(",")[0]} itinerary is saved and added to your schedule.`);
  };

  /* ---------- Edit and delete ---------- */
  const saveEdit = async (t: Trip) => {
    const old = d.trips.find((x) => x.id === t.id)!;
    const sameLength = daysBetween(t.start, t.end) === daysBetween(old.start, old.end);
    const onlyDates = sameLength && t.travellers === old.travellers && t.budget === old.budget && t.notes === old.notes;
    let next = { ...t, updatedAt: new Date().toISOString() };
    setEdit(null);
    if (onlyDates && next.itinerary) {
      next.itinerary = { ...next.itinerary, days: next.itinerary.days.map((x, i) => ({ ...x, date: addDays(t.start, i) })) };
    } else {
      setReplanning(true);
      const r = await buildItinerary(t);
      setReplanning(false);
      if (!r.ok) { toast.error(r.error || "The itinerary couldn't be updated."); return; }
      next.itinerary = r.itinerary;
    }
    useStore.getState().patch((x) => ({ ...x, trips: x.trips.map((y) => (y.id === t.id ? next : y)) }));
    scheduleTrip(next);
    toast.success("Trip updated, and your schedule too.");
  };
  const removeTrip = (t: Trip) => {
    actions.deleteTrip(t.id);
    const ev = d.schedule.find((e) => e.source.ref === `trip:${t.id}`);
    if (ev) actions.deleteEvent(ev.id);
    setDel(null);
    if (tripId === t.id) { setTripId(null); setStage("start"); }
    toast.info("Trip deleted and removed from your schedule.");
  };

  /* ---------- Views ---------- */
  if (stage === "creating")
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6" role="status" aria-live="polite">
        <div className="relative w-28 h-28">
          <span className="absolute inset-0 rounded-full border-2 border-dashed border-gold/60 animate-[spin_6s_linear_infinite]" aria-hidden />
          <span className="absolute inset-3 rounded-full bg-cream flex items-center justify-center"><Plane className="w-9 h-9 text-gold animate-floaty" aria-hidden /></span>
        </div>
        <p className="t-h2 mt-8">Creating your destination</p>
        <p className="text-sm text-muted mt-2">Gathering maps, sights and inspiration…</p>
      </div>
    );

  if (stage === "result" && trip?.itinerary)
    return (
      <div className="max-w-[1300px] mx-auto px-5 md:px-10 pt-6 md:pt-8 pb-28">
        <button onClick={() => setStage("start")} className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink mb-4"><ChevronLeft className="w-4 h-4" />All trips</button>
        <ItineraryView trip={trip} who={who} replanning={replanning} onEdit={() => setEdit(trip)} onDelete={() => setDel(trip)} />
        {edit && <EditTrip trip={edit} onCancel={() => setEdit(null)} onSave={saveEdit} />}
        <ConfirmDialog open={!!del} danger title="Delete this trip?" body="The itinerary will be removed, along with its entry in your schedule." confirmLabel="Delete trip" onCancel={() => setDel(null)} onConfirm={() => removeTrip(del!)} />
      </div>
    );

  if (stage === "plan") {
    const idx = ORDER.indexOf(step);
    const days = f.start && f.end ? tripDays(f.start, f.end) : 0;
    const answer = (s: Step) => ({
      dates: `${fmtDate(f.start)} to ${fmtDate(f.end)} (${days} ${days === 1 ? "day" : "days"})`, travellers: `${f.group}, ${f.travellers} ${f.travellers === 1 ? "person" : "people"}`,
      budget: money(f.budget), interests: interests.join(", ") || "Surprise me", extras: `${f.pace}${f.origin ? `, from ${f.origin}` : ""}`, ready: "",
    }[s]);
    const next = () => setStep(ORDER[Math.min(idx + 1, ORDER.length - 1)]);
    const pins = [...DESTINATIONS, ...(coords && !known(dest) ? [{ name: dest, lat: coords.lat, lng: coords.lng, tags: [], note: "" }] : [])];

    return (
      <div className="max-w-[1500px] mx-auto px-4 md:px-8 pt-4 md:pt-6 pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-5 items-start">
          <section className="min-w-0 rounded-3xl border border-line bg-paper flex flex-col lg:sticky lg:top-4 lg:h-[calc(100vh-120px)] min-h-[520px]" aria-label="Plan with Sebastian">
            <div className="px-5 pt-4 pb-3 border-b border-line">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0"><p className="t-kicker text-muted">Planning</p><p className="font-serif text-xl truncate">{dest}</p></div>
                <button onClick={() => setStage("start")} className="text-[12px] text-muted hover:text-ink underline underline-offset-2 shrink-0">Start over</button>
              </div>
              <div className="flex gap-1 mt-3" aria-label={`Step ${idx + 1} of ${ORDER.length}`}>{ORDER.map((s, i) => <span key={s} className={cx("h-1 flex-1 rounded-full", i <= idx ? "bg-gold" : "bg-line")} />)}</div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
              <Bubble who="s">{who ? `${who}, ` : ""}{dest.split(",")[0]} it is. Browse the inspiration and the globe whenever you like, and tap a sight to add it to your plan.</Bubble>
              {log.map((m, i) => <Bubble key={i} who={m.who}>{m.text}</Bubble>)}
              {ORDER.slice(0, idx).filter((s) => s !== "ready").map((s) => (
                <div key={s} className="space-y-2.5">
                  <Bubble who="s">{Q[s]}</Bubble>
                  <Bubble who="u"><button onClick={() => setStep(s)} className="text-left">{answer(s)}<span className="block text-[10.5px] opacity-60 mt-0.5">Tap to change</span></button></Bubble>
                </div>
              ))}
              <Bubble who="s">{Q[step]}</Bubble>
              <div className="rounded-2xl border border-line p-4 ml-0 sm:ml-9 bg-paper">
                {step === "dates" && (<>
                  <div className="flex"><DateRangePicker label="Travel dates" startText="Departure" endText="Return" start={f.start} end={f.end} onChange={(a, b) => { set("start", a); set("end", b); }} /></div>
                  {f.start && f.end && daysBetween(f.start, f.end) + 1 > 14 && <p className="text-[11.5px] text-warning mt-2">I&apos;ll plan the first 14 days in detail.</p>}
                  <Button size="sm" className="mt-3" onClick={next} disabled={!f.start || !f.end || f.end <= f.start || f.start < today}>Continue</Button>
                </>)}
                {step === "travellers" && (<>
                  <div role="radiogroup" className="grid grid-cols-2 gap-2">{([["Solo", 1], ["Couple", 2], ["Family", 4], ["Friends", 4]] as [string, number][]).map(([g, n]) => <Option key={g} variant="row" selected={f.group === g} onClick={() => { set("group", g); set("travellers", n); }}>{g}</Option>)}</div>
                  {(f.group === "Family" || f.group === "Friends") && <label className="block text-[12px] text-muted mt-3">How many people?<input type="number" min={2} max={30} className={inputCls + " mt-1 h-10"} value={f.travellers} onChange={(e) => set("travellers", Math.max(2, +e.target.value))} /></label>}
                  <Button size="sm" className="mt-3" onClick={next}>Continue</Button>
                </>)}
                {step === "budget" && (<>
                  <p className="font-serif text-2xl text-center">{money(f.budget)}</p>
                  <input type="range" className="range w-full mt-3" min={200} max={20000} step={100} value={f.budget} onChange={(e) => set("budget", +e.target.value)} aria-label="Budget" />
                  <div className="flex justify-between text-[11px] text-muted mt-1"><span>$200</span><span>$20,000</span></div>
                  <Button size="sm" className="mt-3" onClick={next}>Continue</Button>
                </>)}
                {step === "interests" && (<>
                  <div className="flex flex-wrap gap-1.5">{ACTIVITIES.map((a) => <Option key={a} variant="chip" role="checkbox" selected={interests.includes(a)} onClick={() => setInterests((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]))}>{a}</Option>)}</div>
                  {f.mustSee.length > 0 && <p className="text-[11.5px] text-muted mt-3">Must-see: {f.mustSee.join(", ")}</p>}
                  <Button size="sm" className="mt-3" onClick={next}>Continue</Button>
                </>)}
                {step === "extras" && (<>
                  <div role="radiogroup" className="grid grid-cols-3 gap-2">{["Relaxed", "Balanced", "Packed"].map((p) => <Option key={p} variant="row" selected={f.pace === p} onClick={() => set("pace", p)}>{p}</Option>)}</div>
                  <input className={inputCls + " mt-3 h-10"} placeholder="Flying from (optional), e.g. Harare" value={f.origin} onChange={(e) => set("origin", e.target.value)} aria-label="Flying from" />
                  <input className={inputCls + " mt-2 h-10"} placeholder="Anything else? e.g. no early starts" value={f.notes} onChange={(e) => set("notes", e.target.value)} aria-label="Notes" />
                  <Button size="sm" className="mt-3" onClick={next}>Continue</Button>
                </>)}
                {step === "ready" && (<>
                  <dl className="text-[13px] grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                    <dt className="text-muted">Where</dt><dd>{dest}</dd><dt className="text-muted">When</dt><dd>{fmtDate(f.start)} to {fmtDate(f.end)}</dd>
                    <dt className="text-muted">Who</dt><dd>{f.travellers} {f.travellers === 1 ? "person" : "people"}</dd><dt className="text-muted">Budget</dt><dd>{money(f.budget)}</dd>
                    <dt className="text-muted">Loves</dt><dd>{interests.join(", ") || "Anything"}</dd>{f.mustSee.length > 0 && <><dt className="text-muted">Must-see</dt><dd>{f.mustSee.join(", ")}</dd></>}
                  </dl>
                  <Button className="mt-4 w-full" onClick={generate} loading={gen === "busy"}><Sparkles className="w-4 h-4" />Create my itinerary</Button>
                  {gen === "busy" && <p className="text-[12px] text-muted mt-2 text-center">Planning each day and checking local etiquette…</p>}
                </>)}
              </div>
              {gen === "error" && <ErrorState title="I couldn't create the itinerary" body={genErr} onRetry={generate} />}
              <div ref={endRef} />
            </div>

            <div className="border-t border-line p-3 flex gap-2">
              <label htmlFor="trip-talk" className="sr-only">Tell Sebastian about your trip</label>
              <input id="trip-talk" className="flex-1 min-w-0 h-10 px-4 rounded-pill border border-line bg-canvas text-base md:text-[13px] outline-none focus:border-gold" placeholder="Or just tell me, e.g. 10 to 15 December, two of us"
                value={talk} onChange={(e) => setTalk(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && talk.trim()) { parseFree(talk, false); setTalk(""); } }} />
              <VoiceButton onText={(t) => parseFree(t, false)} size={40} />
              <button onClick={() => { if (talk.trim()) { parseFree(talk, false); setTalk(""); } }} disabled={!talk.trim() || parsing} aria-label="Send" className="w-10 h-10 shrink-0 rounded-full bg-gold text-white inline-flex items-center justify-center disabled:opacity-40"><Send className="w-4 h-4" /></button>
            </div>
          </section>

          <div className="space-y-5 min-w-0">
            <Inspiration dest={dest} data={insp} loading={inspLoading} interests={interests} mustSee={f.mustSee}
              onToggleMustSee={(n) => set("mustSee", f.mustSee.includes(n) ? f.mustSee.filter((x) => x !== n) : [...f.mustSee, n])}
              onChoose={(n) => begin(n, { start: f.start, end: f.end })} />
            <div className="h-[420px] lg:h-[480px]">
              <Globe pins={pins} focus={coords} selected={dest} onPick={(p) => { if (p.name !== dest) begin(p.name, { start: f.start, end: f.end }); }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Start ---------- */
  return (
    <Container>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Travel" }]} title="Where to next?" subtitle="Tell me in your own words, or pick what you love and I'll suggest somewhere. I've been advising travellers for forty years." />
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 items-start">
        <div className="space-y-6">
          <section className="rounded-3xl bg-paper border border-line p-6 md:p-7">
            <label htmlFor="trip-dest" className="t-h3 block">Where would you like to go?</label>
            <div className="flex gap-2 mt-4">
              <input id="trip-dest" className={inputCls} placeholder="City, region or country" value={dest} onChange={(e) => setDest(e.target.value)} onKeyDown={(e) => e.key === "Enter" && begin(dest)} />
              <Button onClick={() => begin(dest)} disabled={!dest.trim()}>Continue<ArrowRight className="w-4 h-4" /></Button>
            </div>
            <p className="text-[12px] text-muted mt-4 mb-2">{hasDNA || interests.length ? "Recommended for you" : "Popular right now"}</p>
            <div className="flex flex-wrap gap-2">{recs.map((r) => <button key={r.name} onClick={() => begin(r.name)} className="h-9 px-3.5 rounded-pill border border-line text-[13px] inline-flex items-center gap-1.5 hover:bg-cream/60 hover:border-cream-line"><MapPin className="w-3.5 h-3.5 text-gold" />{r.name.split(",")[0]}</button>)}</div>
            <div className="mt-6 pt-5 border-t border-line">
              <label htmlFor="trip-free" className="text-[13px] font-medium">Or describe your trip</label>
              <div className="flex gap-2 mt-2">
                <input id="trip-free" className={inputCls} placeholder="Five days in Cape Town in December, food and beaches, $1,000" value={free} onChange={(e) => setFree(e.target.value)} onKeyDown={(e) => e.key === "Enter" && parseFree(free, true)} />
                <VoiceButton onText={(t) => { setFree(t); parseFree(t, true); }} size={48} />
                <Button onClick={() => parseFree(free, true)} loading={parsing} disabled={!free.trim()} aria-label="Send"><Send className="w-4 h-4" /></Button>
              </div>
            </div>
          </section>

          {d.trips.length > 0 && (
            <section>
              <h2 className="t-h3 mb-3">Your trips</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {d.trips.map((t) => (
                  <article key={t.id} className="rounded-2xl bg-paper border border-line overflow-hidden flex">
                    <button onClick={() => { setTripId(t.id); setStage("result"); setSidebar(false); }} className="flex-1 flex text-left min-w-0">
                      <Img src={t.photo} alt="" label="" className="w-20 h-full min-h-[84px] shrink-0" />
                      <span className="p-3 min-w-0"><span className="block text-[14px] font-medium truncate">{t.destination}</span><span className="block text-[12px] text-muted">{fmtDate(t.start)} to {fmtDate(t.end)}</span><span className="block text-[11.5px] text-gold-deep mt-1">Open itinerary</span></span>
                    </button>
                    <div className="flex flex-col border-l border-line">
                      <button onClick={() => setEdit(t)} aria-label={`Edit trip to ${t.destination}`} className="flex-1 px-3 hover:bg-cream/60"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setDel(t)} aria-label={`Delete trip to ${t.destination}`} className="flex-1 px-3 hover:bg-cream/60 border-t border-line"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </article>
                ))}
              </div>
              {hasDNA && (
                <p className="text-[12px] text-muted mt-3 flex flex-wrap items-center gap-1.5">Your Trip DNA:
                  {Object.entries(d.tripDNA.activities).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => <span key={k} className="bg-cream rounded-full px-2 py-0.5 text-ink">{k}</span>)}
                  <button onClick={() => { actions.resetTripDNA(); toast.info("Trip DNA cleared."); }} className="inline-flex items-center gap-1 underline ml-1"><RotateCcw className="w-3 h-3" />Reset</button>
                </p>
              )}
            </section>
          )}
        </div>

        <aside className="rounded-3xl bg-[#FDFCF7] text-[#1C1B19] border border-line p-4 md:p-6">
          <p className="t-h3 text-center">What makes a trip yours?</p>
          <p className="text-[12.5px] text-[#6E6A64] text-center mt-1 mb-3">Tap what you love and I&apos;ll tailor the suggestions.</p>
          <div className="max-w-[440px] mx-auto"><Collage selected={interests} onToggle={(k) => setInterests((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))} /></div>
        </aside>
      </div>
      {edit && <EditTrip trip={edit} onCancel={() => setEdit(null)} onSave={saveEdit} />}
      <ConfirmDialog open={!!del} danger title="Delete this trip?" body="The itinerary will be removed, along with its entry in your schedule." confirmLabel="Delete trip" onCancel={() => setDel(null)} onConfirm={() => removeTrip(del!)} />
    </Container>
  );
}

function EditTrip({ trip, onCancel, onSave }: { trip: Trip; onCancel: () => void; onSave: (t: Trip) => void }) {
  const [t, setT] = useState<Trip>(trip);
  const today = new Date().toISOString().slice(0, 10);
  const valid = t.start && t.end && t.end > t.start;
  const lengthChanged = daysBetween(t.start, t.end) !== daysBetween(trip.start, trip.end) || t.travellers !== trip.travellers || t.budget !== trip.budget || t.notes !== trip.notes;
  return (
    <Modal open onClose={onCancel} title={`Edit trip to ${trip.destination.split(",")[0]}`}>
      <div className="space-y-4">
        <div className="flex"><DateRangePicker label="Travel dates" startText="Departure" endText="Return" start={t.start} end={t.end} onChange={(a, b) => setT({ ...t, start: a, end: b })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-[12.5px] text-muted">Travellers<input type="number" min={1} max={30} className={inputCls + " mt-1"} value={t.travellers} onChange={(e) => setT({ ...t, travellers: Math.max(1, +e.target.value) })} /></label>
          <label className="text-[12.5px] text-muted">Budget ($)<input type="number" min={0} className={inputCls + " mt-1"} value={t.budget} onChange={(e) => setT({ ...t, budget: Math.max(0, +e.target.value) })} /></label>
        </div>
        <label className="block text-[12.5px] text-muted">Notes<input className={inputCls + " mt-1"} value={t.notes || ""} onChange={(e) => setT({ ...t, notes: e.target.value })} /></label>
        {valid && <p className="text-[12px] text-muted">{lengthChanged ? "Sebastian will re-plan the itinerary to fit these changes." : "Your days will simply move to the new dates."}{t.start < today && " The start date is in the past."}</p>}
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onCancel}>Cancel</Button><Button onClick={() => onSave(t)} disabled={!valid}>Save changes</Button></div>
      </div>
    </Modal>
  );
}

export default function TravelPage() { return <Suspense><TravelInner /></Suspense>; }
