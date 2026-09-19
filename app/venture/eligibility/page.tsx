"use client";

import { useState } from "react";
import { ClipboardCheck, CheckCircle2, XCircle, AlertTriangle, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/venture/page-header";
import { ModuleIntro } from "@/components/venture/module-intro";
import { WizardShell } from "@/components/venture/wizard-shell";
import { StatusPill } from "@/components/venture/status-pill";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { useVenture } from "@/lib/venture/store";
import { getEligibilityStatus } from "@/lib/venture/status";
import { computeEligibility } from "@/lib/venture/eligibility-rules";
import type { EligibilityAnswers } from "@/lib/venture/types";

const TOTAL_STEPS = 5;

const RESULT_ICON = {
  pass: CheckCircle2,
  fail: XCircle,
  borderline: AlertTriangle,
} as const;

export default function EligibilityPage() {
  const { state, setState } = useVenture();
  const status = getEligibilityStatus(state);
  const hasResults = !!state.eligibility.results;

  const [view, setView] = useState<"intro" | "wizard" | "results">(
    hasResults ? "intro" : "intro"
  );
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<EligibilityAnswers>(state.eligibility.answers);

  const updateAnswer = <K extends keyof EligibilityAnswers>(key: K, value: EligibilityAnswers[K]) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return !!answers.tradingActivity;
      case 1:
        return answers.grossAssetsGBP !== null && answers.grossAssetsGBP >= 0;
      case 2:
        return answers.employeeCount !== null && answers.employeeCount >= 0;
      case 3:
        return answers.tradeAgeMonths !== null && answers.tradeAgeMonths >= 0;
      case 4:
        return answers.companyIndependent !== null;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
      return;
    }
    const results = computeEligibility(answers);
    setState((prev) => ({
      ...prev,
      eligibility: { answers, results, completedAt: new Date().toISOString() },
    }));
    setView("results");
  };

  const handleBack = () => {
    if (step === 0) {
      setView("intro");
      return;
    }
    setStep((s) => s - 1);
  };

  const restart = () => {
    setAnswers({
      tradingActivity: null,
      grossAssetsGBP: null,
      employeeCount: null,
      tradeAgeMonths: null,
      companyIndependent: null,
    });
    setStep(0);
    setView("wizard");
  };

  return (
    <div>
      <PageHeader
        title="Eligibility Checker"
        subtitle="A short questionnaire covering trading activity, gross assets, employee count, age of trade and company independence."
      />

      {view === "intro" && (
        <ModuleIntro
          icon={ClipboardCheck}
          eyebrow="Step 1 of your fundraise"
          title="Check your eligibility"
          description="Answer five quick questions to see, at a glance, whether your company is likely to qualify for SEIS, EIS, R&D tax relief and EMI options - with the specific reason behind each result."
          color="#F5C542"
          status={status}
          stats={
            hasResults
              ? [
                  {
                    label: "Last checked",
                    value: new Date(state.eligibility.completedAt as string).toLocaleDateString("en-GB"),
                  },
                  {
                    label: "Schemes passing",
                    value: `${state.eligibility.results!.filter((r) => r.result === "pass").length}/4`,
                  },
                ]
              : undefined
          }
          ctaLabel={hasResults ? "View results" : "Start assessment"}
          onStart={() => (hasResults ? setView("results") : setView("wizard"))}
        />
      )}

      {view === "wizard" && (
        <WizardShell
          step={step}
          totalSteps={TOTAL_STEPS}
          onBack={handleBack}
          onNext={handleNext}
          nextDisabled={!canProceed()}
          isLastStep={step === TOTAL_STEPS - 1}
          nextLabel={step === TOTAL_STEPS - 1 ? "See my results" : "Next"}
          stepLabel={
            [
              "Trading activity",
              "Gross assets",
              "Employee count",
              "Age of trade",
              "Company independence",
            ][step]
          }
        >
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-stone-900">
                  Does your company carry out a qualifying trading activity?
                </h3>
                <p className="mt-1 text-sm text-stone-500">
                  HMRC excludes certain activities (e.g. property development, financial
                  services, legal/accountancy services, farming) from SEIS, EIS and EMI.
                </p>
              </div>
              <RadioGroup
                value={answers.tradingActivity ?? undefined}
                onValueChange={(v) => updateAnswer("tradingActivity", v as EligibilityAnswers["tradingActivity"])}
                className="gap-3"
              >
                {[
                  { value: "qualifying", label: "Yes - we believe our trade qualifies" },
                  { value: "unsure", label: "Not sure - I need this confirmed" },
                  { value: "excluded", label: "No - we carry out an excluded activity" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-3 rounded-none border border-stone-200 bg-card p-4 text-sm text-stone-700 transition-colors hover:border-forest-300"
                  >
                    <RadioGroupItem value={opt.value} id={`trade-${opt.value}`} />
                    {opt.label}
                  </label>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-stone-900">
                  What are your company&apos;s gross assets?
                </h3>
                <p className="mt-1 text-sm text-stone-500">
                  The total value of assets on your balance sheet before the investment, in GBP.
                </p>
              </div>
              <div className="max-w-xs space-y-2">
                <Label htmlFor="grossAssets">Gross assets (£)</Label>
                <Input
                  id="grossAssets"
                  type="number"
                  min={0}
                  placeholder="e.g. 180000"
                  value={answers.grossAssetsGBP ?? ""}
                  onChange={(e) => updateAnswer("grossAssetsGBP", e.target.value === "" ? null : Number(e.target.value))}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-stone-900">
                  How many full-time equivalent employees do you have?
                </h3>
                <p className="mt-1 text-sm text-stone-500">
                  Include full-time, part-time (pro-rated) and connected persons.
                </p>
              </div>
              <div className="max-w-xs space-y-2">
                <Label htmlFor="employeeCount">Employees</Label>
                <Input
                  id="employeeCount"
                  type="number"
                  min={0}
                  placeholder="e.g. 6"
                  value={answers.employeeCount ?? ""}
                  onChange={(e) => updateAnswer("employeeCount", e.target.value === "" ? null : Number(e.target.value))}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-stone-900">
                  How long has your company been trading?
                </h3>
                <p className="mt-1 text-sm text-stone-500">
                  Months since you started your first commercial sale - not incorporation date.
                </p>
              </div>
              <div className="max-w-xs space-y-2">
                <Label htmlFor="tradeAge">Age of trade (months)</Label>
                <Input
                  id="tradeAge"
                  type="number"
                  min={0}
                  placeholder="e.g. 14"
                  value={answers.tradeAgeMonths ?? ""}
                  onChange={(e) => updateAnswer("tradeAgeMonths", e.target.value === "" ? null : Number(e.target.value))}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-stone-900">
                  Is your company independent?
                </h3>
                <p className="mt-1 text-sm text-stone-500">
                  Your company must not be a 51%+ subsidiary of, or controlled by, another company.
                </p>
              </div>
              <RadioGroup
                value={
                  answers.companyIndependent === null
                    ? undefined
                    : answers.companyIndependent
                      ? "yes"
                      : "no"
                }
                onValueChange={(v) => updateAnswer("companyIndependent", v === "yes")}
                className="gap-3"
              >
                {[
                  { value: "yes", label: "Yes - we are independent" },
                  { value: "no", label: "No - we are owned/controlled by another company" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-3 rounded-none border border-stone-200 bg-card p-4 text-sm text-stone-700 transition-colors hover:border-forest-300"
                  >
                    <RadioGroupItem value={opt.value} id={`indep-${opt.value}`} />
                    {opt.label}
                  </label>
                ))}
              </RadioGroup>
            </div>
          )}
        </WizardShell>
      )}

      {view === "results" && state.eligibility.results && (
        <div className="space-y-6">
          <div className="rounded-none border border-border bg-card p-6 shadow-sm sm:p-10">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-stone-900">
                  Your results
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  Checked on{" "}
                  {new Date(state.eligibility.completedAt as string).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  . Not a substitute for formal HMRC advance clearance.
                </p>
              </div>
              <Button variant="outline" onClick={restart}>
                <RotateCcw className="mr-1.5 h-4 w-4" /> Retake assessment
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {state.eligibility.results.map((r) => {
                const Icon = RESULT_ICON[r.result];
                return (
                  <div
                    key={r.scheme}
                    className="rounded-none border border-stone-200 bg-stone-50/50 p-5"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-stone-900">{r.scheme}</h3>
                      <StatusPill status={r.result} />
                    </div>
                    <div className="flex items-start gap-2 text-sm text-stone-600">
                      <Icon
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          r.result === "pass"
                            ? "text-forest-600"
                            : r.result === "fail"
                              ? "text-red-500"
                              : "text-amber-500"
                        }`}
                      />
                      <span>{r.reason}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
