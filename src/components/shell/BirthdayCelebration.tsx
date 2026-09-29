"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Music, Square, Cake } from "lucide-react";
import { useAccount, useData } from "@/lib/store";
import { formOfAddress } from "@/lib/address";
import { useSpeaker } from "@/lib/voice";
import { playSerenade } from "@/lib/sound";
import { pushNotify } from "@/lib/notify";
import { translateText } from "@/lib/translator";

type State = { pushed?: boolean; spoken?: boolean; dismissed?: boolean };
const read = (k: string): State => { try { return JSON.parse(localStorage.getItem(k) || "{}"); } catch { return {}; } };
const write = (k: string, s: State) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch {} };

function todayIn(tz?: string) {
  let iso = new Date().toISOString().slice(0, 10);
  try { iso = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); } catch {}
  return { year: iso.slice(0, 4), md: iso.slice(5) };
}
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** On the user's birthday: a notification, a spoken greeting on the home screen, and a serenade. */
export function BirthdayCelebration() {
  const acc = useAccount();
  const d = useData();
  const path = usePathname();
  const { speak, cancel } = useSpeaker();
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const stopRef = useRef<() => void>(() => {});

  const who = formOfAddress(acc, d.prefs) || acc?.firstName || "";
  const today = todayIn(acc?.timezone);
  const bday = acc?.dob?.slice(5) || "";
  const isBirthday = !!bday && (bday === today.md || (bday === "02-29" && today.md === "02-28" && !isLeap(+today.year)));
  const key = acc ? `sebastian-bday-${acc.id}-${today.year}` : "";
  const message = `Happy birthday, ${who}! On this special day, may you be blessed with good health, good fortune and a long and joyful life. It is my honour to serve you.`;

  // A notification once on the day.
  useEffect(() => {
    if (!isBirthday || !key) return;
    const st = read(key);
    if (!st.pushed) { pushNotify("Sebastian", `Happy birthday, ${who}! Wishing you good health, fortune and a joyful year ahead.`, { tag: "sebastian-birthday", url: "/" }); write(key, { ...st, pushed: true }); }
  }, [isBirthday, key, who]);

  // The greeting on the home screen, spoken once. Browsers only allow speech after the first tap.
  useEffect(() => {
    if (!isBirthday || !key || path !== "/") return;
    const st = read(key);
    if (st.dismissed) return;
    setOpen(true);
    if (st.spoken || d.prefs.voiceAlerts === false) return;
    const go = async () => {
      const text = await translateText(`${message} Shall I play you a little serenade?`);
      speak(text, d.prefs.voiceName);
      write(key, { ...read(key), spoken: true });
    };
    if ((navigator as any).userActivation?.hasBeenActive) { go(); return; }
    const once = () => { off(); go(); };
    const off = () => { window.removeEventListener("pointerdown", once); window.removeEventListener("keydown", once); };
    window.addEventListener("pointerdown", once);
    window.addEventListener("keydown", once);
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBirthday, key, path]);

  useEffect(() => () => stopRef.current(), []);

  if (!open || path !== "/") return null;

  const serenade = () => {
    if (playing) { stopRef.current(); setPlaying(false); return; }
    cancel();
    const s = playSerenade();
    stopRef.current = s.stop;
    setPlaying(true);
    setTimeout(() => setPlaying(false), s.duration);
  };
  const close = () => { stopRef.current(); cancel(); write(key, { ...read(key), dismissed: true, spoken: true }); setOpen(false); };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-5" role="dialog" aria-modal="true" aria-label="Happy birthday">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" onClick={close} aria-hidden />
      <div className="relative w-full max-w-md rounded-3xl bg-paper border border-cream-line shadow-lift p-7 md:p-8 text-center overflow-hidden animate-fadeUp">
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 18 }).map((_, i) => (
            <span key={i} className="absolute w-1.5 h-3 rounded-sm animate-floaty"
              style={{ left: `${(i * 53) % 100}%`, top: `${4 + ((i * 37) % 18)}%`, background: ["#B8823A", "#E6D3B8", "#8C6FE6", "#3F7D58"][i % 4], transform: `rotate(${i * 29}deg)`, animationDelay: `${(i % 6) * 0.3}s`, opacity: 0.7 }} />
          ))}
        </div>
        <div className="relative">
          <span className="inline-flex w-14 h-14 rounded-full bg-cream items-center justify-center"><Cake className="w-7 h-7 text-gold" aria-hidden /></span>
          <h2 className="t-h1 mt-4">Happy birthday, {who}</h2>
          <p className="text-[14px] text-muted mt-3 leading-relaxed">May this year bring you good health, good fortune and a long and joyful life. It is my honour to serve you.</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
            <button onClick={serenade} className="h-11 px-5 rounded-pill bg-gold text-white text-sm inline-flex items-center justify-center gap-2 hover:bg-gold-deep">
              {playing ? <><Square className="w-4 h-4" />Stop the serenade</> : <><Music className="w-4 h-4" />Play a serenade</>}
            </button>
            <button onClick={close} className="h-11 px-5 rounded-pill border border-line text-sm">Thank you, Sebastian</button>
          </div>
        </div>
      </div>
    </div>
  );
}
