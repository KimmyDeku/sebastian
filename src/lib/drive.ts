"use client";
/**
 * Google Drive sync for Research notebooks.
 * - Each notebook is kept as a Google Doc in "Sebastian Notebooks" (add it to NotebookLM once,
 *   then use NotebookLM's "Sync with Google Drive" to refresh it).
 * - Large imported files are stored in "Sebastian Notebooks/Imported files", and Sebastian keeps a
 *   short preview locally, fetching the full text from Drive when it's needed.
 * Uses the drive.file permission: Sebastian can only see files it created itself.
 */
import type { Notebook, Source } from "./notebook";

const SCOPE = "https://www.googleapis.com/auth/drive.file openid email";
const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
export const PREVIEW_CHARS = 6000;
export const clientId = () => process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

let gis: Promise<any> | null = null;
let token: { value: string; exp: number } | null = null;

function loadGis(): Promise<any> {
  const w = window as any;
  if (w.google?.accounts?.oauth2) return Promise.resolve(w.google);
  if (!gis) gis = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => resolve(w.google);
    s.onerror = () => { gis = null; reject(new Error("Google sign-in couldn't load. Check your connection.")); };
    document.head.appendChild(s);
  });
  return gis;
}

function saved() {
  if (token && token.exp > Date.now() + 60000) return token.value;
  try { const t = JSON.parse(sessionStorage.getItem("sebastian-drive-token") || "null"); if (t && t.exp > Date.now() + 60000) { token = t; return t.value; } } catch {}
  return null;
}
export const hasToken = () => !!saved();

/** Gets an access token. Interactive requests must come from a tap or click (browsers block pop-ups otherwise). */
export async function getToken(interactive: boolean, consent = false): Promise<string> {
  const t = saved();
  if (t) return t;
  if (!interactive) throw new Error("reconnect");
  if (!clientId()) throw new Error("Google Drive isn't set up yet (NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing).");
  const g = await loadGis();
  return new Promise((resolve, reject) => {
    const client = g.accounts.oauth2.initTokenClient({
      client_id: clientId(), scope: SCOPE,
      callback: (r: any) => {
        if (r.error || !r.access_token) { reject(new Error(r.error_description || r.error || "Google sign-in was cancelled.")); return; }
        token = { value: r.access_token, exp: Date.now() + (Number(r.expires_in) || 3600) * 1000 };
        try { sessionStorage.setItem("sebastian-drive-token", JSON.stringify(token)); } catch {}
        resolve(token.value);
      },
      error_callback: (e: any) => reject(new Error(e?.type === "popup_closed" ? "Google sign-in was closed." : "Google sign-in was blocked. Allow pop-ups for this site and try again.")),
    });
    client.requestAccessToken({ prompt: consent ? "consent" : "" });
  });
}

export async function disconnect() {
  const t = saved();
  token = null;
  try { sessionStorage.removeItem("sebastian-drive-token"); } catch {}
  if (t) { try { const g = await loadGis(); g.accounts.oauth2.revoke(t, () => {}); } catch {} }
}

async function call(path: string, init: RequestInit & { upload?: boolean } = {}, interactive = false) {
  const t = await getToken(interactive);
  const r = await fetch(`${init.upload ? UPLOAD : API}${path}`, { ...init, headers: { Authorization: `Bearer ${t}`, ...(init.headers || {}) } });
  if (r.status === 401) { token = null; try { sessionStorage.removeItem("sebastian-drive-token"); } catch {} throw new Error("reconnect"); }
  if (!r.ok) { const j = await r.json().catch(() => ({})); const e: any = new Error(j?.error?.message || `Google Drive returned ${r.status}`); e.status = r.status; throw e; }
  return r;
}

export async function whoAmI(interactive = true) {
  const t = await getToken(interactive);
  const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${t}` } });
  return r.ok ? ((await r.json()).email as string) : undefined;
}

async function findOrCreateFolder(name: string, parent?: string, interactive = false) {
  const q = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parent ? ` and '${parent}' in parents` : ""}`;
  const r = await call(`/files?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`, {}, interactive);
  const hit = (await r.json()).files?.[0]?.id;
  if (hit) return hit as string;
  const c = await call(`/files?fields=id`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", ...(parent ? { parents: [parent] } : {}) }) }, interactive);
  return (await c.json()).id as string;
}

/** Makes sure the "Sebastian Notebooks" and "Imported files" folders exist. */
export async function ensureFolders(interactive = false) {
  const folderId = await findOrCreateFolder("Sebastian Notebooks", undefined, interactive);
  const sourcesFolderId = await findOrCreateFolder("Imported files", folderId, interactive);
  return { folderId, sourcesFolderId };
}

function multipart(meta: any, body: string, type: string) {
  const b = "sebastian" + Math.random().toString(36).slice(2);
  return { headers: { "content-type": `multipart/related; boundary=${b}` }, body: `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: ${type}; charset=UTF-8\r\n\r\n${body}\r\n--${b}--` };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function notebookHtml(n: Notebook, full: Record<string, string>) {
  const parts = n.sources.map((s, i) => {
    const text = full[s.id] ?? s.text;
    const paras = text.split(/\n{2,}|\r\n\r\n/).map((p) => `<p>${esc(p.trim()).replace(/\n/g, "<br>")}</p>`).join("");
    return `<h2>[${i + 1}] ${esc(s.title)}</h2>${s.url ? `<p><a href="${esc(s.url)}">${esc(s.url)}</a></p>` : ""}${paras}`;
  }).join("");
  return `<html><body><h1>${esc(n.title)}</h1><p><i>Synced from Sebastian on ${new Date().toLocaleString("en-GB")}. Edit this notebook in Sebastian; changes here will be replaced at the next sync.</i></p>${parts || "<p>No sources yet.</p>"}</body></html>`;
}

/** Creates or updates the notebook's Google Doc. Returns its id and link. */
export async function syncNotebook(n: Notebook, folderId: string, full: Record<string, string>) {
  const html = notebookHtml(n, full);
  const name = `${n.title} (Sebastian)`;
  if (n.driveDocId) {
    try {
      await call(`/files/${n.driveDocId}?uploadType=media&fields=id`, { upload: true, method: "PATCH", headers: { "content-type": "text/html; charset=UTF-8" }, body: html });
      await call(`/files/${n.driveDocId}?fields=id`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
      return { id: n.driveDocId, url: n.driveUrl || `https://docs.google.com/document/d/${n.driveDocId}/edit` };
    } catch (e: any) {
      if (e.message === "reconnect" || e.status !== 404) throw e; // the Doc was deleted in Drive: make a new one
    }
  }
  const m = multipart({ name, parents: [folderId], mimeType: "application/vnd.google-apps.document" }, html, "text/html");
  const r = await call(`/files?uploadType=multipart&fields=id,webViewLink`, { upload: true, method: "POST", ...m });
  const j = await r.json();
  return { id: j.id as string, url: (j.webViewLink as string) || `https://docs.google.com/document/d/${j.id}/edit` };
}

/** Saves an imported file's full text to Drive. */
export async function storeSource(s: Pick<Source, "title" | "text">, sourcesFolderId: string, interactive = false) {
  const m = multipart({ name: `${s.title}.txt`, parents: [sourcesFolderId], mimeType: "text/plain" }, s.text, "text/plain");
  const r = await call(`/files?uploadType=multipart&fields=id`, { upload: true, method: "POST", ...m }, interactive);
  return (await r.json()).id as string;
}

export async function readSource(id: string, interactive = false) {
  const r = await call(`/files/${id}?alt=media`, {}, interactive);
  return r.text();
}

export async function removeFile(id: string) {
  try { await call(`/files/${id}`, { method: "DELETE" }); } catch {}
}

/** Full text for every source: offloaded ones are read back from Drive (falls back to the preview). */
export async function fullTexts(sources: Source[], interactive: boolean) {
  const out: Record<string, string> = {};
  await Promise.all(sources.map(async (s) => {
    if (s.offloaded && s.driveId) { try { out[s.id] = await readSource(s.driveId, interactive); return; } catch {} }
    out[s.id] = s.text;
  }));
  return out;
}
