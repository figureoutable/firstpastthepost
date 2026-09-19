"use client";

import { useState } from "react";
import { Gift, Plus, Settings2 } from "lucide-react";
import { PageHeader } from "@/components/venture/page-header";
import { ModuleIntro } from "@/components/venture/module-intro";
import { WizardShell } from "@/components/venture/wizard-shell";
import { FormSection } from "@/components/venture/form-section";
import { SummaryRow } from "@/components/venture/summary-row";
import { StubAction } from "@/components/venture/stub-action";
import { StatusPill } from "@/components/venture/status-pill";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useVenture, genId } from "@/lib/venture/store";
import { getEmiStatus } from "@/lib/venture/status";
import type { EmiGrant } from "@/lib/venture/types";

const TOTAL_STEPS = 2;
const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2 });

const EMPTY_DRAFT = { employeeName: "", numberOfOptions: "", exercisePrice: "", grantDate: "" };

export default function EmiPage() {
  const { state, setState } = useVenture();
  const status = getEmiStatus(state);
  const { poolSizePercent, vestingYears, cliffMonths, grants, valuationRequested } = state.emi;
  const totalGranted = grants.reduce((s, g) => s + g.numberOfOptions, 0);

  const [view, setView] = useState<"intro" | "workspace" | "wizard">("intro");
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [poolDraft, setPoolDraft] = useState({
    poolSizePercent: String(poolSizePercent),
    vestingYears: String(vestingYears),
    cliffMonths: String(cliffMonths),
  });
  const [editingPool, setEditingPool] = useState(false);

  const update = <K extends keyof typeof EMPTY_DRAFT>(key: K, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const canProceed = () => {
    if (step === 0) return draft.employeeName.trim().length > 0 && Number(draft.numberOfOptions) > 0;
    return Number(draft.exercisePrice) > 0 && draft.grantDate.length > 0;
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
      return;
    }
    const grant: EmiGrant = {
      id: genId("emi"),
      employeeName: draft.employeeName.trim(),
      numberOfOptions: Number(draft.numberOfOptions),
      exercisePrice: Number(draft.exercisePrice),
      grantDate: new Date(draft.grantDate).toISOString(),
      status: "draft",
    };
    setState((prev) => ({ ...prev, emi: { ...prev.emi, grants: [grant, ...prev.emi.grants] } }));
    setDraft(EMPTY_DRAFT);
    setStep(0);
    setView("workspace");
  };

  const handleBack = () => {
    if (step === 0) {
      setView("workspace");
      return;
    }
    setStep((s) => s - 1);
  };

  const savePoolSettings = () => {
    setState((prev) => ({
      ...prev,
      emi: {
        ...prev.emi,
        poolSizePercent: Number(poolDraft.poolSizePercent) || 0,
        vestingYears: Number(poolDraft.vestingYears) || 0,
        cliffMonths: Number(poolDraft.cliffMonths) || 0,
      },
    }));
    setEditingPool(false);
  };

  const cycleGrantStatus = (id: string) => {
    const order: EmiGrant["status"][] = ["draft", "granted", "exercised", "lapsed"];
    setState((prev) => ({
      ...prev,
      emi: {
        ...prev.emi,
        grants: prev.emi.grants.map((g) =>
          g.id === id ? { ...g, status: order[(order.indexOf(g.status) + 1) % order.length] } : g
        ),
      },
    }));
  };

  return (
    <div>
      <PageHeader
        title="EMI Share Options"
        subtitle="Set up an option pool with vesting defaults, and record individual option grants."
      />

      {view === "intro" && (
        <ModuleIntro
          icon={Gift}
          eyebrow="Employee equity"
          title="EMI option scheme"
          description="Configure your option pool and vesting defaults, then record grants to individual employees - exercise price, number of options and status, all in one place."
          color="#E0A458"
          status={status}
          stats={[
            { label: "Pool size", value: `${poolSizePercent}%` },
            { label: "Options granted", value: totalGranted.toLocaleString() },
          ]}
          ctaLabel="Manage option scheme"
          onStart={() => setView("workspace")}
        />
      )}

      {view === "workspace" && (
        <div className="space-y-6">
          <div className="rounded-none border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold tracking-tight text-stone-900">Option pool settings</h2>
              {!editingPool && (
                <Button variant="outline" size="sm" onClick={() => setEditingPool(true)}>
                  <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
              )}
            </div>

            {editingPool ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="poolSize">Pool size (%)</Label>
                    <Input
                      id="poolSize"
                      type="number"
                      min={0}
                      max={100}
                      value={poolDraft.poolSizePercent}
                      onChange={(e) => setPoolDraft((f) => ({ ...f, poolSizePercent: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vestingYears">Vesting (years)</Label>
                    <Input
                      id="vestingYears"
                      type="number"
                      min={0}
                      value={poolDraft.vestingYears}
                      onChange={(e) => setPoolDraft((f) => ({ ...f, vestingYears: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cliffMonths">Cliff (months)</Label>
                    <Input
                      id="cliffMonths"
                      type="number"
                      min={0}
                      value={poolDraft.cliffMonths}
                      onChange={(e) => setPoolDraft((f) => ({ ...f, cliffMonths: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={savePoolSettings}>Save</Button>
                  <Button variant="outline" onClick={() => setEditingPool(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-none border border-stone-200 bg-stone-50/50 p-6">
                <SummaryRow label="Pool size" value={`${poolSizePercent}% of fully diluted shares`} />
                <SummaryRow label="Default vesting" value={`${vestingYears} years`} />
                <SummaryRow label="Default cliff" value={`${cliffMonths} months`} />
              </div>
            )}

            <div className="mt-6 border-t border-stone-200 pt-6">
              <h3 className="mb-3 text-sm font-semibold text-stone-900">Valuation</h3>
              {valuationRequested ? (
                <StatusPill status="sent" label="Valuation requested" />
              ) : (
                <StubAction
                  label="Request EMI valuation"
                  placeholderText="Connect a share valuation provider here - this demo does not calculate a real HMRC-agreed valuation."
                  onActivated={() =>
                    setState((prev) => ({ ...prev, emi: { ...prev.emi, valuationRequested: true } }))
                  }
                />
              )}
            </div>
          </div>

          <div className="rounded-none border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-stone-900">Option grants</h2>
                <p className="mt-1 text-sm text-stone-500">
                  {totalGranted.toLocaleString()} options granted across {grants.length} grant(s)
                </p>
              </div>
              <Button onClick={() => setView("wizard")}>
                <Plus className="mr-1.5 h-4 w-4" /> Record grant
              </Button>
            </div>

            {grants.length === 0 ? (
              <p className="rounded-none border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
                No grants recorded yet.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-none border border-stone-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Employee</th>
                      <th className="px-4 py-3 font-semibold text-right">Options</th>
                      <th className="px-4 py-3 font-semibold text-right">Exercise price</th>
                      <th className="px-4 py-3 font-semibold">Grant date</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grants.map((g) => (
                      <tr key={g.id} className="border-t border-stone-100">
                        <td className="px-4 py-3 font-medium text-stone-900">{g.employeeName}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-stone-600">
                          {g.numberOfOptions.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-stone-600">
                          {GBP.format(g.exercisePrice)}
                        </td>
                        <td className="px-4 py-3 text-stone-600">
                          {new Date(g.grantDate).toLocaleDateString("en-GB")}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => cycleGrantStatus(g.id)} title="Click to advance status">
                            <StatusPill status={g.status} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {view === "wizard" && (
        <WizardShell
          step={step}
          totalSteps={TOTAL_STEPS}
          onBack={handleBack}
          onNext={handleNext}
          nextDisabled={!canProceed()}
          isLastStep={step === TOTAL_STEPS - 1}
          nextLabel={step === TOTAL_STEPS - 1 ? "Save grant" : "Next"}
          stepLabel={["Employee & options", "Exercise price & date"][step]}
        >
          {step === 0 && (
            <FormSection title="Employee & options">
              <div className="space-y-2">
                <Label htmlFor="employeeName">Employee name *</Label>
                <Input
                  id="employeeName"
                  value={draft.employeeName}
                  onChange={(e) => update("employeeName", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numberOfOptions">Number of options *</Label>
                <Input
                  id="numberOfOptions"
                  type="number"
                  min={0}
                  value={draft.numberOfOptions}
                  onChange={(e) => update("numberOfOptions", e.target.value)}
                />
              </div>
            </FormSection>
          )}

          {step === 1 && (
            <FormSection title="Exercise price & date">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="exercisePrice">Exercise price (£ per share) *</Label>
                  <Input
                    id="exercisePrice"
                    type="number"
                    min={0}
                    step="0.01"
                    value={draft.exercisePrice}
                    onChange={(e) => update("exercisePrice", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grantDate">Grant date *</Label>
                  <Input
                    id="grantDate"
                    type="date"
                    value={draft.grantDate}
                    onChange={(e) => update("grantDate", e.target.value)}
                  />
                </div>
              </div>
            </FormSection>
          )}
        </WizardShell>
      )}
    </div>
  );
}
