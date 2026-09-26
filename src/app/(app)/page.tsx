"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, UtensilsCrossed, Plane, CalendarDays, MapPin, Clock, BarChart3, Newspaper, Shirt, BookOpen, PiggyBank } from "lucide-react";
import { Composer } from "@/components/Composer";
import { SUITES } from "@/components/shell/nav";
import { useAccount, useData, actions } from "@/lib/store";
import { greeting } from "@/lib/address";
import { IMG } from "@/lib/images";
import { Img } from "@/components/ui/Img";
import { uid, fmtDateTime, money } from "@/lib/util";
import { setPendingAttachment } from "@/lib/pending";
import { Progress } from "@/components/ui/Wizard";
import { useEffect, useState } from "react";

const CHIPS = [
  { label: "Find a recipe", href: "/recipes", icon: UtensilsCrossed },
  { label: "Plan a trip", href: "/travel", icon: Plane },
  { label: "Plan my week", href: "/schedule", icon: Clock },
  { label: "Review finances", href: "/finance", icon: BarChart3 },
  { label: "Read the news", href: "/news", icon: Newspaper },
];

type CardP = { kicker: string; title: string; body: string; cta: string; href: string; img: string; alt: string; tone: "dark" | "light"; className?: string; tall?: boolean };

function FeatureCard({ kicker, title, body, cta, href, img, alt, tone, className = "", tall }: CardP) {
  const dark = tone === "dark";
  return (
    <Link href={href} className={`group relative overflow-hidden rounded-[20px] border border-line/60 block ${tall ? "min-h-[260px] md:min-h-[280px]" : "min-h-[210px] md:min-h-[220px]"} ${className}`}>
      <Img src={img} alt={alt} label="" className="absolute inset-0 w-full h-full transition-transform duration-700 group-hover:scale-[1.03]" />
      <div className={`absolute inset-0 ${dark ? "card-scrim" : "card-scrim-light"}`} aria-hidden />
      <div className={`relative h-full flex flex-col p-5 md:p-6 max-w-[460px] ${dark ? "text-white" : "text-ink"}`}>
        <span className={`t-kicker ${dark ? "text-white/85" : "text-ink/70"}`}>{kicker}</span>
        <h3 className={`font-serif font-medium mt-2 leading-[1.08] ${tall ? "text-[1.6rem] md:text-[1.9rem]" : "text-[1.5rem] md:text-[1.7rem]"}`}>{title}</h3>
        <p className={`mt-2 text-[14px] leading-snug max-w-[280px] ${dark ? "text-white/90" : "text-ink/70"}`}>{body}</p>
        <span className="mt-auto pt-5 inline-flex">
          <span className={`inline-flex items-center gap-2 h-9 px-4 rounded-pill text-[13px] ${dark ? "bg-white text-ink" : "bg-paper/90 border border-line text-ink"}`}>
            {cta}<ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </span>
      </div>
    </Link>
  );
}

export default function Home() {
  const acc = useAccount();
  const d = useData();
  const router = useRouter();
  const [hello, setHello] = useState("");
  useEffect(() => { setHello(greeting(acc, d.prefs)); const t = setInterval(() => setHello(greeting(acc, d.prefs)), 60000); return () => clearInterval(t); }, [acc, d.prefs]);

  const next = d.schedule.filter((e) => new Date(e.start).getTime() > Date.now()).sort((a, b) => a.start.localeCompare(b.start))[0];
  const plan = d.plans.find((p) => !p.archived);
  const saved = plan ? plan.deposits.reduce((s, x) => s + x.amount, 0) : 0;

  const send = (text: string, att: any) => {
    setPendingAttachment(att);
    const id = actions.newChat({ id: uid("m_"), role: "user", content: text, at: new Date().toISOString() });
    router.push(`/chat?id=${id}&pending=1`);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-5 md:px-10 pt-8 lg:pt-4 pb-16">
      <section className="pt-4 md:pt-6">
        <h1 className="t-display text-[1.5rem] sm:text-5xl xl:text-[3.5rem]" suppressHydrationWarning>{hello || "\u00a0"}</h1>
        <p className="mt-2 text-muted text-[15px] md:text-lg font-light">Your intelligent concierge for finding, planning, and discovering.</p>
      </section>

      <section className="mt-6 md:mt-8" aria-label="Ask Sebastian">
        <Composer onSend={send} large>
          <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar md:flex-wrap md:justify-center -mx-1 px-1 pb-1">
            {CHIPS.map((c) => (
              <Link key={c.label} href={c.href} className="shrink-0 inline-flex items-center gap-2 h-9 px-3.5 rounded-pill bg-canvas border border-line/70 text-[13px] hover:bg-cream hover:border-cream-line">
                <c.icon className="w-4 h-4" strokeWidth={1.5} aria-hidden />{c.label}
              </Link>
            ))}
          </div>
        </Composer>
      </section>

      <nav aria-label="Suites" className="mt-6 md:mt-8 -mx-5 px-5 md:mx-0 md:px-0 overflow-x-auto no-scrollbar">
        <ul className="flex gap-2 md:gap-3 w-full min-w-max">
          {SUITES.map((s, i) => (
            <li key={s.key} className="flex-1">
              <Link href={s.href} className={`flex items-center gap-2.5 h-12 md:h-14 px-4 rounded-2xl border transition-colors ${i === 0 ? "bg-cream border-cream-line" : "bg-paper border-line hover:bg-cream/60 hover:border-cream-line"}`}>
                <s.icon className={`w-5 h-5 shrink-0 ${i === 0 ? "text-gold" : "text-ink"}`} strokeWidth={1.4} aria-hidden />
                <span className="text-sm whitespace-nowrap">{s.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section className="mt-5 md:mt-6 grid gap-4 md:gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Featured">
        <FeatureCard tall tone="dark" kicker="Recipes" title="Extraordinary meals at home" body="Ten matched recipes from trusted kitchens, scaled to your table." cta="Explore recipes" href="/recipes" img={IMG.recipes} alt="A table of colourful home-cooked dishes" />
        <FeatureCard tall tone="dark" kicker="Booking" title="Handpicked stays for meaningful trips" body="Hotels, lodges, flights and transfers, filtered to exactly what you need." cta="Find stays" href="/booking?type=stays" img={IMG.booking} alt="A calm hotel bedroom with morning light" />
        <FeatureCard tall tone="dark" kicker="Travel" title="See more of the world" body="Personal itineraries shaped by your dates, budget and Trip DNA." cta="Plan a trip" href="/travel" img={IMG.travel} alt="Turquoise water meeting a white beach" className="md:col-span-2 xl:col-span-1" />

        <FeatureCard tone="light" kicker="Discover services" title="Everyday help, extraordinary living" body="Pharmacies, cafés, mechanics and emergency help near you." cta="Explore services" href="/discover" img={IMG.discover} alt="A warmly lit restaurant interior" />
        <FeatureCard tone="light" kicker="Scheduling" title="A more organized you" body="Appointments, reminders and every trip, in one calendar." cta="Plan my week" href="/schedule" img={IMG.schedule} alt="An open planner beside a coffee cup" />
        <FeatureCard tone="light" kicker="Finance" title="Clarity for what's next" body="Track income and spending, and grow your savings pots." cta="Review finances" href="/finance" img={IMG.finance} alt="A calculator and financial papers on a desk" className="md:col-span-2 xl:col-span-1" />

        <FeatureCard tone="dark" kicker="Fashion" title="Dressed for the moment" body="Looks, hair, colour and skincare ideas for any occasion." cta="Get styled" href="/fashion" img={IMG.fashion} alt="A rail of neatly hung clothes" />
        <Link href="/news" className="group relative overflow-hidden rounded-[20px] border border-line/60 block min-h-[210px] md:col-span-1 xl:col-span-2">
          <Img src={IMG.news} alt="Stacked newspapers" label="" className="absolute inset-0 w-full h-full transition-transform duration-700 group-hover:scale-[1.03]" />
          <div className="absolute inset-0 card-scrim-light" aria-hidden />
          <div className="relative h-full p-5 md:p-6 flex flex-col gap-2">
            <div>
              <span className="t-kicker text-ink/70">News</span>
              <h3 className="font-serif font-medium text-[1.5rem] md:text-[1.7rem] leading-[1.08] mt-2 max-w-[380px]">Stay informed, without the noise</h3>
            </div>
            <p className="text-[14px] text-ink/70 max-w-[300px]">Breaking and developing stories from the sources you choose.</p>
            <span className="mt-auto pt-3 inline-flex items-center gap-2 h-9 px-4 rounded-pill bg-paper/90 border border-line text-[13px] w-fit whitespace-nowrap">Read the news<ArrowRight className="w-3.5 h-3.5" aria-hidden /></span>
          </div>
        </Link>
      </section>

      <section className="mt-12 md:mt-14" aria-labelledby="glance">
        <h2 id="glance" className="t-h2">At a glance</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Link href="/schedule" className="rounded-[20px] bg-paper border border-line p-5 hover:border-cream-line">
            <CalendarDays className="w-5 h-5 text-gold" strokeWidth={1.5} aria-hidden />
            <p className="text-[12.5px] text-muted mt-3">Next up</p>
            <p className="font-serif text-lg mt-1">{next ? next.title : "Nothing scheduled"}</p>
            <p className="text-[13px] text-muted mt-1">{next ? fmtDateTime(next.start, acc?.timezone) : "Add an appointment or reminder."}</p>
          </Link>
          <Link href="/recipes/cookbook" className="rounded-[20px] bg-paper border border-line p-5 hover:border-cream-line">
            <BookOpen className="w-5 h-5 text-gold" strokeWidth={1.5} aria-hidden />
            <p className="text-[12.5px] text-muted mt-3">Your cookbook</p>
            <p className="font-serif text-lg mt-1">{d.cookbook.length} {d.cookbook.length === 1 ? "recipe" : "recipes"} saved</p>
            <p className="text-[13px] text-muted mt-1">{d.cookbook[0]?.title || "Save recipes you love as you browse."}</p>
          </Link>
          <Link href="/finance" className="rounded-[20px] bg-paper border border-line p-5 hover:border-cream-line">
            <PiggyBank className="w-5 h-5 text-gold" strokeWidth={1.5} aria-hidden />
            <p className="text-[12.5px] text-muted mt-3">Savings</p>
            <p className="font-serif text-lg mt-1">{plan ? plan.name : "No savings plan yet"}</p>
            {plan ? (<><p className="text-[13px] text-muted mt-1 mb-3">{money(saved)} of {money(plan.target)}</p><Progress value={saved} max={plan.target} label={`${plan.name} progress`} /></>) : <p className="text-[13px] text-muted mt-1">Create a pot and start saving.</p>}
          </Link>
        </div>
      </section>
    </div>
  );
}