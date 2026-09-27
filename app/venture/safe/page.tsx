"use client";

import { useMemo, useState } from "react";
import {
  FileSignature,
  Plus,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  UserPlus,
} from "lucide-react";
import { ModuleIntro } from "@/components/venture/module-intro";
import { FormSection, FormSubGroup } from "@/components/venture/form-section";
import { SummaryRow } from "@/components/venture/summary-row";
import { StubAction } from "@/components/venture/stub-action";
import { StatusPill } from "@/components/venture/status-pill";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Expandable } from "@/components/ui/expandable";
import GradientButton from "@/components/kokonutui/gradient-button";
import {
  effectiveEconomicTerms,
  FEA_OVERRIDABLE_TERM_KEYS,
  formatGbpFromPence,
  poundsToPence,
  penceToPounds,
  type ConsiderationType,
  type FeaCompany,
  type FeaEconomicTermOverrides,
  type FeaEconomicTerms,
  type FeaInvestor,
  type FeaInvestorType,
  type FeaLongstop,
  type FeaRaise,
} from "@/lib/fea";
import { useVenture, genId } from "@/lib/venture/store";
import { getSafeStatus } from "@/lib/venture/status";
import { cn } from "@/lib/utils";

function formatThousands(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-GB");
}

function parseThousands(formatted: string): string {
  return formatted.replace(/,/g, "");
}

function penceToThousandsInput(pence: number | null | undefined): string {
  if (pence == null || pence <= 0) return "";
  return String(Math.round(penceToPounds(pence)));
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function formatLongstop(longstop: FeaLongstop): string {
  if (longstop.type === "FIXED_DATE") {
    return longstop.date ? new Date(longstop.date).toLocaleDateString("en-GB") : "-";
  }
  return `${longstop.months} months from agreement`;
}

function longstopEqual(a: FeaLongstop, b: FeaLongstop): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "FIXED_DATE" && b.type === "FIXED_DATE") return a.date === b.date;
  if (a.type === "MONTHS_FROM_AGREEMENT" && b.type === "MONTHS_FROM_AGREEMENT") {
    return a.months === b.months;
  }
  return false;
}

const EMPTY_COMPANY = {
  legalName: "MoonShot AI Ltd",
  shortName: "MoonShot AI",
  jurisdiction: "England and Wales",
  registeredNumber: "14827391",
  registeredOffice: "71-75 Shelton Street, London WC2H 9JQ",
  signatoryName: "",
  signatoryTitle: "Director",
  bankAccountName: "",
  bankSortCode: "",
  bankAccountNumber: "",
  bankIban: "",
  bankSwift: "",
};

const EMPTY_DEFAULT_TERMS = {
  discountPercent: "20",
  valuationCap: "",
  qualifyingRoundThreshold: "500000",
  longstopType: "FIXED_DATE" as "FIXED_DATE" | "MONTHS_FROM_AGREEMENT",
  longstopDate: "",
  longstopMonths: "6",
  conversionShareClass: "Ordinary Shares",
};

const EMPTY_INVESTOR = {
  type: "COMPANY" as FeaInvestorType,
  name: "",
  address: "",
  email: "",
  investmentAmount: "",
  considerationType: "CASH" as ConsiderationType,
  signatoryName: "",
  signatoryTitle: "",
  investorSignedAt: "",
  companySignedAt: "",
};

type CompanyDraft = typeof EMPTY_COMPANY;
type DefaultTermsDraft = typeof EMPTY_DEFAULT_TERMS;
type InvestorDraft = typeof EMPTY_INVESTOR;

function companyFromRaise(raise: FeaRaise): CompanyDraft {
  return {
    legalName: raise.company.legalName,
    shortName: raise.company.shortName,
    jurisdiction: raise.company.jurisdiction,
    registeredNumber: raise.company.registeredNumber,
    registeredOffice: raise.company.registeredOffice,
    signatoryName: raise.company.signatory.name,
    signatoryTitle: raise.company.signatory.title,
    bankAccountName: raise.company.bankDetails.accountName,
    bankSortCode: raise.company.bankDetails.sortCode,
    bankAccountNumber: raise.company.bankDetails.accountNumber,
    bankIban: raise.company.bankDetails.iban,
    bankSwift: raise.company.bankDetails.swift,
  };
}

function defaultTermsFromRaise(terms: FeaEconomicTerms): DefaultTermsDraft {
  return {
    discountPercent: String(terms.discountPercent ?? ""),
    valuationCap: penceToThousandsInput(terms.valuationCap),
    qualifyingRoundThreshold: penceToThousandsInput(terms.qualifyingRoundThreshold),
    longstopType: terms.longstop.type,
    longstopDate:
      terms.longstop.type === "FIXED_DATE" ? terms.longstop.date : "",
    longstopMonths:
      terms.longstop.type === "MONTHS_FROM_AGREEMENT"
        ? String(terms.longstop.months)
        : "6",
    conversionShareClass: terms.conversionShareClass,
  };
}

function parseCompanyDraft(draft: CompanyDraft): FeaCompany {
  return {
    legalName: draft.legalName.trim(),
    shortName: draft.shortName.trim() || draft.legalName.trim(),
    jurisdiction: draft.jurisdiction.trim(),
    registeredNumber: draft.registeredNumber.trim(),
    registeredOffice: draft.registeredOffice.trim(),
    signatory: {
      name: draft.signatoryName.trim(),
      title: draft.signatoryTitle.trim(),
    },
    bankDetails: {
      accountName: draft.bankAccountName.trim(),
      sortCode: draft.bankSortCode.trim(),
      accountNumber: draft.bankAccountNumber.trim(),
      iban: draft.bankIban.trim(),
      swift: draft.bankSwift.trim(),
    },
  };
}

function parseDefaultTermsDraft(draft: DefaultTermsDraft): FeaEconomicTerms {
  const valuationCapPence = draft.valuationCap
    ? poundsToPence(Number(draft.valuationCap))
    : null;
  const longstop: FeaLongstop =
    draft.longstopType === "FIXED_DATE"
      ? { type: "FIXED_DATE", date: draft.longstopDate }
      : {
          type: "MONTHS_FROM_AGREEMENT",
          months: Number(draft.longstopMonths) || 6,
        };

  return {
    valuationMechanism: "DISCOUNT_AND_CAP",
    discountPercent: Number(draft.discountPercent),
    valuationCap: valuationCapPence,
    fixedValuation: null,
    longstopValuation: valuationCapPence,
    qualifyingRoundThreshold: poundsToPence(Number(draft.qualifyingRoundThreshold)),
    longstop,
    conversionShareClass: draft.conversionShareClass.trim(),
    fullyDilutedIncludesOptionPool: true,
    nomineeConversionEnabled: false,
  };
}

function economicTermsEqual(a: FeaEconomicTerms, b: FeaEconomicTerms): boolean {
  for (const key of FEA_OVERRIDABLE_TERM_KEYS) {
    if (key === "longstop") {
      if (!longstopEqual(a.longstop, b.longstop)) return false;
      continue;
    }
    if (a[key] !== b[key]) return false;
  }
  return true;
}

function buildEconomicOverrides(
  defaults: FeaEconomicTerms,
  next: FeaEconomicTerms
): FeaEconomicTermOverrides | null {
  const overrides: FeaEconomicTermOverrides = {};
  for (const key of FEA_OVERRIDABLE_TERM_KEYS) {
    if (key === "longstop") {
      if (!longstopEqual(defaults.longstop, next.longstop)) {
        overrides.longstop = next.longstop;
      }
      continue;
    }
    if (defaults[key] !== next[key]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (overrides as any)[key] = next[key];
    }
  }
  return Object.keys(overrides).length > 0 ? overrides : null;
}

function raiseTotal(raise: FeaRaise): number {
  return raise.investors
    .filter(
      (i) =>
        i.registerStatus === "outstanding" ||
        i.registerStatus === "converted" ||
        i.registerStatus === "complete"
    )
    .reduce((sum, i) => sum + i.investmentAmount, 0);
}

/** Single lifecycle status for the register (merges register + signature). */
function investorLifecycleStatus(investor: FeaInvestor): string {
  if (investor.registerStatus === "cancelled") return "cancelled";
  if (investor.registerStatus === "converted") return "converted";
  if (investor.registerStatus === "complete") return "complete";
  if (investor.signatureStatus === "signed") return "outstanding";
  if (investor.signatureStatus === "sent") return "sent";
  return "draft";
}

export default function SafePage() {
  const { state, setState } = useVenture();
  const status = getSafeStatus(state);
  const raises = state.safe.raises;
  const allInvestors = raises.flatMap((r) => r.investors);

  const totalOutstanding = allInvestors
    .filter(
      (i) => i.registerStatus === "outstanding" || i.registerStatus === "complete"
    )
    .reduce((sum, i) => sum + i.investmentAmount, 0);
  const totalConverted = allInvestors
    .filter((i) => i.registerStatus === "converted")
    .reduce((sum, i) => sum + i.investmentAmount, 0);

  const [view, setView] = useState<"list" | "form" | "preview">("list");
  const [mode, setMode] = useState<"new-raise" | "add-investor">("new-raise");
  const [targetRaiseId, setTargetRaiseId] = useState<string | null>(null);
  const [companyDraft, setCompanyDraft] = useState(EMPTY_COMPANY);
  const [termsDraft, setTermsDraft] = useState(EMPTY_DEFAULT_TERMS);
  const [investorDraft, setInvestorDraft] = useState(EMPTY_INVESTOR);
  const [raiseName, setRaiseName] = useState("");
  const [editingRaiseTerms, setEditingRaiseTerms] = useState(true);
  const [createdIds, setCreatedIds] = useState<{
    raiseId: string;
    investorId: string;
  } | null>(null);
  const [expandedRaiseId, setExpandedRaiseId] = useState<string | null>(
    raises[0]?.id ?? null
  );
  const [scopeDialog, setScopeDialog] = useState<{
    nextDefaultTerms: FeaEconomicTerms;
    nextCompany: FeaCompany;
    investor: FeaInvestor;
  } | null>(null);

  const targetRaise = targetRaiseId
    ? raises.find((r) => r.id === targetRaiseId) ?? null
    : null;

  const updateCompany = <K extends keyof CompanyDraft>(key: K, value: string) => {
    setCompanyDraft((prev) => ({ ...prev, [key]: value }));
  };

  const updateTerms = <K extends keyof DefaultTermsDraft>(key: K, value: string) => {
    setTermsDraft((prev) => ({ ...prev, [key]: value }));
  };

  const updateInvestor = <K extends keyof InvestorDraft>(key: K, value: string) => {
    setInvestorDraft((prev) => ({ ...prev, [key]: value }));
  };

  const illustrativePreMoney = useMemo(() => {
    const capPence = termsDraft.valuationCap
      ? poundsToPence(Number(termsDraft.valuationCap))
      : 0;
    const discount = Number(termsDraft.discountPercent);
    if (!(capPence > 0) || !(discount >= 0) || discount >= 100) return null;
    return penceToPounds(capPence) / (1 - discount / 100);
  }, [termsDraft.valuationCap, termsDraft.discountPercent]);

  const canSubmitTerms =
    companyDraft.legalName.trim().length > 0 &&
    companyDraft.registeredNumber.trim().length > 0 &&
    companyDraft.registeredOffice.trim().length > 0 &&
    companyDraft.jurisdiction.trim().length > 0 &&
    Number(termsDraft.qualifyingRoundThreshold) > 0 &&
    Number(termsDraft.discountPercent) >= 0 &&
    termsDraft.conversionShareClass.trim().length > 0 &&
    (termsDraft.longstopType === "FIXED_DATE"
      ? termsDraft.longstopDate.length > 0
      : Number(termsDraft.longstopMonths) > 0);

  const canSubmitInvestor =
    investorDraft.name.trim().length > 0 &&
    investorDraft.address.trim().length > 0 &&
    Number(investorDraft.investmentAmount) > 0 &&
    companyDraft.signatoryName.trim().length > 0 &&
    companyDraft.signatoryTitle.trim().length > 0 &&
    investorDraft.signatoryName.trim().length > 0 &&
    investorDraft.signatoryTitle.trim().length > 0;

  const canSubmit = canSubmitTerms && canSubmitInvestor;

  const buildInvestorPayload = (): FeaInvestor => ({
    id: genId("inv"),
    type: investorDraft.type,
    name: investorDraft.name.trim(),
    address: investorDraft.address.trim(),
    email: investorDraft.email.trim(),
    investmentAmount: poundsToPence(Number(investorDraft.investmentAmount)),
    consideration: { type: investorDraft.considerationType },
    overrides: null,
    customTerms: [],
    signatures: {
      investorSignedAt: investorDraft.investorSignedAt || null,
      companySignedAt: investorDraft.companySignedAt || null,
    },
    signatory: {
      name: investorDraft.signatoryName.trim(),
      title: investorDraft.signatoryTitle.trim(),
    },
    registerStatus: "draft",
    signatureStatus: "not_sent",
    createdAt: new Date().toISOString(),
  });

  const persistNewRaise = (
    company: FeaCompany,
    defaultTerms: FeaEconomicTerms,
    investor: FeaInvestor
  ) => {
    const raise: FeaRaise = {
      id: genId("raise"),
      name: raiseName.trim() || `Raise ${raises.length + 1}`,
      instrumentName: "Future Equity Agreement",
      currency: "GBP",
      paymentDeadlineBusinessDays: 5,
      includeInvestorStatusClause: true,
      mostFavouredNation: false,
      taxRelief: { enabled: false },
      company,
      defaultTerms,
      investors: [investor],
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      safe: { ...prev.safe, raises: [raise, ...prev.safe.raises] },
    }));
    setCreatedIds({ raiseId: raise.id, investorId: investor.id });
    setExpandedRaiseId(raise.id);
    setView("preview");
  };

  const persistAddInvestor = (
    raiseId: string,
    investor: FeaInvestor,
    nextDefaultTerms: FeaEconomicTerms,
    nextCompany: FeaCompany,
    scope: "this" | "all" | "unchanged"
  ) => {
    setState((prev) => ({
      ...prev,
      safe: {
        ...prev.safe,
        raises: prev.safe.raises.map((raise) => {
          if (raise.id !== raiseId) return raise;

          const base = { ...raise, company: nextCompany };

          if (scope === "unchanged") {
            return { ...base, investors: [...raise.investors, investor] };
          }

          if (scope === "all") {
            return {
              ...base,
              defaultTerms: nextDefaultTerms,
              investors: [
                ...raise.investors.map((i) => ({ ...i, overrides: null })),
                investor,
              ],
            };
          }

          const overrides = buildEconomicOverrides(raise.defaultTerms, nextDefaultTerms);
          return {
            ...base,
            investors: [
              ...raise.investors,
              { ...investor, overrides },
            ],
          };
        }),
      },
    }));
    setCreatedIds({ raiseId, investorId: investor.id });
    setExpandedRaiseId(raiseId);
    setView("preview");
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const nextCompany = parseCompanyDraft(companyDraft);
    const nextDefaultTerms = parseDefaultTermsDraft(termsDraft);
    const investor = buildInvestorPayload();

    if (mode === "new-raise") {
      persistNewRaise(nextCompany, nextDefaultTerms, investor);
      return;
    }

    if (!targetRaise) return;

    const termsChanged = !economicTermsEqual(targetRaise.defaultTerms, nextDefaultTerms);
    if (termsChanged && targetRaise.investors.length > 0) {
      setScopeDialog({ nextDefaultTerms, nextCompany, investor });
      return;
    }

    persistAddInvestor(targetRaise.id, investor, nextDefaultTerms, nextCompany, "unchanged");
  };

  const startNewRaise = () => {
    setMode("new-raise");
    setTargetRaiseId(null);
    setCompanyDraft(EMPTY_COMPANY);
    setTermsDraft(EMPTY_DEFAULT_TERMS);
    setInvestorDraft(EMPTY_INVESTOR);
    setRaiseName("");
    setEditingRaiseTerms(true);
    setCreatedIds(null);
    setScopeDialog(null);
    setView("form");
  };

  const startAddInvestor = (raise: FeaRaise) => {
    setMode("add-investor");
    setTargetRaiseId(raise.id);
    setCompanyDraft(companyFromRaise(raise));
    setTermsDraft(defaultTermsFromRaise(raise.defaultTerms));
    setInvestorDraft({
      ...EMPTY_INVESTOR,
      companySignedAt: "",
    });
    setRaiseName(raise.name);
    setEditingRaiseTerms(false);
    setCreatedIds(null);
    setScopeDialog(null);
    setView("form");
  };

  const formatDate = (value: string | null | undefined) =>
    value ? new Date(value).toLocaleDateString("en-GB") : "-";

  return (
    <div>
      {view === "list" && (
        <div className="space-y-6">
          <ModuleIntro
            icon={FileSignature}
            eyebrow="Future equity"
            title="Future Equity Agreements"
            description="Create a Future Equity Agreement in minutes, then track every instrument you've issued - outstanding or converted - in one register."
            color="#D2795A"
            status={status}
            visual={
              <p className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                <span>{raises.length}</span>{" "}
                <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                  raises
                </span>
                <span className="mx-4 font-normal text-stone-300">·</span>
                <span>{formatGbpFromPence(totalOutstanding)}</span>{" "}
                <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                  outstanding
                </span>
                <span className="mx-4 font-normal text-stone-300">·</span>
                <span>{formatGbpFromPence(totalConverted)}</span>{" "}
                <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                  converted
                </span>
              </p>
            }
            hideStatus
          />

          <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-stone-900">
                  Raise register
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  {formatGbpFromPence(totalOutstanding)} outstanding across {raises.length}{" "}
                  raise{raises.length === 1 ? "" : "s"} · {allInvestors.length} investor
                  {allInvestors.length === 1 ? "" : "s"}
                </p>
              </div>
              <Button size="default" className="w-48 rounded-md" onClick={startNewRaise}>
                <Plus className="mr-1.5 h-4 w-4" /> New raise
              </Button>
            </div>

            {raises.length === 0 ? (
              <p className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
                No raises yet. Create your first Future Equity Agreement to start one.
              </p>
            ) : (
              <div className="space-y-3">
                {raises.map((raise) => {
                  const expanded = expandedRaiseId === raise.id;
                  const total = raiseTotal(raise);
                  const cap = raise.defaultTerms.valuationCap;
                  return (
                    <div
                      key={raise.id}
                      className="overflow-hidden rounded-lg border border-stone-200"
                    >
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 bg-stone-50/80 px-4 py-3 text-left transition-colors hover:bg-stone-50"
                        onClick={() =>
                          setExpandedRaiseId(expanded ? null : raise.id)
                        }
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-stone-400 transition-transform",
                            expanded && "rotate-180"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="font-semibold text-stone-900">
                              {raise.name}
                            </span>
                            <span className="text-xs text-stone-500">
                              {raise.investors.length} investor
                              {raise.investors.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-stone-500">
                            Cap{" "}
                            {cap != null && cap > 0
                              ? formatGbpFromPence(cap)
                              : "—"}{" "}
                            · {raise.defaultTerms.discountPercent ?? 0}% discount ·
                            Longstop {formatLongstop(raise.defaultTerms.longstop)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-semibold tabular-nums text-stone-900">
                            {formatGbpFromPence(total)}
                          </div>
                          <div className="text-xs uppercase tracking-wide text-stone-400">
                            Total raised
                          </div>
                        </div>
                      </button>

                      <Expandable show={expanded} contentKey={`raise-${raise.id}`}>
                        <div className="border-t border-stone-200 bg-card">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-stone-50/50 text-xs uppercase tracking-wide text-stone-500">
                                <tr>
                                  <th className="px-4 py-2.5 font-semibold">Investor</th>
                                  <th className="px-4 py-2.5 font-semibold text-right">
                                    Amount
                                  </th>
                                  <th className="px-4 py-2.5 font-semibold">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {raise.investors.map((inv) => {
                                  const terms = effectiveEconomicTerms(raise, inv);
                                  const hasOverrides =
                                    inv.overrides &&
                                    Object.keys(inv.overrides).length > 0;
                                  return (
                                    <tr
                                      key={inv.id}
                                      className="border-t border-stone-100"
                                    >
                                      <td className="px-4 py-3">
                                        <div className="font-medium text-stone-900">
                                          {inv.name}
                                        </div>
                                        {hasOverrides && (
                                          <div className="mt-0.5 text-xs text-amber-700">
                                            Custom terms (cap{" "}
                                            {terms.valuationCap != null && terms.valuationCap > 0
                                              ? formatGbpFromPence(terms.valuationCap)
                                              : "—"}
                                            , {terms.discountPercent ?? 0}% discount)
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-right tabular-nums text-stone-600">
                                        {formatGbpFromPence(inv.investmentAmount)}
                                      </td>
                                      <td className="px-4 py-3">
                                        <StatusPill
                                          status={investorLifecycleStatus(inv)}
                                        />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 px-4 py-3">
                            <p className="text-xs text-stone-500">
                              Shared raise terms apply to new investors unless you choose
                              otherwise.
                            </p>
                            <Button
                              size="sm"
                              className="rounded-md"
                              onClick={() => startAddInvestor(raise)}
                            >
                              <UserPlus className="mr-1.5 h-4 w-4" />
                              Add another investor
                            </Button>
                          </div>
                        </div>
                      </Expandable>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {view === "form" && (
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
          {mode === "add-investor" && targetRaise && (
            <div className="mb-6 rounded-lg border border-forest-200 bg-forest-50 px-4 py-3 text-sm text-forest-800">
              Adding an investor to{" "}
              <span className="font-semibold">{targetRaise.name}</span>. Raise terms are
              pre-filled — you only need investor-specific details.
            </div>
          )}

          <div className="space-y-10">
            {mode === "new-raise" && (
              <div className="max-w-md space-y-2">
                <Label htmlFor="raiseName">Raise name</Label>
                <Input
                  id="raiseName"
                  placeholder={`Raise ${raises.length + 1}`}
                  value={raiseName}
                  onChange={(e) => setRaiseName(e.target.value)}
                />
              </div>
            )}

            <FormSection
              step={1}
              title="Investor"
              description="Agreement-specific details for this subscriber."
            >
              <FormSubGroup label="Subscriber">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="investorType">Subscriber type</Label>
                    <select
                      id="investorType"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={investorDraft.type}
                      onChange={(e) =>
                        updateInvestor("type", e.target.value as FeaInvestorType)
                      }
                    >
                      <option value="COMPANY">Company</option>
                      <option value="INDIVIDUAL">Individual</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="considerationType">Consideration</Label>
                    <select
                      id="considerationType"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={investorDraft.considerationType}
                      onChange={(e) =>
                        updateInvestor(
                          "considerationType",
                          e.target.value as ConsiderationType
                        )
                      }
                    >
                      <option value="CASH">Cash</option>
                      <option value="SERVICES_IN_LIEU">Services in lieu</option>
                      <option value="SALARY_SACRIFICE">Salary sacrifice</option>
                    </select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="investorName">Subscriber name *</Label>
                    <Input
                      id="investorName"
                      placeholder="Individual or company name"
                      value={investorDraft.name}
                      onChange={(e) => updateInvestor("name", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="investorAddress">Registered office / address *</Label>
                    <Textarea
                      id="investorAddress"
                      rows={2}
                      value={investorDraft.address}
                      onChange={(e) => updateInvestor("address", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="investorEmail">Email</Label>
                    <Input
                      id="investorEmail"
                      type="email"
                      value={investorDraft.email}
                      onChange={(e) => updateInvestor("email", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="investmentAmount">Investment amount (£) *</Label>
                    <Input
                      id="investmentAmount"
                      inputMode="numeric"
                      className="text-left"
                      value={formatThousands(investorDraft.investmentAmount)}
                      onChange={(e) =>
                        updateInvestor(
                          "investmentAmount",
                          parseThousands(e.target.value)
                        )
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
              </FormSubGroup>
            </FormSection>

            <div className="border-t border-stone-200 pt-10">
              <FormSection
                step={2}
                title="Raise terms"
                description={
                  mode === "add-investor"
                    ? "Shared across every investor in this raise. Edit only if this investor needs different terms."
                    : "Company details, economics and bank details shared by every investor in this raise."
                }
              >
                {mode === "add-investor" && !editingRaiseTerms ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-stone-200 bg-stone-50/60 p-4">
                      <SummaryRow
                        label="Company"
                        value={`${companyDraft.legalName} (${companyDraft.registeredNumber})`}
                      />
                      <SummaryRow
                        label="Valuation cap"
                        value={
                          termsDraft.valuationCap
                            ? formatGbpFromPence(
                                poundsToPence(Number(termsDraft.valuationCap))
                              )
                            : "—"
                        }
                      />
                      <SummaryRow
                        label="Discount"
                        value={`${termsDraft.discountPercent}%`}
                      />
                      <SummaryRow
                        label="Qualifying round threshold"
                        value={formatGbpFromPence(
                          poundsToPence(Number(termsDraft.qualifyingRoundThreshold) || 0)
                        )}
                      />
                      <SummaryRow
                        label="Longstop"
                        value={
                          termsDraft.longstopType === "FIXED_DATE"
                            ? formatDate(termsDraft.longstopDate)
                            : `${termsDraft.longstopMonths} months from agreement`
                        }
                      />
                      <SummaryRow
                        label="Jurisdiction"
                        value={companyDraft.jurisdiction}
                      />
                      <SummaryRow
                        label="Share class"
                        value={termsDraft.conversionShareClass}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-md"
                      onClick={() => setEditingRaiseTerms(true)}
                    >
                      Edit raise terms
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <FormSubGroup label="Company">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="legalName">Legal name *</Label>
                          <Input
                            id="legalName"
                            value={companyDraft.legalName}
                            onChange={(e) => updateCompany("legalName", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="shortName">Short name</Label>
                          <Input
                            id="shortName"
                            value={companyDraft.shortName}
                            onChange={(e) => updateCompany("shortName", e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="registeredNumber">
                            Company registered number *
                          </Label>
                          <Input
                            id="registeredNumber"
                            value={companyDraft.registeredNumber}
                            onChange={(e) =>
                              updateCompany("registeredNumber", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="jurisdiction">Jurisdiction *</Label>
                          <Input
                            id="jurisdiction"
                            value={companyDraft.jurisdiction}
                            onChange={(e) =>
                              updateCompany("jurisdiction", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="registeredOffice">Registered office *</Label>
                          <Textarea
                            id="registeredOffice"
                            rows={2}
                            value={companyDraft.registeredOffice}
                            onChange={(e) =>
                              updateCompany("registeredOffice", e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </FormSubGroup>

                    <FormSubGroup label="Conversion terms">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="qualifyingRoundThreshold">
                            Qualifying round threshold (£) *
                          </Label>
                          <Input
                            id="qualifyingRoundThreshold"
                            inputMode="numeric"
                            className="text-left"
                            value={formatThousands(termsDraft.qualifyingRoundThreshold)}
                            onChange={(e) =>
                              updateTerms(
                                "qualifyingRoundThreshold",
                                parseThousands(e.target.value)
                              )
                            }
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="discountPercent">Discount rate (%) *</Label>
                          <Input
                            id="discountPercent"
                            inputMode="numeric"
                            className="text-left"
                            value={termsDraft.discountPercent}
                            onChange={(e) =>
                              updateTerms(
                                "discountPercent",
                                e.target.value.replace(/[^\d.]/g, "")
                              )
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="valuationCap">Valuation cap (£)</Label>
                          <Input
                            id="valuationCap"
                            inputMode="numeric"
                            className="text-left"
                            value={formatThousands(termsDraft.valuationCap)}
                            onChange={(e) =>
                              updateTerms("valuationCap", parseThousands(e.target.value))
                            }
                            placeholder="Optional"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="conversionShareClass">Conversion share class *</Label>
                          <Input
                            id="conversionShareClass"
                            value={termsDraft.conversionShareClass}
                            onChange={(e) =>
                              updateTerms("conversionShareClass", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="longstopType">Longstop type *</Label>
                          <select
                            id="longstopType"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={termsDraft.longstopType}
                            onChange={(e) =>
                              updateTerms(
                                "longstopType",
                                e.target.value as DefaultTermsDraft["longstopType"]
                              )
                            }
                          >
                            <option value="FIXED_DATE">Fixed date</option>
                            <option value="MONTHS_FROM_AGREEMENT">
                              Months from agreement
                            </option>
                          </select>
                        </div>
                        {termsDraft.longstopType === "FIXED_DATE" ? (
                          <div className="space-y-2">
                            <Label htmlFor="longstopDate">Longstop date *</Label>
                            <Input
                              id="longstopDate"
                              type="date"
                              value={termsDraft.longstopDate}
                              onChange={(e) =>
                                updateTerms("longstopDate", e.target.value)
                              }
                            />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label htmlFor="longstopMonths">Longstop (months) *</Label>
                            <Input
                              id="longstopMonths"
                              inputMode="numeric"
                              className="text-left"
                              value={termsDraft.longstopMonths}
                              onChange={(e) =>
                                updateTerms(
                                  "longstopMonths",
                                  e.target.value.replace(/[^\d]/g, "")
                                )
                              }
                            />
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-forest-200 bg-forest-50 px-4 py-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-forest-700">
                            Illustrative pre-money valuation (derived)
                          </p>
                          <p className="mt-0.5 text-xs text-forest-700/80">
                            Cap ÷ (1 − discount) — updates automatically.
                          </p>
                        </div>
                        <div className="shrink-0 text-xl font-bold text-forest-800">
                          {illustrativePreMoney != null
                            ? formatGbpFromPence(poundsToPence(illustrativePreMoney))
                            : "—"}
                        </div>
                      </div>
                    </FormSubGroup>

                    <FormSubGroup label="Designated bank account">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="bankAccountName">Account name</Label>
                          <Input
                            id="bankAccountName"
                            value={companyDraft.bankAccountName}
                            onChange={(e) =>
                              updateCompany("bankAccountName", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bankSortCode">Sort code</Label>
                          <Input
                            id="bankSortCode"
                            placeholder="00-00-00"
                            value={companyDraft.bankSortCode}
                            onChange={(e) =>
                              updateCompany("bankSortCode", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bankAccountNumber">Account number</Label>
                          <Input
                            id="bankAccountNumber"
                            value={companyDraft.bankAccountNumber}
                            onChange={(e) =>
                              updateCompany("bankAccountNumber", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bankIban">IBAN</Label>
                          <Input
                            id="bankIban"
                            value={companyDraft.bankIban}
                            onChange={(e) => updateCompany("bankIban", e.target.value)}
                          />
                        </div>
                      </div>
                    </FormSubGroup>

                    {mode === "add-investor" && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-md text-stone-500"
                        onClick={() => {
                          if (targetRaise) {
                            setCompanyDraft(companyFromRaise(targetRaise));
                            setTermsDraft(defaultTermsFromRaise(targetRaise.defaultTerms));
                          }
                          setEditingRaiseTerms(false);
                        }}
                      >
                        Cancel term edits
                      </Button>
                    )}
                  </div>
                )}
              </FormSection>
            </div>

            <div className="border-t border-stone-200 pt-10">
              <FormSection
                step={3}
                title="Signatories"
                description="Company and subscriber signatories for this agreement."
              >
                <div className="space-y-4">
                  <FormSubGroup label="Company signatory">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="companySignatoryName">Name *</Label>
                        <Input
                          id="companySignatoryName"
                          value={companyDraft.signatoryName}
                          onChange={(e) =>
                            updateCompany("signatoryName", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="companySignatoryTitle">Title *</Label>
                        <Input
                          id="companySignatoryTitle"
                          value={companyDraft.signatoryTitle}
                          onChange={(e) =>
                            updateCompany("signatoryTitle", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="companySignedAt">Date</Label>
                        <Input
                          id="companySignedAt"
                          type="date"
                          value={investorDraft.companySignedAt}
                          onChange={(e) =>
                            updateInvestor("companySignedAt", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </FormSubGroup>

                  <FormSubGroup label="Subscriber signatory">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="subscriberSignatoryName">Name *</Label>
                        <Input
                          id="subscriberSignatoryName"
                          value={investorDraft.signatoryName}
                          onChange={(e) =>
                            updateInvestor("signatoryName", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subscriberSignatoryTitle">Title *</Label>
                        <Input
                          id="subscriberSignatoryTitle"
                          value={investorDraft.signatoryTitle}
                          onChange={(e) =>
                            updateInvestor("signatoryTitle", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="investorSignedAt">Date</Label>
                        <Input
                          id="investorSignedAt"
                          type="date"
                          value={investorDraft.investorSignedAt}
                          onChange={(e) =>
                            updateInvestor("investorSignedAt", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </FormSubGroup>
                </div>
              </FormSection>
            </div>
          </div>

          <div className="mt-6 flex gap-3 border-t border-stone-200 pt-6">
            <GradientButton type="button" appearance="outline" onClick={() => setView("list")}>
              <ArrowLeft className="h-4 w-4" /> Back
            </GradientButton>
            <GradientButton
              type="button"
              variant="emerald"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="ml-auto flex-1 sm:flex-none"
            >
              Generate agreement <ArrowRight className="h-4 w-4" />
            </GradientButton>
          </div>
        </div>
      )}

      {view === "preview" && (
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-stone-900">Agreement preview</h3>
              <div className="flex items-center gap-2">
                <StatusPill status="draft" label="Ready to send" />
              </div>
            </div>

            {mode === "add-investor" && targetRaise && (
              <p className="text-sm text-stone-500">
                Added to{" "}
                <span className="font-medium text-stone-800">{targetRaise.name}</span>
              </p>
            )}

            <div className="rounded-lg border border-stone-200 bg-stone-50/50 p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                Investor
              </p>
              <SummaryRow label="Subscriber" value={investorDraft.name} />
              <SummaryRow label="Subscriber address" value={investorDraft.address} />
              <SummaryRow
                label="Investment amount"
                value={formatGbpFromPence(
                  poundsToPence(Number(investorDraft.investmentAmount) || 0)
                )}
              />
              <SummaryRow label="Consideration" value={investorDraft.considerationType} />
            </div>

            <div className="rounded-lg border border-stone-200 bg-stone-50/50 p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                Raise terms
              </p>
              <SummaryRow
                label="Company"
                value={`${companyDraft.legalName} (${companyDraft.registeredNumber})`}
              />
              <SummaryRow
                label="Registered office"
                value={companyDraft.registeredOffice}
              />
              <SummaryRow
                label="Qualifying round threshold"
                value={formatGbpFromPence(
                  poundsToPence(Number(termsDraft.qualifyingRoundThreshold) || 0)
                )}
              />
              <SummaryRow
                label="Discount rate"
                value={`${termsDraft.discountPercent}%`}
              />
              <SummaryRow
                label="Valuation cap"
                value={
                  termsDraft.valuationCap
                    ? formatGbpFromPence(
                        poundsToPence(Number(termsDraft.valuationCap))
                      )
                    : "—"
                }
              />
              <SummaryRow
                label="Illustrative pre-money"
                value={
                  illustrativePreMoney != null
                    ? formatGbpFromPence(poundsToPence(illustrativePreMoney))
                    : "—"
                }
              />
              <SummaryRow
                label="Longstop"
                value={
                  termsDraft.longstopType === "FIXED_DATE"
                    ? formatDate(termsDraft.longstopDate)
                    : `${termsDraft.longstopMonths} months from agreement`
                }
              />
              <SummaryRow label="Jurisdiction" value={companyDraft.jurisdiction} />
            </div>

            <div className="rounded-lg border border-stone-200 bg-stone-50/50 p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
                Signatories
              </p>
              <SummaryRow
                label="Bank account"
                value={`${companyDraft.bankAccountName || "—"} · ${companyDraft.bankSortCode || "—"} · ${companyDraft.bankAccountNumber || "—"}`}
              />
              <SummaryRow
                label="Company signatory"
                value={`${companyDraft.signatoryName} (${companyDraft.signatoryTitle})${investorDraft.companySignedAt ? ` · ${formatDate(investorDraft.companySignedAt)}` : ""}`}
              />
              <SummaryRow
                label="Subscriber signatory"
                value={`${investorDraft.signatoryName} (${investorDraft.signatoryTitle})${investorDraft.investorSignedAt ? ` · ${formatDate(investorDraft.investorSignedAt)}` : ""}`}
              />
            </div>

            <StubAction
              emphasized
              label="Send for signature"
              placeholderText="Connect an e-signature provider here - this demo does not send a real signature request."
              onActivated={() => {
                if (!createdIds) return;
                setState((prev) => ({
                  ...prev,
                  safe: {
                    ...prev.safe,
                    raises: prev.safe.raises.map((raise) =>
                      raise.id !== createdIds.raiseId
                        ? raise
                        : {
                            ...raise,
                            investors: raise.investors.map((inv) =>
                              inv.id === createdIds.investorId
                                ? {
                                    ...inv,
                                    signatureStatus: "sent",
                                    registerStatus:
                                      inv.registerStatus === "draft"
                                        ? "outstanding"
                                        : inv.registerStatus,
                                  }
                                : inv
                            ),
                          }
                    ),
                  },
                }));
              }}
            />

            <div className="flex flex-wrap gap-3 border-t border-stone-200 pt-6">
              {createdIds && (
                <Button
                  className="rounded-md"
                  onClick={() => {
                    const raise = state.safe.raises.find(
                      (r) => r.id === createdIds.raiseId
                    );
                    if (raise) startAddInvestor(raise);
                  }}
                >
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  Add another investor
                </Button>
              )}
              <Button variant="outline" className="rounded-md" onClick={() => setView("list")}>
                Back to register
              </Button>
            </div>
          </div>
        </div>
      )}

      {scopeDialog && targetRaise && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm"
          onClick={() => setScopeDialog(null)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-stone-200 bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-lg font-semibold text-stone-900">
              Apply raise term changes?
            </h3>
            <p className="mt-2 text-sm text-stone-500">
              You changed shared raise terms. {targetRaise.name} already has{" "}
              {targetRaise.investors.length} investor
              {targetRaise.investors.length === 1 ? "" : "s"}. Choose how to apply the
              changes.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button
                className="h-auto justify-start rounded-md px-4 py-3 text-left"
                onClick={() => {
                  persistAddInvestor(
                    targetRaise.id,
                    scopeDialog.investor,
                    scopeDialog.nextDefaultTerms,
                    scopeDialog.nextCompany,
                    "this"
                  );
                  setScopeDialog(null);
                }}
              >
                <span>
                  <span className="block font-semibold">This investor only</span>
                  <span className="block text-xs font-normal opacity-80">
                    Other investors keep the existing raise terms
                  </span>
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-auto justify-start rounded-md px-4 py-3 text-left"
                onClick={() => {
                  persistAddInvestor(
                    targetRaise.id,
                    scopeDialog.investor,
                    scopeDialog.nextDefaultTerms,
                    scopeDialog.nextCompany,
                    "all"
                  );
                  setScopeDialog(null);
                }}
              >
                <span>
                  <span className="block font-semibold">All investors in this raise</span>
                  <span className="block text-xs font-normal opacity-80">
                    Update shared terms for every investor
                  </span>
                </span>
              </Button>
              <Button
                variant="ghost"
                className="rounded-md"
                onClick={() => setScopeDialog(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
