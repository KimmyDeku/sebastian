// Shared task definitions for Sebastian's Voice Concierge (used by the server and the screen).
export type Slot = { key: string; label: string; ask: string; hint?: string; required?: boolean | ((s: Record<string, any>) => boolean) };
export type TaskDef = { label: string; slots: Slot[]; confirm?: boolean };

export const TASKS: Record<string, TaskDef> = {
  flights: { label: "Flight options", slots: [
    { key: "from", label: "From", ask: "Where will you be flying from?", required: true, hint: "city or airport, add IATA code if known, e.g. Harare (HRE)" },
    { key: "to", label: "To", ask: "And where are you flying to?", required: true, hint: "e.g. Zanzibar (ZNZ)" },
    { key: "trip", label: "Trip type", ask: "Is this a return trip, or one way?", required: true, hint: "round | oneway" },
    { key: "depart", label: "Departure", ask: "What date would you like to depart?", required: true, hint: "YYYY-MM-DD" },
    { key: "ret", label: "Return", ask: "And when would you like to fly back?", required: (s) => s.trip !== "oneway", hint: "YYYY-MM-DD" },
    { key: "adults", label: "Travellers", ask: "How many people are travelling?", required: true, hint: "number" },
    { key: "cabin", label: "Cabin", ask: "Which class would you prefer?", hint: "Economy | Premium_Economy | Business | First (default Economy)" },
  ] },
  stays: { label: "Places to stay", slots: [
    { key: "dest", label: "Destination", ask: "Where would you like to stay?", required: true },
    { key: "checkin", label: "Check-in", ask: "What date will you check in?", required: true, hint: "YYYY-MM-DD" },
    { key: "checkout", label: "Check-out", ask: "And when will you check out?", required: true, hint: "YYYY-MM-DD" },
    { key: "adults", label: "Adults", ask: "How many adults will be staying?", required: true, hint: "number" },
    { key: "children", label: "Children", ask: "Any children travelling?", hint: "number, default 0" },
    { key: "rooms", label: "Rooms", ask: "How many rooms do you need?", hint: "number, default 1" },
  ] },
  cars: { label: "Car rental", slots: [
    { key: "where", label: "Pick-up", ask: "Where would you like to pick up the car?", required: true },
    { key: "pickup", label: "Pick-up time", ask: "When would you like to collect it?", required: true, hint: "YYYY-MM-DDTHH:mm" },
    { key: "dropoff", label: "Drop-off time", ask: "And when will you return it?", required: true, hint: "YYYY-MM-DDTHH:mm" },
    { key: "age", label: "Driver's age", ask: "How old is the main driver?", required: true, hint: "number" },
  ] },
  attractions: { label: "Attractions", slots: [
    { key: "where", label: "Where", ask: "Which city or area shall I look in?", required: true },
    { key: "date", label: "Date", ask: "Which day are you thinking of?", required: true, hint: "YYYY-MM-DD" },
  ] },
  taxis: { label: "Airport taxi", slots: [
    { key: "from", label: "Pick-up", ask: "Where should the taxi collect you?", required: true },
    { key: "to", label: "Drop-off", ask: "And where are you heading?", required: true },
    { key: "date", label: "Date", ask: "Which day is the transfer?", required: true, hint: "YYYY-MM-DD" },
    { key: "time", label: "Time", ask: "What time should it collect you?", required: true, hint: "HH:mm" },
    { key: "passengers", label: "Passengers", ask: "How many passengers?", required: true, hint: "number" },
  ] },
  bus: { label: "Bus and other transport", slots: [
    { key: "from", label: "From", ask: "Where will you be travelling from?", required: true },
    { key: "to", label: "To", ask: "And where are you going?", required: true },
    { key: "date", label: "Date", ask: "Which day would you like to travel?", required: true, hint: "YYYY-MM-DD" },
    { key: "passengers", label: "Passengers", ask: "How many passengers?", required: true, hint: "number" },
    { key: "mode", label: "Transport", ask: "Would you prefer a bus, a train or a ferry?", hint: "Bus|Train|Ferry|Any (default Any)" },
  ] },
  trip: { label: "Trip itinerary", slots: [
    { key: "destination", label: "Destination", ask: "Where would you like to go?", required: true },
    { key: "start", label: "Start date", ask: "When would you like the trip to start?", required: true, hint: "YYYY-MM-DD" },
    { key: "end", label: "End date", ask: "And when will it end?", required: true, hint: "YYYY-MM-DD" },
    { key: "travellers", label: "Travellers", ask: "How many people are going?", required: true, hint: "number" },
    { key: "budget", label: "Budget", ask: "What's your budget for the trip, excluding flights?", required: true, hint: "number in USD" },
    { key: "activities", label: "Interests", ask: "What would you love to do there?", hint: "comma-separated, e.g. Beaches, Food & dining" },
    { key: "origin", label: "Flying from", ask: "Where will you be travelling from?", hint: "city, optional" },
  ] },
  recipe: { label: "Recipes", slots: [
    { key: "category", label: "Meal", ask: "What kind of dish would you like: breakfast, lunch, dinner, a snack, dessert or a drink?", required: true, hint: "Breakfast|Lunch|Dinner|Snack|To Share|Dessert|Lunchbox|Drink" },
    { key: "servings", label: "Servings", ask: "How many people shall I cook for?", required: true, hint: "number" },
    { key: "diet", label: "Dietary needs", ask: "Any dietary restrictions or allergies I should know about?", required: true, hint: "text, or 'none'" },
    { key: "occasion", label: "Occasion", ask: "Is there an occasion?", hint: "optional" },
    { key: "notes", label: "Notes", ask: "Anything else I should consider?", hint: "optional" },
  ] },
  discover: { label: "Find nearby", slots: [
    { key: "category", label: "Looking for", ask: "What are you looking for?", required: true, hint: "e.g. Pharmacy, Restaurant, Cafe, Mechanic" },
    { key: "where", label: "Where", ask: "Near you, or somewhere else?", required: true, hint: "'near me' or a place name" },
  ] },
  news: { label: "News briefing", slots: [
    { key: "categories", label: "Topics", ask: "Any particular topics?", hint: "comma-separated from: top, world, science, technology, politics, economy, business, social, weather (default top)" },
  ] },
  schedule: { label: "Add to schedule", confirm: true, slots: [
    { key: "kind", label: "Type", ask: "Is this an appointment, a meeting or a reminder?", required: true, hint: "appointment|meeting|reminder|other" },
    { key: "title", label: "What", ask: "What is it regarding?", required: true },
    { key: "datetime", label: "When", ask: "When shall I set it for?", required: true, hint: "YYYY-MM-DDTHH:mm" },
    { key: "remindMinutes", label: "Reminder", ask: "How long before should I remind you?", hint: "minutes: 0, 15, 60 or 1440 (default 15)" },
  ] },
  expense: { label: "Record an expense", confirm: true, slots: [
    { key: "label", label: "For", ask: "What was the expense for?", required: true },
    { key: "amount", label: "Amount", ask: "How much was it?", required: true, hint: "number" },
    { key: "category", label: "Category", ask: "Which category fits best?", hint: "Housing|Groceries|Transport|Utilities|Eating out|Entertainment|Health|Education|Shopping|Debt|Family|Other" },
  ] },
  income: { label: "Record income", confirm: true, slots: [
    { key: "label", label: "Source", ask: "Where is the income from?", required: true },
    { key: "amount", label: "Amount", ask: "How much was it?", required: true, hint: "number" },
  ] },
  finance_review: { label: "Finance review", slots: [
    { key: "period", label: "Period", ask: "Shall I review this month or this year?", hint: "month | year (default month)" },
  ] },
  fashion: { label: "Style ideas", slots: [
    { key: "type", label: "Ideas for", ask: "Would you like ideas for skin care, dressing, hairstyles or colour combinations?", required: true, hint: "skincare|dressing|hairstyles|colours" },
    { key: "occasion", label: "Occasion", ask: "What's the occasion?", required: true },
    { key: "gender", label: "Styling", ask: "Shall I style for a man or a woman?", required: true, hint: "Male|Female" },
    { key: "age", label: "Age group", ask: "Which age group should I have in mind?", required: true, hint: "12 and below|13 - 17|18 - 25|25 - 35|35 - 50|50+" },
    { key: "heritage", label: "Complexion", ask: "Which best describes your complexion or heritage? You can say any.", required: true },
  ] },
  emergency: { label: "Emergency call", confirm: true, slots: [
    { key: "service", label: "Service", ask: "Do you need the police, an ambulance or the fire department?", required: true, hint: "police|ambulance|fire|general" },
  ] },
};

const empty = (v: any) => v == null || v === "" || (Array.isArray(v) && v.length === 0);

export function missingSlots(task: string, s: Record<string, any>): Slot[] {
  const def = TASKS[task];
  if (!def) return [];
  return def.slots.filter((x) => (typeof x.required === "function" ? x.required(s) : !!x.required) && empty(s[x.key]));
}

export function taskCatalog() {
  return Object.entries(TASKS).map(([k, t]) =>
    `- ${k}: ${t.label}${t.confirm ? " (needs confirmation)" : ""} — ${t.slots.map((x) => `${x.key}${x.required ? "*" : ""}${x.hint ? ` (${x.hint})` : ""}`).join(", ")}`
  ).join("\n") + "\n- question: any other request you can simply answer — no slots";
}

export function formatSlot(v: any) {
  if (empty(v)) return "";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(v)) {
    const d = new Date(v.length === 10 ? v + "T00:00" : v);
    return d.toLocaleString("en-GB", v.length === 10 ? { weekday: "short", day: "numeric", month: "short" } : { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }
  if (v === "round") return "Return";
  if (v === "oneway") return "One way";
  return String(v).replace(/_/g, " ");
}
