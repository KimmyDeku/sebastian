"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Volume2 } from "lucide-react";
import { Container, PageHeader } from "@/components/ui/Page";
import { Field, inputCls } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { actions, useAccount, useData, useStore } from "@/lib/store";
import { greeting } from "@/lib/address";
import { useSpeaker } from "@/lib/voice";
import { EMERGENCY } from "@/components/discover/emergency";
import { toast } from "@/components/ui/Toast";
import { cx } from "@/lib/util";

function Toggle({ label, desc, on, set }: { label: string; desc?: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div><p className="text-[15px]">{label}</p>{desc && <p className="text-xs text-muted mt-1 max-w-md">{desc}</p>}</div>
      <button role="switch" aria-checked={on} aria-label={label} onClick={() => set(!on)} className={cx("relative w-12 h-7 rounded-full transition-colors shrink-0", on ? "bg-ink" : "bg-line")}>
        <span className={cx("absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all", on ? "left-6" : "left-1")} />
      </button>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-3xl bg-paper border border-line p-6 md:p-8"><h2 className="t-h2 mb-2">{title}</h2>{children}</section>;
}

export default function Settings() {
  const acc = useAccount();
  const d = useData();
  const router = useRouter();
  const { speak } = useSpeaker();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [p, setP] = useState({ firstName: acc?.firstName || "", surname: acc?.surname || "", phone: acc?.phone || "", timezone: acc?.timezone || "UTC" });
  const [confirm, setConfirm] = useState<null | "chats" | "account">(null);
  const zones = useMemo(() => { try { return (Intl as any).supportedValuesOf("timeZone") as string[]; } catch { return [p.timezone]; } }, [p.timezone]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const f = () => setVoices(window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en")));
    f(); window.speechSynthesis.onvoiceschanged = f;
  }, []);
  if (!acc) return null;
  const dirty = p.firstName !== acc.firstName || p.surname !== acc.surname || p.phone !== acc.phone || p.timezone !== acc.timezone;

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ profile: { ...acc, passwordHash: undefined, salt: undefined }, data: d }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "sebastian-data.json"; a.click();
  };

  return (
    <Container narrow>
      <PageHeader crumbs={[{ label: "Home", href: "/" }, { label: "Settings" }]} title="Settings" subtitle="How Sebastian addresses you, speaks, remembers and reminds." />
      <div className="space-y-6">
        <Section title="Profile">
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <Field label="First name"><input className={inputCls} value={p.firstName} onChange={(e) => setP({ ...p, firstName: e.target.value })} /></Field>
            <Field label="Surname"><input className={inputCls} value={p.surname} onChange={(e) => setP({ ...p, surname: e.target.value })} /></Field>
            <Field label="Phone"><input className={inputCls} value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></Field>
            <Field label="Time zone"><select className={inputCls} value={p.timezone} onChange={(e) => setP({ ...p, timezone: e.target.value })}>{zones.map((z) => <option key={z} value={z}>{z.replace(/_/g, " ")}</option>)}</select></Field>
          </div>
          <p className="text-xs text-muted mt-3">Email: {acc.email} · Date of birth: {acc.dob} · {acc.gender === "male" ? "Male" : "Female"}</p>
          <Button className="mt-5" disabled={!dirty || !p.firstName.trim() || !p.surname.trim()} onClick={() => { useStore.getState().updateAccount({ ...p, firstName: p.firstName.trim(), surname: p.surname.trim() }); toast.success("Profile saved."); }}>Save profile</Button>
        </Section>

        <Section title="Form of address">
          <Toggle label="Use my nobility title" desc="Lord or Lady before your first name in greetings, chat and reminders." on={d.prefs.useTitle} set={(v) => actions.setPrefs({ useTitle: v })} />
          <p className="font-serif text-xl text-muted" suppressHydrationWarning>Preview: “{greeting(acc, d.prefs)}”</p>
        </Section>

        <Section title="Voice">
          <Toggle label="Speak replies aloud" desc="Sebastian reads chat replies using your device's voice." on={d.prefs.voiceReplies} set={(v) => actions.setPrefs({ voiceReplies: v })} />
          {voices.length > 0 ? (
            <div className="flex gap-2 items-end">
              <Field label="Voice"><select className={inputCls} value={d.prefs.voiceName} onChange={(e) => actions.setPrefs({ voiceName: e.target.value })}><option value="">Automatic (British English if available)</option>{voices.map((v) => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}</select></Field>
              <Button variant="outline" onClick={() => speak(`${greeting(acc, d.prefs)} I am at your service.`, d.prefs.voiceName)}><Volume2 className="w-4 h-4" />Test</Button>
            </div>
          ) : <p className="text-xs text-muted">Speech output isn&apos;t available in this browser.</p>}
        </Section>

        <Section title="Personalisation & reminders">
          <Toggle label="Learn my travel preferences (Trip DNA)" desc="Saved trips shape destination recommendations. Turning this off stops learning; existing data stays until you reset it." on={d.prefs.personalization} set={(v) => actions.setPrefs({ personalization: v })} />
          <div className="pb-2"><Button size="sm" variant="outline" onClick={() => { actions.resetTripDNA(); toast.info("Trip DNA cleared."); }}>Reset Trip DNA</Button></div>
          <Toggle label="Reminders" desc="Nudges before scheduled events, in the app and as browser notifications if allowed." on={d.prefs.notifications} set={(v) => actions.setPrefs({ notifications: v })} />
          <Field label="Emergency numbers for"><select className={inputCls} value={d.prefs.emergencyCountry} onChange={(e) => actions.setPrefs({ emergencyCountry: e.target.value })}>{Object.entries(EMERGENCY).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select></Field>
        </Section>

        <Section title="Your data">
          <p className="text-sm text-muted">Your account and data are stored on this device.</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Button variant="outline" onClick={exportData}><Download className="w-4 h-4" />Export my data</Button>
            <Button variant="outline" onClick={() => setConfirm("chats")} disabled={!d.chats.length}>Clear chat history</Button>
            <Button variant="danger" onClick={() => setConfirm("account")}>Delete account</Button>
          </div>
        </Section>
      </div>
      <ConfirmDialog open={confirm === "chats"} danger title="Clear all conversations?" body={`${d.chats.length} conversations will be deleted. Your schedule, cookbook, plans and trips are unaffected.`} confirmLabel="Clear history"
        onCancel={() => setConfirm(null)} onConfirm={() => { useStore.getState().patch((x) => ({ ...x, chats: [] })); setConfirm(null); toast.info("Chat history cleared."); }} />
      <ConfirmDialog open={confirm === "account"} danger title="Delete your account?" body="Your profile and every saved item on this device will be permanently removed. This can't be undone." confirmLabel="Delete everything"
        onCancel={() => setConfirm(null)} onConfirm={() => { const s = useStore.getState(); const id = s.sessionId!; const data = { ...s.data }; delete data[id]; useStore.setState({ accounts: s.accounts.filter((a) => a.id !== id), data, sessionId: null }); router.replace("/signup"); }} />
    </Container>
  );
}
