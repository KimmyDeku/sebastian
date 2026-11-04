"use client";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, CalendarDays, Plane, UtensilsCrossed, Shirt, Compass, Newspaper, Droplets, Repeat, Brain, Play, Square } from "lucide-react";
import { cx } from "@/lib/util";

/* ---------- Hear Sebastian: plays his voice, with a moving sound wave ---------- */
let current: HTMLAudioElement | null = null;
export function HearSebastian({ dark = false, label = "Hear Sebastian", wave = false }: { dark?: boolean; label?: string; wave?: boolean }) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const f = (e: Event) => setPlaying((e as CustomEvent).detail === true);
    window.addEventListener("sebastian-voice", f); return () => window.removeEventListener("sebastian-voice", f);
  }, []);
  const toggle = () => {
    const emit = (v: boolean) => window.dispatchEvent(new CustomEvent("sebastian-voice", { detail: v }));
    if (current && !current.paused) { current.pause(); current.currentTime = 0; emit(false); return; }
    current = new Audio("/audio/sebastian-voice.mp3");
    current.onended = () => emit(false);
    current.play().then(() => emit(true)).catch(() => {
      // Fallback: the browser's own voice.
      if (!("speechSynthesis" in window)) return;
      const u = new SpeechSynthesisUtterance("Good to see you. I'm Sebastian. How may I assist you?"); u.lang = "en-GB"; u.rate = 0.95;
      u.onend = () => emit(false); speechSynthesis.cancel(); speechSynthesis.speak(u); emit(true);
    });
  };
  return (
    <div className={cx("inline-flex flex-col", wave && "items-center")}>
      <button onClick={toggle} aria-pressed={playing} className={cx("h-12 px-5 rounded-pill text-[15px] inline-flex items-center gap-2.5 border transition-colors",
        dark ? "border-white/40 text-white hover:bg-white/10" : "border-line hover:bg-cream")}>
        <span className={cx("w-2 h-2 rounded-full", dark ? "bg-white" : "bg-ink", playing && "animate-pulse")} />
        {playing ? <><Square className="w-3.5 h-3.5" />Stop</> : <><Play className="w-3.5 h-3.5" />{label}</>}
      </button>
      {wave && <Wave playing={playing} dark={dark} />}
    </div>
  );
}
export function Wave({ playing, dark }: { playing: boolean; dark?: boolean }) {
  return (
    <div aria-hidden className="flex items-center justify-center gap-[3px] h-14 mt-6">
      <style>{`@keyframes sebWave{0%,100%{height:8px}50%{height:44px}}@media (prefers-reduced-motion:reduce){.seb-wave{animation:none!important}}`}</style>
      {Array.from({ length: 36 }, (_, i) => (
        <span key={i} className={cx("seb-wave w-[3px] rounded-full", dark ? "bg-white/70" : "bg-ink/70")}
          style={{ height: playing ? undefined : `${6 + Math.round(6 * Math.abs(Math.sin(i * 0.7)))}px`, animation: playing ? `sebWave 1s ease-in-out ${(i % 9) * 0.08}s infinite` : "none", minHeight: 6 }} />
      ))}
    </div>
  );
}

/* ---------- The butler's tray: services presented one by one as you scroll ---------- */
const SERVICES = [
  { icon: MessageCircle, key: "conversation", photos: ["friends talking over coffee", "woman smiling at phone", "man laughing on phone call", "notebook planning ideas", "couple chatting at home"], eyebrow: "Conversation", title: ["Tell Sebastian", "anything."], text: "Speak naturally or type. Ask a question, explain a problem, make a plan, or simply say \"Sebastian, help me with this.\"", ex: "\"I have a wedding next Saturday. What should I wear?\"" },
  { icon: CalendarDays, key: "tasks", photos: ["paper planner calendar desk", "alarm clock morning", "grocery shopping basket", "video call meeting laptop", "to do list notebook"], eyebrow: "Tasks and schedule", title: ["Your day,", "perfectly orchestrated."], text: "Say your week out loud and Sebastian arranges it, spots clashes and reminds you discreetly. He does the groundwork and asks before anything final.", ex: "\"Remind me to buy groceries tomorrow at 5 PM.\"" },
  { icon: Plane, key: "travel", photos: ["Table Mountain Cape Town", "travel selfie beach", "hotel reception check in", "airplane window view clouds", "packing suitcase travel"], eyebrow: "Travel", title: ["Travel without", "the planning."], text: "Destinations, day-by-day itineraries, local etiquette, stays and maps, together in one conversation, with nothing booked until you say so.", ex: "\"I'm travelling to Cape Town next Friday. Organise everything.\"" },
  { icon: UtensilsCrossed, key: "food", photos: ["sushi platter", "italian pasta dish", "indian curry bowl", "african grilled food plate", "mexican tacos", "french pastries bakery"], eyebrow: "Food and recipes", title: ["Your private", "chef."], text: "Recipes around what's in your kitchen and how you like to eat, scaled to your table and read aloud while you cook.", ex: "\"I have chicken, rice and tomatoes. What can I make?\"" },
  { icon: Shirt, key: "style", photos: ["woman elegant evening dress", "man tailored suit", "skincare products", "hair salon styling", "stylish shoes"], eyebrow: "Style", title: ["Always", "appropriately dressed."], text: "Outfit, skincare and hairstyle ideas for the occasion, with inspiration to save.", ex: "\"I have a black-and-gold soirée this Saturday.\"" },
  { icon: Compass, key: "discovery", photos: ["rooftop restaurant evening", "art gallery exhibition", "live music concert crowd", "picnic in the park", "cosy coffee shop interior"], eyebrow: "Discovery", title: ["Discover what's", "around you."], text: "Restaurants, mechanics, pharmacies and things to do nearby, and in an emergency, the nearest help and the numbers to call.", ex: "\"I have two free hours. Find something interesting nearby.\"" },
  { icon: Newspaper, key: "news", photos: ["reading newspaper coffee", "television news studio", "city skyline morning", "journalist microphone interview", "reading news on tablet"], eyebrow: "News", title: ["Know what", "matters."], text: "Breaking and local news from screened, trusted sources, with the stories that matter to you first.", ex: "\"Give me today's most important headlines.\"" },
  { icon: Droplets, key: "wellness", photos: ["glass of water", "yoga stretching", "walking outdoors nature", "pill organiser medication", "peaceful bedroom sleep"], eyebrow: "Wellness", title: ["Take better care", "of your day."], text: "Gentle reminders to drink water, move, stretch and take your medication on time.", ex: "\"Remind me to drink water every two hours.\"" },
  { icon: Repeat, key: "subscriptions", photos: ["paying with phone card", "streaming tv living room", "electricity meter", "car keys insurance", "budget spreadsheet laptop"], eyebrow: "Subscriptions", title: ["Never miss", "a payment."], text: "ZESA, insurance, Netflix, AI tools and hosting, tracked in one place, with a reminder three days before each one is due.", ex: "\"Track my Netflix and ZESA, and remind me before they're due.\"" },
  { icon: Brain, key: "memory", photos: ["photo album memories", "quiet cafe window seat", "morning coffee notebook", "family dinner table", "handwritten notes"], eyebrow: "Memory", title: ["Sebastian remembers", "what matters."], text: "He learns your preferences so every conversation starts with him knowing you, and you can see, edit or clear what he remembers.", ex: "\"Remember that I prefer quiet cafés and morning meetings.\"" },
];

/* Real photos in circular frames, bursting out of the tray in an arc. Your own photos win:
   /public/images/tray/<service>-<n>.jpg (for example travel-1.jpg); otherwise a photo is found automatically. */
function TrayPhoto({ k, n, q }: { k: string; n: number; q: string }) {
  const [stage, setStage] = useState(0);
  if (stage > 1) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={stage === 0 ? `/images/tray/${k}-${n}.jpg` : `/api/images/photo?q=${encodeURIComponent(q)}`} alt={q} title={q} loading="lazy" onError={() => setStage(stage + 1)} className="w-full h-full object-cover" />;
}
function PhotoBurst({ service }: { service: (typeof SERVICES)[number] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => { const el = ref.current?.parentElement; if (!el) return; const ro = new ResizeObserver(() => setW(el.clientWidth)); ro.observe(el); setW(el.clientWidth); return () => ro.disconnect(); }, []);
  const small = w < 420;
  const photos = service.photos.slice(0, small ? 3 : service.photos.length);
  const n = photos.length;
  const R = w * (small ? 0.42 : 0.38), size = Math.max(small ? 54 : 70, w * (small ? 0.17 : 0.14));
  const cx = w * 0.61, trayTop = w * 0.02; // the middle of the tray's surface, near the top of the picture
  const from = small ? 150 : n > 5 ? 172 : 165, to = small ? 30 : n > 5 ? 8 : 15;
  return (
    <div ref={ref} aria-hidden className="absolute inset-0 pointer-events-none z-[2]">
      <style>{`@keyframes sebBurst{from{transform:translate(var(--fx),var(--fy)) scale(.15);opacity:0}to{transform:none;opacity:1}}@keyframes sebFloat{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-7px)}}@media (prefers-reduced-motion:reduce){.seb-burst{animation:none!important}}`}</style>
      {w > 0 && photos.map((q, k) => {
        const a = ((from + ((to - from) * k) / Math.max(1, n - 1)) * Math.PI) / 180;
        const x = cx + R * Math.cos(a), y = trayTop - R * Math.sin(a) * 0.78 - size * (small ? 1.15 : 0.55);
        return (
          <div key={q} className="seb-burst absolute rounded-full overflow-hidden bg-cream border-[3px] border-white shadow-lift"
            style={{ width: size, height: size, left: x - size / 2, top: y - size / 2, outline: "2px solid rgba(184,130,58,.75)", outlineOffset: 2,
              ["--fx" as any]: `${cx - x}px`, ["--fy" as any]: `${trayTop - y}px`, animation: `sebBurst .7s cubic-bezier(.2,.9,.25,1.15) ${k * 70}ms both` }}>
            <TrayPhoto k={service.key} n={k + 1} q={q} />
          </div>
        );
      })}
    </div>
  );
}

export function TrayStory() {
  const ref = useRef<HTMLElement>(null);
  const [i, setI] = useState(0);
  useEffect(() => {
    const on = () => {
      const el = ref.current; if (!el) return;
      const r = el.getBoundingClientRect(); const total = el.offsetHeight - window.innerHeight;
      const p = Math.max(0, Math.min(0.9999, -r.top / Math.max(1, total)));
      setI(Math.floor(p * SERVICES.length));
    };
    on(); window.addEventListener("scroll", on, { passive: true }); window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);
  const s = SERVICES[i];
  return (
    <section ref={ref} id="services" aria-label="What Sebastian does" className="relative scroll-mt-16" style={{ height: `${SERVICES.length * 55 + 45}vh` }}>
      <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-hidden bg-paper border-y border-line">
        <div aria-hidden className="absolute inset-0" style={{ background: "radial-gradient(circle at 26% 72%, rgba(184,130,58,.16), transparent 32%)" }} />
        {/* the butler's hand and tray, presenting each service */}
        <div className="absolute left-0 bottom-[4vh] w-[78vw] sm:w-[60vw] lg:w-[46vw] max-w-[680px] z-[2]">
          <div className="relative">
            <PhotoBurst key={`burst-${i}`} service={s} />
            <div key={i} className="absolute left-[61%] bottom-[112%] sm:bottom-[122%] z-[3]" style={{ animation: "sebFloat 3.2s ease-in-out infinite", transform: "translateX(-50%)" }}>
              <div className="flex items-center gap-2.5 rounded-2xl bg-canvas border border-cream-line shadow-lift px-4 py-3 animate-fadeUp">
                <span className="w-10 h-10 rounded-full bg-ink inline-flex items-center justify-center"><s.icon className="w-5 h-5 text-[#E6C98F]" aria-hidden /></span>
                <span className="font-serif text-[18px] whitespace-nowrap">{s.eyebrow}</span>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/butler-tray.png" alt="A butler's white-gloved hand presenting a silver tray" className="w-full h-auto drop-shadow-[0_24px_30px_rgba(0,0,0,.22)]" />
          </div>
        </div>
        <div className="relative z-[3] h-full max-w-6xl mx-auto px-5 flex items-start lg:items-center">
          <div className="w-full lg:w-[48%] lg:ml-auto pt-10 lg:pt-0">
            <div className="h-px bg-line w-full mb-8 lg:mb-12" aria-hidden><span className="block h-px bg-gold transition-all duration-300" style={{ width: `${((i + 1) / SERVICES.length) * 100}%` }} /></div>
            <div key={i} className="animate-fadeUp">
              <p className="t-kicker text-gold-deep">{String(i + 1).padStart(2, "0")} · {s.eyebrow}</p>
              <h2 className="font-serif text-[2.6rem] sm:text-6xl leading-[1.02] mt-3">{s.title[0]}<br /><em className="text-muted">{s.title[1]}</em></h2>
              <p className="text-[15px] sm:text-[17px] text-muted mt-5 max-w-lg leading-relaxed">{s.text}</p>
              <p className="mt-6 border-l-2 border-gold pl-4 font-serif text-[20px] sm:text-[24px] text-ink/90 max-w-lg">{s.ex}</p>
            </div>
            <div className="flex justify-between mt-8 lg:mt-12 text-[11px] tracking-[.2em] text-muted uppercase"><span>{String(i + 1).padStart(2, "0")} / {SERVICES.length}</span><span className="hidden sm:inline">Scroll to continue</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Partners ---------- */
const PARTNERS = [["Takmor Technologies", "/images/partners/takmor.jpg"], ["Devplus", "/images/partners/devplus.jpg"], ["Artificial Intelligence Institute Africa (Aiia)", "/images/partners/aiia.jpg"]];
export function Partners() {
  return (
    <section aria-label="Our partners" className="border-y border-line bg-paper">
      <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col md:flex-row items-center gap-5 md:gap-10">
        <p className="t-kicker text-muted shrink-0">In good company</p>
        <ul className="flex flex-wrap justify-center md:justify-start items-center gap-4 sm:gap-6 flex-1">
          {PARTNERS.map(([name, src]) => (
            <li key={name} className="h-16 sm:h-20 px-4 rounded-2xl bg-white border border-line inline-flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={name} title={name} className="h-11 sm:h-14 w-auto object-contain" loading="lazy" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
