"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, Check, Copy, CreditCard, Landmark, Loader2, Mail, Search, Send, Ban, User, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OnboardingType } from "@/lib/onboarding-fields";
import type { PaymentMethod, PriceListItem } from "@/lib/engagements/types";
import { BILLING_LABEL } from "@/lib/engagements/types";

const card = "rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_1px_2px_rgba(28,25,23,0.04)] sm:p-6";

const TYPES: { id: OnboardingType; label: string; Icon: typeof User }[] = [
  { id: "self-assessment", label: "Self Assessment", Icon: User },
  { id: "business", label: "Company", Icon: Building2 },
  { id: "both", label: "Company and Self Assessment", Icon: Users },
];

const PAYMENTS: { id: PaymentMethod; title: string; detail: string; Icon: typeof Landmark }[] = [
  { id: "direct_debit", title: "Direct Debit", detail: "Client sets up a mandate. Nothing is collected until your Xero invoice.", Icon: Landmark },
  { id: "card", title: "Card upfront", detail: "Client pays by card through Stripe before giving their details.", Icon: CreditCard },
  { id: "none", title: "No payment step", detail: "Skips payment, for bank transfer or anything agreed separately.", Icon: Ban },
];

const gbp = (pence: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: pence % 100 ? 2 : 0 }).format(pence / 100);

function toPence(value: string): number | null {
  const cleaned = value.replace(/[£,\s]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className={card}>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-clay-50 text-xs font-semibold text-clay-700 ring-1 ring-inset ring-clay-100">{n}</span>
        <h2 className="text-base font-semibold text-stone-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function NewClientForm({ items, examples, lookupEnabled }: { items: PriceListItem[]; examples: boolean; lookupEnabled: boolean }) {
  const [type, setType] = useState<OnboardingType>("business");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyNumber, setCompanyNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [lookup, setLookup] = useState<{ busy: boolean; message: string }>({ busy: false, message: "" });
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [method, setMethod] = useState<PaymentMethod>("direct_debit");
  const [cardAmount, setCardAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"" | "send" | "copy">("");
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ id: string; link: string; sent: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  const isCompany = type !== "self-assessment";
  const active = items.filter((i) => i.active);

  const lines = useMemo(
    () =>
      active
        .filter((i) => selected[i.id] !== undefined)
        .map((i) => ({ item: i, pence: toPence(selected[i.id]) })),
    [active, selected]
  );

  const totals = useMemo(() => {
    const t = { monthly: 0, annual: 0, one_off: 0 };
    for (const l of lines) if (l.pence !== null) t[l.item.billing] += l.pence;
    return t;
  }, [lines]);
  const grandTotal = totals.monthly + totals.annual + totals.one_off;

  const toggle = (item: PriceListItem) =>
    setSelected((prev) => {
      const next = { ...prev };
      if (next[item.id] !== undefined) delete next[item.id];
      else next[item.id] = (item.pricePence / 100).toFixed(item.pricePence % 100 ? 2 : 0);
      return next;
    });

  const doLookup = async () => {
    setLookup({ busy: true, message: "" });
    try {
      const res = await fetch(`/api/admin/companies-house?number=${encodeURIComponent(companyNumber)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Lookup failed.");
      setCompanyName(data.name || "");
      if (data.number) setCompanyNumber(data.number);
      setLookup({ busy: false, message: data.status && data.status !== "active" ? `Note: this company is ${data.status}.` : `Found: ${data.address || data.name}` });
    } catch (err) {
      setLookup({ busy: false, message: err instanceof Error ? err.message : "Lookup failed." });
    }
  };

  const submit = async (send: boolean) => {
    setError("");
    if (lines.some((l) => l.pence === null)) {
      setError("Check the prices: one of them isn't a number.");
      return;
    }
    setBusy(send ? "send" : "copy");
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name,
          email,
          companyName,
          companyNumber,
          lines: lines.map((l) => ({ serviceId: l.item.id, pricePence: l.pence })),
          paymentMethod: method,
          cardAmountPence: method === "card" ? toPence(cardAmount || String(grandTotal / 100)) : undefined,
          paymentNote: note,
          send,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not create the link.");
      setCreated(data);
      if (!send) {
        await navigator.clipboard.writeText(data.link).then(() => setCopied(true)).catch(() => {});
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the link.");
    } finally {
      setBusy("");
    }
  };

  const copyLink = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(created.link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (created) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={cn(card, "mx-auto max-w-xl text-center")}>
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-forest-50 text-forest-600"
        >
          <Check className="h-6 w-6" />
        </motion.span>
        <h2 className="text-lg font-semibold text-stone-900">Link ready for {companyName || name}</h2>
        <p className="mt-1 text-sm text-stone-600">
          {created.sent ? `We've emailed it to ${email}.` : copied ? "It's copied, ready to paste." : "Copy it and send it to the client."}
        </p>
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-2 text-left">
          <code className="min-w-0 flex-1 truncate px-2 text-xs text-stone-700">{created.link}</code>
          <Button size="sm" variant="outline" onClick={copyLink} className="bg-white">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href={`/admin/clients/${created.id}`} className="inline-flex h-10 items-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800 hover:bg-stone-50">
            Open client
          </Link>
          <button
            type="button"
            onClick={() => {
              setCreated(null);
              setName("");
              setEmail("");
              setCompanyName("");
              setCompanyNumber("");
              setSelected({});
              setMethod("direct_debit");
              setNote("");
              setCardAmount("");
              setCopied(false);
            }}
            className="inline-flex h-10 items-center rounded-lg bg-clay-500 px-4 text-sm font-semibold text-white hover:bg-clay-600"
          >
            Add another client
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
      <div className="space-y-5">
        <Section n={1} title="Who is it for?">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="What the client needs">
            {TYPES.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={type === id}
                onClick={() => setType(id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left text-sm font-medium transition-all",
                  type === id ? "border-clay-400 bg-clay-50/60 text-stone-900 ring-1 ring-clay-300" : "border-stone-200 text-stone-600 hover:border-stone-300"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", type === id ? "text-clay-600" : "text-stone-400")} /> {label}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client-name">{isCompany ? "Contact name (director)" : "Client name"}</Label>
              <Input id="client-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-email">Email</Label>
              <Input id="client-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="off" />
            </div>
          </div>

          <AnimatePresence initial={false}>
            {isCompany && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="mt-4 grid gap-4 sm:grid-cols-[200px_1fr]">
                  <div className="space-y-2">
                    <Label htmlFor="company-number">Company number</Label>
                    <div className="flex gap-2">
                      <Input id="company-number" value={companyNumber} onChange={(e) => setCompanyNumber(e.target.value.toUpperCase())} placeholder="12345678" maxLength={8} />
                      {lookupEnabled && (
                        <Button type="button" variant="outline" onClick={doLookup} disabled={lookup.busy || companyNumber.length < 6} aria-label="Look up on Companies House">
                          {lookup.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company name</Label>
                    <Input id="company-name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Example Ltd" />
                  </div>
                </div>
                {lookup.message && <p className="mt-2 text-xs text-stone-500">{lookup.message}</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </Section>

        <Section n={2} title="Services and fees">
          {examples && (
            <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              These are example prices. Set your own in <Link href="/admin/settings" className="font-semibold underline">Settings</Link>.
            </p>
          )}
          <ul className="divide-y divide-stone-100">
            {active.map((item) => {
              const on = selected[item.id] !== undefined;
              return (
                <li key={item.id} className="flex flex-wrap items-center gap-3 py-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggle(item)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors", on ? "border-clay-500 bg-clay-500 text-white" : "border-stone-300")}>
                      {on && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-stone-900">{item.name}</span>
                      <span className="block text-xs text-stone-500">{BILLING_LABEL[item.billing]} · usually {gbp(item.pricePence)}</span>
                    </span>
                  </button>
                  {on && (
                    <motion.label initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="relative ml-8 block sm:ml-0">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">£</span>
                      <input
                        aria-label={`Price for ${item.name}`}
                        inputMode="decimal"
                        value={selected[item.id]}
                        onChange={(e) => setSelected((p) => ({ ...p, [item.id]: e.target.value }))}
                        className="h-9 w-28 rounded-lg border border-stone-200 pl-7 pr-2 text-right text-sm tabular-nums outline-none focus:border-clay-400 focus:ring-2 focus:ring-clay-500/20"
                      />
                    </motion.label>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>

        <Section n={3} title="How will they pay?">
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Payment">
            {PAYMENTS.map(({ id, title, detail, Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={method === id}
                onClick={() => setMethod(id)}
                className={cn(
                  "rounded-xl border p-3.5 text-left transition-all",
                  method === id ? "border-clay-400 bg-clay-50/60 ring-1 ring-clay-300" : "border-stone-200 hover:border-stone-300"
                )}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                  <Icon className={cn("h-4 w-4", method === id ? "text-clay-600" : "text-stone-400")} /> {title}
                  {id === "direct_debit" && <span className="ml-auto rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-500">Default</span>}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-stone-500">{detail}</span>
              </button>
            ))}
          </div>
          <AnimatePresence initial={false} mode="wait">
            {method === "card" && (
              <motion.div key="card" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr]">
                  <div className="space-y-2">
                    <Label htmlFor="card-amount">Amount to pay now</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">£</span>
                      <Input id="card-amount" inputMode="decimal" className="pl-7" value={cardAmount} onChange={(e) => setCardAmount(e.target.value)} placeholder={(grandTotal / 100).toFixed(grandTotal % 100 ? 2 : 0)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pay-note">Note for the team (optional)</Label>
                    <Input id="pay-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: one-off tax return" />
                  </div>
                </div>
              </motion.div>
            )}
            {method === "none" && (
              <motion.div key="none" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="mt-4 space-y-2">
                  <Label htmlFor="pay-reason">Reason (kept on record)</Label>
                  <Input id="pay-reason" value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: pays by bank transfer" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Section>
      </div>

      <aside className={cn(card, "space-y-4 lg:sticky lg:top-24")}>
        <h2 className="text-sm font-semibold text-stone-900">Summary</h2>
        {lines.length === 0 ? (
          <p className="text-sm text-stone-500">Tick the services to see the fees.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {lines.map((l) => (
              <li key={l.item.id} className="flex justify-between gap-3">
                <span className="text-stone-700">{l.item.name}</span>
                <span className="shrink-0 tabular-nums text-stone-900">{l.pence === null ? "?" : gbp(l.pence)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="space-y-1 border-t border-stone-100 pt-3 text-sm">
          {totals.monthly > 0 && <p className="flex justify-between"><span className="text-stone-500">Monthly</span><span className="font-semibold tabular-nums">{gbp(totals.monthly)}</span></p>}
          {totals.annual > 0 && <p className="flex justify-between"><span className="text-stone-500">Annual</span><span className="font-semibold tabular-nums">{gbp(totals.annual)}</span></p>}
          {totals.one_off > 0 && <p className="flex justify-between"><span className="text-stone-500">One-off</span><span className="font-semibold tabular-nums">{gbp(totals.one_off)}</span></p>}
          {grandTotal === 0 && <p className="text-stone-400">No fees yet</p>}
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="space-y-2">
          <Button type="button" className="w-full" onClick={() => submit(true)} disabled={Boolean(busy)}>
            {busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Create and email link
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => submit(false)} disabled={Boolean(busy)}>
            {busy === "copy" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />} Create and copy link
          </Button>
        </div>
        <p className="flex items-start gap-1.5 text-xs text-stone-500">
          <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" /> The email comes from joshua@ and the client signs, pays, then adds their details.
        </p>
      </aside>
    </div>
  );
}
