"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Send, Sparkles, RotateCcw, Trash2, MapPin } from "lucide-react";
import { Container, PageHeader } from "@/components/ui/Page";
import { Option, inputCls } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { ErrorState, Notice } from "@/components/ui/States";
import { ConfirmDialog } from "@/components/ui/Modal";
import { SebastianMark } from "@/components/SebastianMark";
import { VoiceButton } from "@/components/VoiceButton";
import { StageTracker, TripResult } from "@/components/travel/Results";
import { downloadItineraryPDF } from "@/components/travel/pdf";
import { ACTIVITIES, DESTINATIONS } from "@/components/travel/destinations";
import { actions, useAccount, useData } from "@/lib/store";
import { formOfAddress } from "@/lib/address";
import { api } from "@/lib/api";
import { daysBetween, fmtDate, money, uid } from "@/lib/util";
import { toast } from "@/components/ui/Toast";

type Step = "destination" | "dates" | "travellers" | "budget" | "activities" | "pace" | "ready";
const ORDER: Step[] = ["destination", "dates", "travellers", "budget", "activities", "pace", "ready"];
const Q: Record<Step, string> = {
  destination: "Where would you like to go?", dates: "Which dates suit you?", travellers: "Who's travelling?", budget: "What's your budget for the trip, excluding flights?",
  activities: "What would you love to do there?", pace: "How would you like to pace it, and where will you fly from?", ready: "Splendid. Shall I prepare your itinerary?",
};
const addDays = (iso: string, n: number) => { const d = new Date(iso + "T00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

function Bubble({ who, children }: { who: "s" | "u"; children: React.ReactNode }) {
  return who === "u" ? <div className="flex justify-end"><div className="bg-ink text-white rounded-3xl rounded-br-lg px-5 py-2.5 text-sm max-w-[80%]">{children}</div></div>
    : <div className="flex gap-3"><SebastianMark size={32} /><div className="bg-paper border border-line rounded-3xl rounded-tl-lg px-5 py-3 text-[15px] max-w-[90%]">{children}</div></div>;
}

function TravelInner() {
  const sp = useSearchParams();
  const acc = useAccount();
  const d = useData();
  const who = formOfAddress(acc, d.prefs);
  const today = new Date().toISOString().slice(0, 10);
  const [t, setT] = useState({ destination: sp.get("destination") || "", start: sp.get("start") || "", end: sp.get("end") || "", travellers: 2, group: "Couple", budget: Number(sp.get("budget")) || 1000, activities: (sp.get("activities") || "").split(",").filter(Boolean), pace: "Balanced", origin: "", notes: "" });
  const [step, setStep] = useState<Step>("destination");
  const [freeText, setFreeText] = useState("");
  const [intro, setIntro] = useState<string>("");
  const [parsing, setParsing] = useState(false);
  const [gen, setGen] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [tripId, setTripId] = useState<string | null>(null);
  const [scheduled, setScheduled] = useState(false);
  const [del, setDel] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const set = (k: string, v: any) => setT((p) => ({ ...p, [k]: v }));

  const firstMissing = (x = t): Step => (!x.destination ? "destination" : !x.start || !x.end ? "dates" : "travellers");
  useEffect(() => { if (sp.get("destination")) { if (sp.get("days") && !t.start) setIntro(`Understood${who ? ", " + who : ""}. A ${sp.get("days")}-day trip to ${sp.get("destination")}. Which dates would you prefer?`); setStep(firstMissing()); } /* eslint-disable-next-line */ }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [step]);

  const idx = ORDER.indexOf(step);
  const next = () => setStep(ORDER[Math.min(idx + 1, ORDER.length - 1)]);
  const days = t.start && t.end ? daysBetween(t.start, t.end) + 0 : 0;

  const parse = async (text: string) => {
    if (!text.trim()) return;
    setParsing(true);
    const r = await api<any>("/api/travel/parse", { text, today, address: who });
    setParsing(false);
    if (!r.ok) { toast.error(r.error || "I couldn't read that. Let's go step by step."); return; }
    const nt = { ...t };
    if (r.destination) nt.destination = r.destination;
    if (r.start) nt.start = r.start;
    if (r.end) nt.end = r.end;
    if (r.start && !r.end && r.days) nt.end = addDays(r.start, r.days);
    if (r.budget) nt.budget = r.budget;
    if (r.travellers) nt.travellers = r.travellers;
    if (r.activities?.length) nt.activities = r.activities.filter((a: string) => ACTIVITIES.includes(a));
    setT(nt);
    setIntro(r.reply || "");
    setFreeText("");
    setStep(firstMissing(nt) === "travellers" ? (r.activities?.length && r.budget ? "pace" : "travellers") : firstMissing(nt));
  };

  const generate = async () => {
    setGen("busy"); setErr("");
    const topDNA = { destinations: Object.keys(d.tripDNA.destinations).slice(0, 5), activities: Object.entries(d.tripDNA.activities).sort((a, b) => b[1] - a[1]).slice(0, 5).map((x) => x[0]) };
    const r = await api<any>("/api/travel", { ...t, days: days || 3, dna: d.prefs.personalization ? topDNA : {} });
    if (r.ok) { setData(r); setGen("done"); setTripId(null); setScheduled(false); } else { setErr(r.error || "Planning failed."); setGen("error"); }
  };

  const saveTrip = () => {
    const id = tripId || uid("t_");
    actions.saveTrip({ id, destination: t.destination, start: t.start, end: t.end, budget: t.budget, travellers: t.travellers, activities: t.activities, itinerary: data.itinerary, createdAt: new Date().toISOString() });
    setTripId(id);
    toast.success(d.prefs.personalization ? "Trip saved and your Trip DNA updated." : "Trip saved. (Trip DNA is off in Settings.)");
    return id;
  };
  const toSchedule = () => {
    const id = tripId || saveTrip();
    actions.addEvent({ kind: "trip", title: `Trip to ${t.destination}`, start: new Date(t.start + "T09:00").toISOString(), end: new Date(t.end + "T18:00").toISOString(), remindMinutes: 1440, notes: `${days}-day itinerary by Sebastian. Budget ${money(t.budget)}.`, source: { type: "trip", ref: `trip:${id}` } });
    setScheduled(true);
    toast.success("Trip added to your Schedule, with a reminder the day before.");
  };

  const recs = useMemo(() => {
    const acts = d.tripDNA.activities;
    const visited = d.tripDNA.destinations;
    return DESTINATIONS.map((x) => ({ ...x, score: x.tags.reduce((s, tg) => s + (acts[tg] || 0), 0) - (visited[x.name] ? 2 : 0) })).sort((a, b) => b.score - a.score);
  }, [d.tripDNA]);
  const hasDNA = Object.keys(d.tripDNA.activities).length > 0 && d.prefs.personalization;
  const doneStages = gen === "done" ? 7 + (scheduled ? 1 : 0) : idx >= 1 ? 1 : 0;

  return (
    <Container>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Travel" }]} title="Where to next?" subtitle="Tell me in your own words, or let me guide you. I've been advising travellers for forty years." />
      <StageTracker done={doneStages} />

      <div className="grid lg:grid-cols-[1.35fr_1fr] gap-8 mt-6">
        <section className="rounded-[28px] bg-canvas border border-line p-5 md:p-7 space-y-5" aria-label="Trip planner conversation">
          <Bubble who="s">{who ? `${who}, t` : "T"}ell me about the trip you have in mind — for example, &ldquo;Five days in Cape Town in December, I love food and beaches, budget $1,000.&rdquo;</Bubble>
          <div className="flex gap-2">
            <label htmlFor="trip-free" className="sr-only">Describe your trip</label>
            <input id="trip-free" className={inputCls} placeholder="Describe your trip…" value={freeText} onChange={(e) => setFreeText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && parse(freeText)} />
            <VoiceButton onText={(x) => { setFreeText(x); parse(x); }} size={48} />
            <Button onClick={() => parse(freeText)} loading={parsing} disabled={!freeText.trim()} aria-label="Send"><Send className="w-4 h-4" /></Button>
          </div>
          {intro && <Bubble who="s">{intro}</Bubble>}

          {ORDER.slice(0, idx).filter((s) => s !== "ready").map((s) => (
            <div key={s} className="space-y-3">
              <Bubble who="s">{Q[s]}</Bubble>
              <Bubble who="u">
                <button onClick={() => setStep(s)} className="text-left" aria-label={`Change ${s}`}>
                  {s === "destination" && t.destination}{s === "dates" && `${fmtDate(t.start)} → ${fmtDate(t.end)} (${days} days)`}
                  {s === "travellers" && `${t.group}, ${t.travellers} ${t.travellers === 1 ? "person" : "people"}`}{s === "budget" && money(t.budget)}
                  {s === "activities" && (t.activities.join(", ") || "Open to anything")}{s === "pace" && `${t.pace}${t.origin ? `, from ${t.origin}` : ""}`}
                  <span className="block text-[11px] text-white/60 mt-0.5">Tap to change</span>
                </button>
              </Bubble>
            </div>
          ))}

          <div className="space-y-3" ref={endRef}>
            <Bubble who="s">{Q[step]}</Bubble>
            <div className="bg-paper rounded-3xl border border-line p-5 ml-0 md:ml-11">
              {step === "destination" && (<>
                <input autoFocus className={inputCls} placeholder="City, region or country" value={t.destination} onChange={(e) => set("destination", e.target.value)} onKeyDown={(e) => e.key === "Enter" && t.destination.trim() && next()} aria-label="Destination" />
                <div className="flex flex-wrap gap-2 mt-3">{recs.slice(0, 5).map((x) => <Option key={x.name} variant="chip" selected={t.destination === x.name} onClick={() => set("destination", x.name)}>{x.name.split(",")[0]}</Option>)}</div>
                <Button className="mt-4" onClick={next} disabled={!t.destination.trim()}>Continue</Button>
              </>)}
              {step === "dates" && (<>
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="text-xs text-muted">Depart<input type="date" min={today} className={inputCls + " mt-1"} value={t.start} onChange={(e) => set("start", e.target.value)} /></label>
                  <label className="text-xs text-muted">Return<input type="date" min={t.start || today} className={inputCls + " mt-1"} value={t.end} onChange={(e) => set("end", e.target.value)} /></label>
                </div>
                {t.start && t.end && t.end <= t.start && <p className="text-xs text-danger mt-2">Return must be after departure.</p>}
                {days > 14 && <p className="text-xs text-warning mt-2">I&apos;ll plan the first 14 days in detail.</p>}
                <Button className="mt-4" onClick={next} disabled={!t.start || !t.end || t.end <= t.start || t.start < today}>Continue</Button>
              </>)}
              {step === "travellers" && (<>
                <div role="radiogroup" className="grid grid-cols-2 gap-2">
                  {[["Solo", 1], ["Couple", 2], ["Family", 4], ["Friends", 4]].map(([g, n]) => <Option key={g as string} variant="row" selected={t.group === g} onClick={() => { set("group", g); set("travellers", n); }}>{g}</Option>)}
                </div>
                {(t.group === "Family" || t.group === "Friends") && <label className="block text-xs text-muted mt-3">How many people?<input type="number" min={2} max={30} className={inputCls + " mt-1"} value={t.travellers} onChange={(e) => set("travellers", Math.max(2, +e.target.value))} /></label>}
                <Button className="mt-4" onClick={next}>Continue</Button>
              </>)}
              {step === "budget" && (<>
                <p className="font-serif text-3xl text-center">{money(t.budget)}</p>
                <input type="range" className="range w-full mt-4" min={200} max={20000} step={100} value={t.budget} onChange={(e) => set("budget", +e.target.value)} aria-label="Budget" />
                <div className="flex justify-between text-xs text-muted mt-1"><span>$200</span><span>$20,000</span></div>
                <label className="block text-xs text-muted mt-3">Or type an amount<input type="number" min={0} className={inputCls + " mt-1"} value={t.budget} onChange={(e) => set("budget", Math.max(0, +e.target.value))} /></label>
                <Button className="mt-4" onClick={next}>Continue</Button>
              </>)}
              {step === "activities" && (<>
                <div className="flex flex-wrap gap-2">{ACTIVITIES.map((a) => <Option key={a} variant="chip" role="checkbox" selected={t.activities.includes(a)} onClick={() => set("activities", t.activities.includes(a) ? t.activities.filter((x) => x !== a) : [...t.activities, a])}>{a}</Option>)}</div>
                <input className={inputCls + " mt-4"} placeholder="Anything specific? e.g. a cooking class, no early starts" value={t.notes} onChange={(e) => set("notes", e.target.value)} aria-label="Extra notes" />
                <Button className="mt-4" onClick={next}>Continue</Button>
              </>)}
              {step === "pace" && (<>
                <div role="radiogroup" className="grid grid-cols-3 gap-2">{["Relaxed", "Balanced", "Packed"].map((p) => <Option key={p} variant="row" selected={t.pace === p} onClick={() => set("pace", p)}>{p}</Option>)}</div>
                <label className="block text-xs text-muted mt-4">Flying from (optional)<input className={inputCls + " mt-1"} placeholder="e.g. Harare (HRE)" value={t.origin} onChange={(e) => set("origin", e.target.value)} /></label>
                <Button className="mt-4" onClick={next}>Continue</Button>
              </>)}
              {step === "ready" && (<>
                <dl className="text-sm grid grid-cols-2 gap-y-2">
                  <dt className="text-muted">Destination</dt><dd>{t.destination}</dd><dt className="text-muted">Dates</dt><dd>{fmtDate(t.start)} → {fmtDate(t.end)}</dd>
                  <dt className="text-muted">Travellers</dt><dd>{t.travellers}</dd><dt className="text-muted">Budget</dt><dd>{money(t.budget)}</dd>
                  <dt className="text-muted">Interests</dt><dd>{t.activities.join(", ") || "Anything"}</dd>
                </dl>
                <Button className="mt-5 w-full" onClick={generate} loading={gen === "busy"}><Sparkles className="w-4 h-4" />Prepare my itinerary</Button>
              </>)}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[28px] bg-paper border border-line p-6">
            <h2 className="t-h3">{hasDNA ? "Recommended for you" : "Destinations to consider"}</h2>
            <p className="text-xs text-muted mt-1">{hasDNA ? "Based on your Trip DNA." : "Save a trip and I'll start tailoring these."}</p>
            <ul className="mt-4 divide-y divide-line">
              {recs.slice(0, 6).map((x) => (
                <li key={x.name}><button onClick={() => { set("destination", x.name); setStep(t.start ? "travellers" : "dates"); }} className="w-full text-left py-3 flex gap-3 hover:bg-cream/40 rounded-xl px-2">
                  <MapPin className="w-4 h-4 text-gold mt-1 shrink-0" aria-hidden /><span><span className="block text-sm">{x.name}</span><span className="block text-xs text-muted">{x.note}</span></span>
                </button></li>
              ))}
            </ul>
          </div>
          <div className="rounded-[28px] bg-paper border border-line p-6">
            <div className="flex items-center justify-between"><h2 className="t-h3">Trip DNA</h2>{hasDNA && <button onClick={() => { actions.resetTripDNA(); toast.info("Trip DNA reset."); }} className="text-xs text-muted hover:text-ink inline-flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" />Reset</button>}</div>
            {!d.prefs.personalization ? <p className="text-sm text-muted mt-2">Personalisation is turned off in Settings.</p>
              : !hasDNA ? <p className="text-sm text-muted mt-2">Nothing learned yet.</p>
              : <div className="mt-3 flex flex-wrap gap-2">{Object.entries(d.tripDNA.activities).sort((a, b) => b[1] - a[1]).map(([k, v]) => <span key={k} className="text-xs bg-cream rounded-full px-3 py-1">{k} · {v}</span>)}</div>}
          </div>
          {d.trips.length > 0 && (
            <div className="rounded-[28px] bg-paper border border-line p-6">
              <h2 className="t-h3">Saved trips</h2>
              <ul className="mt-3 divide-y divide-line">
                {d.trips.map((tr) => (
                  <li key={tr.id} className="py-3 flex items-center gap-3">
                    <button className="flex-1 text-left" onClick={() => { setT((p) => ({ ...p, destination: tr.destination, start: tr.start, end: tr.end, budget: tr.budget, travellers: tr.travellers, activities: tr.activities })); setData({ itinerary: tr.itinerary }); setTripId(tr.id); setGen("done"); setStep("ready"); }}>
                      <span className="block text-sm">{tr.destination}</span><span className="block text-xs text-muted">{fmtDate(tr.start)} → {fmtDate(tr.end)}</span>
                    </button>
                    <button onClick={() => setDel(tr.id)} aria-label={`Delete trip to ${tr.destination}`} className="w-8 h-8 rounded-full hover:bg-cream inline-flex items-center justify-center text-muted"><Trash2 className="w-4 h-4" /></button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      <section className="mt-14" aria-live="polite">
        {gen === "busy" && <div className="rounded-3xl bg-paper border border-line p-10 text-center"><SebastianMark size={52} state="thinking" /><p className="t-h3 mt-4">Consulting maps, weather and my notes…</p></div>}
        {gen === "error" && <ErrorState title="I couldn't prepare the itinerary" body={err} onRetry={generate} />}
        {gen === "done" && data?.itinerary && (
          <>
            <h2 className="t-h1 mb-6">{days}-day plan for {t.destination}</h2>
            <Notice className="mb-8">Opening hours, prices and weather change. Please verify details before you book or travel.</Notice>
            <TripResult data={data} trip={{ ...t }} saved={!!tripId} scheduled={scheduled} onSave={saveTrip} onSchedule={toSchedule}
              onPdf={() => downloadItineraryPDF({ destination: t.destination, start: t.start, end: t.end, budget: t.budget, travellers: t.travellers, address: who }, data.itinerary, data.weather).then(() => toast.success("Itinerary PDF downloaded.")).catch(() => toast.error("The PDF couldn't be created."))} />
          </>
        )}
      </section>
      <ConfirmDialog open={!!del} danger title="Delete this trip?" body="The saved itinerary will be removed. Any schedule entry for it stays until you remove it." confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={() => { actions.deleteTrip(del!); setDel(null); toast.info("Trip deleted."); }} />
    </Container>
  );
}
export default function TravelPage() { return <Suspense><TravelInner /></Suspense>; }
