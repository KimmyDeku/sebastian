import type { Account, Prefs } from "./types";

export function formOfAddress(a: Account | null, prefs?: Prefs) {
  if (!a) return "";
  if (prefs && !prefs.useTitle) return a.firstName;
  return `${a.gender === "male" ? "Lord" : "Lady"} ${a.firstName}`;
}

export function partOfDay(tz?: string) {
  let h = new Date().getHours();
  try {
    h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: tz }).format(new Date()));
  } catch {}
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 22) return "Good evening";
  return "Good night";
}

export function greeting(a: Account | null, prefs?: Prefs) {
  if (!a) return "Good day.";
  return `${partOfDay(a.timezone)}, ${formOfAddress(a, prefs)}.`;
}
