# Sebastian — your intelligent concierge

A Next.js 14 (App Router) implementation of Sebastian AI, built from the *Implementation Design Specification*, the *Section Workflows* document and the reference dashboard.

## Run it

```bash
npm install
cp .env.example .env.local   # add your keys (see below)
npm run dev                  # http://localhost:3000
```

Create an account at `/signup`. Everything works on desktop, tablet and mobile.

### Keys

| Variable | Needed for | Without it |
|---|---|---|
| `ANTHROPIC_API_KEY` | Chat, itineraries, booking suggestions, fashion looks, recipe-from-video, chef Q&A, finance review | Those features show an explicit "AI not configured" state; chat still routes you to the right suite with a keyword router |
| `ANTHROPIC_MODEL` | Model override | Defaults to `claude-sonnet-4-6` |
| `GOOGLE_MAPS_API_KEY` | Discover via Google Places (with photos), hotel photos | Discover falls back to OpenStreetMap (no photos) |
| `GOOGLE_WEATHER_API_KEY` | Google Weather | Falls back to Open-Meteo (no key) |
| `YOUTUBE_API_KEY` | Embedded YouTube Shorts in Fashion | Deep links to TikTok / Instagram / YouTube / Pinterest |
| `UNSPLASH_ACCESS_KEY` | Downloadable style images in Fashion | Pinterest deep links |

Recipes (Allrecipes, Food Network, A Couple Cooks) and News (BBC, CNN, ABC, Al Jazeera, Sky, Fox, ZBC RSS feeds) need no keys.

## How each workflow maps to the brief

- **Recipes** — 5 steps (occasion → category or pasted TikTok/YouTube/Instagram link → servings 1–100 → dietary restrictions → notes). *Prepare* plays a ≥5-second cooking animation while the server scrapes the whitelisted sites, parses schema.org recipe data, filters out clashing ingredients, and returns 10 recipes (chef/dietician notes and gap-filling via Claude, clearly labelled). Horizontal scroll on desktop, swipe on mobile, cookbook with counter and search, serving scaling, and **Chef Mode** (reads steps aloud, voice commands: next / back / repeat / ingredients / stop, or ask any cooking question).
- **Booking** — choose Stays, Flights, Car rental, Attractions or Airport taxis first; only that type's filter bar appears (Booking.com-inspired layout, not a clone). Voice input fills the filters. Results are Sebastian's suggestions with *estimated* prices; every handoff shows a confirmation of your details, opens Booking.com, and adds the dates to Schedule (with a Google Calendar button). Direct links to Agoda, Tripadvisor, Flight-Fare and Air Zimbabwe.
- **Travel** — Layla-style conversational planner with text, date pickers, radio buttons, sliders and checkboxes, or free-text ("five days in Cape Town…") that asks only for what's missing. Stage tracker, live weather and forecast advisories, day-by-day itinerary, attractions, budget, stays and flights handoff, Save to Schedule, PDF download, and **Trip DNA** recommendations (viewable, resettable, can be switched off).
- **Discover** — categories, near-me (asks for location) or another location, heart favourites that return as "Your choice", desktop grid and a Tinder-style swipe deck on mobile, confirmed handoff to Google Maps directions. **Emergency mode**: Police, Ambulance, Fire, Other with country-specific numbers, voice command ("call police"), and a confirmation before opening the dialler.
- **Fashion** — skin care, dressing, hairstyles or colour combinations → occasion → gender → age → complexion; skin-care-only questions follow, with a dermatologist notice and a link to find one in Discover. Results are organised into Looks, Reels and Images tabs.
- **Schedule** — 4-step wizard matching the screenshots, count badge in navigation, bookings and trips added automatically (with source labels), edit/delete, Google Calendar and `.ics` export for phones, in-app and browser reminders.
- **Finance** — savings plans (name, target, weekly/monthly/whenever, $0–$1,000 commitment slider, projected finish date, deposit log, reminders, edit, archive/restore, delete with confirmation), income vs expenses by month, category breakdown, 50/30/20 plan, yearly review chart, and an optional AI assessment. Framed as organisation, not financial advice.
- **News** — pick sources and categories; breaking/developing stories surface first; cards open the publisher's site; auto-refresh every 5 minutes.

## Architecture (spec §26)

```
src/app/(auth)        login, signup (real-time password checklist, Lord/Lady preview)
src/app/(app)         shell + suites (home, chat, recipes, booking, travel, discover, schedule, finance, fashion, news, settings)
src/app/api/*         allow-listed tool routes — every one returns explicit ok/error/empty/ai_unavailable
src/lib/server/*      adapters: ai, recipes (cheerio scraper), news (RSS), weather, places, media, provider links
src/lib/store.ts      persistence layer (per-account, idempotent cross-suite events via source.ref)
src/components/ui/*   design system: Button, Option, Modal, ConfirmDialog, Wizard, Notice/Empty/Error, Toast, Img, Breadcrumbs
```

## Decisions worth knowing

1. **Beautiful Soup → Cheerio.** The brief names Beautiful Soup (Python). Since the app is Next.js, scraping uses Cheerio, the Node equivalent, reading each page's schema.org Recipe data, which is more reliable than HTML scraping.
2. **Accounts live on the device** (hashed passwords in local storage) so the app runs with no backend. `src/lib/store.ts` is the single swap point for Supabase or another database.
3. **Google Calendar** opens pre-filled so you confirm the save in Google; `.ics` export covers phone calendars. Silent two-way sync needs a Google OAuth client and can be added behind the same calendar helper.
4. **Booking.com, TikTok, Instagram and Pinterest have no public search APIs**, so Sebastian hands off with pre-filled links and labels all prices as estimates — it never claims a booking exists.
5. **Emergency calls** open the phone's dialler (`tel:`); browsers can't place calls themselves.
6. Weather "alerts" are Sebastian's reading of the forecast, labelled as such, not official warnings.
