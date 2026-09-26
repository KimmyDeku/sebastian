"use client";
import { useEffect } from "react";
import { useStore, actions, useAccount } from "@/lib/store";
import { toast } from "../ui/Toast";
import { formOfAddress } from "@/lib/address";

/** Sebastian's internal reminder memory: checks the schedule and nudges before events. */
export function ReminderEngine() {
  const acc = useAccount();
  useEffect(() => {
    const tick = () => {
      const s = useStore.getState();
      const d = s.sessionId ? s.data[s.sessionId] : null;
      if (!d || !d.prefs.notifications) return;
      const now = Date.now();
      d.schedule.forEach((e) => {
        if (e.remindMinutes == null || e.notified) return;
        const start = new Date(e.start).getTime();
        const at = start - e.remindMinutes * 60000;
        if (now >= at && now < start + 6 * 3600000) {
          const who = formOfAddress(acc, d.prefs);
          const msg = `${who ? who + ", a" : "A"} reminder: ${e.title} ${start > now ? "at " + new Date(e.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "is now"}.`;
          toast.info(msg);
          if (typeof Notification !== "undefined" && Notification.permission === "granted") { try { new Notification("Sebastian", { body: msg, icon: "/favicon.svg" }); } catch {} }
          actions.updateEvent(e.id, { notified: true });
        }
      });
    };
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, [acc]);
  return null;
}

export function OfflineWatcher() {
  useEffect(() => {
    const off = () => toast.offline("You're offline. Your schedule, cookbook and finances still work; searches will wait for a connection.");
    const on = () => toast.success("Back online.");
    window.addEventListener("offline", off);
    window.addEventListener("online", on);
    return () => { window.removeEventListener("offline", off); window.removeEventListener("online", on); };
  }, []);
  return null;
}
