import { poundsToPence } from "@/lib/fea/money";
import type { FeaCompany, FeaInvestor, FeaRaise, FeaState } from "@/lib/fea/types";

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

function futureDays(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function isoDaysAgo(n: number): string {
  return daysAgo(n).slice(0, 10);
}

const moonshotCompany: FeaCompany = {
  legalName: "MoonShot AI Ltd",
  shortName: "MoonShot",
  jurisdiction: "England and Wales",
  registeredNumber: "14827391",
  registeredOffice: "71-75 Shelton Street, London WC2H 9JQ",
  signatory: { name: "Alex Chen", title: "Director" },
  bankDetails: {
    accountName: "MoonShot AI Ltd",
    sortCode: "20-00-00",
    accountNumber: "12345678",
    iban: "",
    swift: "",
  },
};

function investor(partial: {
  id: string;
  name: string;
  address: string;
  amountPounds: number;
  daysAgo: number;
  registerStatus: FeaInvestor["registerStatus"];
  signatureStatus: FeaInvestor["signatureStatus"];
  overrides?: FeaInvestor["overrides"];
  signatoryName?: string;
  signatoryTitle?: string;
}): FeaInvestor {
  const created = isoDaysAgo(partial.daysAgo);
  return {
    id: partial.id,
    type: "COMPANY",
    name: partial.name,
    address: partial.address,
    email: "",
    investmentAmount: poundsToPence(partial.amountPounds),
    consideration: { type: "CASH" },
    overrides: partial.overrides ?? null,
    customTerms: [],
    signatures: {
      investorSignedAt:
        partial.signatureStatus === "signed" ? created : null,
      companySignedAt:
        partial.signatureStatus === "signed" || partial.signatureStatus === "sent"
          ? created
          : null,
    },
    registerStatus: partial.registerStatus,
    signatureStatus: partial.signatureStatus,
    createdAt: daysAgo(partial.daysAgo),
    signatory: partial.signatoryName
      ? {
          name: partial.signatoryName,
          title: partial.signatoryTitle ?? "Partner",
        }
      : undefined,
  };
}

export function createSeedFeaState(): FeaState {
  const seedRaise: FeaRaise = {
    id: "raise-1",
    name: "Seed FEA Raise",
    instrumentName: "Future Equity Agreement",
    currency: "GBP",
    paymentDeadlineBusinessDays: 5,
    includeInvestorStatusClause: true,
    mostFavouredNation: false,
    taxRelief: { enabled: false },
    company: moonshotCompany,
    defaultTerms: {
      valuationMechanism: "DISCOUNT_AND_CAP",
      discountPercent: 20,
      valuationCap: poundsToPence(4_000_000),
      fixedValuation: null,
      longstopValuation: null,
      qualifyingRoundThreshold: poundsToPence(500_000),
      longstop: { type: "FIXED_DATE", date: futureDays(210) },
      conversionShareClass: "Ordinary Shares",
      fullyDilutedIncludesOptionPool: true,
      nomineeConversionEnabled: false,
    },
    createdAt: daysAgo(60),
    investors: [
      investor({
        id: "safe-1",
        name: "Northbound Seed Fund",
        address: "1 Bishopsgate, London EC2N 4AG",
        amountPounds: 100_000,
        daysAgo: 60,
        registerStatus: "complete",
        signatureStatus: "signed",
        signatoryName: "Priya Shah",
        signatoryTitle: "Partner",
      }),
      investor({
        id: "safe-2",
        name: "Riverside Angels Syndicate",
        address: "42 King Street, Manchester M2 6BA",
        amountPounds: 50_000,
        daysAgo: 9,
        registerStatus: "complete",
        signatureStatus: "signed",
        signatoryName: "James Okonkwo",
        signatoryTitle: "Lead Angel",
        overrides: {
          discountPercent: 15,
          valuationCap: poundsToPence(4_500_000),
          longstop: { type: "FIXED_DATE", date: futureDays(240) },
        },
      }),
      investor({
        id: "safe-3",
        name: "Atlas Capital Partners",
        address: "10 Finsbury Square, London EC2A 1AF",
        amountPounds: 25_000,
        daysAgo: 45,
        registerStatus: "complete",
        signatureStatus: "signed",
        signatoryName: "Helen Park",
        signatoryTitle: "Director",
      }),
      investor({
        id: "safe-4",
        name: "Meridian Ventures",
        address: "55 Colmore Row, Birmingham B3 2AA",
        amountPounds: 40_000,
        daysAgo: 40,
        registerStatus: "complete",
        signatureStatus: "signed",
        signatoryName: "Omar Hassan",
      }),
      investor({
        id: "safe-5",
        name: "Cedar Grove Angels",
        address: "2 Castle Street, Edinburgh EH2 3AT",
        amountPounds: 15_000,
        daysAgo: 35,
        registerStatus: "complete",
        signatureStatus: "signed",
        signatoryName: "Lucy Brennan",
        signatoryTitle: "Lead Angel",
      }),
      investor({
        id: "safe-6",
        name: "Horizon Family Office",
        address: "33 Cavendish Square, London W1G 0PW",
        amountPounds: 75_000,
        daysAgo: 28,
        registerStatus: "complete",
        signatureStatus: "signed",
        signatoryName: "Daniel Kim",
        signatoryTitle: "Principal",
      }),
      investor({
        id: "safe-7",
        name: "Brighton Tech Syndicate",
        address: "1 Pavilion Buildings, Brighton BN1 1EE",
        amountPounds: 20_000,
        daysAgo: 21,
        registerStatus: "complete",
        signatureStatus: "signed",
        signatoryName: "Sofia Alvarez",
        signatoryTitle: "Member",
      }),
      investor({
        id: "safe-8",
        name: "Northern Peak Investments",
        address: "Quayside House, Newcastle NE1 3DX",
        amountPounds: 30_000,
        daysAgo: 14,
        registerStatus: "complete",
        signatureStatus: "signed",
        signatoryName: "Tom Hughes",
        signatoryTitle: "Managing Partner",
      }),
    ],
  };

  const bridgeRaise: FeaRaise = {
    id: "raise-2",
    name: "Bridge FEA Raise",
    instrumentName: "Future Equity Agreement",
    currency: "GBP",
    paymentDeadlineBusinessDays: 5,
    includeInvestorStatusClause: true,
    mostFavouredNation: true,
    taxRelief: { enabled: false },
    company: moonshotCompany,
    defaultTerms: {
      valuationMechanism: "FIXED_VALUATION",
      discountPercent: null,
      valuationCap: null,
      fixedValuation: poundsToPence(6_000_000),
      longstopValuation: null,
      qualifyingRoundThreshold: poundsToPence(750_000),
      longstop: { type: "FIXED_DATE", date: futureDays(180) },
      conversionShareClass: "Preferred Shares",
      fullyDilutedIncludesOptionPool: true,
      nomineeConversionEnabled: true,
    },
    createdAt: daysAgo(20),
    investors: [
      investor({
        id: "safe-b1",
        name: "Peninsula Growth Partners",
        address: "100 Liverpool Street, London EC2M 2RH",
        amountPounds: 60_000,
        daysAgo: 18,
        registerStatus: "complete",
        signatureStatus: "signed",
        signatoryName: "Nina Patel",
      }),
      investor({
        id: "safe-b2",
        name: "Copperfield Ventures",
        address: "15 Westferry Circus, London E14 4HD",
        amountPounds: 35_000,
        daysAgo: 15,
        registerStatus: "complete",
        signatureStatus: "signed",
        signatoryName: "Marcus Webb",
        signatoryTitle: "Director",
      }),
      investor({
        id: "safe-b3",
        name: "Lake District Angels",
        address: "8 Lowther Street, Carlisle CA3 8DA",
        amountPounds: 20_000,
        daysAgo: 12,
        registerStatus: "complete",
        signatureStatus: "signed",
        signatoryName: "Claire Doyle",
        signatoryTitle: "Lead Angel",
      }),
      investor({
        id: "safe-b4",
        name: "Summit Ridge Capital",
        address: "1 St Peter's Square, Manchester M2 3AE",
        amountPounds: 45_000,
        daysAgo: 6,
        registerStatus: "outstanding",
        signatureStatus: "signed",
        signatoryName: "Ryan Cole",
        signatoryTitle: "Principal",
      }),
      investor({
        id: "safe-b5",
        name: "Harbour Light Syndicate",
        address: "The Pier Head, Liverpool L3 1BY",
        amountPounds: 25_000,
        daysAgo: 2,
        registerStatus: "draft",
        signatureStatus: "sent",
        signatoryName: "Amelia Grant",
        signatoryTitle: "Member",
      }),
    ],
  };

  return {
    raises: [seedRaise, bridgeRaise],
    generatedAgreements: [],
  };
}
