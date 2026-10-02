"use client";
/**
 * Gmail for Sebastian, used directly from the browser with the user's permission.
 * Two separate permissions: "send" (gmail.send) and "read" (gmail.readonly).
 * Nothing is ever sent without the user pressing Send in Sebastian's confirmation step.
 */
import { useStore } from "./store";
import { uid } from "./util";

export const SCOPES = {
  send: "https://www.googleapis.com/auth/gmail.send openid email",
  read: "https://www.googleapis.com/auth/gmail.readonly openid email",
  calendar: "https://www.googleapis.com/auth/calendar.events openid email",
} as const;
const SCOPE_MARK: Record<string, string> = { send: "gmail.send", read: "gmail.readonly", calendar: "calendar.events" };
type Kind = keyof typeof SCOPES;
const API = "https://gmail.googleapis.com/gmail/v1/users/me";
export const googleClientId = () => process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

/* ---------- Saved email data (with the user's account) ---------- */
export type FollowUp = { id: string; to: string; toName?: string; subject: string; threadId?: string; sentAt: string; due: string; status: "waiting" | "replied" | "dismissed"; eventId?: string };
export type SentItem = { id: string; threadId?: string; to: string; cc?: string; subject: string; at: string };
export type EmailData = { allowSend: boolean; allowRead: boolean; allowCalendar?: boolean; address?: string; followUps: FollowUp[]; sent: SentItem[]; replied?: string[] };
const EMPTY: EmailData = { allowSend: false, allowRead: false, followUps: [], sent: [] };
const filled = new WeakMap<object, EmailData>();
export function useEmail(): EmailData {
  return useStore((s) => {
    const e: any = s.sessionId ? (s.data[s.sessionId] as any)?.email : null;
    if (!e) return EMPTY;
    let v = filled.get(e);
    if (!v) { v = { ...EMPTY, ...e } as EmailData; filled.set(e, v); }
    return v;
  });
}
export function patchEmail(fn: (e: EmailData) => EmailData) {
  useStore.getState().patch((d: any) => ({ ...d, email: fn({ ...EMPTY, ...(d.email || {}) }) }));
}
export const emailId = () => uid("em_");

/* ---------- Google sign-in (one token per permission) ---------- */
let gis: Promise<any> | null = null;
const tokens: Partial<Record<Kind, { value: string; exp: number }>> = {};
function loadGis(): Promise<any> {
  const w = window as any;
  if (w.google?.accounts?.oauth2) return Promise.resolve(w.google);
  if (!gis) gis = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client"; s.async = true;
    s.onload = () => resolve(w.google);
    s.onerror = () => { gis = null; reject(new Error("Google sign-in couldn't load. Check your connection.")); };
    document.head.appendChild(s);
  });
  return gis;
}
function cached(kind: Kind) {
  const t = tokens[kind];
  if (t && t.exp > Date.now() + 60000) return t.value;
  try { const s = JSON.parse(sessionStorage.getItem(`sebastian-gmail-${kind}`) || "null"); if (s && s.exp > Date.now() + 60000) { tokens[kind] = s; return s.value; } } catch {}
  return null;
}
export const hasGmailToken = (kind: Kind) => !!cached(kind);

/** Asks Google for permission. Must be called from a tap or click (browsers block the pop-up otherwise). */
export async function gmailToken(kind: Kind, consent = false): Promise<string> {
  const t = cached(kind);
  if (t) return t;
  if (!googleClientId()) throw new Error("Gmail isn't set up on this server yet (NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing).");
  const g = await loadGis();
  return new Promise((resolve, reject) => {
    g.accounts.oauth2.initTokenClient({
      client_id: googleClientId(), scope: SCOPES[kind], include_granted_scopes: false,
      callback: (r: any) => {
        if (r.error || !r.access_token) { reject(new Error(r.error_description || "Google permission wasn't granted.")); return; }
        if (!String(r.scope || "").includes(SCOPE_MARK[kind])) { reject(new Error(`The ${kind === "calendar" ? "Google Calendar" : "Gmail"} permission wasn't ticked on Google's screen. Please try again and allow it.`)); return; }
        const tok = { value: r.access_token, exp: Date.now() + (Number(r.expires_in) || 3600) * 1000 };
        tokens[kind] = tok;
        try { sessionStorage.setItem(`sebastian-gmail-${kind}`, JSON.stringify(tok)); } catch {}
        resolve(tok.value);
      },
      error_callback: (e: any) => reject(new Error(e?.type === "popup_closed" ? "Google's window was closed before permission was given." : "Google's window was blocked. Allow pop-ups for this site and try again.")),
    }).requestAccessToken({ prompt: consent ? "consent" : "" });
  });
}
export function forgetGmail(kind: Kind) {
  delete tokens[kind];
  try { sessionStorage.removeItem(`sebastian-gmail-${kind}`); } catch {}
}
export async function googleEmail(token: string) {
  const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${token}` } });
  return r.ok ? ((await r.json()).email as string) : undefined;
}

export async function gcall(kind: Kind, path: string, init: RequestInit = {}) {
  const token = await gmailToken(kind);
  const r = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
  if (r.status === 401) { forgetGmail(kind); throw new Error("Gmail needs you to sign in again."); }
  if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j?.error?.message || `Gmail returned ${r.status}`); }
  return r.json();
}

/* ---------- Sending ---------- */
const enc = new TextEncoder();
function b64(bytes: Uint8Array) { let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); }
const b64u = (bytes: Uint8Array) => b64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const wrap76 = (s: string) => s.replace(/(.{76})/g, "$1\r\n");
const header = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(enc.encode(s))}?=`);
const cleanList = (s?: string) => (s || "").split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean).join(", ");
export const validEmail = (s: string) => /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/.test(s.trim());
export const validList = (s?: string) => !cleanList(s) || cleanList(s).split(", ").every(validEmail);

export type Outgoing = { to: string; cc?: string; bcc?: string; subject: string; body: string; attachments?: File[]; threadId?: string; inReplyTo?: string };

/** Sends through Gmail. Returns Gmail's message and thread ids. Throws if Gmail doesn't confirm. */
export async function sendEmail(m: Outgoing) {
  const boundary = "sebastian_" + Math.random().toString(36).slice(2);
  const lines = [`To: ${cleanList(m.to)}`];
  if (cleanList(m.cc)) lines.push(`Cc: ${cleanList(m.cc)}`);
  if (cleanList(m.bcc)) lines.push(`Bcc: ${cleanList(m.bcc)}`);
  lines.push(`Subject: ${header(m.subject)}`, "MIME-Version: 1.0");
  if (m.inReplyTo) lines.push(`In-Reply-To: ${m.inReplyTo}`, `References: ${m.inReplyTo}`);
  const textPart = [`Content-Type: text/plain; charset="UTF-8"`, "Content-Transfer-Encoding: base64", "", wrap76(b64(enc.encode(m.body)))].join("\r\n");
  let mime: string;
  if (m.attachments?.length) {
    const parts = [textPart];
    for (const f of m.attachments) {
      const data = new Uint8Array(await f.arrayBuffer());
      const name = header(f.name).replace(/"/g, "");
      parts.push([`Content-Type: ${f.type || "application/octet-stream"}; name="${name}"`, `Content-Disposition: attachment; filename="${name}"`, "Content-Transfer-Encoding: base64", "", wrap76(b64(data))].join("\r\n"));
    }
    mime = [...lines, `Content-Type: multipart/mixed; boundary="${boundary}"`, "", ...parts.map((p) => `--${boundary}\r\n${p}`), `--${boundary}--`].join("\r\n");
  } else {
    mime = [...lines, textPart].join("\r\n");
  }
  const r = await gcall("send", "/messages/send", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ raw: b64u(enc.encode(mime)), ...(m.threadId ? { threadId: m.threadId } : {}) }) });
  if (!r?.id) throw new Error("Gmail didn't confirm the message.");
  return { id: r.id as string, threadId: r.threadId as string };
}

/* ---------- Reading ---------- */
export type MailSummary = { id: string; threadId: string; from: string; fromEmail: string; subject: string; date: string; snippet: string; unread: boolean; messageId?: string };
const hdr = (m: any, name: string) => (m.payload?.headers || []).find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
const decodeEntities = (s: string) => { const t = document.createElement("textarea"); t.innerHTML = s; return t.value; };

function toSummary(m: any): MailSummary {
  const from = hdr(m, "From");
  const email = (from.match(/<([^>]+)>/)?.[1] || from).trim();
  return { id: m.id, threadId: m.threadId, from: from.replace(/<[^>]+>/, "").replace(/"/g, "").trim() || email, fromEmail: email, subject: hdr(m, "Subject") || "(no subject)",
    date: m.internalDate ? new Date(Number(m.internalDate)).toISOString() : hdr(m, "Date"), snippet: decodeEntities(m.snippet || ""), unread: (m.labelIds || []).includes("UNREAD"), messageId: hdr(m, "Message-ID") || undefined };
}

export async function listEmails(q = "newer_than:1d", max = 15): Promise<MailSummary[]> {
  const list = await gcall("read", `/messages?maxResults=${max}&q=${encodeURIComponent(q)}`);
  const ids: string[] = (list.messages || []).map((x: any) => x.id);
  const msgs = await Promise.all(ids.map((id) => gcall("read", `/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=Message-ID`)));
  return msgs.map(toSummary);
}

function walkText(p: any): { text: string; html: string } {
  let text = "", html = "";
  const dec = (d: string) => { try { return new TextDecoder().decode(Uint8Array.from(atob(d.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))); } catch { return ""; } };
  const visit = (x: any) => {
    if (!x) return;
    if (x.mimeType === "text/plain" && x.body?.data) text += dec(x.body.data);
    else if (x.mimeType === "text/html" && x.body?.data) html += dec(x.body.data);
    (x.parts || []).forEach(visit);
  };
  visit(p);
  return { text, html };
}
export async function readEmail(id: string) {
  const m = await gcall("read", `/messages/${id}?format=full`);
  const { text, html } = walkText(m.payload);
  const body = text.trim() || (html ? new DOMParser().parseFromString(html, "text/html").body.innerText : m.snippet || "");
  return { ...toSummary(m), body: body.replace(/\n{3,}/g, "\n\n").trim(), to: hdr(m, "To"), cc: hdr(m, "Cc") };
}

/** Has anyone replied in this thread since it was sent? */
export async function threadHasReply(threadId: string, sentAt: string, myAddress?: string) {
  const t = await gcall("read", `/threads/${threadId}?format=metadata&metadataHeaders=From`);
  return (t.messages || []).some((m: any) => Number(m.internalDate) > new Date(sentAt).getTime() + 1000 && !(myAddress && hdr(m, "From").toLowerCase().includes(myAddress.toLowerCase())));
}
