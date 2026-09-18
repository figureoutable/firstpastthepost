import type { VentureState } from "./types";
import { computeEligibility } from "./eligibility-rules";

const seedAnswers = {
  tradingActivity: "qualifying" as const,
  grossAssetsGBP: 180_000,
  employeeCount: 6,
  tradeAgeMonths: 14,
  companyIndependent: true,
};

export function createSeedVentureState(): VentureState {
  return {
    eligibility: {
      answers: seedAnswers,
      results: computeEligibility(seedAnswers),
      completedAt: daysAgo(11),
    },

    seisEis: {
      companyName: "MoonShot AI",
      tradingSinceMonths: 14,
      schemeType: "SEIS",
      amountSeeking: 150_000,
      sharesToIssue: 15_000,
      shareClass: "Ordinary A",
      businessPlanSummary:
        "MoonShot AI builds accounting automation tools for early-stage startups. We're raising a pre-seed round to expand the engineering team and reach 500 paying customers within 18 months.",
      useOfFunds:
        "60% engineering hires, 25% go-to-market, 15% working capital.",
      submitted: false,
      submittedAt: null,
    },

    rd: {
      projects: [
        {
          id: "rd-1",
          name: "Automated bank reconciliation engine",
          advance:
            "Develop a reconciliation engine that automatically matches bank transactions to ledger entries with >98% accuracy across inconsistent, unstructured transaction descriptions.",
          uncertainty:
            "It was not readily deducible by a competent professional how to reliably classify ambiguous, free-text transaction narratives across many different UK banking formats without a high false-positive rate.",
          workDone:
            "Built and iterated on an NLP-based matching pipeline, ran controlled experiments against 40k historical transactions, and developed a novel fuzzy-confidence scoring model.",
          costs: { staff: 42_000, subcontractors: 6_500, software: 3_200, consumables: 400 },
          createdAt: daysAgo(40),
        },
        {
          id: "rd-2",
          name: "Real-time R&D cost apportionment model",
          advance:
            "Create a system to automatically apportion staff costs across qualifying and non-qualifying R&D activity in real time from timesheet data.",
          uncertainty:
            "No existing off-the-shelf method could reliably apportion mixed-activity time entries without significant manual review, and it was unclear whether a rules-based or ML approach would generalise across industries.",
          workDone:
            "Prototyped both a rules-based and an ML-based classifier, benchmarked accuracy against manually reviewed data, and integrated the better-performing model into the product.",
          costs: { staff: 28_000, subcontractors: 0, software: 1_800, consumables: 150 },
          createdAt: daysAgo(15),
        },
      ],
      submitted: false,
      submittedAt: null,
    },

    capTable: {
      shareholders: [
        { id: "sh-1", name: "Alex Chen", role: "Founder", shareClass: "Ordinary", shares: 4_200_000 },
        { id: "sh-2", name: "Priya Patel", role: "Founder", shareClass: "Ordinary", shares: 2_100_000 },
        { id: "sh-3", name: "Jordan Blake", role: "Founder", shareClass: "Ordinary", shares: 900_000 },
        { id: "sh-4", name: "Founders' Fund Angels LP", role: "Investor", shareClass: "Ordinary A", shares: 750_000 },
        { id: "sh-5", name: "Northbound Seed Fund", role: "Investor", shareClass: "Ordinary A", shares: 600_000 },
        { id: "sh-6", name: "Riverside Angels Syndicate", role: "Investor", shareClass: "Ordinary A", shares: 400_000 },
        { id: "sh-7", name: "Sam Okonkwo", role: "Advisor", shareClass: "Ordinary", shares: 250_000 },
        { id: "sh-8", name: "Mei Zhang", role: "Early employee", shareClass: "Ordinary", shares: 200_000 },
        { id: "sh-9", name: "Chris Doyle", role: "Early employee", shareClass: "Ordinary", shares: 150_000 },
        { id: "sh-10", name: "EMI Option Pool", role: "Unallocated", shareClass: "Ordinary", shares: 450_000 },
      ],
      shareClasses: [
        { id: "sc-1", name: "Ordinary", classType: "Ordinary", nominalValue: 0.01 },
        { id: "sc-2", name: "Ordinary A", classType: "Ordinary A", nominalValue: 0.01 },
      ],
      events: [
        {
          id: "ev-1",
          type: "issue",
          date: daysAgo(400),
          description: "Incorporation share split - Ordinary shares issued to founding team.",
        },
        {
          id: "ev-2",
          type: "issue",
          date: daysAgo(398),
          description: "Advisor and early employee grants issued from the founding pool.",
        },
        {
          id: "ev-3",
          type: "issue",
          date: daysAgo(120),
          description: "Angel and seed investor Ordinary A shares issued across three syndicates/funds.",
        },
      ],
    },

    safe: {
      instruments: [
        {
          id: "safe-1",
          investorName: "Northbound Seed Fund",
          subscriberAddress: "1 Bishopsgate, London EC2N 4AG",
          companyName: "MoonShot AI",
          companyNumber: "14827391",
          companyRegisteredOffice: "71-75 Shelton Street, London WC2H 9JQ",
          amount: 100_000,
          financingRoundThreshold: 500_000,
          discountRate: 20,
          valuationCap: 4_000_000,
          longstopDate: futureDays(210),
          bankName: "Barclays Bank UK PLC",
          bankAccountName: "MoonShot AI Ltd",
          bankAccountNumber: "12345678",
          bankSortCode: "20-00-00",
          companySignatoryName: "Alex Chen",
          companySignatoryCapacity: "Director",
          companySignatoryDate: daysAgo(60),
          subscriberSignatoryName: "Priya Shah",
          subscriberSignatoryCapacity: "Partner",
          subscriberSignatoryDate: daysAgo(58),
          agreementDate: daysAgo(60),
          status: "outstanding",
          signatureStatus: "signed",
          issuedAt: daysAgo(60),
        },
        {
          id: "safe-2",
          investorName: "Riverside Angels Syndicate",
          subscriberAddress: "42 King Street, Manchester M2 6BA",
          companyName: "MoonShot AI",
          companyNumber: "14827391",
          companyRegisteredOffice: "71-75 Shelton Street, London WC2H 9JQ",
          amount: 50_000,
          financingRoundThreshold: 500_000,
          discountRate: 15,
          valuationCap: 4_500_000,
          longstopDate: futureDays(240),
          bankName: "Barclays Bank UK PLC",
          bankAccountName: "MoonShot AI Ltd",
          bankAccountNumber: "12345678",
          bankSortCode: "20-00-00",
          companySignatoryName: "Alex Chen",
          companySignatoryCapacity: "Director",
          companySignatoryDate: daysAgo(9),
          subscriberSignatoryName: "James Okonkwo",
          subscriberSignatoryCapacity: "Lead Angel",
          subscriberSignatoryDate: "",
          agreementDate: daysAgo(9),
          status: "outstanding",
          signatureStatus: "sent",
          issuedAt: daysAgo(9),
        },
      ],
    },

    termSheets: {
      sheets: [
        {
          id: "ts-1",
          name: "Northbound Seed Fund - Seed Round",
          valuation: 8_000_000,
          roundSize: 1_500_000,
          liquidationPreference: "1x non-participating",
          proRataRights: true,
          boardSeats: 1,
          vestingSchedule: "4 years, 1 year cliff",
          status: "draft",
          createdAt: daysAgo(5),
        },
      ],
    },

    fundingRounds: {
      rounds: [],
    },

    emi: {
      poolSizePercent: 10,
      vestingYears: 4,
      cliffMonths: 12,
      valuationRequested: false,
      grants: [
        {
          id: "emi-1",
          employeeName: "Jordan Lee (Lead Engineer)",
          numberOfOptions: 40_000,
          exercisePrice: 0.08,
          grantDate: daysAgo(90),
          status: "granted",
        },
        {
          id: "emi-2",
          employeeName: "Sam Osei (Product Designer)",
          numberOfOptions: 25_000,
          exercisePrice: 0.08,
          grantDate: daysAgo(30),
          status: "granted",
        },
        {
          id: "emi-3",
          employeeName: "Maya Rodriguez (Backend Engineer)",
          numberOfOptions: 20_000,
          exercisePrice: 0.1,
          grantDate: daysAgo(2),
          status: "draft",
        },
      ],
    },
  };
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function futureDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}
