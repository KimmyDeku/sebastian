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
    const c = getConsent();
    if (c === "granted") loadGA(); else if (c === null) setAsk(true);
    const f = () => setAsk(getConsent() === null);
    window.addEventListener("sebastian-consent", f);
    return () => window.removeEventListener("sebastian-consent", f);
  }, []);
  // Which part of Sebastian is being used (Home, Recipes, Travel, Finance...). Page views are counted by Analytics itself.
  useEffect(() => { if (path) track("module_view", { module: path.startsWith("/welcome") ? "landing" : path.startsWith("/login") ? "login" : path.startsWith("/signup") ? "signup" : sectionOf(path) }); }, [path]);
  if (!GA_ID || !ask) return null;
  return (
    <div role="dialog" aria-label="Analytics cookies" className="fixed z-[70] inset-x-3 bottom-3 lg:left-auto lg:right-6 lg:bottom-6 lg:w-[420px] rounded-2xl bg-paper border border-line shadow-lift p-4">
      <p className="text-[13.5px] font-medium inline-flex items-center gap-2"><BarChart3 className="w-4 h-4 text-gold" aria-hidden />Help us improve Sebastian</p>
      <p className="text-[12.5px] text-muted mt-1.5 leading-relaxed">With your permission, we use Google Analytics cookies to understand how Sebastian is used, such as which features are popular and which devices people use. No names, emails or anything you type are shared. <Link href="/privacy#cookies" className="underline">Privacy policy</Link></p>
      <div className="flex gap-2 mt-3 justify-end">
        <button onClick={() => { setConsent("denied"); setAsk(false); }} className="h-9 px-4 rounded-pill border border-line text-[13px]">No thanks</button>
        <button onClick={() => { setConsent("granted"); setAsk(false); }} className="h-9 px-4 rounded-pill bg-ink text-white text-[13px]">Allow</button>
      </div>
    </div>
  );
}
