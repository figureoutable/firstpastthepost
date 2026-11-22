"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check, CreditCard, FileSignature, Landmark, Loader2, Lock, ShieldCheck, UserRound } from "lucide-react";
import { Panel } from "@/components/site/site-chrome";
import { NextStepsList } from "@/components/site/next-steps-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FlowStep, LetterBlock, PaymentMethod } from "@/lib/engagements/types";
import type { NextStep } from "@/lib/next-steps";
import { LetterView } from "./letter-view";
import { FormationStep } from "./formation-step";
import { OnboardingStep } from "./onboarding-step";
import { cn } from "@/lib/utils";

export interface StartView {
  token: string;
  firstName: string;
  party: string;
  /** Company name, when signing for a company. */
  onBehalfOf?: string;
  email: string;
  steps: { id: FlowStep; label: string }[];
  current: FlowStep;
  letter?: { blocks: LetterBlock[]; fingerprint: string };
  payment: { method: PaymentMethod; amount?: string; canSimulate: boolean };
  nextSteps: NextStep[];
  contactEmail: string;
  /** A new company: the last step is the formation form, not the onboarding form. */
  formation: boolean;
}

const ICONS: Partial<Record<FlowStep, typeof Check>> = { letter: FileSignature, payment: Landmark, onboarding: UserRound };

function Stepper({ steps, current }: { steps: StartView["steps"]; current: FlowStep }) {
  const currentIndex = current === "done" ? steps.length : steps.findIndex((s) => s.id === current);
  return (
    <ol className="mb-6 flex items-center gap-2 sm:mb-8" aria-label="Progress">
      {steps.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const Icon = step.id === "payment" && steps.find((s) => s.id === "payment")?.label === "Payment" ? CreditCard : ICONS[step.id] || Check;
        return (
          <li key={step.id} className="flex flex-1 items-center gap-2" aria-current={active ? "step" : undefined}>
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                done ? "bg-forest-500 text-white" : active ? "bg-clay-500 text-white shadow-md shadow-clay-500/30" : "bg-stone-200 text-stone-500"
              )}
            >
              {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </span>
            <span className={cn("hidden text-sm font-medium sm:block", active ? "text-stone-900" : done ? "text-stone-600" : "text-stone-400")}>
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <span className="mx-1 h-0.5 flex-1 overflow-hidden rounded-full bg-stone-200">
                <motion.span className="block h-full bg-forest-500" initial={false} animate={{ width: done ? "100%" : "0%" }} transition={{ duration: 0.5 }} />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {message}
    </p>
  );
}

function LetterStep({ view, onSigned }: { view: StartView; onSigned: () => void }) {
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const sign = async () => {
    setError("");
    if (name.trim().length < 2) return setError("Type your full name to sign.");
    if (!agree) return setError("Please tick to confirm you agree.");
    setBusy(true);
    try {
      const res = await fetch(`/api/start/${view.token}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, agree, fingerprint: view.letter?.fingerprint }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "We could not record your signature. Please try again.");
      onSigned();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <Panel>{view.letter && <LetterView blocks={view.letter.blocks} />}</Panel>
      <Panel className="border-clay-200">
        <h2 className="text-lg font-semibold text-stone-900">Sign your engagement letter</h2>
        <p className="mt-1 text-sm text-stone-600">Type your full name. This counts as your signature, and we&apos;ll email you a signed PDF copy.</p>
        <div className="mt-5 space-y-2">
          <Label htmlFor="signer">Full name</Label>
          <Input id="signer" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Your full name" className="text-base" />
          <AnimatePresence>
            {name.trim().length > 1 && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="pt-1 font-serif text-3xl italic text-stone-800"
                aria-hidden
              >
                {name}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <label className="mt-4 flex items-start gap-3 rounded-xl border border-stone-200 p-3.5 text-sm text-stone-700">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-clay-600" />
          <span>I have read this engagement letter and agree to it{view.onBehalfOf ? ` on behalf of ${view.onBehalfOf}` : ""}.</span>
        </label>
        {error && <div className="mt-4"><ErrorBox message={error} /></div>}
        <Button type="button" onClick={sign} disabled={busy} className="mt-5 w-full sm:w-auto">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />} Sign engagement letter
        </Button>
        <p className="mt-3 text-xs text-stone-500">Signing as {view.email}. We record the date, time and your internet address with your signature.</p>
      </Panel>
    </div>
  );
}

function PaymentStep({ view, onPaid }: { view: StartView; onPaid: () => void }) {
  const searchParams = useSearchParams();
  const returning = searchParams.get("payment") === "return";
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(returning);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState("");
  const [simulate, setSimulate] = useState(false);
  const isCard = view.payment.method === "card";
  const attempts = useRef(0);

  const confirm = useCallback(async () => {
    setChecking(true);
    setSlow(false);
    attempts.current = 0;
    while (attempts.current < 10) {
      attempts.current += 1;
      try {
        const res = await fetch(`/api/start/${view.token}/payment/confirm`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.done) {
          onPaid();
          return;
        }
      } catch {
        /* try again */
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    setSlow(true);
    setChecking(false);
  }, [view.token, onPaid]);

  useEffect(() => {
    if (!returning) return;
    // Check with GoCardless or Stripe once the client is back.
    void confirm();
  }, [returning, confirm]);

  const start = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/start/${view.token}/payment`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Please try again.");
      if (data.simulate) {
        setSimulate(true);
        setBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
      setBusy(false);
    }
  };

  const runSimulation = async () => {
    setBusy(true);
    const res = await fetch(`/api/start/${view.token}/payment/simulate`, { method: "POST" });
    if (res.ok) onPaid();
    else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not simulate.");
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <Panel className="py-14 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-clay-500" />
        <p className="mt-4 font-medium text-stone-900">Checking with {isCard ? "Stripe" : "GoCardless"}…</p>
        <p className="mt-1 text-sm text-stone-500">This only takes a moment.</p>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-clay-50 text-clay-600 ring-1 ring-inset ring-clay-100">
          {isCard ? <CreditCard className="h-6 w-6" /> : <Landmark className="h-6 w-6" />}
        </span>
        <div>
          <h2 className="text-lg font-semibold text-stone-900">{isCard ? `Pay ${view.payment.amount} by card` : "Set up your Direct Debit"}</h2>
          <p className="mt-1 text-sm text-stone-600">
            {isCard
              ? "You'll pay on Stripe's secure page, then come straight back here."
              : "You'll set it up on GoCardless's secure page, then come straight back here. It takes about a minute."}
          </p>
        </div>
      </div>

      <ul className="mt-5 space-y-2.5 text-sm text-stone-700">
        {(isCard
          ? ["Card details go to Stripe, never to us.", "You'll get a receipt by email."]
          : [
              "Your bank details go to GoCardless, the UK's leading Direct Debit provider, never to us.",
              "Nothing is taken until we've finished our checks and sent your first invoice.",
              "You're covered by the Direct Debit Guarantee.",
            ]
        ).map((t) => (
          <li key={t} className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" /> {t}
          </li>
        ))}
      </ul>

      {slow && (
        <p className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          We haven&apos;t had confirmation yet. If you finished, press Check again in a minute. Otherwise start again below.
        </p>
      )}
      {error && <div className="mt-5"><ErrorBox message={error} /></div>}

      {simulate ? (
        <div className="mt-6 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Test version</p>
          <p className="mt-1 text-sm text-amber-900">{isCard ? "Stripe" : "GoCardless"} isn&apos;t connected on this test build yet, so you can simulate this step.</p>
          <Button type="button" onClick={runSimulation} disabled={busy} className="mt-3">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Simulate {isCard ? "card payment" : "Direct Debit set-up"}
          </Button>
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="button" onClick={start} disabled={busy} className="w-full sm:w-auto">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {isCard ? `Pay ${view.payment.amount}` : "Set up Direct Debit"}
          </Button>
          {slow && (
            <Button type="button" variant="outline" onClick={() => void confirm()}>
              Check again
            </Button>
          )}
        </div>
      )}
    </Panel>
  );
}

function DoneStep({ view }: { view: StartView }) {
  return (
    <Panel className="text-center">
      <motion.span
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 16 }}
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-forest-500 text-white shadow-lg shadow-forest-500/30"
      >
        <Check className="h-8 w-8" strokeWidth={3} />
      </motion.span>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-stone-900">You&apos;re all set, {view.firstName}</h2>
      <p className="mx-auto mt-2 max-w-md text-stone-600">Thank you. We&apos;ve emailed you a copy of your signed engagement letter.</p>
      {view.nextSteps.length > 0 && (
        <div className="mx-auto mt-8 max-w-md text-left">
          <p className="mb-4 text-sm font-semibold text-stone-900">What happens next</p>
          <NextStepsList steps={view.nextSteps} />
        </div>
      )}
      <p className="mt-8 text-sm text-stone-500">
        Questions? Email <a href={`mailto:${view.contactEmail}`} className="font-medium text-clay-700">{view.contactEmail}</a>
      </p>
    </Panel>
  );
}

export function StartFlow({ view }: { view: StartView }) {
  const router = useRouter();
  const [transitioning, setTransitioning] = useState(false);

  // After each step, reload from the server, which decides what comes next.
  const advance = useCallback(() => {
    setTransitioning(true);
    router.replace(`/start/${view.token}`, { scroll: true });
    router.refresh();
  }, [router, view.token]);

  // When the server moves the client on, show the new step.
  const [shownStep, setShownStep] = useState(view.current);
  if (shownStep !== view.current) {
    setShownStep(view.current);
    setTransitioning(false);
  }
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [shownStep]);

  const titles: Partial<Record<FlowStep, { title: string; text: string }>> = {
    letter: { title: `Welcome, ${view.firstName}`, text: "Please read your engagement letter and sign it at the bottom." },
    payment: {
      title: view.payment.method === "card" ? "Make your payment" : "Set up your Direct Debit",
      text: "Thank you for signing. Next, your payment details.",
    },
    onboarding: view.formation
      ? { title: "Your new company", text: "Last step. Tell us about the company you'd like to set up." }
      : { title: "Your details", text: "Last step. Your progress saves as you go, so you can come back to this link any time." },
  };
  const heading = titles[view.current];

  return (
    <div>
      {view.current !== "done" && <Stepper steps={view.steps} current={view.current} />}
      {heading && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-clay-700">Getting started with Figures</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">{heading.title}</h1>
          <p className="mt-1.5 text-stone-600">{heading.text}</p>
        </div>
      )}

      {transitioning ? (
        <Panel className="py-14 text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-clay-500" />
        </Panel>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={view.current} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
            {view.current === "letter" && <LetterStep view={view} onSigned={advance} />}
            {view.current === "payment" && <PaymentStep view={view} onPaid={advance} />}
            {view.current === "onboarding" &&
              (view.formation ? (
                <FormationStep token={view.token} onDone={advance} />
              ) : (
                <Panel>
                  <OnboardingStep token={view.token} onDone={advance} />
                </Panel>
              ))}
            {view.current === "done" && <DoneStep view={view} />}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
