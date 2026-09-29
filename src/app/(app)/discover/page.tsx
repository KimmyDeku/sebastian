"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Siren, Flame, ShieldAlert, Ambulance, Phone, Heart, Navigation, LocateFixed, Search, MapPin } from "lucide-react";
import { Container, PageHeader } from "@/components/ui/Page";
import { Option, inputCls } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { ErrorState, Notice, EmptyState, Skeleton } from "@/components/ui/States";
import { Img } from "@/components/ui/Img";
import { VoiceButton } from "@/components/VoiceButton";
import { SwipeDeck, PlaceBody } from "@/components/discover/SwipeDeck";
import { EMERGENCY } from "@/components/discover/emergency";
import { GoogleMap } from "@/components/GoogleMap";
import { actions, useData } from "@/lib/store";
import { api } from "@/lib/api";
import { IMG } from "@/lib/images";
import { cx } from "@/lib/util";
import { toast } from "@/components/ui/Toast";

const CATS = ["Pharmacy", "Restaurant", "Cafe", "Recreation", "Mechanic", "Mall", "Cinema", "Hotel", "Hospital", "Dermatologist", "Other"];
const IMG_FOR: Record<string, string> = { Restaurant: IMG.discover, Cafe: IMG.cafe, Hotel: IMG.booking, Mall: IMG.fashionRack, Recreation: IMG.travel };
type Phase = "pick" | "emergency" | "locating" | "loading" | "results" | "error" | "denied";
type Svc = "police" | "ambulance" | "fire" | "general";

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => { const q = window.matchMedia("(max-width: 767px)"); const f = () => setM(q.matches); f(); q.addEventListener("change", f); return () => q.removeEventListener("change", f); }, []);
  return m;
}

function DiscoverInner() {
  const sp = useSearchParams();
  const d = useData();
  const mobile = useIsMobile();
  const initialCat = sp.get("category");
  const [cat, setCat] = useState(initialCat && initialCat !== "Emergency" ? (CATS.includes(initialCat) ? initialCat : "Other") : "");
  const [other, setOther] = useState(initialCat && !CATS.includes(initialCat) && initialCat !== "Emergency" ? initialCat : sp.get("q") || "");
  const [mode, setMode] = useState<"near" | "elsewhere">(sp.get("where") ? "elsewhere" : "near");
  const [where, setWhere] = useState(sp.get("where") || "");
  const [phase, setPhase] = useState<Phase>(initialCat === "Emergency" ? "emergency" : "pick");
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState("");
  const [go, setGo] = useState<any>(null);
  const [call, setCall] = useState<Svc | null>(null);
  const country = EMERGENCY[d.prefs.emergencyCountry] || EMERGENCY.ZW;
  const favs = new Set(d.places.map((p) => p.id));
  const label = cat === "Other" ? other : cat;

  const run = async (coords?: { lat: number; lng: number }, overrideCat?: string) => {
    setPhase("loading"); setErr("");
    const category = overrideCat || label;
    const r = await api<any>("/api/places", { category: category.toLowerCase(), text: category, ...(coords || {}), where: mode === "elsewhere" ? where : undefined });
    if (r.ok) { setRes(r); setPhase("results"); } else { setErr(r.error || "Search failed."); setPhase(r.code === "empty" ? "results" : "error"); if (r.code === "empty") setRes({ results: [], where: r.where, provider: r.provider }); }
  };

  const search = (overrideCat?: string) => {
    if (mode === "elsewhere") { if (!where.trim()) { toast.error("Enter a place to search around."); return; } run(undefined, overrideCat); return; }
    if (!("geolocation" in navigator)) { setPhase("denied"); return; }
    setPhase("locating");
    navigator.geolocation.getCurrentPosition(
      (p) => run({ lat: p.coords.latitude, lng: p.coords.longitude }, overrideCat),
      (e) => setPhase(e.code === 1 ? "denied" : "error"),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
    setErr("I couldn't determine your location. Try again or search another location.");
  };

  const fav = (p: any) => {
    actions.togglePlace({ id: p.id, name: p.name, address: p.address, lat: p.lat, lng: p.lng, category: label || p.category, photo: p.photo, phone: p.phone, mapsUrl: p.mapsUrl, rating: p.rating });
    toast.success(favs.has(p.id) ? "Removed from your choices." : "Saved. It'll appear as “Your choice” next time.");
  };

  const results: any[] = res?.results || [];
  const savedHere = d.places.filter((p) => p.category.toLowerCase() === (label || "").toLowerCase() && !results.some((r) => r.id === p.id));
  const ordered = [...savedHere, ...results.filter((r) => favs.has(r.id)), ...results.filter((r) => !favs.has(r.id))];

  const onVoice = (t: string) => {
    const s = t.toLowerCase();
    const svc: Svc | null = /police/.test(s) ? "police" : /ambulance|medical|hurt|injur/.test(s) ? "ambulance" : /fire/.test(s) ? "fire" : /emergency|help/.test(s) ? "general" : null;
    if (svc) { setPhase("emergency"); setCall(svc); return; }
    const c = CATS.find((x) => s.includes(x.toLowerCase()));
    if (c) setCat(c); else { setCat("Other"); setOther(t); }
  };

  const crumbs = [{ label: "Home", href: "/" }, { label: "Discover", onClick: () => setPhase("pick") }, ...(phase === "emergency" ? [{ label: "Emergency" }] : phase === "results" ? [{ label: label || "Results" }] : [])];

  return (
    <Container>
      <PageHeader crumbs={crumbs} title={phase === "emergency" ? "Emergency help" : phase === "results" ? `${label} near ${res?.where || "you"}` : "What are you looking for?"}
        subtitle={phase === "emergency" ? `Numbers for ${country.name}. Change the country in Settings.` : "Search near you or anywhere else. Heart the places you prefer."}
        onBack={phase !== "pick" ? () => setPhase("pick") : undefined} right={<VoiceButton onText={onVoice} />} />

      {phase === "pick" && (
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8">
          <section className="bg-paper rounded-3xl border border-line shadow-soft p-6 md:p-8">
            <button onClick={() => setPhase("emergency")} className="w-full mb-6 flex items-center gap-4 rounded-2xl border border-danger/30 bg-[#FBF3F1] px-5 h-16 text-left hover:border-danger/60">
              <Siren className="w-6 h-6 text-danger" aria-hidden /><span className="flex-1"><span className="block font-medium text-sm">Emergency services</span><span className="block text-xs text-muted">Police, ambulance, fire, with a Call now option</span></span>
            </button>
            <div role="radiogroup" aria-label="Category" className="grid sm:grid-cols-2 gap-3">{CATS.map((c) => <Option key={c} selected={cat === c} onClick={() => setCat(c)}>{c}</Option>)}</div>
            {cat === "Other" && <input className={inputCls + " mt-4"} placeholder="e.g. tailor, vet, car wash" value={other} onChange={(e) => setOther(e.target.value)} aria-label="Specify service" autoFocus />}
            <div className="mt-6 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Where">
              <Option variant="row" selected={mode === "near"} onClick={() => setMode("near")} icon={<LocateFixed className="w-4 h-4" />}>Near me</Option>
              <Option variant="row" selected={mode === "elsewhere"} onClick={() => setMode("elsewhere")} icon={<MapPin className="w-4 h-4" />}>Another location</Option>
            </div>
            {mode === "elsewhere" && <input className={inputCls + " mt-3"} placeholder="City, suburb or address" value={where} onChange={(e) => setWhere(e.target.value)} aria-label="Search location" />}
            {mode === "near" && <p className="text-xs text-muted mt-3">I&apos;ll ask your browser for your location, used only for this search.</p>}
            <Button className="mt-6" onClick={() => search()} disabled={!label.trim()}><Search className="w-4 h-4" />Search {mode === "near" ? "nearby" : ""}</Button>
          </section>
          <aside className="bg-paper rounded-3xl border border-line p-6">
            <h2 className="t-h3">Your choices</h2>
            {d.places.length === 0 ? <p className="text-sm text-muted mt-2">Places you heart appear here for quick access.</p> : (
              <ul className="mt-3 divide-y divide-line">
                {d.places.map((p) => (
                  <li key={p.id} className="py-3 flex items-center gap-3">
                    <span className="flex-1 min-w-0"><span className="block text-sm truncate">{p.name}</span><span className="block text-xs text-muted">{p.category}</span></span>
                    <Button size="sm" variant="outline" onClick={() => setGo(p)}><Navigation className="w-3.5 h-3.5" />Go</Button>
                    <button onClick={() => fav(p)} aria-label={`Remove ${p.name}`}><Heart className="w-4 h-4 fill-gold text-gold" /></button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}

      {phase === "emergency" && (
        <div className="space-y-6">
          <Notice tone="warning">If someone is in immediate danger, call now. Sebastian opens your phone&apos;s dialler with the number; your device places the call.</Notice>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {([["police", "Police", ShieldAlert], ["ambulance", "Ambulance", Ambulance], ["fire", "Fire Department", Flame], ["general", "Other emergency", Siren]] as [Svc, string, any][]).map(([k, l, I]) => (
              <div key={k} className="rounded-3xl bg-paper border border-line p-6">
                <I className="w-7 h-7 text-danger" strokeWidth={1.5} aria-hidden />
                <p className="font-serif text-xl mt-3">{l}</p>
                <p className="text-3xl font-serif mt-1">{country[k]}</p>
                <Button variant="danger" className="w-full mt-4" onClick={() => setCall(k)}><Phone className="w-4 h-4" />Call now</Button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted self-center mr-1">Find the nearest:</span>
            {[["police", "Police station"], ["hospital", "Hospital"], ["fire", "Fire station"], ["pharmacy", "Pharmacy"]].map(([k, l]) => (
              <Button key={k} size="sm" variant="outline" onClick={() => { setCat(k === "police" || k === "fire" ? "Other" : k[0].toUpperCase() + k.slice(1)); setOther(k); setMode("near"); search(k); }}>{l}</Button>
            ))}
          </div>
        </div>
      )}

      {phase === "locating" && <div className="bg-paper rounded-3xl border border-line p-8"><p className="t-h2">Finding your location…</p><p className="text-sm text-muted mt-2">One moment while I look. Please allow location access if your browser asks.</p></div>}
      {phase === "loading" && <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-72" />)}</div>}
      {phase === "denied" && (
        <div className="rounded-3xl border border-[#DCD3F6] bg-[#F4F1FC] p-8">
          <p className="t-h3">Location permission needed</p>
          <p className="text-sm text-muted mt-2">To search near you, allow location for this site in your browser settings. Or search around a place instead.</p>
          <div className="flex gap-2 mt-5"><Button onClick={() => search()}>Try again</Button><Button variant="outline" onClick={() => { setMode("elsewhere"); setPhase("pick"); }}>Search another location</Button></div>
        </div>
      )}
      {phase === "error" && <ErrorState body={err} onRetry={() => search()} />}

      {phase === "results" && (
        <>
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs text-muted">Results from {res?.provider}. Hours and details can change; check before you go.</p>
            <Button size="sm" variant="outline" onClick={() => setPhase("pick")}>New search</Button>
          </div>
          {ordered.some((p) => p.lat != null) && (
            <GoogleMap className="h-[260px] md:h-[320px] rounded-3xl border border-line mb-5" fit labels={!mobile}
              pins={ordered.filter((p) => p.lat != null).map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng }))}
              center={res?.center || null} zoom={13} onPick={(pin) => { const hit = ordered.find((x) => x.id === pin.id); if (hit) setGo(hit); }} />
          )}
          {ordered.length === 0 ? <EmptyState title="Nothing found" body={err || "Try a wider area or another category."} action={<Button onClick={() => setPhase("pick")}>Change search</Button>} />
            : mobile ? <SwipeDeck items={ordered} favs={favs} onFav={fav} onGo={setGo} fallbackImg={IMG_FOR[label] || IMG.cafe} />
            : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {ordered.map((p) => (
                  <article key={p.id} className="bg-paper rounded-3xl border border-line overflow-hidden flex flex-col">
                    <div className="relative">
                      <Img src={p.photo} fallback={IMG_FOR[label] || IMG.cafe} alt={p.name} label="" className="w-full h-44" />
                      <button onClick={() => fav(p)} aria-pressed={favs.has(p.id)} aria-label={favs.has(p.id) ? "Remove from your choices" : "Save as your choice"} className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/95 shadow-soft inline-flex items-center justify-center"><Heart className={cx("w-5 h-5 text-gold", favs.has(p.id) && "fill-gold")} /></button>
                    </div>
                    <PlaceBody p={p} fav={favs.has(p.id)} />
                    <div className="px-5 pb-5 mt-auto"><Button size="sm" variant="outline" onClick={() => setGo(p)}><Navigation className="w-3.5 h-3.5" />Directions</Button></div>
                  </article>
                ))}
              </div>
            )}
        </>
      )}

      <ConfirmDialog open={!!go} title="Open Google Maps?" rows={go ? [["Place", go.name], ["Address", go.address || "—"]] : []} body="You'll leave Sebastian for Google Maps to see the route." confirmLabel="Open directions"
        onCancel={() => setGo(null)} onConfirm={() => { window.open(go.mapsUrl, "_blank", "noopener"); setGo(null); }} />
      <ConfirmDialog open={!!call} danger title={`Call ${call === "general" ? "emergency services" : call} now?`} rows={call ? [["Service", call], ["Number", country[call]], ["Country", country.name]] : []}
        body="This opens your phone's dialler with the number ready. On a computer, your device may ask which app to use." confirmLabel={call ? `Call ${country[call]}` : "Call"}
        onCancel={() => setCall(null)} onConfirm={() => { window.location.href = `tel:${country[call!]}`; setCall(null); }} />
    </Container>
  );
}
export default function DiscoverPage() { return <Suspense><DiscoverInner /></Suspense>; }
