"use client";
/**
 * Activity history: a private record, kept with the user's own account, of what they do in Sebastian
 * (stories opened, recipes generated, emails drafted, trips, bookings and so on).
 * It can be turned off, and cleared, in Settings.
 */
import { actions, useStore } from "./store";
import { uid } from "./util";

export type ActivityKind = "chat" | "news" | "recipe" | "email" | "trip" | "schedule" | "booking" | "discover" | "finance" | "fashion" | "notebook" | "link";
export type Activity = { id: string; at: string; kind: ActivityKind; title: string; detail?: string; href?: string };
const EMPTY: Activity[] = [];

export function useActivity(): Activity[] {
  return useStore((s) => ((s.sessionId ? (s.data[s.sessionId] as any)?.activity : null) as Activity[]) || EMPTY);
}

export function logActivity(a: Omit<Activity, "id" | "at">) {
  const s = useStore.getState();
  const d: any = s.sessionId ? s.data[s.sessionId] : null;
  if (!d || d.prefs?.activityHistory === false) return;
  const list: Activity[] = d.activity || [];
  // The same action twice within a few seconds is only recorded once.
  const last = list[0];
  if (last && last.title === a.title && last.kind === a.kind && Date.now() - new Date(last.at).getTime() < 4000) return;
  s.patch((x: any) => ({ ...x, activity: [{ ...a, id: uid("ac_"), at: new Date().toISOString() }, ...(x.activity || [])].slice(0, 600) }));
}
export const deleteActivity = (id: string) => useStore.getState().patch((x: any) => ({ ...x, activity: (x.activity || []).filter((a: Activity) => a.id !== id) }));
export const clearActivity = () => useStore.getState().patch((x: any) => ({ ...x, activity: [] }));

const cut = (s: any, n = 70) => { const t = String(s ?? "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const qs = (o: Record<string, any>) => new URLSearchParams(Object.entries(o).filter(([, v]) => v != null && v !== "").map(([k, v]) => [k, String(v)])).toString();

/** Records successful requests made through Sebastian's api() helper. */
export function logFromApi(url: string, body: any, res: any) {
  if (!res?.ok || typeof window === "undefined") return;
  const path = url.split("?")[0];
  const b = body || {};
  switch (path) {
    case "/api/recipes": return logActivity({ kind: "recipe", title: `Recipes generated: ${b.category || "Something delicious"}`, detail: `${plural(res.recipes?.length || 0, "recipe")}${b.diet && b.diet !== "none" ? ` · ${b.diet}` : ""}`, href: `/recipes?${qs({ category: b.category, occasion: b.occasion })}` });
    case "/api/recipes/link": return logActivity({ kind: "recipe", title: `Recipe from a link: ${cut(res.recipe?.title)}`, href: "/recipes" });
    case "/api/booking": {
      const where = b.dest || b.where || (b.from && b.to ? `${b.from} to ${b.to}` : "");
      const label: Record<string, string> = { stays: "Stays", flights: "Flights", cars: "Car rental", attractions: "Attractions", taxis: "Airport taxis", bus: "Other transport" };
      return logActivity({ kind: "booking", title: `Searched ${label[b.type] || "bookings"}${where ? `: ${cut(where, 50)}` : ""}`, detail: plural(res.items?.length || 0, "option"), href: `/booking?type=${b.type}` });
    }
    case "/api/travel": return b.destination && logActivity({ kind: "trip", title: `Itinerary created: ${cut(b.destination, 50)}`, detail: b.start && b.end ? `${b.start} to ${b.end}` : undefined, href: "/travel" });
    case "/api/places": return logActivity({ kind: "discover", title: `Nearby search: ${cut(b.q || b.category || "places", 40)}${b.where ? ` in ${cut(b.where, 30)}` : ""}`, detail: plural(res.results?.length || 0, "result"), href: "/discover" });
    case "/api/fashion": return logActivity({ kind: "fashion", title: `Style ideas: ${b.type || "fashion"}`, detail: b.occasion ? cut(b.occasion, 50) : undefined, href: "/fashion" });
    case "/api/finance": return logActivity({ kind: "finance", title: "Finance review", href: "/finance" });
    case "/api/email":
      if (["draft", "reply", "followup"].includes(b.mode)) return logActivity({ kind: "email", title: `${b.mode === "reply" ? "Reply drafted" : b.mode === "followup" ? "Follow-up drafted" : "Email drafted"}: ${cut(res.draft?.subject || "Untitled", 60)}`, detail: res.draft?.toName ? `To ${res.draft.toName}` : undefined, href: "/email" });
      if (b.mode === "triage") return logActivity({ kind: "email", title: "Inbox checked", detail: cut(res.overview, 80), href: "/email" });
      return;
    case "/api/notebook":
      if (b.mode === "ask") return logActivity({ kind: "notebook", title: `Research question: ${cut(b.question, 60)}`, href: "/notebook?s=research" });
      if (b.mode === "guide") return logActivity({ kind: "notebook", title: `Study ${b.kind === "faq" ? "FAQ" : b.kind === "study" ? "guide" : "summary"} made`, href: "/notebook?s=research" });
      if (b.mode === "lesson") return logActivity({ kind: "notebook", title: `${b.language} lesson: ${cut(res.lesson?.topic, 40)}`, href: "/notebook?s=languages" });
      if (b.mode === "quiz") return logActivity({ kind: "notebook", title: `Quiz: ${cut(b.topic || b.subject || "your sources", 50)}`, href: b.subject ? "/notebook?s=tutor" : "/notebook?s=research" });
      if (b.mode === "plan") return logActivity({ kind: "notebook", title: `Assignment planned: ${cut(b.title, 50)}`, href: "/notebook?s=assignments" });
      if (b.mode === "feedback") return logActivity({ kind: "notebook", title: `Draft feedback: ${cut(b.title, 50)}`, href: "/notebook?s=assignments" });
      return;
    case "/api/notebook/code": {
      const q = [...(b.messages || [])].reverse().find((m: any) => m.role === "user")?.content;
      return logActivity({ kind: "notebook", title: `Coding: ${cut(q, 60)}`, href: "/notebook?s=coding" });
    }
  }
}

/* Saves made anywhere in the app (schedule, cookbook, trips, places, finances). */
let wrapped = false;
export function recordSaves() {
  if (wrapped) return;
  wrapped = true;
  const A: any = actions;
  const wrap = (name: string, fn: (...args: any[]) => Omit<Activity, "id" | "at"> | null) => {
    const orig = A[name];
    if (typeof orig !== "function") return;
    A[name] = (...args: any[]) => { const r = orig(...args); try { const a = fn(...args); if (a) logActivity(a); } catch {} return r; };
  };
  wrap("addEvent", (e) => ({ kind: e.kind === "trip" ? "trip" : e.kind === "booking" ? "booking" : "schedule", title: `Added to schedule: ${cut(e.title, 60)}`, detail: new Date(e.start).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }), href: "/schedule" }));
  wrap("addRecipe", (r) => ({ kind: "recipe", title: `Saved to cookbook: ${cut(r.title, 60)}`, href: "/recipes/cookbook" }));
  wrap("saveTrip", (t) => ({ kind: "trip", title: `Trip saved: ${cut(t.destination, 50)}`, detail: `${t.start} to ${t.end}`, href: "/travel" }));
  wrap("togglePlace", (p) => {
    const s = useStore.getState(); const d: any = s.sessionId ? s.data[s.sessionId] : null;
    return d?.places?.some((x: any) => x.id === p.id) ? { kind: "discover", title: `Saved place: ${cut(p.name, 50)}`, href: "/discover" } : null;
  });
  wrap("savePlan", (p) => ({ kind: "finance", title: `Savings plan updated: ${cut(p.name, 50)}`, detail: p.target ? `Target ${p.target}` : undefined, href: "/finance" }));
  wrap("addTxn", (t) => ({ kind: "finance", title: `${t.type === "income" ? "Income" : "Expense"} logged: ${cut(t.label || t.category, 40)}`, detail: t.category, href: "/finance?tab=money" }));
  // Removals count as actions too.
  const name = (list: string, id: string, field: string) => { const s = useStore.getState(); const d: any = s.sessionId ? s.data[s.sessionId] : null; return cut((d?.[list] || []).find((x: any) => x.id === id)?.[field] || "", 50); };
  const before = (n: string, fn: (...a: any[]) => Omit<Activity, "id" | "at"> | null) => {
    const orig = A[n]; if (typeof orig !== "function") return;
    A[n] = (...args: any[]) => { let a = null; try { a = fn(...args); } catch {} const r = orig(...args); if (a) logActivity(a); return r; };
  };
  before("deleteEvent", (id) => ({ kind: "schedule", title: `Removed from schedule: ${name("schedule", id, "title")}`, href: "/schedule" }));
  before("removeRecipe", (id) => ({ kind: "recipe", title: `Removed from cookbook: ${name("cookbook", id, "title")}`, href: "/recipes/cookbook" }));
  before("deleteTrip", (id) => ({ kind: "trip", title: `Trip deleted: ${name("trips", id, "destination")}`, href: "/travel" }));
  before("deletePlan", (id) => ({ kind: "finance", title: `Savings plan deleted: ${name("plans", id, "name")}`, href: "/finance" }));
  before("deleteTxn", (id) => ({ kind: "finance", title: `Entry deleted: ${name("txns", id, "label")}`, href: "/finance?tab=money" }));
}

/** Records links opened to other websites (for example a news story on the publisher's site). */
export function recordLinkOpens() {
  if ((window as any).__sebastianLinks) return;
  (window as any).__sebastianLinks = true;
  document.addEventListener("click", (e) => {
    const a = (e.target as HTMLElement)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a || !/^https?:/i.test(a.href) || a.origin === window.location.origin) return;
    // The headline: inside the link first (cards are often one big link), then in the surrounding card.
    const heading = a.querySelector("h1, h2, h3, h4")?.textContent || a.closest("article, li")?.querySelector("h1, h2, h3, h4")?.textContent || a.getAttribute("aria-label") || "";
    const host = a.hostname.replace(/^www\./, "");
    const page = window.location.pathname;
    if (page.startsWith("/news")) logActivity({ kind: "news", title: cut(heading || host, 80), detail: `Opened on ${host}`, href: a.href });
    else logActivity({ kind: "link", title: `Opened ${host}${heading ? `: ${cut(heading, 50)}` : ""}`, href: a.href });
  }, true);
}
