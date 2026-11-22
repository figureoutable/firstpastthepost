"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, PencilLine } from "lucide-react";
import { ModuleIntro } from "@/components/venture/module-intro";
import { WizardShell } from "@/components/venture/wizard-shell";
import { SummaryRow } from "@/components/venture/summary-row";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useVenture } from "@/lib/venture/store";
import { getSeisEisStatus } from "@/lib/venture/status";
import type { SeisEisState } from "@/lib/venture/types";
import { cn } from "@/lib/utils";

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

const STEPS = ["Your company", "The investment", "Your plan", "Check and finish"];

const SCHEMES: { value: NonNullable<SeisEisState["schemeType"]>; title: string; detail: string }[] = [
  { value: "SEIS", title: "SEIS", detail: "For very early companies raising their first money" },
  { value: "EIS", title: "EIS", detail: "For companies raising larger amounts" },
  { value: "Both", title: "Both", detail: "SEIS first, then EIS in the same round" },
];

const numberOrNull = (v: string) => (v === "" ? null : Number(v));

export default function SeisEisPage() {
  const router = useRouter();
  const { state, setState } = useVenture();
  const form = state.seisEis;
  const status = getSeisEisStatus(state);
  const [step, setStep] = useState(0);

  const update = <K extends keyof SeisEisState>(key: K, value: SeisEisState[K]) =>
    setState((s) => ({ ...s, seisEis: { ...s.seisEis, [key]: value } }));

  const stepComplete = [
    Boolean(form.companyName.trim()) && form.tradingSinceMonths !== null,
    Boolean(form.schemeType && form.amountSeeking && form.sharesToIssue && form.shareClass.trim()),
    Boolean(form.businessPlanSummary.trim() && form.useOfFunds.trim()),
    true,
  ];

  const finish = () =>
    setState((s) => ({ ...s, seisEis: { ...s.seisEis, submitted: true, submittedAt: new Date().toISOString() } }));

  const reopen = () => {
    setState((s) => ({ ...s, seisEis: { ...s.seisEis, submitted: false, submittedAt: null } }));
    setStep(0);
  };

  const summary = (
    <div className="rounded-xl border border-stone-200 bg-stone-50/60 px-4">
      <SummaryRow label="Company" value={form.companyName || "-"} />
      <SummaryRow label="Trading for" value={form.tradingSinceMonths != null ? `${form.tradingSinceMonths} months` : "-"} />
      <SummaryRow label="Scheme" value={form.schemeType ?? "-"} />
      <SummaryRow label="Raising" value={form.amountSeeking ? GBP.format(form.amountSeeking) : "-"} />
      <SummaryRow label="Shares to issue" value={form.sharesToIssue?.toLocaleString("en-GB") ?? "-"} />
      <SummaryRow label="Share class" value={form.shareClass || "-"} />
      <SummaryRow label="Business plan" value={form.businessPlanSummary || "-"} />
      <SummaryRow label="Use of funds" value={form.useOfFunds || "-"} />
    </div>
  );

  return (
    <div>
      <ModuleIntro
        logoSrc="/icons/seis-eis.png"
        eyebrow="Raise money"
        title="SEIS / EIS advance assurance"
        description="Investors get income tax relief under SEIS and EIS. Most want HMRC's advance assurance before they invest. Answer a few questions and we prepare the application."
        status={status}
      />

      {form.submitted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_1px_2px_rgba(28,25,23,0.04)] sm:p-7"
        >
          <div className="flex items-start gap-3">
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.1 }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest-50 text-forest-600"
            >
              <CheckCircle2 className="h-6 w-6" />
            </motion.span>
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Ready for review</h2>
              <p className="text-sm text-stone-600">
                Figures checks your answers, asks for anything missing and sends the application to HMRC with you.
                {form.submittedAt && ` Marked ready on ${new Date(form.submittedAt).toLocaleDateString("en-GB")}.`}
              </p>
            </div>
          </div>
          {summary}
          <Button variant="outline" onClick={reopen}>
            <PencilLine className="mr-1.5 h-4 w-4" /> Make changes
          </Button>
        </motion.div>
      ) : (
        <WizardShell
          step={step}
          totalSteps={STEPS.length}
          stepLabel={STEPS[step]}
          isLastStep={step === STEPS.length - 1}
          nextLabel={step === STEPS.length - 1 ? "Mark as ready for review" : "Continue"}
          backLabel={step === 0 ? "Overview" : "Back"}
          nextDisabled={!stepComplete[step]}
          onBack={() => (step === 0 ? router.push("/venture") : setStep((s) => s - 1))}
          onNext={() => (step < STEPS.length - 1 ? setStep((s) => s + 1) : finish())}
        >
          {step === 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company name</Label>
                <Input id="companyName" value={form.companyName} onChange={(e) => update("companyName", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tradingSince">How many months have you been trading?</Label>
                <Input
                  id="tradingSince"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.tradingSinceMonths ?? ""}
                  onChange={(e) => update("tradingSinceMonths", numberOrNull(e.target.value))}
                />
                <p className="text-xs text-stone-500">Put 0 if you have not started trading yet.</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <>
              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-medium text-stone-900">Which scheme?</legend>
                <div role="radiogroup" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {SCHEMES.map((opt) => {
                    const selected = form.schemeType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => update("schemeType", opt.value)}
                        className={cn(
                          "rounded-xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/40",
                          selected
                            ? "border-clay-400 bg-clay-50/60 shadow-sm ring-1 ring-clay-300"
                            : "border-stone-200 bg-white hover:border-stone-300"
                        )}
                      >
                        <span className="flex items-center justify-between">
                          <span className="font-semibold text-stone-900">{opt.title}</span>
                          <span
                            className={cn(
                              "flex h-4 w-4 items-center justify-center rounded-full border",
                              selected ? "border-clay-500 bg-clay-500" : "border-stone-300"
                            )}
                          >
                            {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </span>
                        </span>
                        <span className="mt-1 block text-sm text-stone-500">{opt.detail}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="amountSeeking">Amount you are raising (£)</Label>
                  <Input
                    id="amountSeeking"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={form.amountSeeking ?? ""}
                    onChange={(e) => update("amountSeeking", numberOrNull(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sharesToIssue">Shares to issue</Label>
                  <Input
                    id="sharesToIssue"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={form.sharesToIssue ?? ""}
                    onChange={(e) => update("sharesToIssue", numberOrNull(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shareClass">Share class</Label>
                  <Input
                    id="shareClass"
                    placeholder="Ordinary"
                    value={form.shareClass}
                    onChange={(e) => update("shareClass", e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-stone-500">
                Shares must be full-risk ordinary shares for investors to get the relief. We check this for you.
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="businessPlanSummary">What does the business do, and why now?</Label>
                <Textarea
                  id="businessPlanSummary"
                  rows={5}
                  value={form.businessPlanSummary}
                  onChange={(e) => update("businessPlanSummary", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="useOfFunds">How will you spend the money?</Label>
                <Textarea id="useOfFunds" rows={4} value={form.useOfFunds} onChange={(e) => update("useOfFunds", e.target.value)} />
                <p className="text-xs text-stone-500">For example hiring, product development or marketing, with rough amounts.</p>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm text-stone-600">Check your answers. You can go back to change anything.</p>
              {summary}
            </>
          )}
        </WizardShell>
      )}
    </div>
  );
}
