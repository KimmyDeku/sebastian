import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Wordmark } from "@/components/SebastianMark";
import { SUPPORT } from "@/lib/support";

export const metadata = { title: "Privacy Policy · Sebastian" };

const UPDATED = "28 September 2026";

function S({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="t-h2 mt-12 mb-4">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-ink/85">{children}</div>
    </section>
  );
}
const L = ({ items }: { items: React.ReactNode[] }) => <ul className="list-disc pl-5 space-y-2">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>;

export default function Privacy() {
  const toc = [
    ["who", "Who we are"], ["terms", "Key terms"], ["data", "Data we process"], ["sensitive", "Sensitive information"],
    ["why", "Why we process your data"], ["ai", "AI processing"], ["voice", "Voice, microphone and location"],
    ["storage", "Where your data is stored"], ["sharing", "Who receives your data"], ["transfers", "International transfers"],
    ["retention", "How long we keep your data"], ["rights", "Your rights and controls"], ["notifications", "Reminders and notifications"],
    ["cookies", "Cookies and local storage"], ["security", "Security"], ["children", "Children"], ["changes", "Changes and contact"],
  ];
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-paper/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" aria-label="Sebastian home"><Wordmark /></Link>
          <Link href="/settings" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink"><ChevronLeft className="w-4 h-4" />Back to settings</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 py-10 md:py-14 pb-24">
        <h1 className="t-h1">Sebastian Privacy Policy</h1>
        <p className="text-muted text-sm mt-2">Last updated: {UPDATED}</p>
        <p className="mt-6 text-[15px] leading-relaxed">Your privacy matters to us. This policy explains what personal data Sebastian processes, including your account details and your conversations, why we process it, who receives it, and the rights and controls you have.</p>

        <nav aria-label="Contents" className="mt-8 rounded-2xl bg-paper border border-line p-5">
          <p className="t-kicker text-muted mb-3">Contents</p>
          <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[13.5px] list-decimal pl-5">{toc.map(([id, t]) => <li key={id}><a href={`#${id}`} className="hover:underline">{t}</a></li>)}</ol>
        </nav>

        <S id="who" title="Who we are">
          <p>Sebastian is provided by {SUPPORT.company}, {SUPPORT.address} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). We are the controller of your personal data: we decide why and how it is processed.</p>
          <p>Contact: <a className="underline" href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a> · {SUPPORT.phone}</p>
        </S>

        <S id="terms" title="Key terms">
          <L items={[
            <><b className="font-medium">Personal data</b> is any information that identifies you directly or indirectly.</>,
            <><b className="font-medium">Processing</b> covers everything done with personal data: collecting, storing, using, sharing and deleting it.</>,
            <><b className="font-medium">Profiling</b> is automated processing that evaluates personal preferences, such as the travel interests Sebastian learns for Trip DNA.</>,
            <><b className="font-medium">Processors</b> are companies that process data on our instructions, such as our AI and hosting providers.</>,
          ]} />
        </S>

        <S id="data" title="Data we process">
          <L items={[
            <><b className="font-medium">Account data:</b> first name, surname, date of birth, gender (used for your form of address, Lord or Lady), phone number, email address, time zone, your hashed password and your settings (language, theme, voice and reminder choices, plan).</>,
            <><b className="font-medium">Your conversations with Sebastian:</b> the messages you type or speak, Sebastian&apos;s replies, any files you attach, and timestamps. Voice conversations are saved as text in your chat history.</>,
            <><b className="font-medium">What you create in the suites:</b> saved recipes and your cookbook, dietary notes, trips and itineraries, travel preferences (Trip DNA), bookings you hand off to providers, schedule entries and reminders, savings plans, income and expense entries, saved places, news preferences and fashion questionnaire answers.</>,
            <><b className="font-medium">Location:</b> only when you choose &ldquo;Near me&rdquo; in Discover or ask the Voice Concierge for something nearby. We use it for that search and don&apos;t keep a location history.</>,
            <><b className="font-medium">Technical data:</b> basic server logs (such as time, route and errors) kept briefly for security and troubleshooting.</>,
          ]} />
          <p>Chat is free text. Please share only what Sebastian needs for your request; whatever you write or say becomes part of your stored conversation.</p>
        </S>

        <S id="sensitive" title="Sensitive information">
          <p>Some features ask for information that can be sensitive: dietary restrictions, allergies or medication in Recipes, skin concerns in Fashion, and complexion or heritage (&ldquo;Which best describes you?&rdquo;) to tailor style suggestions. These questions are optional; you can always choose &ldquo;Any&rdquo; or leave them blank.</p>
          <p>If you provide this information, you explicitly consent to us processing it only to answer that request. We do not use it for advertising or sell it, and you can delete it at any time by deleting the conversation or your account.</p>
          <p>Sebastian offers general information, not medical, legal or financial advice. For health concerns, please consult a qualified professional.</p>
        </S>

        <S id="why" title="Why we process your data">
          <L items={[
            <><b className="font-medium">Providing the service:</b> your account, chats, recipes, trips, schedule, finances and every other suite. This is necessary to perform our agreement with you.</>,
            <><b className="font-medium">Personalisation:</b> addressing you as you prefer, Trip DNA recommendations and birthday greetings. You can switch Trip DNA off in Settings.</>,
            <><b className="font-medium">Security and reliability:</b> preventing abuse and fixing errors, based on our legitimate interest in a safe service.</>,
            <><b className="font-medium">Plan upgrades:</b> handling your request when you contact us to change plans.</>,
            <><b className="font-medium">Legal obligations:</b> keeping records where the law requires it.</>,
          ]} />
        </S>

        <S id="ai" title="AI processing">
          <p>Sebastian is an AI assistant. When you chat, speak to the Voice Concierge, ask for recipes, itineraries, booking suggestions, style ideas, finance reviews or translations, the relevant text is sent to our AI provider, <b className="font-medium">Groq</b>, to generate a response in real time.</p>
          <L items={[
            <><b className="font-medium">Transparency:</b> you are always talking to an AI system, not a person.</>,
            <><b className="font-medium">Training:</b> we do not use your personal data to train AI models. Our AI provider processes your content to produce your results under its API terms.</>,
            <><b className="font-medium">Suggestions only:</b> AI output is advice and suggestions. Sebastian never makes bookings, payments or decisions with legal effect on your behalf, and asks for your confirmation before changing your data.</>,
            <><b className="font-medium">Accuracy:</b> AI can make mistakes. Please verify prices, availability, opening times, weather, and visa, entry and health requirements before relying on them.</>,
          ]} />
        </S>

        <S id="voice" title="Voice, microphone and location">
          <p>When you tap a microphone, your browser converts your speech to text. In Chrome and Edge this is done by Google&apos;s speech service; in Safari, by Apple. Sebastian receives only the resulting text.</p>
          <p>Spoken replies are produced by your device&apos;s built-in voice or, if enabled, by <b className="font-medium">ElevenLabs</b>, which receives the text to be read aloud.</p>
          <p>Microphone and location access are only used while you are actively using them, and you can withdraw permission at any time in your browser settings.</p>
        </S>

        <S id="storage" title="Where your data is stored">
          <p>Your account and data are stored in our database provider, <b className="font-medium">Supabase</b>, so you can use the same account on any device, and a working copy is kept in your browser&apos;s local storage on each device you use. Passwords are handled by Supabase authentication and are never stored in readable form.</p>
        </S>

        <S id="sharing" title="Who receives your data">
          <p>We use carefully selected providers, each receiving only what is needed for the feature you use:</p>
          <L items={[
            <><b className="font-medium">Hosting and database:</b> Supabase (accounts and data); our hosting provider (running the app).</>,
            <><b className="font-medium">AI:</b> Groq (conversations, reasoning and translation). ElevenLabs, if enabled (voice).</>,
            <><b className="font-medium">Maps and places:</b> Google Maps Platform (places, photos, Street View, weather) and OpenStreetMap services, which receive your search and, for &ldquo;near me&rdquo;, your approximate coordinates.</>,
            <><b className="font-medium">Weather:</b> Open-Meteo or Google Weather receive the destination you ask about.</>,
            <><b className="font-medium">Content sources:</b> recipe sites, news publishers, YouTube, Pinterest and Meta (Instagram) receive search terms or links needed to fetch content. They do not receive your identity from us.</>,
            <><b className="font-medium">Booking providers:</b> when you choose &ldquo;View on Booking.com&rdquo; or similar, we open the provider&apos;s site with your search details. Any booking is made directly between you and that provider under their privacy policy.</>,
            <><b className="font-medium">Authorities:</b> where we are legally required to disclose data.</>,
          ]} />
          <p>We do not sell your personal data or use it for third-party advertising.</p>
        </S>

        <S id="transfers" title="International data transfers">
          <p>Some providers process data outside Zimbabwe, including in the United States and the European Union. Where this happens, we rely on the provider&apos;s contractual safeguards and choose providers with recognised security standards.</p>
        </S>

        <S id="retention" title="How long we keep your data">
          <L items={[
            "Account data, conversations, trips and other content: for as long as your account exists, so you can return and continue.",
            "Individual conversations: until you delete them (Settings, then Privacy & data, then Clear chat history).",
            "Server logs: for a short period for security, then deleted.",
            "Translations of the app's text: cached on your device until you clear your browser data.",
          ]} />
        </S>

        <S id="rights" title="Your rights and controls">
          <L items={[
            <><b className="font-medium">Download your data:</b> Settings, then Privacy & data, then Export my data.</>,
            <><b className="font-medium">Delete your data:</b> clear chat history, or delete your account in Settings.</>,
            <><b className="font-medium">Correct your data:</b> edit your personal information in Settings at any time.</>,
            <><b className="font-medium">Object or withdraw consent:</b> switch off Trip DNA, voice, reminders or notifications in Settings, or contact us.</>,
          ]} />
          <p>You may also have rights under the Zimbabwe Cyber and Data Protection Act and, where applicable, other data protection laws such as the EU GDPR, including the right to complain to your data protection authority. We respond to requests within one month.</p>
        </S>

        <S id="notifications" title="Reminders and notifications">
          <p>If you allow notifications, Sebastian alerts you before scheduled items and on your birthday. For your privacy, notifications and spoken alerts never describe what a reminder is about; they simply say that you have a notification. The details are only visible inside Sebastian.</p>
        </S>

        <S id="cookies" title="Cookies and local storage">
          <p>Sebastian does not use advertising or analytics cookies. We use your browser&apos;s local storage for strictly necessary purposes: keeping you signed in, storing your data for offline use, and remembering your language, theme and translation cache. You can clear these at any time in your browser settings; doing so signs you out on that device.</p>
        </S>

        <S id="security" title="Security">
          <p>We apply technical and organisational measures appropriate to the risk, including encrypted connections, access controls that let each account see only its own data, and API keys kept on our server rather than in your browser.</p>
        </S>

        <S id="children" title="Children">
          <p>Sebastian is not directed at children under 16, and we do not knowingly process their data without a parent or guardian&apos;s involvement.</p>
        </S>

        <S id="changes" title="Changes and contact">
          <p>We will update this policy as Sebastian evolves and show the date of the latest version above. For any question about this policy or your data, contact <a className="underline" href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a>.</p>
        </S>
      </main>
    </div>
  );
}
