"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Account, Chat, Msg, NewsPrefs, Prefs, Recipe, SavedPlace, SavingsPlan, ScheduleEvent, Trip, Txn, UserData,
} from "./types";
import { uid } from "./util";

/**
 * Persistence adapter (local, per-account). Every mutation is applied only after
 * validation by the calling workflow. Swap `storage` for a Supabase-backed
 * implementation without touching components.
 */

const defaultPrefs: Prefs = {
  useTitle: true, voiceReplies: false, voiceName: "", personalization: true, notifications: true, emergencyCountry: "ZW",
};

export const emptyData = (): UserData => ({
  prefs: { ...defaultPrefs },
  chats: [],
  cookbook: [],
  schedule: [],
  places: [],
  plans: [],
  txns: [],
  trips: [],
  tripDNA: { destinations: {}, activities: {}, budgets: [] },
  news: { sources: ["bbc", "aljazeera", "sky"], categories: ["top"] },
});

interface State {
  hydrated: boolean;
  accounts: Account[];
  sessionId: string | null;
  data: Record<string, UserData>;
  setHydrated: () => void;
  register: (a: Account) => void;
  login: (id: string) => void;
  logout: () => void;
  updateAccount: (patch: Partial<Account>) => void;
  // user data
  patch: (fn: (d: UserData) => UserData) => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      hydrated: false,
      accounts: [],
      sessionId: null,
      data: {},
      setHydrated: () => set({ hydrated: true }),
      register: (a) => set((s) => ({ accounts: [...s.accounts, a], data: { ...s.data, [a.id]: emptyData() }, sessionId: a.id })),
      login: (id) => set((s) => ({ sessionId: id, data: s.data[id] ? s.data : { ...s.data, [id]: emptyData() } })),
      logout: () => set({ sessionId: null }),
      updateAccount: (p) => set((s) => ({ accounts: s.accounts.map((a) => (a.id === s.sessionId ? { ...a, ...p } : a)) })),
      patch: (fn) => {
        const id = get().sessionId;
        if (!id) return;
        set((s) => ({ data: { ...s.data, [id]: fn(s.data[id] || emptyData()) } }));
      },
    }),
    {
      name: "sebastian-store-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ accounts: s.accounts, sessionId: s.sessionId, data: s.data }) as any,
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    }
  )
);

export function useAccount(): Account | null {
  return useStore((s) => s.accounts.find((a) => a.id === s.sessionId) || null);
}
export function useData(): UserData {
  return useStore((s) => (s.sessionId && s.data[s.sessionId]) || EMPTY);
}
const EMPTY = emptyData();

/* ---------------- domain actions ---------------- */
const P = () => useStore.getState().patch;

export const actions = {
  setPrefs: (p: Partial<Prefs>) => P()((d) => ({ ...d, prefs: { ...d.prefs, ...p } })),
  setNews: (n: NewsPrefs) => P()((d) => ({ ...d, news: n })),

  // chats
  newChat: (first?: Msg): string => {
    const id = uid("c_");
    P()((d) => ({ ...d, chats: [{ id, title: first ? first.content.slice(0, 48) : "New conversation", updatedAt: new Date().toISOString(), messages: first ? [first] : [] }, ...d.chats] }));
    return id;
  },
  pushMsg: (chatId: string, m: Msg) =>
    P()((d) => ({
      ...d,
      chats: d.chats
        .map((c) => (c.id === chatId ? { ...c, title: c.messages.length === 0 && m.role === "user" ? m.content.slice(0, 48) : c.title, messages: [...c.messages, m], updatedAt: new Date().toISOString() } : c))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    })),
  deleteChat: (id: string) => P()((d) => ({ ...d, chats: d.chats.filter((c) => c.id !== id) })),

  // cookbook
  addRecipe: (r: Recipe) => P()((d) => (d.cookbook.some((x) => x.id === r.id) ? d : { ...d, cookbook: [r, ...d.cookbook] })),
  removeRecipe: (id: string) => P()((d) => ({ ...d, cookbook: d.cookbook.filter((r) => r.id !== id) })),

  // schedule — idempotent on source.ref
  addEvent: (e: Omit<ScheduleEvent, "id" | "createdAt"> & { id?: string }): string => {
    let outId = e.id || uid("e_");
    P()((d) => {
      if (e.source.ref) {
        const dup = d.schedule.find((x) => x.source.ref === e.source.ref);
        if (dup) { outId = dup.id; return { ...d, schedule: d.schedule.map((x) => (x.id === dup.id ? { ...x, ...e, id: dup.id } : x)) }; }
      }
      return { ...d, schedule: [...d.schedule, { ...e, id: outId, createdAt: new Date().toISOString() }] };
    });
    return outId;
  },
  updateEvent: (id: string, p: Partial<ScheduleEvent>) => P()((d) => ({ ...d, schedule: d.schedule.map((e) => (e.id === id ? { ...e, ...p } : e)) })),
  deleteEvent: (id: string) => P()((d) => ({ ...d, schedule: d.schedule.filter((e) => e.id !== id) })),

  // places
  togglePlace: (p: SavedPlace) =>
    P()((d) => (d.places.some((x) => x.id === p.id) ? { ...d, places: d.places.filter((x) => x.id !== p.id) } : { ...d, places: [p, ...d.places] })),

  // finance
  savePlan: (p: SavingsPlan) => P()((d) => ({ ...d, plans: d.plans.some((x) => x.id === p.id) ? d.plans.map((x) => (x.id === p.id ? p : x)) : [p, ...d.plans] })),
  deletePlan: (id: string) => P()((d) => ({ ...d, plans: d.plans.filter((x) => x.id !== id) })),
  addTxn: (t: Txn) => P()((d) => ({ ...d, txns: [t, ...d.txns] })),
  deleteTxn: (id: string) => P()((d) => ({ ...d, txns: d.txns.filter((t) => t.id !== id) })),

  // travel
  saveTrip: (t: Trip) =>
    P()((d) => {
      const dna = { ...d.tripDNA, destinations: { ...d.tripDNA.destinations }, activities: { ...d.tripDNA.activities } };
      if (d.prefs.personalization) {
        const key = t.destination.trim();
        dna.destinations[key] = (dna.destinations[key] || 0) + 1;
        t.activities.forEach((a) => (dna.activities[a] = (dna.activities[a] || 0) + 1));
        dna.budgets = [...dna.budgets, t.budget].slice(-12);
      }
      return { ...d, trips: d.trips.some((x) => x.id === t.id) ? d.trips.map((x) => (x.id === t.id ? t : x)) : [t, ...d.trips], tripDNA: dna };
    }),
  deleteTrip: (id: string) => P()((d) => ({ ...d, trips: d.trips.filter((t) => t.id !== id) })),
  resetTripDNA: () => P()((d) => ({ ...d, tripDNA: { destinations: {}, activities: {}, budgets: [] } })),
};
