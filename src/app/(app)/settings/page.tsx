"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown, User, KeyRound, Globe, Gem, SlidersHorizontal, ShieldCheck, LifeBuoy, Eye, EyeOff, Check, Circle,
  Download, Volume2, Bell, Sun, Moon, Monitor, MessageCircle, Phone, Mail, ExternalLink, Crown, Receipt as ReceiptIcon, RefreshCw,
} from "lucide-react";
import { Checkout, downloadReceipt, pendingPayment, clearPendingPayment } from "@/components/billing/Checkout";
import { METHOD_NAMES, PLAN_NAMES, type Receipt } from "@/lib/billing";
import { useNotebook, patchNotebook } from "@/lib/notebook";
import { Gauge } from "lucide-react";
import { Container, PageHeader } from "@/components/ui/Page";
import { Field, inputCls, Option } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/States";
import { LanguageList } from "@/components/LanguageMenu";
import { actions, useAccount, useData, useStore } from "@/lib/store";
import { greeting, formOfAddress } from "@/lib/address";
import { useSpeaker } from "@/lib/voice";
import { playChime } from "@/lib/sound";
import { getTheme, setTheme, type Theme } from "@/lib/theme";
import { SUPPORT, whatsappLink } from "@/lib/support";
import { EMERGENCY } from "@/components/discover/emergency";
import { cloudEnabled, supabase } from "@/lib/supabase";
import { hashPassword, uid, cx } from "@/lib/util";
import { toast } from "@/components/ui/Toast";
import type { Gender } from "@/lib/types";

/* ---------- building blocks ---------- */
function Section({ id, icon: I, title, summary, open, onToggle, children }: { id: string; icon: any; title: string; summary?: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-paper border border-line overflow-hidden">
      <h2>
        <button id={`${id}-btn`} aria-expanded={open} aria-controls={`${id}-panel`} onClick={onToggle}
          className="w-full flex items-center gap-4 px-5 md:px-6 py-4 text-left hover:bg-cream/40 transition-colors">
          <span className="w-10 h-10 rounded-xl bg-cream inline-flex items-center justify-center shrink-0"><I className="w-5 h-5 text-gold" strokeWidth={1.6} aria-hidden /></span>
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-medium">{title}</span>
            {summary && <span className="block text-[12.5px] text-muted truncate">{summary}</span>}
          </span>
          <ChevronDown className={cx("w-5 h-5 text-muted transition-transform", open && "rotate-180")} aria-hidden />
        </button>
      </h2>
      {open && <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-btn`} className="px-5 md:px-6 pb-6 pt-1 border-t border-line animate-fadeUp">{children}</div>}
    </section>
  );
}

function Toggle({ label, desc, on, set, disabled }: { label: string; desc?: string; on: boolean; set: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className={cx("flex items-start justify-between gap-6 py-3.5", disabled && "opacity-50")}>
      <div><p className="text-[14px]">{label}</p>{desc && <p className="text-xs text-muted mt-0.5 max-w-md">{desc}</p>}</div>
      <button role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => set(!on)} className={cx("relative w-11 h-6 rounded-full transition-colors shrink-0", on ? "bg-ink" : "bg-line")}>
        <span className={cx("absolute top-0.5 w-5 h-5 rounded-full bg-paper shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
      </button>
    </div>
  );
}

const pwRules = (p: string) => [
  { label: "8+ characters", ok: p.length >= 8 },
  { label: "Uppercase", ok: /[A-Z]/.test(p) },
  { label: "Lowercase", ok: /[a-z]/.test(p) },
  { label: "Number", ok: /\d/.test(p) },
  { label: "Special character", ok: /[^A-Za-z0-9]/.test(p) },
];

const PLANS = [
  { key: "silver", name: "Silver", price: "Free", period: "", blurb: "Everything you need for everyday help.",
    features: ["All eight suites: recipes, booking, travel, discover, schedule, finance, fashion and news", "Chat assistant and Voice Concierge", "Reminders and your personal schedule", "Your account on every device"] },
  { key: "gold", name: "Gold", price: "$50", period: "/month", blurb: "Optimised travel assistance for frequent travellers.",
    features: ["Everything in Silver", "Automatic booking assistance", "Route scheduling across flights, stays and transfers", "The best offers on airlines and accommodation", "Tips and tricks for getting the best service", "Priority support"] },
  { key: "diamond", name: "Diamond", price: "$100", period: "/month", blurb: "For professionals who need analysis and a secretary.",
    features: ["Everything in Gold", "Data analysis and reporting", "Secretary mode: keeps track of your meetings", "Meeting assistant that turns discussions from Zoom and other calls into text documents", "Dedicated support"] },
] as const;

export default function Settings() {
  const acc = useAccount();
  const d = useData();
  const nb = useNotebook();
  const router = useRouter();
  const { speak } = useSpeaker();
  const [open, setOpen] = useState<Record<string, boolean>>({ personal: true });
  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  /* personal info */
  const [p, setP] = useState({ firstName: acc?.firstName || "", surname: acc?.surname || "", phone: acc?.phone || "", dob: acc?.dob || "", gender: (acc?.gender || "female") as Gender, timezone: acc?.timezone || "UTC" });
  const zones = useMemo(() => { let z: string[] = []; try { z = (Intl as any).supportedValuesOf("timeZone"); } catch {} return z.includes(p.timezone) ? z : [p.timezone, ...z]; }, [p.timezone]);

  /* password */
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwErr, setPwErr] = useState("");

  /* preferences */
  const [theme, setThemeState] = useState<Theme>("light");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [perm, setPerm] = useState<string>("default");

  /* dialogs */
  const [checkout, setCheckout] = useState<null | { plan: string; resume?: any }>(null);
  const [confirm, setConfirm] = useState<null | "chats" | "account">(null);

  useEffect(() => {
    setThemeState(getTheme());
    setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const f = () => setVoices(window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en")));
    f(); window.speechSynthesis.onvoiceschanged = f;
  }, []);

  useEffect(() => {
    if (window.location.hash === "#coding") { setOpen({ coding: true }); setTimeout(() => document.getElementById("coding-btn")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150); }
    // Back from a card or PayPal payment page: confirm the payment.
    const q = new URLSearchParams(window.location.search);
    const pend = pendingPayment();
    if (q.get("billing") === "return" && pend) { setOpen((o) => ({ ...o, package: true })); setCheckout({ plan: pend.plan, resume: { ticket: pend.ticket, method: pend.method } }); }
    if (q.get("billing") === "cancel") { clearPendingPayment(); toast.info("Payment cancelled. You haven't been charged."); }
    if (q.get("billing")) window.history.replaceState(null, "", "/settings");
    // A paid plan that has passed its billing date returns to Silver until renewed.
    const b = useStore.getState().sessionId ? useStore.getState().data[useStore.getState().sessionId!]?.billing : undefined;
    if (b && b.status === "active" && new Date(b.periodEnd).getTime() < Date.now()) {
      useStore.getState().patch((x) => ({ ...x, prefs: { ...x.prefs, plan: "silver" }, billing: { ...x.billing!, status: "expired" } }));
      toast.info(`Your ${PLAN_NAMES[b.plan]} plan has ended. Renew it any time in Package.`);
    }
  }, []);

  if (!acc) return null;
  const cloudAccount = cloudEnabled && !acc.passwordHash;
  const plan = d.prefs.plan || "silver";
  const dirty = p.firstName !== acc.firstName || p.surname !== acc.surname || p.phone !== acc.phone || p.timezone !== acc.timezone || p.dob !== acc.dob || p.gender !== acc.gender;
  const rules = pwRules(pw.next);
  const pwValid = pw.current && rules.every((r) => r.ok) && pw.next === pw.confirm && pw.next !== pw.current;

  const saveProfile = () => {
    if (!p.firstName.trim() || !p.surname.trim()) { toast.error("Please enter your first name and surname."); return; }
    if (!/^\+?[\d\s()-]{7,}$/.test(p.phone)) { toast.error("Enter a valid phone number, including country code."); return; }
    useStore.getState().updateAccount({ ...p, firstName: p.firstName.trim(), surname: p.surname.trim(), phone: p.phone.trim() });
    toast.success("Your details have been saved.");
  };

  const changePassword = async () => {
    setPwErr("");
    if (!pwValid) return;
    setPwBusy(true);
    try {
      if (cloudAccount) {
        const { error: wrong } = await supabase.auth.signInWithPassword({ email: acc.email, password: pw.current });
        if (wrong) { setPwErr("Your current password is incorrect."); return; }
        const { error } = await supabase.auth.updateUser({ password: pw.next });
        if (error) { setPwErr(error.message); return; }
      } else {
        if ((await hashPassword(pw.current, acc.salt)) !== acc.passwordHash) { setPwErr("Your current password is incorrect."); return; }
        const salt = uid();
        useStore.getState().updateAccount({ salt, passwordHash: await hashPassword(pw.next, salt) });
      }
      setPw({ current: "", next: "", confirm: "" });
      toast.success("Your password has been changed.");
    } catch {
      setPwErr("Your password couldn't be changed. Check your connection and try again.");
    } finally { setPwBusy(false); }
  };

  const pickTheme = (t: Theme) => { setTheme(t); setThemeState(t); };
  const who = formOfAddress(acc, d.prefs) || acc.firstName;
  const requestPerm = async () => { if (typeof Notification !== "undefined") setPerm(await Notification.requestPermission()); };

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ profile: { ...acc, passwordHash: undefined, salt: undefined }, data: d }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "sebastian-data.json"; a.click();
  };
  const deleteAccount = async () => {
    const s = useStore.getState();
    const id = s.sessionId!;
    if (cloudAccount) { try { await supabase.from("sebastian_users").delete().eq("id", id); await supabase.auth.signOut(); } catch {} }
    const data = { ...s.data }; delete data[id];
    useStore.setState({ accounts: s.accounts.filter((a) => a.id !== id), data, sessionId: null });
    router.replace("/signup");
  };

  return (
    <Container narrow>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Settings" }]} title="Settings" subtitle="Your details, language, plan and how Sebastian looks after you." />
      <div className="space-y-3">

        <Section id="personal" icon={User} title="Personal information" summary={`${acc.firstName} ${acc.surname} · ${acc.email}`} open={!!open.personal} onToggle={() => toggle("personal")}>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <Field label="First name"><input className={inputCls} value={p.firstName} onChange={(e) => setP({ ...p, firstName: e.target.value })} autoComplete="given-name" /></Field>
            <Field label="Surname"><input className={inputCls} value={p.surname} onChange={(e) => setP({ ...p, surname: e.target.value })} autoComplete="family-name" /></Field>
            <Field label="Date of birth"><input type="date" className={inputCls} value={p.dob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setP({ ...p, dob: e.target.value })} /></Field>
            <Field label="Phone number"><input type="tel" className={inputCls} value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} autoComplete="tel" /></Field>
            <Field label="Email" hint="Contact support to change the email on your account."><input className={inputCls} value={acc.email} disabled /></Field>
            <Field label="Time zone"><select className={inputCls} value={p.timezone} onChange={(e) => setP({ ...p, timezone: e.target.value })} translate="no">{zones.map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}</select></Field>
          </div>
          <fieldset className="mt-4">
            <legend className="text-[13px] font-medium mb-1.5">Gender</legend>
            <div role="radiogroup" className="grid grid-cols-2 gap-3 max-w-sm">
              {(["male", "female"] as Gender[]).map((g) => <Option key={g} variant="row" selected={p.gender === g} onClick={() => setP({ ...p, gender: g })}>{g === "male" ? "Male" : "Female"}</Option>)}
            </div>
          </fieldset>
          <p className="text-xs text-muted mt-3">Member since {new Date(acc.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
          <Button className="mt-5" disabled={!dirty} onClick={saveProfile}>Save changes</Button>
        </Section>

        <Section id="password" icon={KeyRound} title="Change password" summary="Keep your account secure" open={!!open.password} onToggle={() => toggle("password")}>
          <div className="space-y-4 mt-4 max-w-md">
            {pwErr && <Notice tone="warning">{pwErr}</Notice>}
            <Field label="Current password" htmlFor="pw-cur"><input id="pw-cur" type={showPw ? "text" : "password"} className={inputCls} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" /></Field>
            <Field label="New password" htmlFor="pw-new">
              <div className="relative">
                <input id="pw-new" type={showPw ? "text" : "password"} className={inputCls + " pr-12"} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" aria-describedby="pw-rules" />
                <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Hide passwords" : "Show passwords"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">{showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
              </div>
              <ul id="pw-rules" className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2.5 text-xs">
                {rules.map((r) => <li key={r.label} className={cx("flex items-center gap-1.5", r.ok ? "text-success" : "text-muted")}>{r.ok ? <Check className="w-3.5 h-3.5" aria-hidden /> : <Circle className="w-3 h-3" aria-hidden />}{r.label}</li>)}
              </ul>
            </Field>
            <Field label="Confirm new password" htmlFor="pw-conf" error={pw.confirm && pw.confirm !== pw.next ? "The passwords don't match." : undefined}>
              <input id="pw-conf" type={showPw ? "text" : "password"} className={inputCls} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" />
            </Field>
            {pw.next && pw.next === pw.current && <p className="text-xs text-danger">Choose a password different from your current one.</p>}
            <Button onClick={changePassword} disabled={!pwValid} loading={pwBusy}>Update password</Button>
          </div>
        </Section>

        <Section id="language" icon={Globe} title="Language" summary="Translates the whole app instantly" open={!!open.language} onToggle={() => toggle("language")}>
          <p className="text-sm text-muted mt-4 mb-4">Choose a language and every screen, from sign-in to each suite, switches straight away. Sebastian also replies and speaks in your language.</p>
          <LanguageList />
          <p className="text-xs text-muted mt-3">Translations are produced by AI and may not be perfect. Voice input for Shona and Ndebele currently listens in English, as browsers don&apos;t yet support those languages.</p>
        </Section>

        <Section id="package" icon={Gem} title="Package" summary={`${plan[0].toUpperCase() + plan.slice(1)} plan`} open={!!open.package} onToggle={() => toggle("package")}>
          {d.billing && (
            <div className={cx("mt-4 rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3", d.billing.status === "active" ? "border-gold/60 bg-gold-soft/30" : "border-line bg-canvas")}>
              <div>
                <p className="text-sm font-medium inline-flex items-center gap-1.5"><Crown className="w-4 h-4 text-gold" />{PLAN_NAMES[d.billing.plan]} · {d.billing.status === "active" ? "Active" : "Ended"}</p>
                <p className="text-[12.5px] text-muted mt-0.5">
                  {d.billing.status === "active" ? `Next billing date ${new Date(d.billing.periodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` : `Ended on ${new Date(d.billing.periodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`} · Paid with {METHOD_NAMES[d.billing.method]}
                </p>
              </div>
              <Button size="sm" variant={d.billing.status === "active" ? "outline" : "primary"} onClick={() => setCheckout({ plan: d.billing!.plan })}><RefreshCw className="w-4 h-4" />{d.billing.status === "active" ? "Renew early" : "Renew now"}</Button>
            </div>
          )}
          <div className="grid md:grid-cols-3 gap-3 mt-4">
            {PLANS.map((x) => {
              const current = plan === x.key;
              return (
                <article key={x.key} className={cx("rounded-2xl border p-5 flex flex-col", current ? "border-gold bg-gold-soft/40" : "border-line bg-canvas")}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xl inline-flex items-center gap-2">{x.key !== "silver" && <Crown className="w-4 h-4 text-gold" aria-hidden />}{x.name}</h3>
                    {current && <span className="text-[11px] rounded-full bg-gold text-white px-2.5 py-0.5">Current plan</span>}
                  </div>
                  <p className="mt-2"><span className="font-serif text-3xl">{x.price}</span><span className="text-sm text-muted">{x.period}</span></p>
                  <p className="text-[13px] text-muted mt-1">{x.blurb}</p>
                  <ul className="mt-4 space-y-2 text-[13px] flex-1">
                    {x.features.map((f) => <li key={f} className="flex gap-2"><Check className="w-4 h-4 text-success shrink-0 mt-0.5" aria-hidden />{f}</li>)}
                  </ul>
                  {!current && x.key !== "silver" && <Button className="mt-5 w-full whitespace-nowrap" size="sm" onClick={() => setCheckout({ plan: x.key })}>Upgrade to {x.name}</Button>}
                </article>
              );
            })}
          </div>
          <p className="text-xs text-muted mt-3">Pay securely by Mastercard or Visa, EcoCash or PayPal. Plans are billed monthly and renew when you pay again; Sebastian reminds you three days before. Gold and Diamond features are being introduced over time.</p>
        </Section>

        <Section id="receipts" icon={ReceiptIcon} title="Receipts" summary={d.receipts?.length ? `${d.receipts.length} receipt${d.receipts.length > 1 ? "s" : ""}` : "Your payment receipts"} open={!!open.receipts} onToggle={() => toggle("receipts")}>
          {!d.receipts?.length ? <p className="text-sm text-muted mt-4">When you pay for a plan, your receipts appear here. Each one is also emailed to you.</p> : (
            <ul className="mt-4 divide-y divide-line">
              {d.receipts.map((r: Receipt) => (
                <li key={r.number} className="py-3 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[180px]">
                    <p className="text-sm font-medium">{PLAN_NAMES[r.plan]} plan · ${r.amount.toFixed(2)}</p>
                    <p className="text-[12px] text-muted">{r.number} · {new Date(r.paidAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {METHOD_NAMES[r.method]}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => downloadReceipt(r)}><Download className="w-4 h-4" />PDF</Button>
                  <Button size="sm" variant="ghost" onClick={async () => { const x = await fetch("/api/billing/receipt?email=1", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(r) }).then((y) => y.json()).catch(() => ({ ok: false })); x.ok ? toast.success(`Receipt emailed to ${r.billedTo.email}.`) : toast.error(x.error || "The receipt couldn't be emailed."); }}><Mail className="w-4 h-4" />Email</Button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section id="coding" icon={Gauge} title="Coding usage" summary={(() => { const m = new Date().toISOString().slice(0, 7); const u = nb.codingUsage.filter((x) => x.at.startsWith(m)); return `${u.length} request${u.length === 1 ? "" : "s"} · ${u.reduce((a, x) => a + x.input + x.output, 0).toLocaleString()} tokens this month`; })()} open={!!open.coding} onToggle={() => toggle("coding")}>
          {(() => {
            const m = new Date().toISOString().slice(0, 7);
            const month = nb.codingUsage.filter((x) => x.at.startsWith(m));
            const input = month.reduce((a, x) => a + x.input, 0), output = month.reduce((a, x) => a + x.output, 0);
            const costKnown = month.some((x) => x.cost != null);
            const cost = month.reduce((a, x) => a + (x.cost || 0), 0);
            const days = Array.from({ length: 14 }, (_, i) => { const dt = new Date(); dt.setDate(dt.getDate() - 13 + i); const k = dt.toISOString().slice(0, 10); return { k, t: nb.codingUsage.filter((x) => x.at.startsWith(k)).reduce((a, x) => a + x.input + x.output, 0) }; });
            const peak = Math.max(1, ...days.map((x) => x.t));
            const models = [...new Set(month.map((x) => x.model))];
            const where = month.reduce((acc: Record<string, number>, x) => ({ ...acc, [x.where]: (acc[x.where] || 0) + 1 }), {});
            return (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-muted">Coding requests (in Notebook and in chat) run on OpenAI. This tracks what they use this month.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[["Requests", month.length.toLocaleString()], ["Input tokens", input.toLocaleString()], ["Output tokens", output.toLocaleString()], ["Estimated cost", costKnown ? `$${cost.toFixed(cost < 1 ? 4 : 2)}` : "Not set"]].map(([k, v]) => (
                    <div key={k} className="rounded-2xl bg-canvas border border-line p-3"><p className="text-[11.5px] text-muted">{k}</p><p className="font-serif text-xl mt-0.5">{v}</p></div>
                  ))}
                </div>
                <div>
                  <p className="text-[12.5px] text-muted mb-2">Tokens per day, last 14 days</p>
                  <div className="flex items-end gap-1 h-20" role="img" aria-label="Daily coding token usage">
                    {days.map((x) => <div key={x.k} title={`${x.k}: ${x.t.toLocaleString()} tokens`} className="flex-1 rounded-t bg-gold/80" style={{ height: `${Math.max(3, (x.t / peak) * 100)}%`, opacity: x.t ? 1 : 0.25 }} />)}
                  </div>
                </div>
                {month.length > 0 && <p className="text-[12.5px] text-muted">Model{models.length > 1 ? "s" : ""}: {models.join(", ")} · {Object.entries(where).map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>}
                {!costKnown && <p className="text-[12px] text-muted">To see costs, add your model&apos;s prices per million tokens to the server settings (OPENAI_INPUT_PRICE_PER_1M and OPENAI_OUTPUT_PRICE_PER_1M). Your official bill is on platform.openai.com under Usage.</p>}
                {nb.codingUsage.length > 0 && <Button size="sm" variant="ghost" onClick={() => { patchNotebook((n) => ({ ...n, codingUsage: [] })); toast.info("Usage history cleared."); }}>Clear usage history</Button>}
              </div>
            );
          })()}
        </Section>

        <Section id="prefs" icon={SlidersHorizontal} title="Preferences" summary="Appearance, form of address, voice and reminders" open={!!open.prefs} onToggle={() => toggle("prefs")}>
          <div className="py-3.5">
            <p className="text-[14px]">Appearance</p>
            <div role="radiogroup" aria-label="Appearance" className="mt-2 inline-grid grid-cols-3 rounded-xl border border-line p-1 bg-canvas">
              {([["light", "Light", Sun], ["dark", "Dark", Moon], ["system", "Automatic", Monitor]] as [Theme, string, any][]).map(([k, l, I]) => (
                <button key={k} role="radio" aria-checked={theme === k} onClick={() => pickTheme(k)} className={cx("h-9 px-4 rounded-lg text-[13px] inline-flex items-center gap-1.5", theme === k ? "bg-paper shadow-soft text-ink" : "text-muted")}><I className="w-4 h-4" aria-hidden />{l}</button>
              ))}
            </div>
          </div>
          <div className="border-t border-line" />
          <Toggle label="Form of address" desc={d.prefs.useTitle ? `Sebastian addresses you as ${acc.gender === "male" ? "Lord" : "Lady"} ${acc.firstName}.` : `Sebastian addresses you as ${acc.firstName}, with no title.`} on={d.prefs.useTitle} set={(v) => actions.setPrefs({ useTitle: v })} />
          <p className="font-serif text-lg text-muted -mt-1 mb-2" suppressHydrationWarning>“{greeting(acc, d.prefs)}”</p>
          <div className="border-t border-line" />
          <Toggle label="Read replies aloud" desc="Sebastian speaks his chat replies. The Voice Concierge always speaks." on={d.prefs.voiceReplies} set={(v) => actions.setPrefs({ voiceReplies: v })} />
          {voices.length > 0 && (
            <div className="flex gap-2 items-end pb-3">
              <div className="flex-1"><Field label="English voice (when no custom voice is set up)"><select className={inputCls} value={d.prefs.voiceName} onChange={(e) => actions.setPrefs({ voiceName: e.target.value })} translate="no"><option value="">Automatic</option>{voices.map((v) => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}</select></Field></div>
              <Button variant="outline" onClick={() => speak(`${greeting(acc, d.prefs)} I am at your service.`, d.prefs.voiceName)}><Volume2 className="w-4 h-4" />Test</Button>
            </div>
          )}
          <div className="border-t border-line" />
          <Toggle label="Reminders" desc="Every scheduled item alerts you like an alarm, with a notification, and a note of pending reminders when you open Sebastian." on={d.prefs.notifications} set={(v) => actions.setPrefs({ notifications: v })} />
          <div className="pl-4 border-l-2 border-cream-line ml-1">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1"><Toggle label="Alarm sound" desc="A gentle chime when a reminder is due." on={d.prefs.alarmSound !== false} set={(v) => actions.setPrefs({ alarmSound: v })} disabled={!d.prefs.notifications} /></div>
              <Button size="sm" variant="ghost" onClick={() => playChime()} disabled={!d.prefs.notifications}>Test</Button>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1"><Toggle label="Spoken alert" desc={`Sebastian says “Pardon me, ${who}, you have a notification.” He never reads out what it's about.`} on={d.prefs.voiceAlerts !== false} set={(v) => actions.setPrefs({ voiceAlerts: v })} disabled={!d.prefs.notifications} /></div>
              <Button size="sm" variant="ghost" onClick={() => speak(`Pardon me, ${who}, you have a notification.`, d.prefs.voiceName)} disabled={!d.prefs.notifications}>Test</Button>
            </div>
            <div className="py-3">
              {perm === "granted" && <p className="text-xs text-success inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5" />Notifications are allowed on this device.</p>}
              {perm === "default" && <Button size="sm" variant="outline" onClick={requestPerm} disabled={!d.prefs.notifications}><Bell className="w-4 h-4" />Allow notifications on this device</Button>}
              {perm === "denied" && <p className="text-xs text-muted">Notifications are blocked in this browser. Allow them in your browser&apos;s site settings to be alerted when Sebastian isn&apos;t on screen.</p>}
              {perm === "unsupported" && <p className="text-xs text-muted">This browser can&apos;t show notifications here. On a phone, open Sebastian from a secure (https) address.</p>}
            </div>
          </div>
          <div className="border-t border-line" />
          <Toggle label="Learn my travel preferences (Trip DNA)" desc="Saved trips shape destination recommendations." on={d.prefs.personalization} set={(v) => actions.setPrefs({ personalization: v })} />
          <div className="pb-2"><Button size="sm" variant="outline" onClick={() => { actions.resetTripDNA(); toast.info("Trip DNA cleared."); }}>Reset Trip DNA</Button></div>
          <div className="border-t border-line mt-3" />
          <div className="pt-4"><Field label="Emergency numbers for"><select className={inputCls} value={d.prefs.emergencyCountry} onChange={(e) => actions.setPrefs({ emergencyCountry: e.target.value })}>{Object.entries(EMERGENCY).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select></Field></div>
        </Section>

        <Section id="privacy" icon={ShieldCheck} title="Privacy & data" summary="How Sebastian handles your data" open={!!open.privacy} onToggle={() => toggle("privacy")}>
          <div className="mt-4 space-y-3 text-sm text-muted leading-relaxed">
            <p>Your account and conversations are stored securely so you can use Sebastian on any device. Your messages are processed by our AI provider to generate replies and are not used to train AI models. Sebastian never books, pays or shares your data for advertising, and reminders never reveal their contents in notifications.</p>
            <Link href="/privacy" className="inline-flex items-center gap-1.5 text-ink underline underline-offset-4">Read the full privacy policy<ExternalLink className="w-3.5 h-3.5" /></Link>
          </div>
          <div className="flex flex-wrap gap-2 mt-5">
            <Button variant="outline" onClick={exportData}><Download className="w-4 h-4" />Export my data</Button>
            <Button variant="outline" onClick={() => setConfirm("chats")} disabled={!d.chats.length}>Clear chat history</Button>
            <Button variant="danger" onClick={() => setConfirm("account")}>Delete account</Button>
          </div>
        </Section>

        <Section id="support" icon={LifeBuoy} title="Support" summary="WhatsApp, phone and email" open={!!open.support} onToggle={() => toggle("support")}>
          <p className="text-sm text-muted mt-4">We&apos;re here to help. {SUPPORT.hours}.</p>
          <div className="grid sm:grid-cols-3 gap-3 mt-4">
            <a href={whatsappLink(`Hello Sebastian support, I need help with my account (${acc.email}).`)} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-line bg-canvas p-4 hover:border-cream-line">
              <MessageCircle className="w-5 h-5 text-success" aria-hidden /><p className="text-sm font-medium mt-2">WhatsApp</p><p className="text-xs text-muted mt-0.5">Chat with our team</p>
            </a>
            <a href={`tel:${SUPPORT.phone.replace(/\s/g, "")}`} className="rounded-2xl border border-line bg-canvas p-4 hover:border-cream-line">
              <Phone className="w-5 h-5 text-gold" aria-hidden /><p className="text-sm font-medium mt-2">Call us</p><p className="text-xs text-muted mt-0.5" translate="no">{SUPPORT.phone}</p>
            </a>
            <a href={`mailto:${SUPPORT.email}?subject=${encodeURIComponent("Sebastian support")}`} className="rounded-2xl border border-line bg-canvas p-4 hover:border-cream-line">
              <Mail className="w-5 h-5 text-gold" aria-hidden /><p className="text-sm font-medium mt-2">Email</p><p className="text-xs text-muted mt-0.5 break-all" translate="no">{SUPPORT.email}</p>
            </a>
          </div>
        </Section>
      </div>

      {checkout && <Checkout plan={checkout.plan} resume={checkout.resume} onClose={() => setCheckout(null)} />}
      <ConfirmDialog open={confirm === "chats"} danger title="Clear all conversations?" body={`${d.chats.length} conversations will be deleted. Your schedule, cookbook, plans and trips are unaffected.`} confirmLabel="Clear history"
        onCancel={() => setConfirm(null)} onConfirm={() => { useStore.getState().patch((x) => ({ ...x, chats: [] })); setConfirm(null); toast.info("Chat history cleared."); }} />
      <ConfirmDialog open={confirm === "account"} danger title="Delete your account?" body="Your profile and every saved item will be permanently removed from Sebastian. This can't be undone." confirmLabel="Delete everything"
        onCancel={() => setConfirm(null)} onConfirm={deleteAccount} />
    </Container>
  );
}
