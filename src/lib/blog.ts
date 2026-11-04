// Sebastian's News: partnerships, events and new features.
// To add a post, copy one of the entries below, give it a new "slug" (its web address) and today's date.
// Newest posts appear first automatically.

export type Block =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "partners" }
  | { type: "cta"; text: string; href: string };
export type Cover = { kind: "partners" } | { kind: "image"; src: string; alt: string } | { kind: "mark" };
export type Post = { slug: string; title: string; date: string; tag: "Partnership" | "Event" | "What's new" | "Product" | "Announcement"; excerpt: string; cover: Cover; body: Block[] };

export const PARTNERS = [
  { name: "Takmor Technologies", logo: "/images/partners/takmor.jpg" },
  { name: "Devplus", logo: "/images/partners/devplus.jpg" },
  { name: "Artificial Intelligence Institute Africa (Aiia)", logo: "/images/partners/aiia.jpg" },
];

export const POSTS: Post[] = [
  {
    slug: "welcoming-our-partners", date: "2026-11-04", tag: "Partnership",
    title: "Welcoming our partners: Takmor Technologies, Devplus and Aiia",
    excerpt: "Sebastian is growing in good company. We're delighted to introduce the organisations we're working alongside.",
    cover: { kind: "partners" },
    body: [
      { type: "p", text: "Building a personal concierge for everyday life is not something we want to do alone. Today we're proud to introduce the partners working alongside Sebastian as we grow." },
      { type: "partners" },
      { type: "h", text: "Takmor Technologies" },
      { type: "p", text: "We're delighted to be working with Takmor Technologies, and to share our commitment to technology that makes a practical difference to people's lives." },
      { type: "h", text: "Devplus" },
      { type: "p", text: "Devplus, whose motto is \"byte crafting your dreams\", shares our belief that thoughtfully built software can make everyday life easier." },
      { type: "h", text: "Artificial Intelligence Institute Africa (Aiia)" },
      { type: "p", text: "We're proud to be connected with the Artificial Intelligence Institute Africa, and to be part of a growing community building artificial intelligence on and for the continent." },
      { type: "p", text: "We'll share more about what we're building together in the months ahead. If your organisation would like to partner with Sebastian, we'd love to hear from you." },
      { type: "cta", text: "Get in touch", href: "/welcome#contact" },
    ],
  },
  {
    slug: "whats-new-november-2026", date: "2026-11-03", tag: "What's new",
    title: "What's new: subscriptions, tasks and a voice on every website",
    excerpt: "Sebastian can now track your subscriptions, take care of tasks for you, and talk you through any website by voice.",
    cover: { kind: "image", src: "/videos/sebastian-demo-poster.jpg", alt: "The Sebastian app" },
    body: [
      { type: "p", text: "This month brings some of the biggest changes to Sebastian yet. Here's what's new, and how to try each one." },
      { type: "h", text: "Track your subscriptions" },
      { type: "p", text: "In Finance, under Subscriptions, add ZESA, insurance, Netflix, Spotify, AI tools, hosting and more. Sebastian adds each payment to your calendar, reminds you three days before it's due, and records it in your expenses when you mark it as paid." },
      { type: "h", text: "Give Sebastian a task" },
      { type: "p", text: "Tap Tasks at the bottom of the screen and say what you need, such as \"Find a mechanic near Avondale and remind me on Friday\". Sebastian plans the steps, does the groundwork, asks you a question if something important is missing, and checks with you before anything is added, sent, booked or paid." },
      { type: "h", text: "Routines and reminders" },
      { type: "p", text: "Water, movement, medication, bills and application follow-ups, with discreet reminders. You'll find them in Schedule." },
      { type: "h", text: "Picked for you" },
      { type: "p", text: "The new For you page suggests recipes, places to visit, things to do and news from your favourite sources, based on what Sebastian has learned you enjoy. Your thumbs up and down help him choose better." },
      { type: "h", text: "Your apps" },
      { type: "p", text: "Connect Gmail and Google Calendar, and choose what Sebastian should look out for. View only: he never posts, sends or changes anything without asking." },
    ],
  },
  {
    slug: "sebastian-companion-1-1", date: "2026-11-02", tag: "Product",
    title: "Sebastian Companion 1.1: talk, shop and fill in forms on any website",
    excerpt: "Tap the bow tie on any website to talk it through with Sebastian by voice, get help shopping, and have your basic details filled in.",
    cover: { kind: "image", src: "/images/butler-tray.png", alt: "A butler's white-gloved hand presenting a silver tray" },
    body: [
      { type: "p", text: "Sebastian Companion, our browser extension for Chrome and Edge, now brings Sebastian with you across the web." },
      { type: "list", items: [
        "Tap the black-and-white bow tie on a page to talk to Sebastian. Tap the microphone once for a back-and-forth voice conversation.",
        "Ask about what you're looking at: whether a product suits what you wanted, and the delivery, size and return details that matter.",
        "Let Sebastian fill in your basic details on forms, such as your name, email and phone number. Every field he fills is highlighted in gold.",
      ] },
      { type: "quote", text: "Sebastian never enters passwords, card or bank details, and never submits a form, adds to a cart or pays. You always do." },
      { type: "p", text: "To try it, open Your apps in Sebastian and switch on Sebastian Companion, then follow the steps to add the extension to your browser." },
    ],
  },
  {
    slug: "meet-sebastian", date: "2026-10-05", tag: "Announcement",
    title: "Meet Sebastian, your personal concierge",
    excerpt: "An AI concierge that plans your trips, finds your recipes, keeps your calendar, drafts your emails and helps you study, with a butler's composure.",
    cover: { kind: "mark" },
    body: [
      { type: "p", text: "Sebastian is an AI personal concierge that looks after your day the way a trusted butler would: warmly, discreetly and always one step ahead." },
      { type: "p", text: "Instead of working out which app you need, you simply tell Sebastian what you want, in your own words or out loud, in English, Shona, Ndebele and more." },
      { type: "list", items: ["Scheduling and discreet reminders", "Travel planning and bookings, checked with you first", "Recipes, style and things to do nearby", "News from trusted sources", "Email drafted in your own words, never sent without your approval"] },
      { type: "p", text: "Sebastian is opening to a small group of testers. Join the waitlist and we'll invite you as soon as a place is free." },
      { type: "cta", text: "Join the waitlist", href: "/welcome#waitlist" },
    ],
  },
  // Example: an event you attended. Copy it above, fill it in, and remove the "//" at the start of each line.
  // {
  //   slug: "harare-tech-summit-2026", date: "2026-11-20", tag: "Event",
  //   title: "Sebastian at the Harare Tech Summit",
  //   excerpt: "One or two sentences about the event and what you showed.",
  //   cover: { kind: "image", src: "/images/events/harare-tech-summit.jpg", alt: "Our stand at the summit" },
  //   body: [
  //     { type: "p", text: "What happened, who you met and what you learned." },
  //   ],
  // },
];

export const sortedPosts = () => [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
export const getPost = (slug: string) => POSTS.find((p) => p.slug === slug);
export const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
