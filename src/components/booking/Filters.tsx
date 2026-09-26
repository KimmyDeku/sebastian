"use client";
import { useState } from "react";
import { ArrowLeftRight, BedDouble, CalendarDays, MapPin, Minus, Plus, Users, Search } from "lucide-react";
import { inputCls } from "../ui/Chip";
import { Button } from "../ui/Button";
import { VoiceButton } from "../VoiceButton";
import { clamp } from "@/lib/util";

export type BookingType = "stays" | "flights" | "cars" | "attractions" | "taxis";
const today = () => new Date().toISOString().slice(0, 10);

function Box({ icon: I, label, children, wide }: { icon: any; label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`flex items-center gap-3 bg-paper rounded-2xl border border-line px-4 min-h-[60px] min-w-0 focus-within:border-gold ${wide ? "flex-[1.6]" : "flex-1"}`}>
      <I className="w-5 h-5 text-gold shrink-0" strokeWidth={1.5} aria-hidden />
      <span className="flex-1 min-w-0"><span className="block text-[11px] text-muted">{label}</span>{children}</span>
    </label>
  );
}
const bare = "w-full bg-transparent outline-none text-[14px] text-ink placeholder:text-muted-soft";

function Counter({ label, value, set, min = 0, max = 30 }: { label: string; value: number; set: (n: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={`Fewer ${label}`} onClick={() => set(clamp(value - 1, min, max))} disabled={value <= min} className="w-8 h-8 rounded-full border border-line inline-flex items-center justify-center disabled:opacity-30"><Minus className="w-3.5 h-3.5" /></button>
        <span className="w-6 text-center" aria-live="polite">{value}</span>
        <button type="button" aria-label={`More ${label}`} onClick={() => set(clamp(value + 1, min, max))} disabled={value >= max} className="w-8 h-8 rounded-full border border-line inline-flex items-center justify-center disabled:opacity-30"><Plus className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

export function validate(type: BookingType, f: any): string | null {
  const t = today();
  if (type === "stays") {
    if (!f.dest?.trim()) return "Where are you going?";
    if (!f.checkin || !f.checkout) return "Choose your check-in and check-out dates.";
    if (f.checkin < t) return "Check-in can't be in the past.";
    if (f.checkout <= f.checkin) return "Check-out must be after check-in.";
  }
  if (type === "flights") {
    if (!f.from?.trim() || !f.to?.trim()) return "Enter where you're flying from and to.";
    if (!f.depart) return "Choose a departure date.";
    if (f.depart < t) return "Departure can't be in the past.";
    if (f.trip === "round" && (!f.ret || f.ret < f.depart)) return "Return must be on or after departure.";
  }
  if (type === "cars") {
    if (!f.where?.trim()) return "Where will you pick up the car?";
    if (!f.pickup || !f.dropoff) return "Choose pick-up and drop-off times.";
    if (f.dropoff <= f.pickup) return "Drop-off must be after pick-up.";
  }
  if (type === "attractions" && (!f.where?.trim() || !f.date)) return "Enter a destination and date.";
  if (type === "taxis" && (!f.from?.trim() || !f.to?.trim() || !f.date || !f.time)) return "Enter pick-up, drop-off, date and time.";
  return null;
}

export function FilterBar({ type, f, set, onSearch, busy, onVoice }: { type: BookingType; f: any; set: (k: string, v: any) => void; onSearch: () => void; busy: boolean; onVoice: (t: string) => void }) {
  const [occ, setOcc] = useState(false);
  const t = today();
  const submit = (e: React.FormEvent) => { e.preventDefault(); onSearch(); };
  return (
    <form onSubmit={submit} className="rounded-3xl bg-gold/90 p-1.5 shadow-lift" aria-label={`${type} search`}>
      <div className="flex flex-col lg:flex-row gap-1.5">
        {type === "stays" && <>
          <Box icon={BedDouble} label="Enter destination"><input className={bare} value={f.dest || ""} onChange={(e) => set("dest", e.target.value)} placeholder="e.g. Victoria Falls" required /></Box>
          <Box wide icon={CalendarDays} label="Check-in — Check-out">
            <span className="flex items-center gap-2"><input type="date" aria-label="Check-in date" min={t} className={bare} value={f.checkin || ""} onChange={(e) => set("checkin", e.target.value)} /><span aria-hidden>—</span><input type="date" aria-label="Check-out date" min={f.checkin || t} className={bare} value={f.checkout || ""} onChange={(e) => set("checkout", e.target.value)} /></span>
          </Box>
          <div className="relative flex-1">
            <button type="button" onClick={() => setOcc(!occ)} aria-expanded={occ} className="w-full text-left flex items-center gap-3 bg-paper rounded-2xl border border-line px-4 min-h-[60px]">
              <Users className="w-5 h-5 text-gold" strokeWidth={1.5} aria-hidden />
              <span><span className="block text-[11px] text-muted">Select occupancy</span><span className="text-[14px]">{f.adults} adult{f.adults !== 1 && "s"} · {f.children} children · {f.rooms} room{f.rooms !== 1 && "s"}</span></span>
            </button>
            {occ && (
              <div className="absolute z-30 top-full mt-2 left-0 right-0 bg-paper border border-line rounded-2xl shadow-lift p-4">
                <Counter label="Adults" value={f.adults} set={(n) => set("adults", n)} min={1} />
                <Counter label="Children" value={f.children} set={(n) => set("children", n)} />
                <Counter label="Rooms" value={f.rooms} set={(n) => set("rooms", n)} min={1} />
                <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => setOcc(false)}>Done</Button>
              </div>
            )}
          </div>
        </>}
        {type === "flights" && <>
          <Box icon={MapPin} label="From"><input className={bare} value={f.from || ""} onChange={(e) => set("from", e.target.value)} placeholder="Harare (HRE)" /></Box>
          <button type="button" aria-label="Swap origin and destination" onClick={() => { const a = f.from; set("from", f.to); set("to", a); }} className="self-center w-10 h-10 rounded-full bg-paper border border-line inline-flex items-center justify-center shrink-0"><ArrowLeftRight className="w-4 h-4" /></button>
          <Box icon={MapPin} label="To"><input className={bare} value={f.to || ""} onChange={(e) => set("to", e.target.value)} placeholder="Where to?" /></Box>
          <Box wide icon={CalendarDays} label={f.trip === "round" ? "Departure — Return" : "Departure"}>
            <span className="flex items-center gap-2"><input type="date" aria-label="Departure" min={t} className={bare} value={f.depart || ""} onChange={(e) => set("depart", e.target.value)} />
              {f.trip === "round" && <><span aria-hidden>—</span><input type="date" aria-label="Return" min={f.depart || t} className={bare} value={f.ret || ""} onChange={(e) => set("ret", e.target.value)} /></>}</span>
          </Box>
          <Box icon={Users} label="Travellers & class">
            <span className="flex gap-2"><select aria-label="Adults" className={bare} value={f.adults} onChange={(e) => set("adults", +e.target.value)}>{Array.from({ length: 9 }, (_, i) => <option key={i} value={i + 1}>{i + 1} adult{i ? "s" : ""}</option>)}</select>
              <select aria-label="Cabin class" className={bare} value={f.cabin} onChange={(e) => set("cabin", e.target.value)}>{["Economy", "Premium_Economy", "Business", "First"].map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}</select></span>
          </Box>
        </>}
        {type === "cars" && <>
          <Box icon={MapPin} label="Pick-up location"><input className={bare} value={f.where || ""} onChange={(e) => set("where", e.target.value)} placeholder="City or airport" /></Box>
          <Box icon={CalendarDays} label="Pick-up"><input type="datetime-local" className={bare} value={f.pickup || ""} onChange={(e) => set("pickup", e.target.value)} /></Box>
          <Box icon={CalendarDays} label="Drop-off"><input type="datetime-local" className={bare} value={f.dropoff || ""} onChange={(e) => set("dropoff", e.target.value)} /></Box>
          <Box icon={Users} label="Driver's age"><input type="number" min={18} max={99} className={bare} value={f.age} onChange={(e) => set("age", +e.target.value)} /></Box>
        </>}
        {type === "attractions" && <>
          <Box icon={MapPin} label="Where are you going?"><input className={bare} value={f.where || ""} onChange={(e) => set("where", e.target.value)} placeholder="e.g. Cape Town" /></Box>
          <Box icon={CalendarDays} label="Date"><input type="date" min={t} className={bare} value={f.date || ""} onChange={(e) => set("date", e.target.value)} /></Box>
        </>}
        {type === "taxis" && <>
          <Box icon={MapPin} label="Pick-up"><input className={bare} value={f.from || ""} onChange={(e) => set("from", e.target.value)} placeholder="Airport, hotel or address" /></Box>
          <Box icon={MapPin} label="Drop-off"><input className={bare} value={f.to || ""} onChange={(e) => set("to", e.target.value)} placeholder="Destination" /></Box>
          <Box icon={CalendarDays} label="Date & time"><span className="flex gap-2"><input type="date" aria-label="Date" min={t} className={bare} value={f.date || ""} onChange={(e) => set("date", e.target.value)} /><input type="time" aria-label="Time" className={bare} value={f.time || ""} onChange={(e) => set("time", e.target.value)} /></span></Box>
          <Box icon={Users} label="Passengers"><input type="number" min={1} max={16} className={bare} value={f.passengers} onChange={(e) => set("passengers", +e.target.value)} /></Box>
        </>}
        <div className="flex gap-1.5">
          <span className="bg-paper rounded-2xl border border-line inline-flex items-center justify-center px-2"><VoiceButton onText={onVoice} /></span>
          <button type="submit" disabled={busy} className="flex-1 lg:flex-none min-h-[60px] px-8 rounded-2xl bg-ink text-white inline-flex items-center justify-center gap-2 text-[15px] disabled:opacity-60">
            <Search className="w-5 h-5" aria-hidden />{busy ? "Searching…" : "Search"}
          </button>
        </div>
      </div>
      {type === "stays" && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 px-3 pt-3 pb-1.5 text-[13px] text-white">
          <label className="inline-flex items-center gap-2"><input type="checkbox" className="w-4 h-4 accent-ink" checked={!!f.entireHome} onChange={(e) => set("entireHome", e.target.checked)} />I&apos;m looking for an entire home or apartment</label>
          <label className="inline-flex items-center gap-2"><input type="checkbox" className="w-4 h-4 accent-ink" checked={!!f.work} onChange={(e) => set("work", e.target.checked)} />I&apos;m travelling for work</label>
        </div>
      )}
      {type === "flights" && (
        <div className="flex gap-2 px-3 pt-3 pb-1.5" role="radiogroup" aria-label="Trip type">
          {[["round", "Round-trip"], ["oneway", "One-way"]].map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={f.trip === v} onClick={() => set("trip", v)} className={`h-8 px-4 rounded-pill text-[13px] ${f.trip === v ? "bg-white text-ink" : "text-white border border-white/50"}`}>{l}</button>
          ))}
        </div>
      )}
    </form>
  );
}
