"use client";
import { useState } from "react";
import { Puzzle, Plug, Eye, Plus, X } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { Container, PageHeader } from "@/components/ui/Page";
import { useEmail, patchEmail, forgetGmail, googleClientId } from "@/lib/gmail";
import { grantGmail } from "@/components/email/Permission";
import { useCompanion, patchCompanion } from "@/lib/companion";
import { useStore } from "@/lib/store";
import { cx } from "@/lib/util";
import { toast } from "@/components/ui/Toast";

type Status = "on" | "off" | "soon" | "unavailable";
type App = { key: string; name: string; icon?: any; does: string; status: Status; note?: string; toggle?: (v: boolean) => Promise<void> | void };

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cx("w-11 h-6 rounded-full relative transition-colors shrink-0", on ? "bg-ink" : "bg-line")}><span className={cx("absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all", on ? "left-[22px]" : "left-0.5")} /></button>;
}
const CHIP: Record<Status, [string, string]> = { on: ["Connected", "bg-[#E3F0E8] text-[#2F6B4F]"], off: ["Off", "bg-canvas text-muted border border-line"], soon: ["Coming soon", "bg-cream text-gold-deep"], unavailable: ["Not available", "bg-canvas text-muted border border-dashed border-line"] };

export default function YourApps() {
  const em = useEmail();
  const comp = useCompanion();
  const interests: string[] = useStore((s) => ((s.sessionId ? (s.data[s.sessionId] as any)?.interests : null) as string[]) || []);
  const [text, setText] = useState("");
  const setInterests = (fn: (x: string[]) => string[]) => useStore.getState().patch((d: any) => ({ ...d, interests: fn(d.interests || []).slice(0, 30) }));
  const google = !!googleClientId();
  const g = (kind: "read" | "calendar", flag: "allowRead" | "allowCalendar") => async (v: boolean) => {
    if (!google) { toast.error("Google sign-in isn't set up on this server yet."); return; }
    if (v) { try { await grantGmail(kind); toast.success("Connected."); } catch (e: any) { toast.error(e?.message || "Permission wasn't granted."); } }
    else { forgetGmail(kind as any); patchEmail((x) => ({ ...x, [flag]: false })); }
  };

  const apps: App[] = [
    { key: "gmail", name: "Gmail", does: "Summarises your inbox, reminds you to follow up on emails you've sent, and drafts replies for you to approve.", status: em.allowRead ? "on" : "off", toggle: g("read", "allowRead") },
    { key: "google_calendar", name: "Google Calendar", does: "Adds the plans you approve to your Google Calendar, with email reminders.", status: em.allowCalendar ? "on" : "off", toggle: g("calendar", "allowCalendar") },
    { key: "browser", name: "Browser (Sebastian Companion)", icon: Puzzle, does: "Remembers pages and tasks you haven't finished. Filling in basic details on forms is coming next; never passwords or card numbers.", status: comp.allowed ? "on" : "off", toggle: (v) => patchCompanion((x) => ({ ...x, allowed: v })) },
    { key: "slack", name: "Slack", does: "Will summarise messages you missed in your channels.", status: "soon", note: "Needs a Sebastian Slack app, coming in the next update." },
    { key: "telegram", name: "Telegram", does: "Will summarise messages you forward to Sebastian's Telegram bot.", status: "soon", note: "Telegram only lets apps see messages sent to their bot." },
    { key: "mcp", name: "Other apps (MCP)", icon: Plug, does: "Will connect services such as Zapier or Composio, giving Sebastian safe access to thousands of apps, with your approval for any change.", status: "soon" },
    { key: "instagram", name: "Instagram", does: "Will learn from your own posts (Instagram doesn't share your feed or likes with apps).", status: "soon", note: "Needs Meta's approval." },
    { key: "facebook", name: "Facebook", does: "Will learn from your own posts and pages (Facebook doesn't share your feed with apps).", status: "soon", note: "Needs Meta's approval." },
    { key: "x", name: "X (Twitter)", does: "Could learn from posts you like and follow.", status: "soon", note: "X charges about $200 a month for this access." },
    { key: "whatsapp", name: "WhatsApp", does: "WhatsApp doesn't allow any app to read personal chats.", status: "unavailable", note: "Tip: in WhatsApp, open a chat, choose Export chat, and attach the file in a Sebastian chat for a summary." },
    { key: "linkedin", name: "LinkedIn", does: "LinkedIn doesn't let apps read your feed or job matches.", status: "unavailable", note: "Sebastian will find opportunities on trusted job sites instead, in the next update." },
  ];

  const add = () => { const v = text.trim(); if (!v) return; setInterests((x) => (x.includes(v) ? x : [...x, v])); setText(""); };
  return (
    <Container>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Your apps" }]} title="Your apps" subtitle="Choose which apps Sebastian may look at, so he can learn what you like and keep you a step ahead." />
      <p className="text-[13px] text-muted mb-5 inline-flex items-start gap-2 max-w-3xl"><Eye className="w-4 h-4 text-gold shrink-0 mt-0.5" />View only. Sebastian reads to understand what matters to you. He never posts, sends, changes or deletes anything in your apps without asking you first, and you can switch any app off at any time.</p>

      <section className="rounded-3xl bg-paper border border-line p-5 md:p-6 mb-6">
        <h2 className="t-h3">What should Sebastian look out for?</h2>
        <p className="text-[13px] text-muted mt-1">Tell him what you care about, such as job opportunities, recipes, events or prices. He'll use it when planning tasks, and for alerts as more apps connect.</p>
        <div className="flex gap-2 mt-4"><label htmlFor="int-in" className="sr-only">An interest</label>
          <input id="int-in" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="e.g. Product design jobs in Harare" className="flex-1 min-w-0 h-11 px-4 rounded-xl border border-line bg-canvas text-base md:text-[14px] outline-none focus:border-gold" />
          <button onClick={add} className="h-11 px-4 rounded-xl bg-ink text-white text-[13.5px] inline-flex items-center gap-1.5"><Plus className="w-4 h-4" />Add</button></div>
        {interests.length > 0 && <ul className="flex flex-wrap gap-2 mt-4">{interests.map((i) => (
          <li key={i} className="inline-flex items-center gap-1 h-8 pl-3 pr-1 rounded-pill bg-cream text-[13px]">{i}<button onClick={() => setInterests((x) => x.filter((y) => y !== i))} aria-label={`Remove ${i}`} className="w-6 h-6 rounded-full hover:bg-cream-deep inline-flex items-center justify-center"><X className="w-3 h-3" /></button></li>))}</ul>}
      </section>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {apps.map((a) => { const [chip, cls] = CHIP[a.status]; return (
          <article key={a.key} className={cx("rounded-2xl border p-4 bg-paper flex flex-col", a.status === "unavailable" ? "border-dashed border-line" : "border-line")}>
            <div className="flex items-start gap-3">
              {a.icon ? <span className="w-10 h-10 rounded-xl bg-cream inline-flex items-center justify-center shrink-0"><a.icon className="w-5 h-5 text-gold" aria-hidden /></span> : <AppLogo k={a.key} name={a.name} />}
              <div className="flex-1 min-w-0"><p className="text-[14.5px] font-medium">{a.name}</p><span className={cx("inline-block mt-1 text-[10.5px] rounded-full px-2 py-0.5", cls)}>{chip}</span></div>
              {a.toggle && <Switch on={a.status === "on"} onChange={(v) => a.toggle!(v)} label={`Allow Sebastian to view ${a.name}`} />}
            </div>
            <p className="text-[12.5px] text-muted mt-3 leading-relaxed">{a.does}</p>
            {a.note && <p className="text-[11.5px] text-muted-soft mt-2">{a.note}</p>}
          </article>); })}
      </div>
    </Container>
  );
}
