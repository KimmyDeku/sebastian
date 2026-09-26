export type Gender = "male" | "female";

export interface Account {
  id: string;
  firstName: string;
  surname: string;
  dob: string;
  gender: Gender;
  phone: string;
  email: string;
  passwordHash: string;
  salt: string;
  timezone: string;
  createdAt: string;
}

export interface Prefs {
  useTitle: boolean;
  voiceReplies: boolean;
  voiceName: string;
  personalization: boolean;
  notifications: boolean;
  emergencyCountry: string;
}

export interface ChatAction { label: string; href: string }
export interface Msg { id: string; role: "user" | "assistant"; content: string; at: string; actions?: ChatAction[]; error?: boolean }
export interface Chat { id: string; title: string; updatedAt: string; messages: Msg[] }

export interface Recipe {
  id: string;
  title: string;
  image?: string;
  source: string;
  url?: string;
  baseServings: number;
  totalTime?: string;
  ingredients: string[];
  steps: string[];
  summary?: string;
  tags?: string[];
  generated?: boolean;
}

export type EventKind = "appointment" | "meeting" | "reminder" | "other" | "booking" | "trip";
export interface ScheduleEvent {
  id: string;
  kind: EventKind;
  otherLabel?: string;
  title: string;
  start: string; // ISO
  end?: string;
  remindMinutes: number | null;
  notes?: string;
  source: { type: "manual" | "booking" | "trip"; ref?: string; provider?: string };
  gcalOpened?: boolean;
  notified?: boolean;
  createdAt: string;
}

export interface SavedPlace {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  category: string;
  photo?: string;
  phone?: string;
  mapsUrl: string;
  rating?: number;
}

export interface Deposit { id: string; amount: number; at: string; note?: string }
export interface SavingsPlan {
  id: string;
  name: string;
  target: number;
  frequency: "weekly" | "monthly" | "flexible";
  commitment: number;
  deposits: Deposit[];
  reminder: { enabled: boolean; weekday?: number; dayOfMonth?: number };
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface Txn { id: string; type: "income" | "expense"; label: string; category: string; amount: number; date: string }

export interface Trip {
  id: string;
  destination: string;
  start: string;
  end: string;
  budget: number;
  travellers: number;
  activities: string[];
  itinerary: Itinerary | null;
  createdAt: string;
}
export interface ItineraryDay { day: number; date?: string; title: string; morning: string; afternoon: string; evening: string; estCost?: number }
export interface Itinerary {
  summary: string;
  days: ItineraryDay[];
  attractions: { name: string; why: string }[];
  budgetBreakdown: { item: string; amount: number }[];
  tips: string[];
}

export interface TripDNA { destinations: Record<string, number>; activities: Record<string, number>; budgets: number[] }
export interface NewsPrefs { sources: string[]; categories: string[] }

export interface UserData {
  prefs: Prefs;
  chats: Chat[];
  cookbook: Recipe[];
  schedule: ScheduleEvent[];
  places: SavedPlace[];
  plans: SavingsPlan[];
  txns: Txn[];
  trips: Trip[];
  tripDNA: TripDNA;
  news: NewsPrefs;
}
