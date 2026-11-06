"use client";
import { useEffect, useRef, useState } from "react";
import { CalendarClock, Loader2, ArrowRight } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { VoiceButton } from "../VoiceButton";
import { useSpeaker } from "@/lib/voice";
import { useAccount, useData } from "@/lib/store";
import { formOfAddress } from "@/lib/address";
import { allItems, moveItem, when, timeOf, type Clash } from "@/lib/clash";
import type { CalItem } from "@/lib/gcal";
import { startTask } from "@/lib/agent";
import { logActivity } from "@/lib/activity";
import { toast } from "../ui/Toast";
import { cx } from "@/lib/util";

type Mode = "which" | "when" | "done";
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const Badge = ({ i }: { i: CalItem }) => <span className={cx("text-[10.5px] rounded-full px-2 py-0.5 border", i.source === "google" ? "border-ink/30" : "border-line text-muted")}>{i.source === "google" ? "Google Calendar" : "Sebastian"}</span>;

/** Sebastian's spoken conversation to fix a clash (or move one event): which one, and to when. */
export function ClashDialog() {
  const acc = useAccount(); const d = useData();
  const { speak } = useSpeaker();
  const [clash, setClash] = useState<Clash | null>(null);
  const [moving, setMoving] = useState<CalItem | null>(null);
  const [mode, setMode] = useState<Mode>("which");
  const [line, setLine] = useState("");
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const queue = useRef<Clash[]>([]);
  const who = formOfAddress(acc, d.prefs) || acc?.firstName || "";
  const say = (t: string) => { setLine(t); if (d.prefs.voiceAlerts !== false) { try { speak(t, d.prefs.voiceName); } catch {} } };
  const other = clash && moving ? (clash.a.id === moving.id ? clash.b : clash.a) : null;

  const openClash = (c: Clash) => {
    setClash(c); setMoving(null); setMode("which");
    const day = new Date(c.a.start).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    say(`Pardon me${who ? `, ${who}` : ""}. Two of your plans overlap on ${day}: ${c.a.title} at ${timeOf(c.a.start)} and ${c.b.title} at ${timeOf(c.b.start)}. Which would you like me to move?`);
  };
  const askWhen = (item: CalItem) => {
    setMoving(item); setMode("when");
    const t = new Date(item.start); t.setDate(t.getDate() + 1); setPick(localInput(t));
    say(`Very good. Shall I move ${item.title} to tomorrow at the same time, or to a day and time you prefer?`);
  };
  // Waits politely while another window (like What's new or the welcome tour) is open.
  const whenFree = (fn: () => void) => { const go = () => (document.querySelector('[role="dialog"][aria-modal="true"]') ? setTimeout(go, 1500) : fn()); go(); };
  useEffect(() => {
    const onClash = (e: Event) => { const c = (e as CustomEvent).detail as Clash; if (clash || moving) { queue.current.push(c); return; } whenFree(() => openClash(c)); };
    const onMove = (e: Event) => { const item = (e as CustomEvent).detail as CalItem; setClash(null); askWhen(item); };
    window.addEventListener("sebastian-clash", onClash); window.addEventListener("sebastian-move", onMove);
    return () => { window.removeEventListener("sebastian-clash", onClash); window.removeEventListener("sebastian-move", onMove); };
  });

  const close = () => {
    setClash(null); setMoving(null); setLine("");
    const next = queue.current.shift(); if (next) setTimeout(() => openClash(next), 400);
  };
  const leave = () => { say("Very well. I'll leave them as they are."); setTimeout(close, 1800); };

  const doMove = async (start: Date) => {
    if (!moving || isNaN(start.getTime())) return;
    setBusy(true);
    try {
      const from = moving.start;
      await moveItem(moving, start);
      const len = new Date(moving.end).getTime() - new Date(moving.start).getTime();
      const end = start.getTime() + len;
      const hit = allItems().find((x) => x.id !== moving.id && new Date(x.start).getTime() < end && new Date(x.end).getTime() > start.getTime());
      const text = `I've moved ${moving.title} to ${when(start)}.`;
      logActivity({ kind: "schedule", title: `Rescheduled: ${moving.title}`, href: "/schedule" });
      startTask(`Reschedule ${moving.title}`, "you", { title: `Moved ${moving.title}`, steps: [{ label: `Moved from ${when(from)} to ${when(start)}`, tool: "info", args: { text: `${moving.title} now starts ${when(start)}${moving.source === "google" || moving.gcalId ? ", in Google Calendar too" : ""}. Please let anyone involved know.` }, critical: false }] });
      if (hit) { setMoving({ ...moving, start: start.toISOString(), end: new Date(end).toISOString() }); say(`${text} Just so you know, that also overlaps ${hit.title} at ${timeOf(hit.start)}. Would you like another time?`); }
      else { setMode("done"); say(`Done. ${text} Please let anyone involved know.`); setTimeout(close, 4500); }
    } catch (e: any) {
      toast.error(e?.message || "That couldn't be moved."); say("My apologies, I couldn't move that just now.");
    } finally { setBusy(false); }
  };

  const heardWhich = (t: string) => {
    const s = t.toLowerCase();
    if (/\b(leave|keep|no|neither|cancel)\b/.test(s)) return leave();
    if (!clash) return;
    const words = (x: CalItem) => x.title.toLowerCase().split(/\W+/).filter((w) => w.length >= 4);
    const a = /\bfirst\b/.test(s) || words(clash.a).some((w) => s.includes(w));
    const b = /\bsecond\b|\blast\b/.test(s) || words(clash.b).some((w) => s.includes(w));
    if (a && !b) askWhen(clash.a); else if (b && !a) askWhen(clash.b);
    else say(`Sorry, which one: ${clash.a.title} or ${clash.b.title}?`);
  };
  const heardWhen = async (t: string) => {
    if (!moving) return;
    const s = t.toLowerCase().trim();
    const orig = new Date(moving.start);
    if (/^(yes|yes please|tomorrow|tomorrow please|the next day|next day)[.!]?$/.test(s) || (/tomorrow|next day/.test(s) && !/\d|morning|afternoon|evening|noon/.test(s))) { const x = new Date(orig); x.setDate(x.getDate() + 1); return doMove(x); }
    setBusy(true);
    const now = new Date();
    const r = await fetch("/api/agent/when", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: t, now: localInput(now), weekday: now.toLocaleDateString("en-GB", { weekday: "long" }), original: localInput(orig) }) }).then((x) => x.json()).catch(() => ({ ok: false }));
    setBusy(false);
    if (r.ok && r.start) return doMove(new Date(r.start));
    say("I'm sorry, I didn't catch the day. Could you say it again, or choose it below?");
  };

  const open = !!(clash || moving);
  if (!open) return null;
  const tomorrow = moving ? (() => { const x = new Date(moving.start); x.setDate(x.getDate() + 1); return x; })() : null;
  const afterOther = other && moving && sameDay(new Date(other.start), new Date(moving.start)) ? new Date(other.end) : null;
  return (
    <Modal open onClose={close} title={mode === "done" ? "All sorted" : moving && !clash ? `Move ${moving.title}` : "Two plans overlap"}>
      <div className="flex items-start gap-3 rounded-2xl bg-cream/60 border border-line p-3 mb-4">
        <CalendarClock className="w-5 h-5 text-gold shrink-0 mt-0.5" aria-hidden />
        <p className="text-[13.5px] leading-relaxed" aria-live="polite">{line}</p>
      </div>
      {clash && mode === "which" && (
        <>
          <div className="space-y-2">
            {[clash.a, clash.b].map((x) => (
              <button key={x.id} onClick={() => askWhen(x)} className="w-full text-left rounded-2xl border border-line p-3 hover:bg-cream/50 flex items-center gap-3">
                <span className="flex-1 min-w-0"><span className="block text-[14px] font-medium truncate">Move {x.title}</span><span className="block text-[12px] text-muted">{when(x.start)}</span></span>
                <Badge i={x} /><ArrowRight className="w-4 h-4 text-muted" />
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4">
            <button onClick={leave} className="text-[13px] text-muted underline">Leave them as they are</button>
            <span className="inline-flex items-center gap-2 text-[12px] text-muted">Or just say it<VoiceButton size={40} onText={heardWhich} /></span>
          </div>
        </>
      )}
      {moving && mode === "when" && (
        <>
          <div className="space-y-2">
            {tomorrow && <Button className="w-full justify-center" onClick={() => doMove(tomorrow)} disabled={busy}>Tomorrow, same time ({tomorrow.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}, {timeOf(tomorrow)})</Button>}
            {afterOther && <Button variant="outline" className="w-full justify-center" onClick={() => doMove(afterOther)} disabled={busy}>Straight after {other!.title} ({timeOf(afterOther)})</Button>}
          </div>
          <p className="text-[12px] text-muted mt-4 mb-1.5">Or choose a day and time</p>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="move-when">New day and time</label>
            <input id="move-when" type="datetime-local" value={pick} onChange={(e) => setPick(e.target.value)} className="flex-1 h-11 px-3 rounded-xl border border-line bg-canvas text-base md:text-[14px] outline-none focus:border-gold" />
            <Button variant="outline" onClick={() => doMove(new Date(pick))} disabled={busy || !pick}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Move it"}</Button>
          </div>
          <div className="flex items-center justify-between mt-4">
            <button onClick={close} className="text-[13px] text-muted underline">Not now</button>
            <span className="inline-flex items-center gap-2 text-[12px] text-muted">Or say when, like &ldquo;Friday at 3&rdquo;<VoiceButton size={40} onText={heardWhen} /></span>
          </div>
        </>
      )}
      {mode === "done" && <div className="flex justify-end"><Button onClick={close}>Thank you</Button></div>}
    </Modal>
  );
}
