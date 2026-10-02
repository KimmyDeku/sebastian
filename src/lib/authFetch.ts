"use client";
// Adds the user's sign-in to every request to Sebastian's own server functions, and notices
// when the trial has ended. Installed once, so every part of the app is covered.
import { cloudEnabled, supabase } from "./supabase";

let token: string | null = null;
let installed = false;
export type TrialState = { ends: string | null; exempt: boolean; ended: boolean };
const state: TrialState = { ends: null, exempt: false, ended: false };
export const trialState = () => state;
const emit = () => window.dispatchEvent(new CustomEvent("sebastian-trial", { detail: { ...state } }));

export function installAuthFetch() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  if (cloudEnabled) {
    supabase.auth.getSession().then(({ data }: any) => { token = data?.session?.access_token || null; });
    supabase.auth.onAuthStateChange((_e: string, session: any) => { token = session?.access_token || null; });
  }
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const href = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const ours = href.startsWith("/api/") || href.startsWith(`${window.location.origin}/api/`);
    if (!ours) return original(input, init);
    if (!token && cloudEnabled) { try { const { data } = await supabase.auth.getSession(); token = data?.session?.access_token || null; } catch {} }
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    if (token && !headers.has("authorization")) headers.set("authorization", `Bearer ${token}`);
    const res = await original(input, { ...init, headers });
    const t = res.headers.get("x-sebastian-trial");
    if (t) { const next = t === "exempt" ? { exempt: true, ends: null } : { exempt: false, ends: t }; if (next.exempt !== state.exempt || next.ends !== state.ends) { Object.assign(state, next); emit(); } }
    if (res.status === 403 || res.status === 401) {
      try { const j = await res.clone().json(); if (j?.code === "trial_ended" && !state.ended) { state.ended = true; emit(); } } catch {}
    }
    return res;
  };
}
