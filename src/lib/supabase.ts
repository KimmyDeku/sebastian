"use client";
import { createClient } from "@supabase/supabase-js";
import { emptyData, useStore } from "./store";
import type { Account, UserData } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const cloudEnabled = !!(url && anon);
export const supabase: any = cloudEnabled ? createClient(url, anon) : null;

type Profile = Omit<Account, "passwordHash" | "salt">;
export function profileOf(a: Account): Profile {
  const { passwordHash, salt, ...p } = a;
  return p;
}

let lastPushed = "";
function snapshot(id: string) {
  const s = useStore.getState();
  const a = s.accounts.find((x) => x.id === id);
  return JSON.stringify({ profile: a ? profileOf(a) : null, data: s.data[id] });
}

// Loads (or creates) the cloud record for the signed-in user and makes it the active account.
// If this device has an older local account with the same email, its data is carried over.
export async function openCloudAccount(user: { id: string; email?: string; user_metadata?: any }) {
  const { data: row, error } = await supabase.from("sebastian_users").select("profile, data").eq("id", user.id).maybeSingle();
  if (error) throw error;
  const s = useStore.getState();
  let profile: Profile;
  let data: UserData;
  if (row) {
    profile = row.profile;
    data = { ...emptyData(), ...row.data };
  } else {
    const local = s.accounts.find((a) => a.email.toLowerCase() === (user.email || "").toLowerCase());
    profile = { ...(local ? profileOf(local) : {}), ...(user.user_metadata?.profile || {}), id: user.id, email: user.email } as Profile;
    data = local && s.data[local.id] ? s.data[local.id] : emptyData();
    const { error: e2 } = await supabase.from("sebastian_users").insert({ id: user.id, profile, data });
    if (e2) throw e2;
  }
  const account = { ...profile, id: user.id, passwordHash: "", salt: "" } as Account;
  useStore.setState((st) => ({
    accounts: [...st.accounts.filter((a) => a.id !== user.id), account],
    data: { ...st.data, [user.id]: data },
    sessionId: user.id,
  }));
  lastPushed = snapshot(user.id);
}

async function signedInAs(id: string) {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id === id;
}

// Gets the latest copy from the cloud (e.g. changes made on your other device).
export async function pullCloud() {
  const id = useStore.getState().sessionId;
  if (!cloudEnabled || !id || !(await signedInAs(id))) return;
  const { data: row } = await supabase.from("sebastian_users").select("profile, data").eq("id", id).maybeSingle();
  if (!row) return;
  useStore.setState((st) => ({
    accounts: st.accounts.map((a) => (a.id === id ? ({ ...a, ...row.profile, id, passwordHash: "", salt: "" } as Account) : a)),
    data: { ...st.data, [id]: { ...emptyData(), ...row.data } },
  }));
  lastPushed = snapshot(id);
}

// Saves this device's changes to the cloud.
export async function pushCloud() {
  const id = useStore.getState().sessionId;
  if (!cloudEnabled || !id) return;
  const snap = snapshot(id);
  if (snap === lastPushed || !(await signedInAs(id))) return;
  const { profile, data } = JSON.parse(snap);
  const { error } = await supabase.from("sebastian_users").update({ profile, data, updated_at: new Date().toISOString() }).eq("id", id);
  if (!error) lastPushed = snap;
}