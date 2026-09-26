"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { cloudEnabled, pullCloud, pushCloud, supabase } from "@/lib/supabase";

/** Keeps this device and the cloud in step, so every device sees the same account and data. */
export function CloudSync() {
  useEffect(() => {
    if (!cloudEnabled) return;
    let timer: any;
    let session = useStore.getState().sessionId;
    pullCloud();
    const unsub = useStore.subscribe((s) => {
      if (session && !s.sessionId) supabase.auth.signOut(); // logged out
      session = s.sessionId;
      clearTimeout(timer);
      timer = setTimeout(pushCloud, 1200);
    });
    const onVisibility = () => (document.visibilityState === "visible" ? pullCloud() : pushCloud());
    document.addEventListener("visibilitychange", onVisibility);
    return () => { unsub(); clearTimeout(timer); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);
  return null;
}