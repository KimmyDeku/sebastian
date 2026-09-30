import { getLang } from "./i18n";
import { recordCodingUsage } from "./notebook";
import { logFromApi } from "./activity";

export type ApiResult<T> = { ok: boolean; code?: string; error?: string; offline?: boolean } & T;

export async function api<T = any>(url: string, body?: any, method = body ? "POST" : "GET"): Promise<ApiResult<T>> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return { ok: false, offline: true, code: "offline", error: "You're offline. Local actions still work; online searches will resume when you reconnect." } as ApiResult<T>;
  try {
    const headers: Record<string, string> = { "x-sebastian-lang": getLang() };
    if (body) headers["content-type"] = "application/json";
    const r = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({ ok: false, error: `The service returned an unreadable response (${r.status}).` }));
    if (j?.codingUsage) { try { recordCodingUsage(j.codingUsage); } catch {} }
    try { logFromApi(url, body, j); } catch {}
    return j;
  } catch (e: any) {
    return { ok: false, code: "network", error: "The request could not reach Sebastian's server. Check your connection and try again." } as ApiResult<T>;
  }
}
