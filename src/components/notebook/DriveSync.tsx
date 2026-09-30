"use client";
import { useEffect, useRef, useState } from "react";
import { Cloud, CloudOff, Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "../ui/Button";
import { useNotebook, patchNotebook, type Notebook, type Source } from "@/lib/notebook";
import { clientId, disconnect, ensureFolders, fullTexts, getToken, hasToken, PREVIEW_CHARS, storeSource, syncNotebook, whoAmI } from "@/lib/drive";
import { relTime } from "@/lib/util";
import { toast } from "../ui/Toast";

const setMeta = (id: string, meta: Partial<Notebook>) => patchNotebook((d) => ({ ...d, notebooks: d.notebooks.map((n) => (n.id === id ? { ...n, ...meta } : n)) }));

/** Connect from a tap or click (Google shows its sign-in pop-up). */
export async function connectDrive() {
  await getToken(true, true);
  const email = await whoAmI(false).catch(() => undefined);
  const f = await ensureFolders(false);
  patchNotebook((d) => ({ ...d, drive: { connected: true, email, ...f, offload: d.drive?.offload ?? true } }));
  toast.success("Google Drive connected. Your notebooks will sync automatically.");
}
export async function disconnectDrive() {
  await disconnect();
  patchNotebook((d) => ({ ...d, drive: { ...(d.drive || {}), connected: false } }));
  toast.info("Google Drive disconnected. Your Docs stay in your Drive.");
}

/** Moves an imported source's full text to Drive, keeping a preview here. */
export async function offloadSource(s: Source): Promise<Source> {
  const nb = (window as any).__sebastianDrive as { connected?: boolean; sourcesFolderId?: string; offload?: boolean } | undefined;
  if (!nb?.connected || !nb.sourcesFolderId || nb.offload === false) return s;
  try {
    const driveId = await storeSource(s, nb.sourcesFolderId, true);
    const long = s.text.length > PREVIEW_CHARS;
    return { ...s, driveId, size: s.text.length, offloaded: long, text: long ? s.text.slice(0, PREVIEW_CHARS) : s.text };
  } catch { return s; }
}

/** The source texts to send to Sebastian's AI: offloaded ones are read back from Drive. */
export async function sourcesForAI(n: Notebook) {
  if (!n.sources.some((s) => s.offloaded)) return n.sources;
  const full = await fullTexts(n.sources, true);
  return n.sources.map((s) => ({ ...s, text: full[s.id] ?? s.text }));
}

/** Status bar, plus automatic sync a few seconds after any change. */
export function DriveBar({ current }: { current: Notebook | null }) {
  const nb = useNotebook();
  const drive = nb.drive;
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [paused, setPaused] = useState(false);
  const timer = useRef<any>(null);
  useEffect(() => { (window as any).__sebastianDrive = drive; }, [drive]);

  const syncDirty = async (interactive: boolean) => {
    if (!drive?.connected || !drive.folderId) return;
    const dirty = nb.notebooks.filter((n) => !n.driveDocId || !n.syncedAt || n.updatedAt > n.syncedAt);
    if (!dirty.length) return;
    if (!interactive && !hasToken()) { setPaused(true); return; }
    setSyncing(true);
    try {
      for (const n of dirty) {
        const full = await fullTexts(n.sources, interactive);
        const r = await syncNotebook(n, drive.folderId, full);
        setMeta(n.id, { driveDocId: r.id, driveUrl: r.url, syncedAt: new Date().toISOString() });
      }
      setPaused(false);
    } catch (e: any) {
      if (e?.message === "reconnect") setPaused(true); else toast.error(`Drive sync failed: ${e?.message || e}`);
    } finally { setSyncing(false); }
  };

  useEffect(() => {
    clearTimeout(timer.current);
    if (drive?.connected) timer.current = setTimeout(() => syncDirty(false), 4000);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nb.notebooks, drive?.connected]);

  if (!clientId()) return <p className="text-[12px] text-muted mb-4 inline-flex items-center gap-1.5"><CloudOff className="w-4 h-4" />Google Drive sync becomes available once NEXT_PUBLIC_GOOGLE_CLIENT_ID is set up.</p>;

  if (!drive?.connected) return (
    <div className="rounded-2xl border border-line bg-paper p-4 mb-5 flex flex-wrap items-center gap-3">
      <Cloud className="w-5 h-5 text-gold shrink-0" aria-hidden />
      <p className="flex-1 min-w-[220px] text-[13px]"><span className="font-medium">Sync with Google Drive.</span> <span className="text-muted">Each notebook is kept as a Google Doc you can add to NotebookLM, and imported files are stored in your Drive to save space here. Sebastian can only see the files it creates.</span></p>
      <Button size="sm" loading={busy} onClick={async () => { setBusy(true); try { await connectDrive(); } catch (e: any) { toast.error(e?.message || "Google Drive couldn't connect."); } setBusy(false); }}>Connect Google Drive</Button>
    </div>
  );

  const synced = current?.syncedAt && current.updatedAt <= current.syncedAt;
  return (
    <div className="rounded-2xl border border-line bg-paper px-4 py-3 mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px]">
      <span className="inline-flex items-center gap-1.5"><Cloud className="w-4 h-4 text-success" aria-hidden />Google Drive{drive.email ? ` · ${drive.email}` : ""}</span>
      {current && (syncing ? <span className="inline-flex items-center gap-1.5 text-muted"><Loader2 className="w-3.5 h-3.5 animate-spin" />Syncing…</span>
        : paused ? <span className="text-warning">Sync paused: Google needs you to sign in again.</span>
        : synced ? <span className="text-muted">Synced {relTime(current.syncedAt!)}</span> : <span className="text-muted">Changes will sync shortly</span>)}
      <span className="ml-auto flex items-center gap-2">
        {current?.driveUrl && <a href={current.driveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2">Open Google Doc<ExternalLink className="w-3.5 h-3.5" /></a>}
        <button onClick={() => syncDirty(true)} className="inline-flex items-center gap-1 h-8 px-3 rounded-pill border border-line hover:bg-cream/60"><RefreshCw className="w-3.5 h-3.5" />{paused ? "Reconnect and sync" : "Sync now"}</button>
      </span>
    </div>
  );
}
