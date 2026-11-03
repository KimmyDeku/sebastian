"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { UtensilsCrossed, BedDouble, Plane, Compass, CalendarDays, BarChart3, Shirt, Newspaper, Mail, BookOpen, LayoutGrid, Play, MessageCircle, ArrowRight, ShieldCheck, Mic, Sparkles, CheckCircle2, Lock, Brain, Loader2 } from "lucide-react";
import { Wordmark, SebastianMark } from "@/components/SebastianMark";
import { LanguageMenu } from "@/components/LanguageMenu";
import { Img } from "@/components/ui/Img";
import { SUPPORT, whatsappLink } from "@/lib/support";
import { LANDING } from "@/lib/landing";
import { cx } from "@/lib/util";
import { track } from "@/lib/analytics";

const FEATURES = [
  [UtensilsCrossed, "Recipes", "Ten recipes matched to your taste, diet and what's in the cupboard, with hands-free cooking."],
  [BedDouble, "Booking", "Stays, flights, cars and transfers from trusted sites, with your details filled in for you."],
  [Plane, "Travel", "Day-by-day itineraries with local etiquette, a live map and a beautiful PDF to take with you."],
  [Compass, "Discover", "Pharmacies, restaurants, mechanics and more near you, with directions in a tap."],
  [CalendarDays, "Schedule", "Say your week out loud and Sebastian arranges it, with discreet reminders and Google Calendar."],
  [BarChart3, "Finance", "Savings plans, income and spending, with gentle advice on reaching your goals."],
  [Shirt, "Fashion", "Outfit, skincare and hairstyle ideas for any occasion, with inspiration to save."],
  [Newspaper, "News", "Trusted local and world news, with the breaking stories first."],
  [Mail, "Email", "Draft, read and reply to email in your own words. Nothing is sent without your approval."],
  [LayoutGrid, "Tasks and your apps", "Ask, and Sebastian gets it done: he plans, prepares and checks with you before anything final."],
] as const;

function Waitlist() {
  const [f, setF] = useState({ name: "", email: "", interest: "Everything", website: "" });
  const [state, setState] = useState<"idle" | "busy" | "done" | "already">("idle");
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setState("busy");
    const r = await fetch("/api/waitlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f) }).then((x) => x.json()).catch(() => ({ ok: false, error: "Please check your connection and try again." }));
    if (!r.ok) { setErr(r.error || "Something went wrong."); setState("idle"); return; }
    setState(r.already ? "already" : "done");
    if (!r.already) track("join_waitlist", { interest: f.interest });
  };
  if (state === "done" || state === "already") return (
    <div className="text-center py-6" role="status">
      <CheckCircle2 className="w-10 h-10 text-success mx-auto" aria-hidden />
      <p className="t-h3 mt-3">{state === "already" ? "You're already on the list" : "You're on the list"}</p>
      <p className="text-sm text-muted mt-2">Thank you{f.name ? `, ${f.name.split(" ")[0]}` : ""}. We&apos;ll be in touch at {f.email} as soon as a place opens.</p>
    </div>
  );
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block"><span className="text-[13px] font-medium">Your name</span><input className="mt-1.5 w-full h-12 px-4 rounded-xl border border-line bg-paper text-base outline-none focus:border-gold" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" /></label>
        <label className="block"><span className="text-[13px] font-medium">Email *</span><input type="email" required className="mt-1.5 w-full h-12 px-4 rounded-xl border border-line bg-paper text-base outline-none focus:border-gold" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" /></label>
      </div>
      <label className="block"><span className="text-[13px] font-medium">What are you most looking forward to?</span>
        <select className="mt-1.5 w-full h-12 px-4 rounded-xl border border-line bg-paper text-base outline-none focus:border-gold" value={f.interest} onChange={(e) => setF({ ...f, interest: e.target.value })}>
          {["Everything", "Travel and booking", "Recipes", "My schedule and email", "Tasks and reminders", "Finance"].map((o) => <option key={o}>{o}</option>)}
        </select>
      </label>
      <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />
      {err && <p className="text-[13px] text-danger" role="alert">{err}</p>}
      <button type="submit" disabled={state === "busy"} className="w-full h-12 rounded-pill bg-ink text-white text-[15px] inline-flex items-center justify-center gap-2 disabled:opacity-60">
        {state === "busy" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}Join the waitlist
      </button>
      <p className="text-[11.5px] text-muted text-center">We&apos;ll only use your email to tell you about Sebastian. See our <Link href="/privacy" className="underline">privacy policy</Link>.</p>
    </form>
  );
}

function Demo() {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  if (LANDING.youtubeId) return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-line shadow-lift bg-ink" style={{ paddingTop: "56.25%" }}>
      <iframe className="absolute inset-0 w-full h-full" src={`https://www.youtube-nocookie.com/embed/${LANDING.youtubeId}?rel=0`} title="Sebastian demo" allow="encrypted-media; picture-in-picture" allowFullScreen />
    </div>
  );
  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-line shadow-lift bg-[#1C1B19]" style={{ paddingTop: "56.25%" }}>
      <video ref={video} className="absolute inset-0 w-full h-full object-cover" poster={LANDING.demoPoster} controls={playing} playsInline preload="metadata" onEnded={() => setPlaying(false)}>
        <source src={LANDING.demoVideoWebm} type="video/webm" />
        <source src={LANDING.demoVideoMp4} type="video/mp4" />
        Your browser can&apos;t play this video.
      </video>
      {!playing && (
        <button onClick={() => { setPlaying(true); video.current?.play().catch(() => {}); }} aria-label="Play the Sebastian demo video" className="absolute inset-0 flex items-center justify-center group">
          <span className="absolute inset-0 bg-black/25 group-hover:bg-black/15 transition-colors" />
          <span className="relative w-20 h-20 rounded-full bg-white/95 shadow-lift inline-flex items-center justify-center group-hover:scale-105 transition-transform"><Play className="w-8 h-8 text-[#1C1B19] ml-1" fill="#1C1B19" /></span>
          <span className="absolute top-4 left-4 text-white text-[13px] bg-black/50 rounded-full px-3 py-1">Watch the 40-second tour</span>
        </button>
      )}
    </div>
  );
}

export default function Welcome() {
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <div className="min-h-screen bg-canvas text-ink overflow-x-clip">
      <header className="sticky top-0 z-30 bg-canvas/85 backdrop-blur border-b border-line">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-3">
          <Link href="/welcome" aria-label="Sebastian"><Wordmark /></Link>
          <nav className="hidden md:flex items-center gap-6 text-[14px] text-muted" aria-label="Page sections">
            <button onClick={() => go("demo")} className="hover:text-ink">Demo</button>
            <button onClick={() => go("features")} className="hover:text-ink">Features</button>
            <button onClick={() => go("contact")} className="hover:text-ink">Contact</button>
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex"><LanguageMenu /></span>
            <Link href="/login" className="h-10 px-4 rounded-pill text-[14px] inline-flex items-center hover:bg-cream">Log in</Link>
            <button onClick={() => go("waitlist")} className="h-10 px-4 rounded-pill bg-ink text-white text-[14px] hidden sm:inline-flex items-center">Join the waitlist</button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-5 pt-12 md:pt-20 pb-14 grid lg:grid-cols-[1.05fr_1fr] gap-10 items-center">
          <div>
            <p className="t-kicker text-gold-deep">Your intelligent concierge</p>
            <h1 className="t-display text-[2.6rem] sm:text-6xl mt-3">Life, handled with a butler&apos;s composure.</h1>
            <p className="text-[17px] text-muted mt-5 max-w-xl leading-relaxed">Sebastian plans your trips, finds your recipes, keeps your calendar, drafts your emails and helps you study, all by simply asking, in your own words or out loud.</p>
            <div className="flex flex-wrap gap-3 mt-8">
              <button onClick={() => go("waitlist")} className="h-12 px-6 rounded-pill bg-ink text-white text-[15px] inline-flex items-center gap-2"><Sparkles className="w-4 h-4" />Join the waitlist</button>
              {LANDING.openSignups && <Link href="/signup" className="h-12 px-6 rounded-pill border border-ink text-[15px] inline-flex items-center gap-2">Try Sebastian<ArrowRight className="w-4 h-4" /></Link>}
              <button onClick={() => go("demo")} className="h-12 px-5 rounded-pill text-[15px] inline-flex items-center gap-2 hover:bg-cream"><Play className="w-4 h-4" />Watch the demo</button>
            </div>
            <p className="text-[12.5px] text-muted mt-5 inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-success" />Free to test · Your information stays private</p>
          </div>
          <div className="relative">
            <div className="absolute -inset-3 sm:-inset-6 rounded-[40px] bg-gradient-to-br from-cream to-gold-soft/60 -z-0" aria-hidden />
            <Img src={LANDING.heroImage} fallback="/images/travel-collage.jpg" alt="Sebastian, the butler concierge" label="" className="relative w-full aspect-[4/5] rounded-[32px] border border-line shadow-lift" />
          </div>
        </section>

        {/* Demo */}
        <section id="demo" className="scroll-mt-20 bg-paper border-y border-line">
          <div className="max-w-5xl mx-auto px-5 py-16 md:py-20">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <p className="t-kicker text-gold-deep">See it in action</p>
              <h2 className="t-h1 mt-2">A quick tour of Sebastian</h2>
              <p className="text-muted mt-3">From planning a weekend away to arranging your week, see how Sebastian works before you try it.</p>
            </div>
            <Demo />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 max-w-6xl mx-auto px-5 py-16 md:py-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <p className="t-kicker text-gold-deep">Everything in one place</p>
            <h2 className="t-h1 mt-2">Ten suites, one concierge</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {FEATURES.map(([I, t, s]) => (
              <article key={t} className="rounded-2xl bg-paper border border-line p-5">
                <span className="w-10 h-10 rounded-xl bg-cream inline-flex items-center justify-center"><I className="w-5 h-5 text-gold" aria-hidden /></span>
                <h3 className="font-serif text-xl mt-3">{t}</h3>
                <p className="text-[13px] text-muted mt-1.5 leading-relaxed">{s}</p>
              </article>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-4 mt-12">
            {[[MessageCircle, "1. Ask", "Type or speak in your own words, in English, Shona, Ndebele, French, Chinese, German, Japanese or Portuguese."], [Mic, "2. Sebastian handles it", "He researches, plans and drafts, then shows you everything clearly."], [CheckCircle2, "3. You stay in control", "Nothing is booked, sent or paid without your say-so."]].map(([I, t, s]: any) => (
              <div key={t} className="flex gap-4"><span className="w-11 h-11 rounded-full bg-ink text-white inline-flex items-center justify-center shrink-0"><I className="w-5 h-5" aria-hidden /></span><div><p className="font-medium">{t}</p><p className="text-[13.5px] text-muted mt-1">{s}</p></div></div>
            ))}
          </div>
        </section>

        {/* Trust */}
        <section className="bg-ink text-white">
          <div className="max-w-6xl mx-auto px-5 py-12 grid md:grid-cols-3 gap-6">
            {[[Lock, "Private by design", "Your information stays with your account and is never sold or used for advertising."], [Brain, "Remembers what matters", "Sebastian learns your preferences, and you can see, edit or clear what he knows."], [ShieldCheck, "Trusted sources", "News and bookings come from screened, established providers."]].map(([I, t, s]: any) => (
              <div key={t} className="flex gap-3"><I className="w-5 h-5 text-gold shrink-0 mt-0.5" aria-hidden /><div><p className="font-medium">{t}</p><p className="text-[13.5px] text-white/70 mt-1">{s}</p></div></div>
            ))}
          </div>
        </section>

        {/* Waitlist */}
        <section id="waitlist" className="scroll-mt-20 max-w-6xl mx-auto px-5 py-16 md:py-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <SebastianMark size={52} />
            <h2 className="t-h1 mt-4">Join the waitlist</h2>
            <p className="text-muted mt-3 max-w-md">Sebastian is opening to a small group of testers. Leave your details and we&apos;ll invite you as soon as a place is free.</p>
            {LANDING.openSignups && <p className="text-[13.5px] mt-4">Already invited? <Link href="/signup" className="underline underline-offset-2">Create your account</Link> or <Link href="/login" className="underline underline-offset-2">log in</Link>.</p>}
          </div>
          <div className="rounded-3xl bg-paper border border-line p-6 md:p-8 shadow-soft"><Waitlist /></div>
        </section>

        {/* Contact */}
        <section id="contact" className="scroll-mt-20 bg-paper border-t border-line">
          <div className="max-w-4xl mx-auto px-5 py-16 text-center">
            <p className="t-kicker text-gold-deep">Get in touch</p>
            <h2 className="t-h1 mt-2">We&apos;d love to hear from you</h2>
            <p className="text-muted mt-3">Questions, partnerships or feedback: message us any time. {SUPPORT.hours}.</p>
            <div className="grid sm:grid-cols-2 gap-3 mt-8 text-left">
              <a href={whatsappLink("Hello! I'd like to know more about Sebastian.")} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-line bg-canvas p-5 hover:border-cream-line flex items-center gap-4">
                <span className="w-12 h-12 rounded-full bg-[#EFF5F1] inline-flex items-center justify-center shrink-0"><MessageCircle className="w-6 h-6 text-success" aria-hidden /></span>
                <span><span className="block font-medium">WhatsApp</span><span className="block text-[13px] text-muted" translate="no">{SUPPORT.phone}</span></span>
              </a>
              <a href={`mailto:${SUPPORT.email}?subject=${encodeURIComponent("About Sebastian")}`} className="rounded-2xl border border-line bg-canvas p-5 hover:border-cream-line flex items-center gap-4">
                <span className="w-12 h-12 rounded-full bg-cream inline-flex items-center justify-center shrink-0"><Mail className="w-6 h-6 text-gold" aria-hidden /></span>
                <span className="min-w-0"><span className="block font-medium">Email</span><span className="block text-[13px] text-muted break-all" translate="no">{SUPPORT.email}</span></span>
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted">
          <span>© {new Date().getFullYear()} {SUPPORT.company.startsWith("[") ? "Sebastian" : SUPPORT.company}</span>
          <span className="flex gap-4"><Link href="/privacy" className="hover:text-ink">Privacy policy</Link><Link href="/login" className="hover:text-ink">Log in</Link>{LANDING.openSignups && <Link href="/signup" className="hover:text-ink">Sign up</Link>}</span>
        </div>
      </footer>
    </div>
  );
}
