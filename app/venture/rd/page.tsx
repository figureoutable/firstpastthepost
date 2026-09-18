"use client";

import { useState } from "react";
import { FlaskConical, Plus, Trash2, PoundSterling } from "lucide-react";
import { PageHeader } from "@/components/venture/page-header";
import { ModuleIntro } from "@/components/venture/module-intro";
import { WizardShell } from "@/components/venture/wizard-shell";
import { FormSection } from "@/components/venture/form-section";
import { StubAction } from "@/components/venture/stub-action";
import { StatusPill } from "@/components/venture/status-pill";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useVenture, genId } from "@/lib/venture/store";
import { getRdStatus } from "@/lib/venture/status";
import type { RdCostBreakdown, RdProject } from "@/lib/venture/types";

const TOTAL_STEPS = 4;
const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

const EMPTY_PROJECT = {
  name: "",
  advance: "",
  uncertainty: "",
  workDone: "",
  costs: { staff: 0, subcontractors: 0, software: 0, consumables: 0 } as RdCostBreakdown,
};

function totalCosts(costs: RdCostBreakdown) {
  return costs.staff + costs.subcontractors + costs.software + costs.consumables;
}

export default function RdPage() {
  const { state, setState } = useVenture();
  const status = getRdStatus(state);
  const projects = state.rd.projects;
  const grandTotal = projects.reduce((sum, p) => sum + totalCosts(p.costs), 0);

  const [view, setView] = useState<"intro" | "list" | "wizard">("intro");
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(EMPTY_PROJECT);

  const update = <K extends keyof typeof EMPTY_PROJECT>(key: K, value: (typeof EMPTY_PROJECT)[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return draft.name.trim().length > 0 && draft.advance.trim().length > 0;
      case 1:
        return draft.uncertainty.trim().length > 0;
      case 2:
        return draft.workDone.trim().length > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
      return;
    }
    const project: RdProject = {
      id: genId("rd"),
      ...draft,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      rd: { ...prev.rd, projects: [...prev.rd.projects, project] },
    }));
    setDraft(EMPTY_PROJECT);
    setStep(0);
    setView("list");
  };

  const handleBack = () => {
    if (step === 0) {
      setView("list");
      return;
    }
    setStep((s) => s - 1);
  };

  const removeProject = (id: string) => {
    setState((prev) => ({
      ...prev,
      rd: { ...prev.rd, projects: prev.rd.projects.filter((p) => p.id !== id) },
    }));
  };

  return (
    <div>
      <PageHeader
        title="R&D Tax Relief"
        subtitle="Log each qualifying project with its advance, uncertainty, work done and cost breakdown."
      />

      {view === "intro" && (
        <ModuleIntro
          icon={FlaskConical}
          eyebrow="Tax relief"
          title="Log your qualifying R&D projects"
          description="Capture the advance you were seeking, the uncertainty you faced, the work carried out and a cost breakdown for each project - then submit as your Additional Information Form when you're ready."
          color="#3DBE7A"
          status={status}
          stats={[
            { label: "Projects logged", value: String(projects.length) },
            { label: "Qualifying spend", value: GBP.format(grandTotal) },
          ]}
          ctaLabel={projects.length > 0 ? "View projects" : "Log your first project"}
          onStart={() => setView("list")}
        />
      )}

      {view === "list" && (
        <div className="space-y-6">
          <div className="rounded-md border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-stone-900">Projects</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Total qualifying spend across all projects: <strong className="text-stone-900">{GBP.format(grandTotal)}</strong>
                </p>
              </div>
              <Button onClick={() => setView("wizard")}>
                <Plus className="mr-1.5 h-4 w-4" /> Add project
              </Button>
            </div>

            {projects.length === 0 ? (
              <p className="rounded-md border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
                No projects logged yet.
              </p>
            ) : (
              <div className="space-y-4">
                {projects.map((p) => (
                  <div key={p.id} className="rounded-md border border-stone-200 bg-stone-50/50 p-5">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-stone-900">{p.name}</h3>
                      <button
                        onClick={() => removeProject(p.id)}
                        aria-label={`Remove ${p.name}`}
                        className="rounded-md p-1.5 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mb-3 text-sm text-stone-600">{p.advance}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-stone-500">
                      <span className="flex items-center gap-1">
                        <PoundSterling className="h-3.5 w-3.5" /> Staff {GBP.format(p.costs.staff)}
                      </span>
                      <span>Subcontractors {GBP.format(p.costs.subcontractors)}</span>
                      <span>Software {GBP.format(p.costs.software)}</span>
                      <span>Consumables {GBP.format(p.costs.consumables)}</span>
                      <span className="font-semibold text-stone-700">
                        Total {GBP.format(totalCosts(p.costs))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {projects.length > 0 && (
            <div className="rounded-md border border-border bg-card p-6 shadow-sm sm:p-8">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-stone-900">
                  {state.rd.submitted ? "Additional Information Form submitted" : "Ready to submit"}
                </h3>
                <StatusPill
                  status={state.rd.submitted ? "complete" : "draft"}
                  label={state.rd.submitted ? "Submitted" : "Ready to submit"}
                />
              </div>
              <StubAction
                emphasized
                label="Submit Additional Information Form"
                placeholderText="Connect HMRC integration here - this demo does not send a real Additional Information Form."
                onActivated={() =>
                  setState((prev) => ({
                    ...prev,
                    rd: { ...prev.rd, submitted: true, submittedAt: new Date().toISOString() },
                  }))
                }
              />
            </div>
          )}
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
          nextLabel={step === TOTAL_STEPS - 1 ? "Save project" : "Next"}
          stepLabel={["Advance", "Uncertainty", "Work done", "Cost breakdown"][step]}
        >
          {step === 0 && (
            <FormSection
              title="The advance"
              description="What scientific or technological advance were you seeking?"
            >
              <div className="space-y-2">
                <Label htmlFor="projName">Project name *</Label>
                <Input id="projName" value={draft.name} onChange={(e) => update("name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="advance">Advance sought *</Label>
                <Textarea
                  id="advance"
                  rows={4}
                  value={draft.advance}
                  onChange={(e) => update("advance", e.target.value)}
                />
              </div>
            </FormSection>
          )}

          {step === 1 && (
            <FormSection
              title="The uncertainty"
              description="What scientific or technological uncertainty existed, and why couldn't a competent professional readily resolve it?"
            >
              <Textarea
                rows={5}
                value={draft.uncertainty}
                onChange={(e) => update("uncertainty", e.target.value)}
              />
            </FormSection>
          )}

          {step === 2 && (
            <FormSection title="The work done" description="Describe the work carried out to resolve the uncertainty.">
              <Textarea
                rows={5}
                value={draft.workDone}
                onChange={(e) => update("workDone", e.target.value)}
              />
            </FormSection>
          )}

          {step === 3 && (
            <FormSection title="Cost breakdown" description="Enter qualifying costs for this project.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {(
                  [
                    ["staff", "Staff costs (£)"],
                    ["subcontractors", "Subcontractors (£)"],
                    ["software", "Software (£)"],
                    ["consumables", "Consumables (£)"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key}>{label}</Label>
                    <Input
                      id={key}
                      type="number"
                      min={0}
                      value={draft.costs[key]}
                      onChange={(e) =>
                        update("costs", { ...draft.costs, [key]: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="rounded-md bg-forest-50 px-4 py-3 text-sm font-semibold text-forest-700">
                Total qualifying spend: {GBP.format(totalCosts(draft.costs))}
              </div>
            </FormSection>
          )}
        </WizardShell>
      )}
    </div>
  );
}
