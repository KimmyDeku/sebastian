"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Sparkles, Copy, Check, ExternalLink, CalendarCheck, ShieldCheck } from "lucide-react";
import { Autopilot, type AutoField } from "./Autopilot";
import { Img } from "../ui/Img";
import { Button } from "../ui/Button";
import { Field, inputCls, textareaCls, Option } from "../ui/Chip";
import { ConfirmDialog } from "../ui/Modal";
import { Notice } from "../ui/States";
import { actions, useAccount } from "@/lib/store";
import { googleCalendarUrl } from "@/lib/calendar";
import { fmtDate, cx } from "@/lib/util";
import { toast } from "../ui/Toast";
import type { ScheduleEvent } from "@/lib/types";

const COUNTRY_BY_TZ: Record<string, string> = {
  "Africa/Harare": "Zimbabwe", "Africa/Johannesburg": "South Africa", "Africa/Lusaka": "Zambia", "Africa/Gaborone": "Botswana", "Africa/Maputo": "Mozambique",
  "Africa/Nairobi": "Kenya", "Africa/Lagos": "Nigeria", "Africa/Accra": "Ghana", "Africa/Dar_es_Salaam": "Tanzania", "Africa/Kampala": "Uganda",
  "Europe/London": "United Kingdom", "Europe/Paris": "France", "Europe/Berlin": "Germany", "Europe/Lisbon": "Portugal", "America/New_York": "United States",
  "America/Chicago": "United States", "America/Los_Angeles": "United States", "America/Toronto": "Canada", "Asia/Dubai": "United Arab Emirates", "Asia/Tokyo": "Japan", "Asia/Shanghai": "China", "Australia/Sydney": "Australia",
};
const ARRIVAL = ["I don't know", "00:00–01:00", "06:00–07:00", "08:00–09:00", "10:00–11:00", "12:00–13:00", "14:00–15:00", "16:00–17:00", "18:00–19:00", "20:00–21:00", "22:00–23:00"];
const PROVIDER_NAME: Record<string, string> = { stays: "Booking.com", flights: "Booking.com Flights", cars: "Booking.com Cars", attractions: "Booking.com Attractions", taxis: "Booking.com Taxis", bus: "Busbud" };

/** Fields each booking needs. Personal ones are filled from Settings; Autopilot asks for the rest. */
function fieldsFor(type: string): (AutoField & { kind?: "text" | "email" | "tel" | "date" | "select" | "textarea" | "choice" })[] {
  const person: any[] = [
    { key: "firstName", label: "First name", ask: "What's the first name for the booking?", required: true },
    { key: "lastName", label: "Last name", ask: "And the last name?", required: true },
    { key: "email", label: "Email", ask: "Which email should the confirmation go to?", required: true, kind: "email" },
    { key: "phone", label: "Phone", ask: "What phone number should the provider use?", required: true, kind: "tel" },
    { key: "country", label: "Country or region", ask: "Which country do you live in?", required: true },
  ];
  const requests = { key: "requests", label: "Special requests", ask: "Any special requests, such as a quiet room or dietary needs? You can say none.", hint: "free text, or none", kind: "textarea" };
  switch (type) {
    case "stays": return [...person,
      { key: "bookingFor", label: "Booking for", ask: "Is this booking for you, or for someone else?", required: true, options: ["Me", "Someone else"], kind: "choice" },
      { key: "guestName", label: "Guest's full name", ask: "What is the main guest's full name?", required: false },
      { key: "work", label: "Travelling for work", ask: "Are you travelling for work?", required: true, options: ["Yes", "No"], kind: "choice" },
      { key: "arrival", label: "Arrival time", ask: "Roughly what time will you arrive?", options: ARRIVAL, kind: "select" }, requests];
    case "flights": return [...person,
      { key: "dob", label: "Date of birth", ask: "What is the passenger's date of birth?", required: true, hint: "YYYY-MM-DD", kind: "date" },
      { key: "gender", label: "Gender (as on passport)", ask: "What gender is shown on the passport?", required: true, options: ["Male", "Female"], kind: "choice" },
      { key: "nationality", label: "Nationality", ask: "What is the passenger's nationality?", required: true },
      { key: "assistance", label: "Special assistance", ask: "Does anyone need special assistance, such as a wheelchair? You can say none.", hint: "free text, or none", kind: "textarea" }];
    case "cars": return [...person,
      { key: "flight", label: "Flight number (optional)", ask: "If you're collecting the car at an airport, what's your flight number? You can say skip." }, requests];
    case "taxis": return [...person,
      { key: "flight", label: "Flight number", ask: "What's your flight number, so the driver can track it?" },
      { key: "luggage", label: "Pieces of luggage", ask: "How many pieces of luggage will you have?", hint: "number" }, requests];
    default: return [...person, requests];
  }
}

function prefill(acc: any, type: string) {
  const v: Record<string, any> = {
    firstName: acc?.firstName || "", lastName: acc?.surname || "", email: acc?.email || "", phone: acc?.phone || "",
    country: COUNTRY_BY_TZ[acc?.timezone] || "",
  };
  if (type === "flights") { v.dob = acc?.dob || ""; v.gender = acc?.gender === "male" ? "Male" : acc?.gender === "female" ? "Female" : ""; v.nationality = v.country; }
  if (type === "stays") v.bookingFor = "Me";
  return v;
}

export function GuestForm({ type, item, search, summary, onBack }: { type: string; item: any; search: any; summary: [string, string][]; onBack: () => void }) {
  const acc = useAccount();
  const fields = useMemo(() => fieldsFor(type), [type]);
  const [v, setV] = useState<Record<string, any>>({});
  const [autopilot, setAutopilot] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [stage, setStage] = useState<"form" | "handoff" | "done">("form");
  const [ref, setRef] = useState("");
  const [copied, setCopied] = useState(false);
  const [event, setEvent] = useState<ScheduleEvent | null>(null);
  useEffect(() => { setV(prefill(acc, type)); }, [acc, type]);
  const set = (k: string, val: any) => setV((p) => ({ ...p, [k]: val }));

  const visible = fields.filter((f) => !(f.key === "guestName" && v.bookingFor !== "Someone else"));
  const missing = visible.filter((f) => (f.required || (f.key === "guestName" && v.bookingFor === "Someone else")) && !String(v[f.key] ?? "").trim());
  const emailOk = !v.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email);
  const provider = PROVIDER_NAME[type] || "the provider";
  const detailsText = visible.filter((f) => v[f.key] && !/^none$/i.test(String(v[f.key]))).map((f) => `${f.label}: ${v[f.key]}`).join("\n");

  const copy = async () => {
    try { await navigator.clipboard.writeText(detailsText); } catch {
      const ta = document.createElement("textarea"); ta.value = detailsText; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };

  const startEnd = () => {
    const s = type === "stays" ? search.checkin : type === "flights" ? search.depart : type === "cars" ? search.pickup : search.date + (search.time ? `T${search.time}` : "");
    const e = type === "stays" ? search.checkout : type === "flights" && search.trip === "round" ? search.ret : type === "cars" ? search.dropoff : "";
    const toIso = (x: string, h = "12:00") => (x ? new Date(x.length === 10 ? `${x}T${h}` : x).toISOString() : undefined);
    return { start: toIso(s, type === "stays" ? "14:00" : "09:00")!, end: toIso(e, type === "stays" ? "10:00" : "18:00") };
  };

  const booked = () => {
    const { start, end } = startEnd();
    const label = { stays: "Stay", flights: "Flight", cars: "Car rental", attractions: "Attraction", taxis: "Airport taxi", bus: "Transport" }[type] || "Booking";
    const ev = { kind: "booking" as const, title: `${label}: ${item.name}`, start, end, remindMinutes: 1440,
      notes: `Booked with ${provider}.${ref ? ` Confirmation: ${ref}.` : ""} ${summary.map(([k, x]) => `${k}: ${x}`).join(" · ")}`,
      source: { type: "booking" as const, ref: `booked:${type}:${item.id}:${start}`, provider } };
    const id = actions.addEvent(ev);
    const full = { ...ev, id, createdAt: new Date().toISOString() } as ScheduleEvent;
    setEvent(full);
    window.open(googleCalendarUrl(full), "_blank", "noopener");
    actions.updateEvent(id, { gcalOpened: true });
    setStage("done");
    toast.success("Added to your Sebastian schedule, with a reminder the day before. Google Calendar is open. Press Save there to sync it.");
  };

  return (
    <div className="mt-2">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink mb-4"><ChevronLeft className="w-4 h-4" />Back to results</button>
      <ol className="flex items-center gap-2 text-[12px] mb-6" aria-label="Booking progress">
        {["Your selection", "Your details", "Confirm and pay"].map((s, i) => {
          const stepNow = stage === "form" ? 1 : 2;
          return <li key={s} className="flex items-center gap-2"><span className={cx("w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px]", i <= stepNow ? "bg-ink text-white" : "border border-line text-muted")}>{i < stepNow ? <Check className="w-3.5 h-3.5" /> : i + 1}</span><span className={i === stepNow ? "font-medium" : "text-muted"}>{s}</span>{i < 2 && <span className="w-8 h-px bg-line" aria-hidden />}</li>;
        })}
      </ol>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6 items-start">
        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="rounded-2xl bg-paper border border-line overflow-hidden">
            <Img src={item.photo} alt={item.name} label="Photo unavailable" className="w-full h-40" />
            <div className="p-4">
              <p className="text-[11px] text-muted">{item.kind}</p>
              <h2 className="font-medium text-[15px]">{item.name}</h2>
              {item.area && <p className="text-[12px] text-muted mt-1">{item.area}</p>}
            </div>
          </div>
          <div className="rounded-2xl bg-paper border border-line p-4">
            <p className="text-sm font-medium mb-2">Your booking details</p>
            <dl className="text-[13px] space-y-1.5">{summary.map(([k, x]) => <div key={k} className="flex justify-between gap-3"><dt className="text-muted">{k}</dt><dd className="text-right">{x}</dd></div>)}</dl>
          </div>
          {item.priceEstimate && (
            <div className="rounded-2xl bg-cream/60 border border-cream-line p-4">
              <p className="text-sm font-medium">Price summary</p>
              <p className="font-serif text-2xl mt-1">{item.priceEstimate}</p>
              <p className="text-[11.5px] text-muted mt-1">An estimate. The final price, taxes and cancellation terms are shown by {provider} before you pay.</p>
            </div>
          )}
        </aside>

        <section className="space-y-4 min-w-0">
          {stage === "form" && (
            <>
              <div className="rounded-2xl bg-paper border border-line p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="t-h3">Enter your details</h2>
                    <p className="text-[12.5px] text-muted mt-1">Sebastian has filled in what he knows from your Settings. Check everything is correct.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setAutopilot(true)}><Sparkles className="w-4 h-4 text-gold" />Autopilot</Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-4 mt-5">
                  {visible.map((f) => {
                    const req = f.required || f.key === "guestName";
                    const label = `${f.label}${req ? " *" : ""}`;
                    const wide = f.kind === "textarea" || f.kind === "choice";
                    return (
                      <div key={f.key} className={wide ? "sm:col-span-2" : ""}>
                        <Field label={label} htmlFor={`g-${f.key}`} error={f.key === "email" && !emailOk ? "Enter a valid email address." : undefined}>
                          {f.kind === "choice" ? (
                            <div role="radiogroup" aria-label={f.label} className="flex flex-wrap gap-2">{f.options!.map((o) => <Option key={o} variant="chip" selected={v[f.key] === o} onClick={() => set(f.key, o)}>{o}</Option>)}</div>
                          ) : f.kind === "select" ? (
                            <select id={`g-${f.key}`} className={inputCls} value={v[f.key] || ""} onChange={(e) => set(f.key, e.target.value)}><option value="">Please select</option>{f.options!.map((o) => <option key={o}>{o}</option>)}</select>
                          ) : f.kind === "textarea" ? (
                            <textarea id={`g-${f.key}`} className={textareaCls + " min-h-[88px]"} value={v[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} />
                          ) : (
                            <input id={`g-${f.key}`} type={f.kind || "text"} className={inputCls} value={v[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} />
                          )}
                        </Field>
                      </div>
                    );
                  })}
                </div>
                {type === "flights" && <Notice className="mt-5">Passport details are entered directly with the airline or provider when you pay. Sebastian doesn&apos;t collect them.</Notice>}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-[12px] text-muted inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-success" />Sebastian never takes payment. You pay {provider} directly.</p>
                <Button onClick={() => setConfirm(true)} disabled={missing.length > 0 || !emailOk}>Next: final details<ExternalLink className="w-4 h-4" /></Button>
              </div>
              {missing.length > 0 && <p className="text-[12px] text-muted text-right">Still needed: {missing.map((m) => m.label).join(", ")}. Autopilot can ask you for them.</p>}
            </>
          )}

          {stage === "handoff" && (
            <div className="rounded-2xl bg-paper border border-line p-5 md:p-6 space-y-4">
              <h2 className="t-h3">Finish on {provider}</h2>
              <p className="text-sm text-muted">{provider} is open in a new tab. It will ask for your details again. Copy them here and paste them in, then check availability and pay there.</p>
              <pre className="text-[12.5px] bg-canvas border border-line rounded-xl p-4 whitespace-pre-wrap font-sans">{detailsText}</pre>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={copy}>{copied ? <><Check className="w-4 h-4" />Copied</> : <><Copy className="w-4 h-4" />Copy my details</>}</Button>
                <Button variant="ghost" href={item.link} external>Open {provider} again<ExternalLink className="w-4 h-4" /></Button>
              </div>
              <div className="border-t border-line pt-4">
                <p className="text-sm font-medium">Have you completed the booking and payment?</p>
                <div className="mt-3 max-w-sm"><Field label="Confirmation number (optional)"><input className={inputCls} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. 4829 117 305" /></Field></div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button onClick={booked}><CalendarCheck className="w-4 h-4" />Yes, I&apos;ve booked and paid</Button>
                  <Button variant="ghost" onClick={() => setStage("form")}>Not yet</Button>
                </div>
              </div>
            </div>
          )}

          {stage === "done" && event && (
            <div className="rounded-2xl border border-[#CFE2D6] bg-[#EFF5F1] p-5 md:p-6">
              <h2 className="t-h3 inline-flex items-center gap-2"><CalendarCheck className="w-5 h-5 text-success" />All scheduled</h2>
              <p className="text-sm text-muted mt-2">{event.title} is in your Sebastian schedule for {fmtDate(event.start.slice(0, 10))}{event.end ? ` to ${fmtDate(event.end.slice(0, 10))}` : ""}, with a reminder the day before. Google Calendar opened so you can save it there too.</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button size="sm" href="/schedule">View schedule</Button>
                <Button size="sm" variant="outline" href={googleCalendarUrl(event)} external>Open Google Calendar again</Button>
                <Button size="sm" variant="ghost" onClick={onBack}>Back to results</Button>
              </div>
            </div>
          )}
        </section>
      </div>

      <Autopilot open={autopilot} title={`Your details for ${item.name}`} fields={visible} values={v} onValues={(p) => setV((x) => ({ ...x, ...p }))} onClose={() => setAutopilot(false)}
        doneText="Please check the form, then continue." />
      <ConfirmDialog open={confirm} title="Please confirm your details" rows={[...summary, ...visible.filter((f) => v[f.key]).slice(0, 6).map((f) => [f.label, String(v[f.key])] as [string, string])]}
        body={`Next, ${provider} opens in a new tab to check live availability and take payment. Nothing has been booked yet.`} confirmLabel={`Continue to ${provider}`}
        onCancel={() => setConfirm(false)} onConfirm={() => { window.open(item.link, "_blank", "noopener,noreferrer"); setConfirm(false); setStage("handoff"); }} />
    </div>
  );
}
