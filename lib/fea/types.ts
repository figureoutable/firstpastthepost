/**
 * FEA domain types — framework-free.
 * Money amounts are integer minor units (pence for GBP). Never use floats for stored money.
 * Dates are ISO calendar dates (YYYY-MM-DD) with no time component.
 */

export type FeaCurrency = "GBP";

export type ValuationMechanism =
  | "DISCOUNT_AND_CAP"
  | "DISCOUNT_ONLY"
  | "CAP_ONLY"
  | "FIXED_VALUATION";

export type FeaInvestorType = "INDIVIDUAL" | "COMPANY";

export type ConsiderationType = "CASH" | "SERVICES_IN_LIEU" | "SALARY_SACRIFICE";

export type TaxReliefScheme = "SEIS" | "EIS";

export type GeneratedAgreementStatus = "DRAFT" | "ISSUED" | "SIGNED" | "VOID";

/** UI register lifecycle (separate from generated document status). */
export type FeaInvestorRegisterStatus =
  | "draft"
  | "outstanding"
  | "converted"
  | "cancelled"
  | "complete";

export type FeaSignatureStatus = "not_sent" | "sent" | "signed";

export interface FeaCompanySignatory {
  name: string;
  title: string;
}

export interface FeaBankDetails {
  accountName: string;
  sortCode: string;
  accountNumber: string;
  iban: string;
  swift: string;
}

export interface FeaCompany {
  legalName: string;
  shortName: string;
  jurisdiction: string;
  registeredNumber: string;
  registeredOffice: string;
  signatory: FeaCompanySignatory;
  bankDetails: FeaBankDetails;
}

export interface FeaTaxRelief {
  enabled: boolean;
  scheme?: TaxReliefScheme;
  schemeLongName?: string;
}

export type FeaLongstop =
  | { type: "MONTHS_FROM_AGREEMENT"; months: number }
  | { type: "FIXED_DATE"; date: string };

/** Raise defaults; investors override only differing fields via `overrides`. */
export interface FeaEconomicTerms {
  valuationMechanism: ValuationMechanism;
  /** Percent, e.g. 20 for 20%. Required for discount mechanisms. */
  discountPercent: number | null;
  /** Pence. Required for cap mechanisms. */
  valuationCap: number | null;
  /** Pence. Required for FIXED_VALUATION. */
  fixedValuation: number | null;
  /**
   * Pence. Defaults to cap or fixed valuation at resolve time.
   * Required for DISCOUNT_ONLY.
   */
  longstopValuation: number | null;
  /** Pence. */
  qualifyingRoundThreshold: number;
  longstop: FeaLongstop;
  conversionShareClass: string;
  fullyDilutedIncludesOptionPool: boolean;
  nomineeConversionEnabled: boolean;
}

export type FeaEconomicTermOverrides = {
  [K in keyof FeaEconomicTerms]?: FeaEconomicTerms[K] | null;
};

export interface FeaCustomTerm {
  title: string;
  body: string;
}

export interface FeaConsiderationPeriod {
  /** Free-text label or ISO date for the period, e.g. "2024-01" or "January 2024". */
  label: string;
}

export interface FeaConsideration {
  type: ConsiderationType;
  /** Non-cash only. */
  underlyingAgreement?: string;
  itemDescription?: string;
  /** Minor units in `currency`. */
  amountPerPeriod?: number;
  currency?: string;
  periods?: FeaConsiderationPeriod[];
  /** 1 unit of source currency = fxRateToGbp GBP. */
  fxRateToGbp?: number;
  fxSource?: string;
  underlyingAgreementDate?: string;
}

export interface FeaInvestorSignatures {
  investorSignedAt: string | null;
  companySignedAt: string | null;
}

export interface FeaInvestorSignatory {
  name: string;
  title: string;
}

/**
 * Investor within a raise (one FEA counterparty).
 * Does not store a copy of raise defaults — only optional overrides.
 */
export interface FeaInvestor {
  id: string;
  type: FeaInvestorType;
  name: string;
  address: string;
  email: string;
  /** COMPANY only. */
  jurisdiction?: string;
  registeredNumber?: string;
  signatory?: FeaInvestorSignatory;
  /** Pence. */
  investmentAmount: number;
  consideration: FeaConsideration;
  /** Only fields that differ from raise.defaultTerms. */
  overrides: FeaEconomicTermOverrides | null;
  customTerms: FeaCustomTerm[];
  signatures: FeaInvestorSignatures;
  /** Demo / register lifecycle (not the generated document status). */
  registerStatus: FeaInvestorRegisterStatus;
  signatureStatus: FeaSignatureStatus;
  createdAt: string;
}

export interface FeaRaise {
  id: string;
  name: string;
  instrumentName: string;
  currency: FeaCurrency;
  paymentDeadlineBusinessDays: number;
  includeInvestorStatusClause: boolean;
  mostFavouredNation: boolean;
  taxRelief: FeaTaxRelief;
  currentFullyDilutedShares?: number;
  company: FeaCompany;
  defaultTerms: FeaEconomicTerms;
  investors: FeaInvestor[];
  createdAt: string;
}

export interface FeaGeneratedAgreement {
  id: string;
  raiseId: string;
  investorId: string;
  templateVersion: string;
  /** Frozen resolve output at generation time. */
  contextSnapshot: unknown;
  renderedMarkdown: string;
  /** Optional storage URLs once a backend exists; unused for print-view v1. */
  pdfUrl: string | null;
  docxUrl: string | null;
  status: GeneratedAgreementStatus;
  validationWarnings: string[];
  createdAt: string;
  issuedAt: string | null;
}

export interface FeaState {
  raises: FeaRaise[];
  /** Versioned generated documents. ISSUED/SIGNED/VOID rows are immutable. */
  generatedAgreements: FeaGeneratedAgreement[];
}

export const FEA_OVERRIDABLE_TERM_KEYS = [
  "valuationMechanism",
  "discountPercent",
  "valuationCap",
  "fixedValuation",
  "longstopValuation",
  "qualifyingRoundThreshold",
  "longstop",
  "conversionShareClass",
  "fullyDilutedIncludesOptionPool",
  "nomineeConversionEnabled",
] as const satisfies readonly (keyof FeaEconomicTerms)[];

export type FeaOverridableTermKey = (typeof FEA_OVERRIDABLE_TERM_KEYS)[number];

/** Effective terms = raise defaults with investor overrides applied (null/undefined skip). */
export function effectiveEconomicTerms(
  raise: FeaRaise,
  investor?: FeaInvestor | null
): FeaEconomicTerms {
  const terms: FeaEconomicTerms = { ...raise.defaultTerms };
  const overrides = investor?.overrides;
  if (!overrides) return terms;
  for (const key of FEA_OVERRIDABLE_TERM_KEYS) {
    const value = overrides[key];
    if (value !== undefined && value !== null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (terms as any)[key] = value;
    }
  }
  return terms;
}

export function isGeneratedAgreementImmutable(
  status: GeneratedAgreementStatus
): boolean {
  return status === "ISSUED" || status === "SIGNED" || status === "VOID";
}
