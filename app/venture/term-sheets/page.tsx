"use client";

import { useState } from "react";
import { FileText, Plus, Copy, Scale } from "lucide-react";
import { PageHeader } from "@/components/venture/page-header";
import { ModuleIntro } from "@/components/venture/module-intro";
import { WizardShell } from "@/components/venture/wizard-shell";
import { FormSection } from "@/components/venture/form-section";
import { SummaryRow } from "@/components/venture/summary-row";
import { StatusPill } from "@/components/venture/status-pill";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { useVenture, genId } from "@/lib/venture/store";
import { getTermSheetsStatus } from "@/lib/venture/status";
import type { TermSheet } from "@/lib/venture/types";

const TOTAL_STEPS = 2;
const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

const EMPTY_DRAFT = {
  name: "",
  valuation: "",
  roundSize: "",
  liquidationPreference: "1x non-participating",
  proRataRights: true,
  boardSeats: "0",
  vestingSchedule: "4 years, 1 year cliff",
};

export default function TermSheetsPage() {
  const { state, setState } = useVenture();
  const status = getTermSheetsStatus(state);
  const sheets = state.termSheets.sheets;

  const [view, setView] = useState<"intro" | "list" | "wizard" | "compare">("intro");
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const update = <K extends keyof typeof EMPTY_DRAFT>(key: K, value: (typeof EMPTY_DRAFT)[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const canProceed = () => {
    if (step === 0) return draft.name.trim().length > 0 && Number(draft.valuation) > 0 && Number(draft.roundSize) > 0;
    return true;
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
      return;
    }
    const sheet: TermSheet = {
      id: genId("ts"),
      name: draft.name.trim(),
      valuation: Number(draft.valuation),
      roundSize: Number(draft.roundSize),
      liquidationPreference: draft.liquidationPreference,
      proRataRights: draft.proRataRights,
      boardSeats: Number(draft.boardSeats) || 0,
      vestingSchedule: draft.vestingSchedule,
      status: "draft",
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({ ...prev, termSheets: { sheets: [sheet, ...prev.termSheets.sheets] } }));
    setDraft(EMPTY_DRAFT);
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

  const duplicate = (sheet: TermSheet) => {
    const copy: TermSheet = {
      ...sheet,
      id: genId("ts"),
      name: `${sheet.name} (Copy)`,
      status: "draft",
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({ ...prev, termSheets: { sheets: [copy, ...prev.termSheets.sheets] } }));
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const compareSheets = sheets.filter((s) => compareIds.includes(s.id));

  return (
    <div>
      <PageHeader
        title="Term Sheets"
        subtitle="Capture the key terms of an offer and compare two term sheets side by side."
      />

      {view === "intro" && (
        <ModuleIntro
          icon={FileText}
          eyebrow="Fundraising"
          title="Capture and compare term sheets"
          description="Record valuation, round size, liquidation preference, pro-rata rights, board seats and vesting for each offer - then duplicate and compare them side by side before you decide."
          color="#5FA8A0"
          status={status}
          stats={[{ label: "Term sheets", value: String(sheets.length) }]}
          ctaLabel={sheets.length > 0 ? "View term sheets" : "Create your first term sheet"}
          onStart={() => setView("list")}
        />
      )}

      {view === "list" && (
        <div className="space-y-6">
          <div className="rounded-md border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-stone-900">Term sheets</h2>
                <p className="mt-1 text-sm text-stone-500">Select up to two to compare side by side.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {compareIds.length === 2 && (
                  <Button variant="outline" onClick={() => setView("compare")}>
                    <Scale className="mr-1.5 h-4 w-4" /> Compare selected
                  </Button>
                )}
                <Button onClick={() => setView("wizard")}>
                  <Plus className="mr-1.5 h-4 w-4" /> New term sheet
                </Button>
              </div>
            </div>

            {sheets.length === 0 ? (
              <p className="rounded-md border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
                No term sheets yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {sheets.map((s) => (
                  <div key={s.id} className="rounded-md border border-stone-200 bg-stone-50/50 p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={compareIds.includes(s.id)}
                          onCheckedChange={() => toggleCompare(s.id)}
                        />
                        <h3 className="font-semibold text-stone-900">{s.name}</h3>
                      </label>
                      <StatusPill status={s.status} />
                    </div>
                    <SummaryRow label="Valuation" value={GBP.format(s.valuation)} />
                    <SummaryRow label="Round size" value={GBP.format(s.roundSize)} />
                    <SummaryRow label="Liquidation preference" value={s.liquidationPreference} />
                    <SummaryRow label="Pro-rata rights" value={s.proRataRights ? "Yes" : "No"} />
                    <SummaryRow label="Board seats" value={String(s.boardSeats)} />
                    <SummaryRow label="Vesting" value={s.vestingSchedule} />
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => duplicate(s)}
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5" /> Duplicate
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {view === "compare" && compareSheets.length === 2 && (
        <div className="space-y-6">
          <div className="rounded-md border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold tracking-tight text-stone-900">Comparing term sheets</h2>
              <Button variant="outline" onClick={() => setView("list")}>
                Back to list
              </Button>
            </div>
            <div className="overflow-x-auto rounded-md border border-stone-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Term</th>
                    {compareSheets.map((s) => (
                      <th key={s.id} className="px-4 py-3 font-semibold text-stone-900">
                        {s.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Valuation", render: (s: TermSheet) => GBP.format(s.valuation) },
                    { label: "Round size", render: (s: TermSheet) => GBP.format(s.roundSize) },
                    { label: "Liquidation preference", render: (s: TermSheet) => s.liquidationPreference },
                    { label: "Pro-rata rights", render: (s: TermSheet) => (s.proRataRights ? "Yes" : "No") },
                    { label: "Board seats", render: (s: TermSheet) => String(s.boardSeats) },
                    { label: "Vesting schedule", render: (s: TermSheet) => s.vestingSchedule },
                    { label: "Status", render: (s: TermSheet) => s.status },
                  ].map((row) => (
                    <tr key={row.label} className="border-t border-stone-100">
                      <td className="px-4 py-3 font-medium text-stone-500">{row.label}</td>
                      {compareSheets.map((s) => (
                        <td key={s.id} className="px-4 py-3 font-semibold text-stone-900">
                          {row.render(s)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
          nextLabel={step === TOTAL_STEPS - 1 ? "Save term sheet" : "Next"}
          stepLabel={["Deal economics", "Governance & vesting"][step]}
        >
          {step === 0 && (
            <FormSection title="Deal economics">
              <div className="space-y-2">
                <Label htmlFor="tsName">Label / investor name *</Label>
                <Input id="tsName" value={draft.name} onChange={(e) => update("name", e.target.value)} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="valuation">Pre-money valuation (£) *</Label>
                  <Input
                    id="valuation"
                    type="number"
                    min={0}
                    value={draft.valuation}
                    onChange={(e) => update("valuation", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roundSize">Round size (£) *</Label>
                  <Input
                    id="roundSize"
                    type="number"
                    min={0}
                    value={draft.roundSize}
                    onChange={(e) => update("roundSize", e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="liqPref">Liquidation preference</Label>
                <Input
                  id="liqPref"
                  value={draft.liquidationPreference}
                  onChange={(e) => update("liquidationPreference", e.target.value)}
                />
              </div>
            </FormSection>
          )}

          {step === 1 && (
            <FormSection title="Governance & vesting">
              <div className="space-y-2">
                <Label>Pro-rata rights</Label>
                <RadioGroup
                  value={draft.proRataRights ? "yes" : "no"}
                  onValueChange={(v) => update("proRataRights", v === "yes")}
                  className="grid grid-cols-2 gap-3"
                >
                  {["yes", "no"].map((v) => (
                    <label
                      key={v}
                      className="flex cursor-pointer items-center gap-3 rounded-md border border-stone-200 bg-card p-4 text-sm capitalize text-stone-700 transition-colors hover:border-forest-300"
                    >
                      <RadioGroupItem value={v} id={`pr-${v}`} />
                      {v}
                    </label>
                  ))}
                </RadioGroup>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="boardSeats">Board seats</Label>
                  <Input
                    id="boardSeats"
                    type="number"
                    min={0}
                    value={draft.boardSeats}
                    onChange={(e) => update("boardSeats", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vesting">Vesting schedule</Label>
                  <Input
                    id="vesting"
                    value={draft.vestingSchedule}
                    onChange={(e) => update("vestingSchedule", e.target.value)}
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
