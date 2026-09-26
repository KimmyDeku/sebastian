export const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
export async function fetchText(url: string, ms = 9000, headers: Record<string, string> = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "accept-language": "en-US,en;q=0.9", ...headers }, signal: ctrl.signal, cache: "no-store" });
    if (!r.ok) throw new Error(`${url} → ${r.status}`);
    return await r.text();
  } finally { clearTimeout(t); }
}
export async function fetchJSON(url: string, init: RequestInit = {}, ms = 9000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
    if (!r.ok) throw new Error(`${url.split("?")[0]} → ${r.status}`);
    return await r.json();
  } finally { clearTimeout(t); }
}
