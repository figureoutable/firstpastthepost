export type ModuleStatus = "not_started" | "in_progress" | "complete";

export type SchemeResult = "pass" | "fail" | "borderline";

export type Scheme = "SEIS" | "EIS" | "R&D" | "EMI";

export interface EligibilityAnswers {
  tradingActivity: "qualifying" | "excluded" | "unsure" | null;
  grossAssetsGBP: number | null;
  employeeCount: number | null;
  tradeAgeMonths: number | null;
  companyIndependent: boolean | null;
}

export interface EligibilityResultItem {
  scheme: Scheme;
  result: SchemeResult;
  reason: string;
}

export interface EligibilityState {
  answers: EligibilityAnswers;
  results: EligibilityResultItem[] | null;
  completedAt: string | null;
}

export interface SeisEisState {
  companyName: string;
  tradingSinceMonths: number | null;
  schemeType: "SEIS" | "EIS" | "Both" | null;
  amountSeeking: number | null;
  sharesToIssue: number | null;
  shareClass: string;
  businessPlanSummary: string;
  useOfFunds: string;
  submitted: boolean;
  submittedAt: string | null;
}

export interface RdCostBreakdown {
  staff: number;
  subcontractors: number;
  software: number;
  consumables: number;
}

export interface RdProject {
  id: string;
  name: string;
  advance: string;
  uncertainty: string;
  workDone: string;
  costs: RdCostBreakdown;
  createdAt: string;
}

export interface RdState {
  projects: RdProject[];
  submitted: boolean;
  submittedAt: string | null;
}

export interface Shareholder {
  id: string;
  name: string;
  role?: string;
  shareClass: string;
  shares: number;
}

export interface ShareEvent {
  id: string;
  type: "issue" | "transfer";
  date: string;
  description: string;
}

export interface ShareClassDefinition {
  id: string;
  /** Display name used on the cap table (editable) */
  name: string;
  /** Standard class type this maps to (for the meaning) */
  classType: string;
  /** Nominal (par) value per share, in GBP */
  nominalValue?: number;
}

export interface CapTableState {
  shareholders: Shareholder[];
  events: ShareEvent[];
  shareClasses: ShareClassDefinition[];
}

export interface SafeInstrument {
  id: string;
  /** Subscriber / investor name */
  investorName: string;
  subscriberAddress: string;
  companyName: string;
  companyNumber: string;
  companyRegisteredOffice: string;
  amount: number;
  financingRoundThreshold: number;
  discountRate: number;
  valuationCap: number;
  longstopDate: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankSortCode: string;
  companySignatoryName: string;
  companySignatoryCapacity: string;
  companySignatoryDate: string;
  subscriberSignatoryName: string;
  subscriberSignatoryCapacity: string;
  subscriberSignatoryDate: string;
  agreementDate: string;
  status: "outstanding" | "converted";
  signatureStatus: "not_sent" | "sent" | "signed";
  issuedAt: string;
}

export interface SafeState {
  instruments: SafeInstrument[];
}

export interface TermSheet {
  id: string;
  name: string;
  valuation: number;
  roundSize: number;
  liquidationPreference: string;
  proRataRights: boolean;
  boardSeats: number;
  vestingSchedule: string;
  status: "draft" | "accepted" | "declined";
  createdAt: string;
}

export interface TermSheetState {
  sheets: TermSheet[];
}

export interface FundingRound {
  id: string;
  name: string;
  termSheetId: string | null;
  amountRaised: number;
  preMoneyValuation: number;
  status: "draft" | "documents_generated" | "applied_to_cap_table";
  documentsGenerated: string[];
  createdAt: string;
}

export interface FundingRoundState {
  rounds: FundingRound[];
}

export interface EmiGrant {
  id: string;
  employeeName: string;
  numberOfOptions: number;
  exercisePrice: number;
  grantDate: string;
  status: "draft" | "granted" | "exercised" | "lapsed";
}

export interface EmiState {
  poolSizePercent: number;
  vestingYears: number;
  cliffMonths: number;
  valuationRequested: boolean;
  grants: EmiGrant[];
}

export interface VentureState {
  eligibility: EligibilityState;
  seisEis: SeisEisState;
  rd: RdState;
  capTable: CapTableState;
  safe: SafeState;
  termSheets: TermSheetState;
  fundingRounds: FundingRoundState;
  emi: EmiState;
}
