"use client";
// Subscriptions and regular payments Sebastian tracks, with calendar reminders 3 days before each one.
import { useStore, actions } from "./store";
import { uid } from "./util";
import { track } from "./analytics";

export type Cycle = "weekly" | "monthly" | "quarterly" | "yearly";
export type Service = { key: string; name: string; category: string; url?: string };
export type Payment = { at: string; amount: number };
export type Subscription = { id: string; key: string; name: string; category: string; amount: number; currency: string; cycle: Cycle; nextDue: string; payLink?: string; note?: string; active: boolean; eventId?: string; payments: Payment[]; createdAt: string };

// Commonly used subscriptions and regular payments (add any others as "Other").
export const SERVICES: Service[] = [
  // Home and utilities
  { key: "zesa", name: "ZESA / ZETDC electricity", category: "Home and utilities", url: "https://www.zesa.co.zw" },
  { key: "council", name: "City council water and rates", category: "Home and utilities" },
  { key: "telone", name: "TelOne", category: "Home and utilities", url: "https://www.telone.co.zw" },
  { key: "liquid", name: "Liquid Home (internet)", category: "Home and utilities" },
  { key: "econet", name: "Econet airtime and data", category: "Home and utilities", url: "https://www.econet.co.zw" },
  { key: "netone", name: "NetOne", category: "Home and utilities", url: "https://www.netone.co.zw" },
  { key: "starlink", name: "Starlink", category: "Home and utilities", url: "https://www.starlink.com" },
  { key: "dstv", name: "DStv", category: "Home and utilities", url: "https://www.dstv.com" },
  { key: "rent", name: "Rent", category: "Home and utilities" },
  // Insurance and cover
  { key: "car_insurance", name: "Car insurance", category: "Insurance and cover" },
  { key: "medical_aid", name: "Medical aid", category: "Insurance and cover" },
  { key: "funeral_cover", name: "Funeral cover", category: "Insurance and cover" },
  { key: "life_insurance", name: "Life insurance", category: "Insurance and cover" },
  { key: "home_insurance", name: "Home and contents insurance", category: "Insurance and cover" },
  // Streaming and TV
  { key: "netflix", name: "Netflix", category: "Streaming and TV", url: "https://www.netflix.com" },
  { key: "showmax", name: "Showmax", category: "Streaming and TV", url: "https://www.showmax.com" },
  { key: "disney_plus", name: "Disney+", category: "Streaming and TV", url: "https://www.disneyplus.com" },
  { key: "prime", name: "Amazon Prime", category: "Streaming and TV", url: "https://www.amazon.com/prime" },
  { key: "youtube_premium", name: "YouTube Premium", category: "Streaming and TV", url: "https://www.youtube.com/premium" },
  { key: "apple_tv", name: "Apple TV+", category: "Streaming and TV", url: "https://tv.apple.com" },
  { key: "max", name: "Max", category: "Streaming and TV", url: "https://www.max.com" },
  { key: "paramount_plus", name: "Paramount+", category: "Streaming and TV", url: "https://www.paramountplus.com" },
  { key: "crunchyroll", name: "Crunchyroll", category: "Streaming and TV", url: "https://www.crunchyroll.com" },
  // Music and audio
  { key: "spotify", name: "Spotify", category: "Music and audio", url: "https://www.spotify.com/account" },
  { key: "apple_music", name: "Apple Music", category: "Music and audio", url: "https://music.apple.com" },
  { key: "youtube_music", name: "YouTube Music", category: "Music and audio", url: "https://music.youtube.com" },
  { key: "deezer", name: "Deezer", category: "Music and audio", url: "https://www.deezer.com" },
  { key: "tidal", name: "TIDAL", category: "Music and audio", url: "https://tidal.com" },
  { key: "audible", name: "Audible", category: "Music and audio", url: "https://www.audible.com" },
  // AI assistants
  { key: "claude", name: "Claude", category: "AI assistants", url: "https://claude.ai/settings/billing" },
  { key: "chatgpt", name: "ChatGPT", category: "AI assistants", url: "https://chatgpt.com" },
  { key: "gemini", name: "Google AI (Gemini)", category: "AI assistants", url: "https://one.google.com" },
  { key: "perplexity", name: "Perplexity", category: "AI assistants", url: "https://www.perplexity.ai" },
  { key: "copilot", name: "Microsoft Copilot", category: "AI assistants", url: "https://copilot.microsoft.com" },
  { key: "github_copilot", name: "GitHub Copilot", category: "AI assistants", url: "https://github.com/settings/copilot" },
  { key: "midjourney", name: "Midjourney", category: "AI assistants", url: "https://www.midjourney.com" },
  // Work, cloud and productivity
  { key: "microsoft_365", name: "Microsoft 365", category: "Work and productivity", url: "https://account.microsoft.com/services" },
  { key: "google_one", name: "Google One", category: "Work and productivity", url: "https://one.google.com" },
  { key: "icloud", name: "iCloud+", category: "Work and productivity", url: "https://www.icloud.com" },
  { key: "dropbox", name: "Dropbox", category: "Work and productivity", url: "https://www.dropbox.com/account" },
  { key: "notion", name: "Notion", category: "Work and productivity", url: "https://www.notion.so" },
  { key: "canva", name: "Canva", category: "Work and productivity", url: "https://www.canva.com" },
  { key: "adobe", name: "Adobe Creative Cloud", category: "Work and productivity", url: "https://account.adobe.com" },
  { key: "grammarly", name: "Grammarly", category: "Work and productivity", url: "https://account.grammarly.com" },
  { key: "zoom", name: "Zoom", category: "Work and productivity", url: "https://zoom.us/billing" },
  { key: "slack", name: "Slack", category: "Work and productivity", url: "https://slack.com" },
  { key: "linkedin_premium", name: "LinkedIn Premium", category: "Work and productivity", url: "https://www.linkedin.com/premium" },
  { key: "google_workspace", name: "Google Workspace", category: "Work and productivity", url: "https://admin.google.com" },
  { key: "one_password", name: "1Password", category: "Work and productivity", url: "https://1password.com" },
  { key: "nordvpn", name: "NordVPN", category: "Work and productivity", url: "https://nordvpn.com" },
  { key: "expressvpn", name: "ExpressVPN", category: "Work and productivity", url: "https://www.expressvpn.com" },
  // Websites and hosting
  { key: "vercel", name: "Vercel", category: "Websites and hosting", url: "https://vercel.com/account/billing" },
  { key: "supabase", name: "Supabase", category: "Websites and hosting", url: "https://supabase.com/dashboard" },
  { key: "netlify", name: "Netlify", category: "Websites and hosting", url: "https://app.netlify.com" },
  { key: "aws", name: "Amazon Web Services", category: "Websites and hosting", url: "https://console.aws.amazon.com/billing" },
  { key: "google_cloud", name: "Google Cloud", category: "Websites and hosting", url: "https://console.cloud.google.com/billing" },
  { key: "digitalocean", name: "DigitalOcean", category: "Websites and hosting", url: "https://cloud.digitalocean.com/account/billing" },
  { key: "cloudflare", name: "Cloudflare", category: "Websites and hosting", url: "https://dash.cloudflare.com" },
  { key: "github", name: "GitHub", category: "Websites and hosting", url: "https://github.com/settings/billing" },
  { key: "namecheap", name: "Namecheap (domains)", category: "Websites and hosting", url: "https://www.namecheap.com" },
  { key: "godaddy", name: "GoDaddy (domains)", category: "Websites and hosting", url: "https://www.godaddy.com" },
  { key: "shopify", name: "Shopify", category: "Websites and hosting", url: "https://admin.shopify.com" },
  { key: "wix", name: "Wix", category: "Websites and hosting", url: "https://www.wix.com" },
  { key: "squarespace", name: "Squarespace", category: "Websites and hosting", url: "https://account.squarespace.com" },
  // Learning, health and fitness
  { key: "duolingo", name: "Duolingo", category: "Learning, health and fitness", url: "https://www.duolingo.com" },
  { key: "coursera", name: "Coursera", category: "Learning, health and fitness", url: "https://www.coursera.org" },
  { key: "masterclass", name: "MasterClass", category: "Learning, health and fitness", url: "https://www.masterclass.com" },
  { key: "headspace", name: "Headspace", category: "Learning, health and fitness", url: "https://www.headspace.com" },
  { key: "calm", name: "Calm", category: "Learning, health and fitness", url: "https://www.calm.com" },
  { key: "strava", name: "Strava", category: "Learning, health and fitness", url: "https://www.strava.com" },
  { key: "gym", name: "Gym membership", category: "Learning, health and fitness" },
  // Gaming and lifestyle
  { key: "xbox", name: "Xbox Game Pass", category: "Gaming and lifestyle", url: "https://account.microsoft.com/services" },
  { key: "playstation", name: "PlayStation Plus", category: "Gaming and lifestyle", url: "https://www.playstation.com" },
  { key: "nintendo", name: "Nintendo Switch Online", category: "Gaming and lifestyle", url: "https://accounts.nintendo.com" },
  { key: "uber_one", name: "Uber One", category: "Gaming and lifestyle", url: "https://www.uber.com" },
  { key: "custom", name: "Other (type your own)", category: "Other" },
];
export const CURRENCIES = ["USD", "ZWG", "ZAR", "GBP", "EUR", "BWP"];

const EMPTY: Subscription[] = [];
export function useSubscriptions(): Subscription[] { return useStore((s) => ((s.sessionId ? (s.data[s.sessionId] as any)?.subscriptions : null) as Subscription[]) || EMPTY); }
export const allSubs = (): Subscription[] => { const s = useStore.getState(); return ((s.sessionId ? (s.data[s.sessionId] as any)?.subscriptions : null) as Subscription[]) || []; };
const save = (fn: (x: Subscription[]) => Subscription[]) => useStore.getState().patch((d: any) => ({ ...d, subscriptions: fn(d.subscriptions || []) }));

export const money = (n: number, cur: string) => { try { return new Intl.NumberFormat("en-GB", { style: "currency", currency: cur === "ZWG" ? "USD" : cur, maximumFractionDigits: 2 }).format(n).replace("US$", cur === "ZWG" ? "ZWG " : "$"); } catch { return `${cur} ${n.toFixed(2)}`; } };
export const perMonth = (s: Subscription) => (s.cycle === "weekly" ? (s.amount * 52) / 12 : s.cycle === "quarterly" ? s.amount / 3 : s.cycle === "yearly" ? s.amount / 12 : s.amount);
export const cycleLabel: Record<Cycle, string> = { weekly: "a week", monthly: "a month", quarterly: "every 3 months", yearly: "a year" };

function advance(date: string, cycle: Cycle) {
  const d = new Date(`${date}T09:00`);
  if (cycle === "weekly") d.setDate(d.getDate() + 7);
  else if (cycle === "monthly") d.setMonth(d.getMonth() + 1);
  else if (cycle === "quarterly") d.setMonth(d.getMonth() + 3);
  else d.setFullYear(d.getFullYear() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** A calendar entry on the due date, with its reminder 3 days before (that reminder also goes out as a push notification). */
function schedule(s: Subscription) {
  const start = new Date(`${s.nextDue}T09:00`).toISOString();
  const title = `${s.name} payment due (${money(s.amount, s.currency)})`;
  if (s.eventId && (useStore.getState().data[useStore.getState().sessionId!] as any)?.schedule?.some((e: any) => e.id === s.eventId)) {
    actions.updateEvent(s.eventId, { title, start, notified: false } as any);
    return s.eventId;
  }
  return actions.addEvent({ kind: "reminder", title, start, remindMinutes: 3 * 24 * 60, notes: `Sebastian is tracking this subscription in Finance.${s.payLink ? ` Pay at ${s.payLink}` : ""}`, source: { type: "manual", ref: `sub:${s.id}` } } as any);
}

export function addSub(p: Omit<Subscription, "id" | "payments" | "createdAt" | "active" | "eventId">) {
  const s: Subscription = { ...p, id: uid("sub_"), payments: [], active: true, createdAt: new Date().toISOString() };
  s.eventId = schedule(s);
  save((x) => [s, ...x]);
  track("add_subscription", { category: s.category, cycle: s.cycle });
  return s.id;
}
export function updateSub(id: string, p: Partial<Subscription>) {
  const cur = allSubs().find((s) => s.id === id); if (!cur) return;
  const next = { ...cur, ...p };
  if (next.active) next.eventId = schedule(next); else if (next.eventId) { actions.deleteEvent(next.eventId); next.eventId = undefined; }
  save((x) => x.map((s) => (s.id === id ? next : s)));
}
export function deleteSub(id: string) {
  const cur = allSubs().find((s) => s.id === id);
  if (cur?.eventId) actions.deleteEvent(cur.eventId);
  save((x) => x.filter((s) => s.id !== id));
}
/** Records a payment (also as a Finance expense), then moves the next due date and its reminder on. */
export function markPaid(id: string, amount?: number) {
  const cur = allSubs().find((s) => s.id === id); if (!cur) return;
  const paid = amount ?? cur.amount;
  const today = new Date().toISOString().slice(0, 10);
  actions.addTxn({ id: uid("tx_"), type: "expense", label: cur.name, category: "Subscriptions", amount: paid, date: today } as any);
  const next: Subscription = { ...cur, payments: [{ at: new Date().toISOString(), amount: paid }, ...cur.payments].slice(0, 60), nextDue: advance(cur.nextDue, cur.cycle) };
  next.eventId = schedule(next);
  save((x) => x.map((s) => (s.id === id ? next : s)));
  return next.nextDue;
}
