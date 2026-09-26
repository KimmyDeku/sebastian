export const uid = (p = "") => p + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export const money = (n: number, cur = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n || 0);
export const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
export function relTime(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)} min ago`;
  if (d < 86400) { const h = Math.floor(d / 3600); return `${h} hour${h > 1 ? "s" : ""} ago`; }
  const days = Math.floor(d / 86400);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}
export function fmtDateTime(iso: string, tz?: string) {
  try {
    return new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: tz });
  } catch { return new Date(iso).toLocaleString(); }
}
export function fmtDate(iso: string) {
  if (!iso) return "";
  return new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
export function daysBetween(a: string, b: string) {
  return Math.max(1, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}
export async function hashPassword(pw: string, salt: string) {
  const data = new TextEncoder().encode(salt + ":" + pw);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export function monthKey(d: string | Date) {
  const x = typeof d === "string" ? new Date(d) : d;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
}

// Turns whatever shape the AI returns (text, numbers, objects, lists) into readable text.
export function toText(x: any): string {
  if (x == null) return "";
  if (typeof x === "string") return x;
  if (typeof x === "number" || typeof x === "boolean") return String(x);
  if (Array.isArray(x)) return x.map(toText).filter(Boolean).join(", ");
  if (typeof x === "object") {
    const qty = [x.quantity ?? x.amount ?? x.qty, x.unit].filter(Boolean).map(toText).join(" ");
    const name = toText(x.item ?? x.name ?? x.ingredient ?? x.text ?? x.step ?? x.instruction ?? x.description ?? "");
    const note = x.note || x.notes ? ` (${toText(x.note ?? x.notes)})` : "";
    if (qty || name) return `${qty} ${name}`.trim() + note;
    return Object.values(x).map(toText).filter(Boolean).join(" ");
  }
  return String(x);
}

export const toTextList = (a: any): string[] =>
  (Array.isArray(a) ? a : a ? [a] : []).map(toText).filter(Boolean);

// Makes any recipe safe to display, whatever format the AI used.
export function normalizeRecipe<T extends Record<string, any>>(r: T): T {
  return {
    ...r,
    title: toText(r.title) || "Untitled recipe",
    summary: r.summary ? toText(r.summary) : undefined,
    totalTime: r.totalTime ? toText(r.totalTime) : undefined,
    source: toText(r.source),
    chefNote: r.chefNote ? toText(r.chefNote) : undefined,
    ingredients: toTextList(r.ingredients),
    steps: toTextList(r.steps),
    tags: toTextList(r.tags),
    baseServings: Number(r.baseServings) || 2,
  } as T;
}