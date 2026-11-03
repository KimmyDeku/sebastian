"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { GA_ID, getConsent, setConsent, loadGA, track } from "@/lib/analytics";
import { sectionOf } from "@/lib/usage";

/** Asks permission once, loads Google Analytics if allowed, and records which part of Sebastian is used. */
export function GoogleAnalytics() {
  const path = usePathname();
  const [ask, setAsk] = useState(false);
  useEffect(() => {
    if (!GA_ID) return;
    loadGA(); // anonymous, cookie-free measurement until the visitor chooses
    // Ask after they've had a moment to look around, which makes a "yes" more likely.
    const t = getConsent() === null ? setTimeout(() => setAsk(getConsent() === null), 8000) : undefined;
    const f = () => setAsk(getConsent() === null);
    window.addEventListener("sebastian-consent", f);
    return () => { window.removeEventListener("sebastian-consent", f); if (t) clearTimeout(t); };
  }, []);
  // Which part of Sebastian is being used (Home, Recipes, Travel, Finance...). Page views are counted by Analytics itself.
  useEffect(() => { if (path) track("module_view", { module: path.startsWith("/welcome") ? "landing" : path.startsWith("/login") ? "login" : path.startsWith("/signup") ? "signup" : sectionOf(path) }); }, [path]);
  if (!GA_ID || !ask) return null;
  return (
    <div role="dialog" aria-label="Analytics cookies" className="fixed z-[70] inset-x-3 bottom-3 lg:left-auto lg:right-6 lg:bottom-6 lg:w-[420px] rounded-2xl bg-paper border border-line shadow-lift p-4">
      <p className="text-[13.5px] font-medium inline-flex items-center gap-2"><BarChart3 className="w-4 h-4 text-gold" aria-hidden />Help us improve Sebastian</p>
      <p className="text-[12.5px] text-muted mt-1.5 leading-relaxed">Sebastian is new, and your visit helps shape it. May we use analytics cookies to see which features people find most useful? We never share your name, email or anything you type. <Link href="/privacy#cookies" className="underline">Privacy policy</Link></p>
      <div className="flex gap-2 mt-3 justify-end">
        <button onClick={() => { setConsent("denied"); setAsk(false); }} className="h-9 px-4 rounded-pill border border-line text-[13px]">No thanks</button>
        <button onClick={() => { setConsent("granted"); setAsk(false); }} className="h-9 px-4 rounded-pill bg-ink text-white text-[13px]">Allow</button>
      </div>
    </div>
  );
}
