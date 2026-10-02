"use client";
import { useEffect, useRef } from "react";
import { useStore, actions, useAccount } from "@/lib/store";
import { toast } from "../ui/Toast";
import { useSpeaker } from "@/lib/voice";
import { playChime, primeAudio } from "@/lib/sound";
import { ensureServiceWorker, pushNotify } from "@/lib/notify";
import { translateText } from "@/lib/translator";
import { alertPhrase } from "@/lib/alertPhrase";
import { pushEndpoint } from "@/lib/push";

/**
 * Checks the schedule and alerts before events: a chime, a notification and a spoken
 * "Pardon me…". For privacy, the notification and the voice never mention what the reminder is
 * about. The details only appear inside Sebastian, on the pending-reminders note.
 */
export function ReminderEngine() {
  const acc = useAccount();
  const { speak } = useSpeaker();
  const speakRef = useRef(speak);
  speakRef.current = speak;

  useEffect(() => { primeAudio(); ensureServiceWorker(); }, []);

  useEffect(() => {
    const tick = async () => {
      const s = useStore.getState();
      const d = s.sessionId ? s.data[s.sessionId] : null;
      if (!d || !d.prefs.notifications) return;
      const now = Date.now();
      const due = d.schedule.filter((e) => {
        if (e.remindMinutes == null || e.notified) return false;
        const start = new Date(e.start).getTime();
        return now >= start - e.remindMinutes * 60000 && now < start + 6 * 3600000;
      });
      if (!due.length) return;
      due.forEach((e) => actions.updateEvent(e.id, { notified: true, seen: false }));

      const line = alertPhrase(acc, d.prefs.useTitle);
      toast.info(`${line} It's on your pending reminders note.`);
      // With push switched on, the server sends the notification; otherwise show one from here.
      if (!pushEndpoint()) pushNotify("Sebastian", line, { tag: "sebastian-reminder", url: "/schedule" });

      let wait = 0;
      if (d.prefs.alarmSound !== false) wait = playChime();
      if (d.prefs.voiceAlerts !== false) {
        const spoken = await translateText(line);
        setTimeout(() => speakRef.current(spoken, d.prefs.voiceName), wait);
      }
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
