/**
 * One-way migrations from older local FEA shapes into FeaState.
 * Pure TypeScript — safe to call from the venture store loader.
 */

import { poundsToPence } from "./money";
import type {
  FeaEconomicTerms,
  FeaInvestor,
  FeaRaise,
  FeaState,
} from "./types";
import { emptyFeaState } from "./storage";

/** Pre–Step 1 flat raise terms (major currency units). */
interface LegacyRaiseTerms {
  companyName?: string;
  companyNumber?: string;
  companyRegisteredOffice?: string;
  financingRoundThreshold?: number;
  discountRate?: number;
  valuationCap?: number;
  longstopDate?: string;
  governingLaw?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankSortCode?: string;
}

interface LegacyAgreement {
  id: string;
  investorName?: string;
  subscriberAddress?: string;
  amount?: number;
  agreementDate?: string;
  companySignatoryName?: string;
  companySignatoryCapacity?: string;
  companySignatoryDate?: string;
  subscriberSignatoryName?: string;
  subscriberSignatoryCapacity?: string;
  subscriberSignatoryDate?: string;
  status?: FeaInvestor["registerStatus"] | "outstanding" | "converted";
  signatureStatus?: FeaInvestor["signatureStatus"];
  issuedAt?: string;
  termOverrides?: Partial<LegacyRaiseTerms>;
}

interface LegacyRaise {
  id: string;
  name?: string;
  createdAt?: string;
  terms?: LegacyRaiseTerms;
  /** Step 1 field name */
  company?: FeaRaise["company"];
  defaultTerms?: FeaEconomicTerms;
  investors?: FeaInvestor[];
  agreements?: LegacyAgreement[];
}

function isoDate(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return value.length >= 10 ? value.slice(0, 10) : fallback;
}

function legacyTermsToDefaultTerms(terms: LegacyRaiseTerms): FeaEconomicTerms {
  return {
    valuationMechanism: "DISCOUNT_AND_CAP",
    discountPercent: terms.discountRate ?? 20,
    valuationCap: poundsToPence(terms.valuationCap ?? 0),
    fixedValuation: null,
    longstopValuation: null,
    qualifyingRoundThreshold: poundsToPence(terms.financingRoundThreshold ?? 0),
    longstop: terms.longstopDate
      ? { type: "FIXED_DATE", date: isoDate(terms.longstopDate, "2027-01-01") }
      : { type: "MONTHS_FROM_AGREEMENT", months: 6 },
    conversionShareClass: "Ordinary Shares",
    fullyDilutedIncludesOptionPool: true,
    nomineeConversionEnabled: false,
  };
}

function legacyOverridesToEconomic(
  overrides: Partial<LegacyRaiseTerms> | undefined
): FeaInvestor["overrides"] {
  if (!overrides) return null;
  const next: NonNullable<FeaInvestor["overrides"]> = {};
  if (overrides.discountRate != null) next.discountPercent = overrides.discountRate;
  if (overrides.valuationCap != null)
    next.valuationCap = poundsToPence(overrides.valuationCap);
  if (overrides.financingRoundThreshold != null) {
    next.qualifyingRoundThreshold = poundsToPence(
      overrides.financingRoundThreshold
    );
  }
  if (overrides.longstopDate) {
    next.longstop = {
      type: "FIXED_DATE",
      date: isoDate(overrides.longstopDate, "2027-01-01"),
    };
  }
  return Object.keys(next).length > 0 ? next : null;
}

function legacyAgreementToInvestor(agreement: LegacyAgreement): FeaInvestor {
  const created = isoDate(agreement.issuedAt, new Date().toISOString().slice(0, 10));
  const registerStatus =
    agreement.status === "outstanding" ||
    agreement.status === "converted" ||
    agreement.status === "draft" ||
    agreement.status === "cancelled" ||
    agreement.status === "complete"
      ? agreement.status
      : "draft";

  return {
    id: agreement.id,
    type: "COMPANY",
    name: agreement.investorName ?? "Investor",
    address: agreement.subscriberAddress ?? "",
    email: "",
    investmentAmount: poundsToPence(agreement.amount ?? 0),
    consideration: { type: "CASH" },
    overrides: legacyOverridesToEconomic(agreement.termOverrides),
    customTerms: [],
    signatures: {
      investorSignedAt: isoDate(agreement.subscriberSignatoryDate, "") || null,
      companySignedAt: isoDate(agreement.companySignatoryDate, "") || null,
    },
    registerStatus,
    signatureStatus: agreement.signatureStatus ?? "not_sent",
    createdAt: created,
    signatory: agreement.subscriberSignatoryName
      ? {
          name: agreement.subscriberSignatoryName,
          title: agreement.subscriberSignatoryCapacity ?? "",
        }
      : undefined,
  };
}

function isModernRaise(raise: LegacyRaise): raise is LegacyRaise & {
  company: FeaRaise["company"];
  defaultTerms: FeaEconomicTerms;
  investors: FeaInvestor[];
} {
  return Boolean(raise.company && raise.defaultTerms && Array.isArray(raise.investors));
}

export function migrateLegacyRaise(raise: LegacyRaise): FeaRaise {
  if (isModernRaise(raise)) {
    return {
      id: raise.id,
      name: raise.name ?? "Raise",
      instrumentName: "Future Equity Agreement",
      currency: "GBP",
      paymentDeadlineBusinessDays: 5,
      includeInvestorStatusClause: true,
      mostFavouredNation: false,
      taxRelief: { enabled: false },
      company: raise.company,
      defaultTerms: raise.defaultTerms,
      investors: raise.investors,
      createdAt: raise.createdAt ?? new Date().toISOString(),
    };
  }

  const terms = raise.terms ?? {};
  return {
    id: raise.id,
    name: raise.name ?? "Raise",
    instrumentName: "Future Equity Agreement",
    currency: "GBP",
    paymentDeadlineBusinessDays: 5,
    includeInvestorStatusClause: true,
    mostFavouredNation: false,
    taxRelief: { enabled: false },
    company: {
      legalName: terms.companyName ?? "Company",
      shortName: (terms.companyName ?? "Company").split(" ")[0] ?? "Company",
      jurisdiction: terms.governingLaw ?? "England and Wales",
      registeredNumber: terms.companyNumber ?? "",
      registeredOffice: terms.companyRegisteredOffice ?? "",
      signatory: { name: "Director", title: "Director" },
      bankDetails: {
        accountName: terms.bankAccountName ?? "",
        sortCode: terms.bankSortCode ?? "",
        accountNumber: terms.bankAccountNumber ?? "",
        iban: "",
        swift: "",
      },
    },
    defaultTerms: legacyTermsToDefaultTerms(terms),
    investors: (raise.agreements ?? []).map(legacyAgreementToInvestor),
    createdAt: raise.createdAt ?? new Date().toISOString(),
  };
}

export function migrateToFeaState(safe: unknown): FeaState {
  if (!safe || typeof safe !== "object") return emptyFeaState();
  const raw = safe as {
    raises?: LegacyRaise[];
    generatedAgreements?: FeaState["generatedAgreements"];
    instruments?: unknown[];
  };

  if (Array.isArray(raw.raises)) {
    return {
      raises: raw.raises.map(migrateLegacyRaise),
      generatedAgreements: Array.isArray(raw.generatedAgreements)
        ? raw.generatedAgreements
        : [],
    };
  }

  return emptyFeaState();
}
