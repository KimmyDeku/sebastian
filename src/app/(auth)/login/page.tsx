"use client";
import { Suspense, useState } from "react";
import { cloudEnabled, openCloudAccount, supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useStore } from "@/lib/store";
import { hashPassword } from "@/lib/util";
import { Button } from "@/components/ui/Button";
import { Field, inputCls } from "@/components/ui/Chip";
import { Notice } from "@/components/ui/States";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";

function LoginInner() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/";
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [reset, setReset] = useState(false);

    const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      if (cloudEnabled) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
        if (error) {
          setErr(/confirm/i.test(error.message) ? "Please confirm your email first. Check your inbox for the confirmation link." : "That email and password don't match an account.");
          return;
        }
        await openCloudAccount(data.user);
        router.replace(next);
        return;
      }
      const acc = useStore.getState().accounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
      await new Promise((r) => setTimeout(r, 450));
      if (!acc || (await hashPassword(pw, acc.salt)) !== acc.passwordHash) { setErr("That email and password don't match an account on this device."); return; }
      useStore.getState().login(acc.id);
      router.replace(next);
    } catch { setErr("Sign-in couldn't be completed. Check your connection and try again."); }
    finally { setBusy(false); }
  };

  return (
    <>
      <h1 className="t-h1">Welcome back</h1>
      <p className="text-muted mt-2">Log in to continue with Sebastian.</p>
      <form onSubmit={submit} className="mt-9 space-y-5" noValidate>
        {err && <Notice tone="warning">{err}</Notice>}
        <Field label="Email" htmlFor="email"><input id="email" type="email" autoComplete="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <Field label="Password" htmlFor="pw">
          <div className="relative">
            <input id="pw" type={show ? "text" : "password"} autoComplete="current-password" className={inputCls + " pr-12"} value={pw} onChange={(e) => setPw(e.target.value)} required />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">{show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
          </div>
        </Field>
        <div className="flex justify-end"><button type="button" onClick={() => setReset(true)} className="text-sm text-muted hover:text-ink underline underline-offset-4">Forgot password?</button></div>
        <Button type="submit" className="w-full" size="lg" loading={busy} disabled={!email || !pw}>Log in</Button>
      </form>
      <p className="text-sm text-muted mt-8 text-center">New to Sebastian? <Link href="/signup" className="text-ink underline underline-offset-4">Create account</Link></p>
      <ResetModal open={reset} onClose={() => setReset(false)} />
    </>
  );
}

function ResetModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState(""); const [dob, setDob] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState("");
  const strong = pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw);
  const go = async () => {
    const s = useStore.getState();
    const acc = s.accounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.dob === dob);
    if (!acc) { setErr("Those details don't match an account on this device."); return; }
    const hash = await hashPassword(pw, acc.salt);
    useStore.setState({ accounts: s.accounts.map((a) => (a.id === acc.id ? { ...a, passwordHash: hash } : a)) });
    toast.success("Password updated. You can log in now.");
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Reset your password">
      <p className="text-sm text-muted mb-5">Accounts are stored on this device. Confirm your email and date of birth to choose a new password.</p>
      <div className="space-y-4">
        {err && <Notice tone="warning">{err}</Notice>}
        <Field label="Email"><input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Date of birth"><input className={inputCls} type="date" value={dob} onChange={(e) => setDob(e.target.value)} /></Field>
        <Field label="New password" hint="8+ characters with upper and lower case, a number and a special character."><input className={inputCls} type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
        <Button className="w-full" onClick={go} disabled={!email || !dob || !strong}>Update password</Button>
      </div>
    </Modal>
  );
}

export default function Login() { return <Suspense><LoginInner /></Suspense>; }
