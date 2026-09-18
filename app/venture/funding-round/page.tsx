"use client";

import { useState } from "react";
import { TrendingUp, Plus, FileCheck } from "lucide-react";
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
import GradientButton from "@/components/kokonutui/gradient-button";
import { useVenture, genId } from "@/lib/venture/store";
import { getFundingRoundsStatus } from "@/lib/venture/status";
import type { FundingRound } from "@/lib/venture/types";

const TOTAL_STEPS = 2;
const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

const DOCUMENTS = [
  "Subscription and Shareholders' Agreement",
  "Updated Articles of Association",
  "Board resolutions",
];

const EMPTY_DRAFT = {
  name: "",
  termSheetId: "",
  amountRaised: "",
  preMoneyValuation: "",
};

export default function FundingRoundPage() {
  const { state, setState } = useVenture();
  const status = getFundingRoundsStatus(state);
  const rounds = state.fundingRounds.rounds;
  const acceptedOrAnySheets = state.termSheets.sheets;

  const [view, setView] = useState<"intro" | "list" | "wizard" | "summary">("intro");
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);

  const update = <K extends keyof typeof EMPTY_DRAFT>(key: K, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const applyTermSheet = (id: string) => {
    const sheet = acceptedOrAnySheets.find((s) => s.id === id);
    setDraft((prev) => ({
      ...prev,
      termSheetId: id,
      name: sheet ? `${sheet.name} - Priced Round` : prev.name,
      amountRaised: sheet ? String(sheet.roundSize) : prev.amountRaised,
      preMoneyValuation: sheet ? String(sheet.valuation) : prev.preMoneyValuation,
    }));
  };

  const startFresh = () => {
    setDraft({ ...EMPTY_DRAFT });
  };

  const canProceed = () => {
    if (step === 0) return draft.name.trim().length > 0;
    return Number(draft.amountRaised) > 0 && Number(draft.preMoneyValuation) > 0;
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
      return;
    }
    const round: FundingRound = {
      id: genId("round"),
      name: draft.name.trim(),
      termSheetId: draft.termSheetId || null,
      amountRaised: Number(draft.amountRaised),
      preMoneyValuation: Number(draft.preMoneyValuation),
      status: "draft",
      documentsGenerated: [],
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({ ...prev, fundingRounds: { rounds: [round, ...prev.fundingRounds.rounds] } }));
    setActiveRoundId(round.id);
    setDraft(EMPTY_DRAFT);
    setStep(0);
    setView("summary");
  };

  const handleBack = () => {
    if (step === 0) {
      setView("list");
      return;
    }
    setStep((s) => s - 1);
  };

  const activeRound = rounds.find((r) => r.id === activeRoundId) ?? null;

  const generateDocument = (doc: string) => {
    if (!activeRoundId) return;
    setState((prev) => ({
      ...prev,
      fundingRounds: {
        rounds: prev.fundingRounds.rounds.map((r) =>
          r.id === activeRoundId
            ? {
                ...r,
                status: "documents_generated",
                documentsGenerated: r.documentsGenerated.includes(doc)
                  ? r.documentsGenerated
                  : [...r.documentsGenerated, doc],
              }
            : r
        ),
      },
    }));
  };

  const applyToCapTable = () => {
    if (!activeRound) return;
    const existingTotal = state.capTable.shareholders.reduce((s, sh) => s + sh.shares, 0);
    const pricePerShare = existingTotal > 0 ? activeRound.preMoneyValuation / existingTotal : 1;
    const newShares = Math.round(activeRound.amountRaised / pricePerShare);

    setState((prev) => ({
      ...prev,
      capTable: {
        ...prev.capTable,
        shareholders: [
          ...prev.capTable.shareholders,
          {
            id: genId("sh"),
            name: `${activeRound.name} investor(s)`,
            shareClass: "Ordinary A",
            shares: newShares,
          },
        ],
        events: [
          {
            id: genId("ev"),
            type: "issue",
            date: new Date().toISOString(),
            description: `${newShares.toLocaleString()} shares issued to new investor(s) as part of "${activeRound.name}" (${GBP.format(
              activeRound.amountRaised
            )} raised).`,
          },
          ...prev.capTable.events,
        ],
      },
      fundingRounds: {
        rounds: prev.fundingRounds.rounds.map((r) =>
          r.id === activeRound.id ? { ...r, status: "applied_to_cap_table" } : r
        ),
      },
    }));
  };

  return (
    <div>
      <PageHeader
        title="Priced Funding Rounds"
        subtitle="Pull in an accepted term sheet or start fresh, walk through the round details, and generate closing documents."
      />

      {view === "intro" && (
        <ModuleIntro
          icon={TrendingUp}
          eyebrow="Fundraising"
          title="Run a priced funding round"
          description="Turn a term sheet into a closed round: confirm the amount raised and valuation, generate the standard closing documents, then apply the round to your cap table."
          color="#4F677A"
          status={status}
          stats={[{ label: "Rounds", value: String(rounds.length) }]}
          ctaLabel={rounds.length > 0 ? "View rounds" : "Start a round"}
          onStart={() => setView("list")}
        />
      )}

      {view === "list" && (
        <div className="space-y-6">
          <div className="rounded-md border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold tracking-tight text-stone-900">Funding rounds</h2>
              <Button
                onClick={() => {
                  startFresh();
                  setView("wizard");
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" /> New round
              </Button>
            </div>

            {rounds.length === 0 ? (
              <p className="rounded-md border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
                No rounds started yet.
              </p>
            ) : (
              <div className="space-y-4">
                {rounds.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setActiveRoundId(r.id);
                      setView("summary");
                    }}
                    className="flex w-full flex-wrap items-center justify-between gap-3 rounded-md border border-stone-200 bg-stone-50/50 p-5 text-left transition-colors hover:border-forest-300"
                  >
                    <div>
                      <h3 className="font-semibold text-stone-900">{r.name}</h3>
                      <p className="text-sm text-stone-500">
                        {GBP.format(r.amountRaised)} raised at {GBP.format(r.preMoneyValuation)} pre-money
                      </p>
                    </div>
                    <StatusPill status={r.status} />
                  </button>
                ))}
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
          nextLabel={step === TOTAL_STEPS - 1 ? "Create round" : "Next"}
          stepLabel={["Source", "Round details"][step]}
        >
          {step === 0 && (
            <FormSection
              title="Where is this round coming from?"
              description="Pull in an accepted term sheet to prefill the details, or start fresh."
            >
              {acceptedOrAnySheets.length > 0 && (
                <div className="space-y-2">
                  <Label>Use a term sheet</Label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {acceptedOrAnySheets.map((s) => (
                      <label
                        key={s.id}
                        className={`flex cursor-pointer flex-col gap-1 rounded-md border p-4 text-sm transition-colors ${
                          draft.termSheetId === s.id
                            ? "border-forest-400 bg-forest-50/60"
                            : "border-stone-200 bg-card hover:border-forest-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="termSheetSource"
                          className="sr-only"
                          checked={draft.termSheetId === s.id}
                          onChange={() => applyTermSheet(s.id)}
                        />
                        <span className="font-semibold text-stone-900">{s.name}</span>
                        <span className="text-stone-500">
                          {GBP.format(s.roundSize)} at {GBP.format(s.valuation)} pre-money
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={startFresh}>
                  Start fresh instead
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="roundName">Round name *</Label>
                <Input id="roundName" value={draft.name} onChange={(e) => update("name", e.target.value)} />
              </div>
            </FormSection>
          )}

          {step === 1 && (
            <FormSection title="Round details">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amountRaised">Amount raised (£) *</Label>
                  <Input
                    id="amountRaised"
                    type="number"
                    min={0}
                    value={draft.amountRaised}
                    onChange={(e) => update("amountRaised", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preMoney">Pre-money valuation (£) *</Label>
                  <Input
                    id="preMoney"
                    type="number"
                    min={0}
                    value={draft.preMoneyValuation}
                    onChange={(e) => update("preMoneyValuation", e.target.value)}
                  />
                </div>
              </div>
              {Number(draft.amountRaised) > 0 && Number(draft.preMoneyValuation) > 0 && (
                <div className="rounded-md bg-forest-50 px-4 py-3 text-sm font-semibold text-forest-700">
                  Post-money valuation:{" "}
                  {GBP.format(Number(draft.amountRaised) + Number(draft.preMoneyValuation))}
                </div>
              )}
            </FormSection>
          )}
        </WizardShell>
      )}

      {view === "summary" && activeRound && (
        <div className="space-y-6">
          <div className="rounded-md border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-stone-900">{activeRound.name}</h2>
                <p className="mt-1 text-sm text-stone-500">Round summary</p>
              </div>
              <StatusPill status={activeRound.status} />
            </div>
            <div className="rounded-md border border-stone-200 bg-stone-50/50 p-6">
              <SummaryRow label="Amount raised" value={GBP.format(activeRound.amountRaised)} />
              <SummaryRow label="Pre-money valuation" value={GBP.format(activeRound.preMoneyValuation)} />
              <SummaryRow
                label="Post-money valuation"
                value={GBP.format(activeRound.amountRaised + activeRound.preMoneyValuation)}
              />
            </div>
          </div>

          <div className="rounded-md border border-border bg-card p-6 shadow-sm sm:p-8">
            <h3 className="mb-4 text-lg font-semibold text-stone-900">Closing documents</h3>
            <div className="space-y-3">
              {DOCUMENTS.map((doc) => {
                const generated = activeRound.documentsGenerated.includes(doc);
                return (
                  <div
                    key={doc}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-stone-200 bg-stone-50/50 p-4"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-stone-800">
                      <FileCheck className={`h-4 w-4 ${generated ? "text-forest-600" : "text-stone-400"}`} />
                      {doc}
                    </span>
                    <StubAction
                      label={generated ? "Regenerate" : "Generate"}
                      variant={generated ? "outline" : "default"}
                      placeholderText="Connect a document-generation / e-signature integration here - this demo does not produce a real document."
                      onActivated={() => generateDocument(doc)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-md border border-border bg-card p-6 shadow-sm sm:p-8">
            <h3 className="mb-2 text-lg font-semibold text-stone-900">Apply to cap table</h3>
            <p className="mb-4 text-sm text-stone-500">
              This will issue new shares to reflect this round and update ownership percentages.
            </p>
            {activeRound.status === "applied_to_cap_table" ? (
              <StatusPill status="applied_to_cap_table" />
            ) : (
              <GradientButton type="button" variant="emerald" onClick={applyToCapTable}>
                Apply round to cap table
              </GradientButton>
            )}
          </div>

          <Button variant="outline" onClick={() => setView("list")}>
            Back to rounds
          </Button>
        </div>
      )}
    </div>
  );
}
