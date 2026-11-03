"use client";
// "For you": Sebastian's daily suggestions, plus news from the user's favourite sources.
import { useStore } from "./store";
import { memoryForPrompt } from "./memory";
import { uid } from "./util";

export type Rec = { id: string; type: "recipe" | "destination" | "activity" | "event"; title: string; why: string; query: string };
export type RecState = { date?: string; at?: string; items: Rec[]; news: { title: string; link: string; source: string; published?: string }[]; liked: string[]; disliked: string[] };
const EMPTY: RecState = { items: [], news: [], liked: [], disliked: [] };
export function useRecs(): RecState { return useStore((s) => ((s.sessionId ? (s.data[s.sessionId] as any)?.recs : null) as RecState) || EMPTY); }
const get = (): RecState => { const s = useStore.getState(); return { ...EMPTY, ...(((s.sessionId ? (s.data[s.sessionId] as any)?.recs : null) as RecState) || {}) }; };
const set = (fn: (r: RecState) => RecState) => useStore.getState().patch((d: any) => ({ ...d, recs: fn({ ...EMPTY, ...(d.recs || {}) }) }));
const today = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`; };

let busy: Promise<boolean> | null = null;
/** Fetches today's suggestions (once a day unless forced). */
export function refreshRecs(force = false): Promise<boolean> {
  if (!force && get().date === today() && get().items.length) return Promise.resolve(false);
  if (busy) return busy;
  busy = (async () => {
    try {
      const s = useStore.getState(); const d: any = s.sessionId ? s.data[s.sessionId] : null; const acc: any = s.accounts.find((a) => a.id === s.sessionId);
      if (!d) return false;
      const r = get();
      const body = { today: today(), month: new Date().toLocaleDateString("en-GB", { month: "long" }), home: acc?.timezone?.split("/")[1]?.replace(/_/g, " "), memory: memoryForPrompt(),
        interests: d.interests || [], tripDNA: d.tripDNA?.activities || {}, cookbook: (d.cookbook || []).slice(0, 12).map((x: any) => x.title),
        activity: (d.activity || []).slice(0, 25).map((a: any) => a.title), liked: r.liked.slice(0, 20), disliked: r.disliked.slice(0, 20) };
      const [rec, news] = await Promise.all([
        fetch("/api/recommend", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((x) => x.json()).catch(() => ({ ok: false })),
        fetch("/api/news", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sources: d.news?.sources || ["bbc", "zbc"], categories: d.news?.categories || ["top"] }) }).then((x) => x.json()).catch(() => ({ ok: false })),
      ]);
      if (!rec.ok && !news.ok) return false;
      set((x) => ({ ...x, date: today(), at: new Date().toISOString(),
        items: rec.ok ? rec.items.map((i: any) => ({ ...i, id: uid("rc_") })) : x.items,
        news: news.ok ? (news.items || []).slice(0, 5).map((n: any) => ({ title: n.title, link: n.link, source: n.sourceName, published: n.published })) : x.news }));
      return true;
    } finally { busy = null; }
  })();
  return busy;
}
/** Thumbs up or down: Sebastian learns from it for next time. */
export function feedback(r: Rec, like: boolean) {
  set((x) => ({ ...x, liked: like ? [r.title, ...x.liked.filter((t) => t !== r.title)].slice(0, 40) : x.liked.filter((t) => t !== r.title),
    disliked: like ? x.disliked.filter((t) => t !== r.title) : [r.title, ...x.disliked.filter((t) => t !== r.title)].slice(0, 40),
    items: like ? x.items : x.items.filter((i) => i.id !== r.id) }));
}
/** The next 18:00, for the daily suggestion notification (an id and a time only). */
export function recJob() {
  const n = new Date(); const t = new Date(n); t.setHours(18, 0, 0, 0); if (t <= n) t.setDate(t.getDate() + 1);
  return { id: `rec_${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, "0")}${String(t.getDate()).padStart(2, "0")}`, fireAt: t.toISOString() };
}
