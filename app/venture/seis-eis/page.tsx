"use client";

import { useState } from "react";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/venture/page-header";
import { ModuleIntro } from "@/components/venture/module-intro";
import { FormSection } from "@/components/venture/form-section";
import { SummaryRow } from "@/components/venture/summary-row";
import { StubAction } from "@/components/venture/stub-action";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import GradientButton from "@/components/kokonutui/gradient-button";
import { useVenture } from "@/lib/venture/store";
import { getSeisEisStatus } from "@/lib/venture/status";
import type { SeisEisState } from "@/lib/venture/types";

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

export default function SeisEisPage() {
  const { state, setState } = useVenture();
  const status = getSeisEisStatus(state);

  const [view, setView] = useState<"intro" | "form">("intro");
  const [form, setForm] = useState<SeisEisState>(state.seisEis);

  const update = <K extends keyof SeisEisState>(key: K, value: SeisEisState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      setState((s) => ({ ...s, seisEis: next }));
      return next;
    });
  };

  const canSubmit =
    !!form.companyName &&
    form.tradingSinceMonths !== null &&
    !!form.schemeType &&
    !!form.amountSeeking &&
    !!form.sharesToIssue &&
    !!form.shareClass &&
    form.businessPlanSummary.trim().length > 0 &&
    form.useOfFunds.trim().length > 0;

  return (
    <div>
      <PageHeader
        title="SEIS / EIS Advance Assurance"
        subtitle="Capture the company and investment details HMRC needs for an advance assurance application."
      />

      {view === "intro" && (
        <ModuleIntro
          icon={ShieldCheck}
          eyebrow="Fundraising"
          title="Prepare your advance assurance application"
          description="Tell us about your raise and business plan, and we'll put together everything HMRC needs to give assurance that your SEIS or EIS investors will qualify for relief."
          color="#4C8DFF"
          status={status}
          hideStatus
          stats={
            form.amountSeeking
              ? [
                  { label: "Scheme", value: form.schemeType ?? "-" },
                  { label: "Seeking", value: GBP.format(form.amountSeeking) },
                ]
              : undefined
          }
          ctaLabel={status === "not_started" ? "Start application" : "Continue application"}
          onStart={() => setView("form")}
        />
      )}

      {view === "form" && (
        <div className="space-y-10 rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
          <FormSection title="Company & trading details">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company name *</Label>
                <Input
                  id="companyName"
                  value={form.companyName}
                  onChange={(e) => update("companyName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tradingSince">Trading since (months ago) *</Label>
                <Input
                  id="tradingSince"
                  type="number"
                  min={0}
                  value={form.tradingSinceMonths ?? ""}
                  onChange={(e) =>
                    update("tradingSinceMonths", e.target.value === "" ? null : Number(e.target.value))
                  }
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Investment details" description="What are you raising, and on what terms?">
            <div className="space-y-2">
              <Label>Scheme *</Label>
              <RadioGroup
                value={form.schemeType ?? undefined}
                onValueChange={(v) => update("schemeType", v as SeisEisState["schemeType"])}
                className="grid grid-cols-1 gap-3 sm:grid-cols-3"
              >
                {["SEIS", "EIS", "Both"].map((opt) => (
                  <label
                    key={opt}
                    className="flex cursor-pointer items-center gap-3 rounded-md border border-stone-200 bg-card p-4 text-sm text-stone-700 transition-colors hover:border-forest-300"
                  >
                    <RadioGroupItem value={opt} id={`scheme-${opt}`} />
                    {opt}
                  </label>
                ))}
              </RadioGroup>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="amountSeeking">Amount seeking (£) *</Label>
                <Input
                  id="amountSeeking"
                  type="number"
                  min={0}
                  value={form.amountSeeking ?? ""}
                  onChange={(e) => update("amountSeeking", e.target.value === "" ? null : Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sharesToIssue">Shares to issue *</Label>
                <Input
                  id="sharesToIssue"
                  type="number"
                  min={0}
                  value={form.sharesToIssue ?? ""}
                  onChange={(e) => update("sharesToIssue", e.target.value === "" ? null : Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shareClass">Share class *</Label>
                <Input
                  id="shareClass"
                  value={form.shareClass}
                  onChange={(e) => update("shareClass", e.target.value)}
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Business plan summary">
            <div className="space-y-2">
              <Label htmlFor="businessPlanSummary">What does the business do, and why now? *</Label>
              <Textarea
                id="businessPlanSummary"
                rows={4}
                value={form.businessPlanSummary}
                onChange={(e) => update("businessPlanSummary", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="useOfFunds">How will you use the funds raised? *</Label>
              <Textarea
                id="useOfFunds"
                rows={3}
                value={form.useOfFunds}
                onChange={(e) => update("useOfFunds", e.target.value)}
              />
            </div>
          </FormSection>

          <FormSection title="Review" description="Check everything looks right before submitting.">
            <div className="rounded-md border border-stone-200 bg-card p-4">
              <SummaryRow label="Company" value={form.companyName || "-"} />
              <SummaryRow label="Trading since" value={`${form.tradingSinceMonths ?? "-"} months ago`} />
              <SummaryRow label="Scheme" value={form.schemeType ?? "-"} />
              <SummaryRow label="Amount seeking" value={form.amountSeeking ? GBP.format(form.amountSeeking) : "-"} />
              <SummaryRow label="Shares to issue" value={form.sharesToIssue?.toLocaleString() ?? "-"} />
              <SummaryRow label="Share class" value={form.shareClass || "-"} />
              <SummaryRow label="Business plan" value={form.businessPlanSummary || "-"} />
              <SummaryRow label="Use of funds" value={form.useOfFunds || "-"} />
            </div>

            <StubAction
              emphasized
              label="Submit to HMRC"
              placeholderText="Connect HMRC integration here - this demo does not send a real advance assurance application."
              onActivated={() => {
                setForm((prev) => {
                  const next = { ...prev, submitted: true, submittedAt: new Date().toISOString() };
                  setState((s) => ({ ...s, seisEis: next }));
                  return next;
                });
              }}
            />
          </FormSection>

          <div className="flex gap-3 border-t border-stone-200 pt-6">
            <Button type="button" variant="outline" onClick={() => setView("intro")}>
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
            </Button>
            <GradientButton
              type="button"
              variant="emerald"
              disabled={!canSubmit}
              className="ml-auto"
              onClick={() => {
                setForm((prev) => {
                  const next = { ...prev, submitted: true, submittedAt: new Date().toISOString() };
                  setState((s) => ({ ...s, seisEis: next }));
                  return next;
                });
              }}
            >
              Save application
            </GradientButton>
          </div>
        </div>
      )}
    </div>
  );
}
