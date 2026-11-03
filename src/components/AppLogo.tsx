"use client";
import { useState } from "react";
import { SERVICES } from "@/lib/subscriptions";

// The website behind each app or service, for its icon (where the subscription link isn't the main site).
const DOMAINS: Record<string, string> = {
  gmail: "mail.google.com", google_calendar: "calendar.google.com", slack: "slack.com", telegram: "telegram.org", instagram: "instagram.com",
  facebook: "facebook.com", x: "x.com", whatsapp: "whatsapp.com", linkedin: "linkedin.com",
  gemini: "gemini.google.com", youtube_music: "music.youtube.com", apple_music: "music.apple.com", apple_tv: "tv.apple.com", google_one: "one.google.com",
  google_workspace: "workspace.google.com", google_cloud: "cloud.google.com", aws: "aws.amazon.com", copilot: "copilot.microsoft.com", github_copilot: "github.com",
  xbox: "xbox.com", microsoft_365: "microsoft.com", prime: "amazon.com", liquid: "liquid.tech",
};
function domainFor(k: string) {
  if (DOMAINS[k]) return DOMAINS[k];
  const url = SERVICES.find((s) => s.key === k)?.url;
  if (!url) return null;
  const parts = new URL(url).hostname.replace(/^www\./, "").split(".");
  return parts.slice(/\.(co|com|org|ac)\.[a-z]{2}$/.test(parts.join(".")) ? -3 : -2).join(".");
}

/**
 * An app or service's logo, in this order:
 *  1. an official logo file you've added to /public/logos/<key>.svg (or .png), which always wins;
 *  2. the company's own website icon (the coloured icon shown in browser tabs);
 *  3. a tile with the name's initials.
 */
export function AppLogo({ k, name, size = 40 }: { k: string; name: string; size?: number }) {
  const domain = domainFor(k);
  const sources = [`/logos/${k}.svg`, `/logos/${k}.png`, ...(domain ? [`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`] : [])];
  const [stage, setStage] = useState(0);
  const initials = name.replace(/\(.*?\)/g, "").split(/[\s/+.-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  if (stage < sources.length) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={sources[stage]} alt="" aria-hidden width={size} height={size} loading="lazy" referrerPolicy="no-referrer"
      onError={() => setStage(stage + 1)}
      onLoad={(e) => { const img = e.currentTarget; if (stage === sources.length - 1 && img.naturalWidth > 0 && img.naturalWidth <= 16) setStage(stage + 1); }}
      className="rounded-xl object-contain bg-white border border-line shrink-0" style={{ width: size, height: size, padding: size * 0.16 }} />
  );
  return <span aria-hidden className="rounded-xl bg-cream text-ink font-medium inline-flex items-center justify-center shrink-0" style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials || "?"}</span>;
}
