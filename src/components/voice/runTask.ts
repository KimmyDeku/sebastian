"use client";
import { api } from "@/lib/api";
import { actions, useStore, emptyData } from "@/lib/store";
import { routeHref } from "@/lib/intent";
import { googleCalendarUrl } from "@/lib/calendar";
import { uid, monthKey, daysBetween, money } from "@/lib/util";
import type { ScheduleEvent } from "@/lib/types";

export type Card = { title: string; subtitle?: string; detail?: string; href?: string };
export type TaskResult = { ok: boolean; error?: string; data?: any; cards?: Card[]; link?: { label: string; href: string }; say?: string };

const num = (v: any, d: number) => (Number(v) > 0 ? Number(v) : d);
const list = (v: any) => (Array.isArray(v) ? v : String(v || "").split(",")).map((x: any) => String(x).trim()).filter(Boolean);
const data = () => { const s = useStore.getState(); return (s.sessionId && s.data[s.sessionId]) || emptyData(); };

function position(): Promise<{ lat: number; lng: number }> {
  return new Promise((res, rej) => {
    if (!("geolocation" in navigator)) return rej(new Error("This browser can't share your location. Tell me an area instead."));
    navigator.geolocation.getCurrentPosition((p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => rej(new Error("I couldn't get your location. Allow location access, or tell me an area to search.")), { timeout: 12000 });
  });
}

async function booking(type: string, body: any, link: Record<string, any>): Promise<TaskResult> {
  const r = await api<any>("/api/booking", { type, ...body });
  if (!r.ok) return { ok: false, error: r.error };
  const href = routeHref("booking", { type, ...link });
  if (r.aiUnavailable) {
    return { ok: true, say: "I can't prepare suggestions without my AI service, but I've set up the search for you to open on the provider sites.", link: { label: "Open the search", href },
      cards: Object.entries(r.links || {}).filter(([, v]) => v).map(([k, v]) => ({ title: k, href: v as string })) };
  }
  const items = (r.items || []).slice(0, 5);
  return {
    ok: true,
    data: { options: items.map((i: any) => ({ name: i.name, area: i.area, kind: i.kind, price: i.priceEstimate, why: i.why })), advice: r.advice },
    cards: items.map((i: any) => ({ title: i.name, subtitle: [i.kind, i.area].filter(Boolean).join(" · "), detail: [i.priceEstimate && `${i.priceEstimate} (estimate)`, i.why].filter(Boolean).join(" — "), href: i.link })),
    link: { label: "Review and book", href },
  };
}

/** Carries out a fully-gathered task using Sebastian's existing tools. */
export async function runTask(task: string, s: Record<string, any>): Promise<TaskResult> {
  try {
    switch (task) {
      case "flights": {
        const trip = s.trip === "oneway" ? "oneway" : "round";
        return booking("flights", { from: s.from, to: s.to, trip, depart: s.depart, ret: trip === "round" ? s.ret : "", adults: num(s.adults, 1), cabin: s.cabin || "Economy" },
          { from: s.from, to: s.to, checkin: s.depart, checkout: trip === "round" ? s.ret : "", adults: num(s.adults, 1) });
      }
      case "stays":
        return booking("stays", { dest: s.dest, checkin: s.checkin, checkout: s.checkout, adults: num(s.adults, 2), children: Number(s.children) || 0, rooms: num(s.rooms, 1) },
          { dest: s.dest, checkin: s.checkin, checkout: s.checkout, adults: num(s.adults, 2) });
      case "cars":
        return booking("cars", { where: s.where, pickup: s.pickup, dropoff: s.dropoff, age: num(s.age, 30) }, { dest: s.where });
      case "attractions":
        return booking("attractions", { where: s.where, date: s.date }, { dest: s.where });
      case "bus":
        return booking("bus", { from: s.from, to: s.to, date: s.date, passengers: num(s.passengers, 1), mode: s.mode || "Any" }, { type: "bus", from: s.from, to: s.to, checkin: s.date });
      case "taxis":
        return booking("taxis", { from: s.from, to: s.to, date: s.date, time: s.time, passengers: num(s.passengers, 1) }, {});

      case "trip": {
        const d = data();
        const days = daysBetween(s.start, s.end);
        const acts = list(s.activities);
        const r = await api<any>("/api/travel", { destination: s.destination, start: s.start, end: s.end, days, travellers: num(s.travellers, 1), budget: num(s.budget, 1000), activities: acts, pace: "Balanced", origin: s.origin || "", notes: "" });
        if (!r.ok) return { ok: false, error: r.error };
        const it = r.itinerary;
        actions.saveTrip({ id: uid("t_"), destination: s.destination, start: s.start, end: s.end, budget: num(s.budget, 1000), travellers: num(s.travellers, 1), activities: acts, itinerary: it, createdAt: new Date().toISOString() });
        return {
          ok: true,
          data: { summary: it.summary, days: it.days.map((x: any) => `Day ${x.day}: ${x.title}`), weather: r.weather ? `${r.weather.current.label}, ${Math.round(r.weather.current.temp)}°C now` : "unavailable", savedToTrips: true },
          cards: it.days.map((x: any) => ({ title: `Day ${x.day} · ${x.title}`, detail: `Morning: ${x.morning} Afternoon: ${x.afternoon} Evening: ${x.evening}` })),
          link: { label: d.prefs ? "Open in Travel" : "Open", href: routeHref("travel", { destination: s.destination, start: s.start, end: s.end, budget: s.budget }) },
        };
      }

      case "recipe": {
        const diet = /^none$/i.test(String(s.diet || "")) ? "" : s.diet;
        const r = await api<any>("/api/recipes", { occasion: s.occasion || "No occasion", category: s.category, servings: num(s.servings, 2), diet, notes: s.notes || "" });
        if (!r.ok) return { ok: false, error: r.error };
        const rs = (r.recipes || []).slice(0, 10);
        return {
          ok: true,
          data: { recipes: rs.map((x: any) => ({ title: x.title, time: x.totalTime, source: x.source })) },
          cards: rs.map((x: any) => ({ title: typeof x.title === "string" ? x.title : String(x.title), subtitle: [x.totalTime, x.source].filter(Boolean).join(" · "), href: x.url })),
          link: { label: "Open in Recipes", href: routeHref("recipes", { category: s.category, servings: s.servings, diet, notes: s.notes, occasion: s.occasion }) },
        };
      }

      case "discover": {
        const near = !s.where || /near|here|nearby|around me|current|my location/i.test(String(s.where));
        const where = near ? await position() : null;
        const r = await api<any>("/api/places", { category: String(s.category).toLowerCase(), text: s.category, ...(where || {}), where: near ? undefined : s.where });
        if (!r.ok) return { ok: false, error: r.error };
        const ps = (r.results || []).slice(0, 6);
        return {
          ok: true,
          data: { near: r.where, places: ps.map((p: any) => ({ name: p.name, rating: p.rating, openNow: p.openNow, address: p.address })) },
          cards: ps.map((p: any) => ({ title: p.name, subtitle: [p.rating && `★ ${p.rating}`, p.openNow == null ? "" : p.openNow ? "Open now" : "Closed"].filter(Boolean).join(" · "), detail: p.address, href: p.mapsUrl })),
          link: { label: "Open in Discover", href: routeHref("discover", { category: s.category, where: near ? "" : s.where }) },
        };
      }

      case "news": {
        const cats = list(s.categories).map((c) => c.toLowerCase());
        const r = await api<any>("/api/news", { sources: data().news.sources, categories: cats.length ? cats : ["top"] });
        if (!r.ok) return { ok: false, error: r.error };
        const ns = (r.items || []).slice(0, 5);
        return {
          ok: true,
          data: { headlines: ns.map((n: any) => ({ title: n.title, source: n.sourceName, status: n.status })) },
          cards: ns.map((n: any) => ({ title: n.title, subtitle: `${n.sourceName}${n.status !== "latest" ? ` · ${n.status}` : ""}`, href: n.link })),
          link: { label: "Open News", href: "/news" },
        };
      }

      case "fashion": {
        const r = await api<any>("/api/fashion", { type: s.type, occasion: s.occasion, gender: s.gender, age: s.age, heritage: s.heritage, notes: "" });
        if (!r.ok) return { ok: false, error: r.error };
        return {
          ok: true,
          data: { intro: r.intro, looks: (r.looks || []).map((l: any) => ({ title: l.title, pieces: l.pieces })) },
          cards: (r.looks || []).map((l: any) => ({ title: l.title, detail: l.description })),
          link: { label: "Open in Fashion", href: routeHref("fashion", { type: s.type, occasion: s.occasion }) },
        };
      }

      case "schedule": {
        const start = new Date(s.datetime);
        if (isNaN(start.getTime())) return { ok: false, error: "I couldn't understand that date and time." };
        const remind = s.remindMinutes === undefined || s.remindMinutes === "" ? 15 : Number(s.remindMinutes);
        const kind = ["appointment", "meeting", "reminder"].includes(s.kind) ? s.kind : "other";
        const ev = { kind, title: s.title, start: start.toISOString(), remindMinutes: isNaN(remind) ? 15 : remind, notes: "Added by voice", source: { type: "manual" as const } };
        const id = actions.addEvent(ev);
        const when = start.toLocaleString("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
        return {
          ok: true,
          say: `Done. ${s.title} is in your schedule for ${when}. You can also send it to Google Calendar below.`,
          cards: [{ title: s.title, subtitle: when, detail: "Tap to add it to Google Calendar", href: googleCalendarUrl({ ...ev, id, createdAt: "" } as ScheduleEvent) }],
          link: { label: "Open Schedule", href: "/schedule" },
        };
      }

      case "expense":
      case "income": {
        const amount = Number(String(s.amount).replace(/[^\d.]/g, ""));
        if (!(amount > 0)) return { ok: false, error: "I didn't catch a valid amount." };
        actions.addTxn({ id: uid("x_"), type: task, label: s.label, category: task === "income" ? "Income" : s.category || "Other", amount, date: new Date().toISOString() });
        return { ok: true, say: `Recorded ${money(amount)} ${task === "income" ? "of income from" : "for"} ${s.label}.`, link: { label: "Open Finance", href: "/finance?tab=money" } };
      }

      case "finance_review": {
        const txns = data().txns;
        const year = s.period === "year";
        const key = monthKey(new Date());
        const inPeriod = txns.filter((t) => (year ? t.date.slice(0, 4) === key.slice(0, 4) : monthKey(t.date) === key));
        if (!inPeriod.length) return { ok: true, say: `You haven't recorded any income or expenses for this ${year ? "year" : "month"} yet. Tell me an amount and I'll add it.`, link: { label: "Open Finance", href: "/finance?tab=money" } };
        const income = inPeriod.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
        const expenses = inPeriod.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
        const byCategory: Record<string, number> = {};
        inPeriod.filter((t) => t.type === "expense").forEach((t) => (byCategory[t.category] = (byCategory[t.category] || 0) + t.amount));
        const r = await api<any>("/api/finance", { summary: { income, expenses, byCategory }, period: year ? "yearly" : "monthly" });
        return { ok: true, data: { income, expenses, byCategory, review: r.ok ? r.review : null }, link: { label: "Open Finance", href: "/finance?tab=money" } };
      }

      default:
        return { ok: false, error: "I'm not able to do that one yet." };
    }
  } catch (e: any) {
    return { ok: false, error: e?.message || "Something went wrong." };
  }
}
