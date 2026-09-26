"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Circle, Eye, EyeOff } from "lucide-react";
import { useStore } from "@/lib/store";
import { hashPassword, uid, cx } from "@/lib/util";
import { Button } from "@/components/ui/Button";
import { Field, inputCls, Option } from "@/components/ui/Chip";
import { Notice } from "@/components/ui/States";
import type { Gender } from "@/lib/types";
import { cloudEnabled, openCloudAccount, supabase } from "@/lib/supabase";

const zones = (): string[] => { try { return (Intl as any).supportedValuesOf("timeZone"); } catch { return ["UTC", "Africa/Harare", "Africa/Johannesburg", "Europe/London", "America/New_York"]; } };

export default function Signup() {
  const router = useRouter();
  const tzList = useMemo(zones, []);
  const [f, setF] = useState({ firstName: "", surname: "", dob: "", gender: "" as Gender | "", phone: "", email: "", password: "", timezone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirmSent, setConfirmSent] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const t = (k: string) => setTouched((p) => ({ ...p, [k]: true }));

  const rules = [
    { label: "8+ characters", ok: f.password.length >= 8 },
    { label: "Uppercase", ok: /[A-Z]/.test(f.password) },
    { label: "Lowercase", ok: /[a-z]/.test(f.password) },
    { label: "Number", ok: /\d/.test(f.password) },
    { label: "Special character", ok: /[^A-Za-z0-9]/.test(f.password) },
  ];
  const errors: Record<string, string> = {};
  if (!f.firstName.trim()) errors.firstName = "Please enter your first name.";
  if (!f.surname.trim()) errors.surname = "Please enter your surname.";
  if (!f.dob) errors.dob = "Please enter your date of birth.";
  else if (new Date(f.dob) > new Date()) errors.dob = "Date of birth can't be in the future.";
  if (!f.gender) errors.gender = "Please choose one.";
  if (!/^\+?[\d\s()-]{7,}$/.test(f.phone)) errors.phone = "Enter a valid phone number, including country code.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) errors.email = "Enter a valid email address.";
  else if (!cloudEnabled && useStore.getState().accounts.some((a) => a.email.toLowerCase() === f.email.toLowerCase())) errors.email = "An account with this email already exists.";
  if (!rules.every((r) => r.ok)) errors.password = "Your password doesn't meet every requirement yet.";
  if (!f.timezone) errors.timezone = "Choose your time zone.";
  const valid = Object.keys(errors).length === 0;
  const e = (k: string) => (touched[k] ? errors[k] : undefined);

    const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!valid) return;
    setBusy(true); setErr("");
    const profile = { firstName: f.firstName.trim(), surname: f.surname.trim(), dob: f.dob, gender: f.gender as Gender, phone: f.phone.trim(), email: f.email.trim(), timezone: f.timezone, createdAt: new Date().toISOString() };
    try {
      if (cloudEnabled) {
        const { data, error } = await supabase.auth.signUp({ email: profile.email, password: f.password, options: { data: { profile } } });
        if (error) { setErr(/registered|exists/i.test(error.message) ? "An account with this email already exists. Please log in instead." : error.message); setBusy(false); return; }
        if (!data.session) { setConfirmSent(true); setBusy(false); return; } // Supabase is asking the user to confirm their email
        await openCloudAccount(data.user);
        router.replace("/");
        return;
      }
      const salt = uid();
      const passwordHash = await hashPassword(f.password, salt);
      useStore.getState().register({ id: uid("u_"), ...profile, passwordHash, salt });
      router.replace("/");
    } catch { setErr("Your account couldn't be created. Check your connection and try again."); setBusy(false); }
  };

  return (
    <>
      <h1 className="t-h1">Create your account</h1>
      <p className="text-muted mt-2">A few details so Sebastian can look after you properly.</p>
      <form onSubmit={submit} className="mt-9 space-y-5" noValidate>
        {err && <Notice tone="warning">{err}</Notice>}
                {confirmSent && <Notice tone="confirm">Almost done. We&apos;ve sent a confirmation link to {f.email}. Open it, then <Link href="/login" className="underline">log in</Link>.</Notice>}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="First name" htmlFor="fn" error={e("firstName")}><input id="fn" className={inputCls} value={f.firstName} onChange={(x) => set("firstName", x.target.value)} onBlur={() => t("firstName")} autoComplete="given-name" /></Field>
          <Field label="Surname" htmlFor="sn" error={e("surname")}><input id="sn" className={inputCls} value={f.surname} onChange={(x) => set("surname", x.target.value)} onBlur={() => t("surname")} autoComplete="family-name" /></Field>
        </div>
        <Field label="Date of birth" htmlFor="dob" error={e("dob")}><input id="dob" type="date" className={inputCls} value={f.dob} onChange={(x) => set("dob", x.target.value)} onBlur={() => t("dob")} max={new Date().toISOString().slice(0, 10)} /></Field>
        <fieldset>
          <legend className="text-[13px] font-medium mb-1.5">Gender</legend>
          <div role="radiogroup" className="grid grid-cols-2 gap-3">
            {(["male", "female"] as Gender[]).map((g) => <Option key={g} variant="row" selected={f.gender === g} onClick={() => { set("gender", g); t("gender"); }}>{g === "male" ? "Male" : "Female"}</Option>)}
          </div>
          {f.gender && <p className="text-xs text-muted mt-2">Sebastian will address you as <span className="text-ink">{f.gender === "male" ? "Lord" : "Lady"} {f.firstName || "…"}</span>. You can turn titles off in Settings.</p>}
          {e("gender") && <p className="text-xs text-danger mt-1">{e("gender")}</p>}
        </fieldset>
        <Field label="Phone number" htmlFor="ph" error={e("phone")}><input id="ph" type="tel" className={inputCls} placeholder="+263 77 123 4567" value={f.phone} onChange={(x) => set("phone", x.target.value)} onBlur={() => t("phone")} autoComplete="tel" /></Field>
        <Field label="Email" htmlFor="em" error={e("email")}><input id="em" type="email" className={inputCls} value={f.email} onChange={(x) => set("email", x.target.value)} onBlur={() => t("email")} autoComplete="email" /></Field>
        <Field label="Password" htmlFor="pw">
          <div className="relative">
            <input id="pw" type={show ? "text" : "password"} className={inputCls + " pr-12"} value={f.password} onChange={(x) => set("password", x.target.value)} autoComplete="new-password" aria-describedby="pw-rules" />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">{show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
          </div>
          <ul id="pw-rules" className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2.5 text-xs">
            {rules.map((r) => (
              <li key={r.label} className={cx("flex items-center gap-1.5", r.ok ? "text-success" : "text-muted")}>
                {r.ok ? <Check className="w-3.5 h-3.5" aria-hidden /> : <Circle className="w-3 h-3" aria-hidden />}{r.label}<span className="sr-only">{r.ok ? " met" : " not met"}</span>
              </li>
            ))}
          </ul>
        </Field>
        <Field label="Time zone" htmlFor="tz" error={e("timezone")}>
          <select id="tz" className={inputCls} value={f.timezone} onChange={(x) => set("timezone", x.target.value)}>
            {tzList.map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}
          </select>
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={!valid} loading={busy}>Create Account</Button>
      </form>
      <p className="text-sm text-muted mt-8 text-center">Already have an account? <Link href="/login" className="text-ink underline underline-offset-4">Log in</Link></p>
    </>
  );
}
