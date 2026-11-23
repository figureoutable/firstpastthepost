import type { OnboardingType } from "@/lib/onboarding-fields";
import type { FeeRowKey, LetterInput, LetterKind } from "./letter-docx";

/**
 * What the client is signing up for.
 * "partnership" uses the Self Assessment form and the partnership letter.
 * "formation" is the company formation form only: no letter or payment until the company exists.
 */
export type ClientType = OnboardingType | "partnership" | "formation";

/** The form the client fills in at the end. */
export function onboardingTypeFor(type: ClientType): OnboardingType | null {
  if (type === "formation") return null;
  return type === "partnership" ? "self-assessment" : type;
}

/** The engagement letters each kind of client signs, in order. */
export function letterKindsFor(type: ClientType): LetterKind[] {
  switch (type) {
    case "business":
      return ["company"];
    case "self-assessment":
      return ["sa"];
    case "both":
      return ["company", "sa"];
    case "partnership":
      return ["partnership"];
    default:
      return [];
  }
}

/** How a client pays. Chosen by the team on the New client screen; clients never see the choice. */
export type PaymentMethod = "direct_debit" | "card" | "none";

export type Billing = "monthly" | "annual" | "one_off";

export interface PriceListItem {
  id: string;
  name: string;
  description: string;
  billing: Billing;
  pricePence: number;
  active: boolean;
  /** Which row of the engagement letter's fee table this service goes in. "none" leaves it out. */
  letterRow?: FeeRowKey | "none";
}

export interface EngagementLine {
  serviceId: string;
  name: string;
  description: string;
  billing: Billing;
  pricePence: number;
  letterRow?: FeeRowKey | "none";
}

/** What the team types in for the engagement letters (beyond name, email and fees). */
export interface LetterDetails {
  /** For "Dear ...,". */
  dearName: string;
  /** Company: address block, one line per part. */
  companyAddress?: string[];
  /** Company: the first year end we are taking over (YYYY-MM-DD). */
  yearEnd?: string;
  /** Company with VAT: the first VAT quarter end we will do (YYYY-MM-DD), if known. */
  vatFirstPeriodEnd?: string;
  personalServiceCompany?: boolean;
  group?: boolean;
  /** Self Assessment: full name with title, for example "Mrs Sheena Margo Mary Croston". */
  saFullName?: string;
  /** Self Assessment: home address, one line per part. */
  saAddress?: string[];
  /** Self Assessment: in Making Tax Digital for Income Tax. */
  mtd?: boolean;
  mtdFirstPeriodEnd?: string;
  /** Partnership: accounting period end (YYYY-MM-DD). */
  partnershipPeriodEnd?: string;
}

/** One engagement letter made from the firm's Word template, as issued to the client. */
export interface IssuedLetter {
  kind: LetterKind;
  /** Who the letter is for: the company, partnership or person. Also the Drive folder name. */
  party: string;
  title: string;
  input: LetterInput;
  docxPath: string;
  pdfPath: string;
  pages: number;
  /** SHA-256 of the PDF the client read. Recorded with the signature. */
  fingerprint: string;
  issuedAt: string;
  issuedBy: string;
  /** How the PDF was made: Google Docs (live) or LibreOffice (local tests only). */
  renderedBy: "google" | "libreoffice";
  drive?: { folderId?: string; docFileId?: string; signedPdfFileId?: string; error?: string };
  signature?: Signature;
}

/** One block of the engagement letter. Kept as data so the page, email, PDF and Google Doc all match. */
export type LetterBlock =
  | { type: "h1" | "h2" | "p" | "small"; text: string }
  | { type: "list"; items: string[] }
  | { type: "fees"; rows: { name: string; billing: string; price: string }[]; totals: string[] };

export interface LetterSnapshot {
  templateVersion: string;
  title: string;
  blocks: LetterBlock[];
  /** SHA-256 of the blocks. Recorded at signing to prove the letter was not changed afterwards. */
  fingerprint: string;
  issuedAt: string;
  issuedBy: string;
}

export interface Signature {
  name: string;
  email: string;
  signedAt: string;
  ip: string;
  userAgent: string;
  fingerprint: string;
  pdfPath: string;
  /** The client asked us to start work within the 14-day cancellation period (clause 5.4.1). */
  startNow?: boolean;
  drive?: { folderId?: string; pdfFileId?: string; docFileId?: string; savedAt?: string; error?: string };
}

export type PaymentStatus =
  | "not_started"
  | "pending" // client sent to GoCardless or Stripe, not confirmed yet
  | "submitted" // Direct Debit authorised by the client, bank confirming
  | "active" // Direct Debit live
  | "paid" // card payment taken
  | "failed"
  | "cancelled"
  | "not_required";

export interface PaymentRecord {
  method: PaymentMethod;
  status: PaymentStatus;
  /** Set once the client has done their part, which unlocks onboarding. */
  completedAt?: string;
  /** True when a preview build simulated the payment because no keys were set. */
  simulated?: boolean;
  gocardless?: { billingRequestId?: string; mandateId?: string; customerId?: string; mandateStatus?: string };
  stripe?: { sessionId?: string; paymentIntentId?: string; amountPence?: number };
}

export type FlagKind = "aml" | "payment" | "drive" | "email" | "other";

export interface Flag {
  id: string;
  kind: FlagKind;
  message: string;
  at: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface EngagementEvent {
  at: string;
  /** A team member's email, "client" or "system". */
  by: string;
  action: string;
}

export interface Engagement {
  id: string;
  /** Secret in the client's link. */
  token: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: "open" | "complete" | "cancelled";
  client: {
    type: ClientType;
    name: string;
    email: string;
    companyName?: string;
    companyNumber?: string;
    address?: string;
    letterDetails?: LetterDetails;
  };
  lines: EngagementLine[];
  payment: PaymentRecord;
  /** Upfront card amount. Only for card payments. */
  cardAmountPence?: number;
  /** Why the team chose card or no payment step. Shown on the status board. */
  paymentNote?: string;
  paymentChosenBy: string;
  /** Letters made from the firm's Word templates. When present, these are what the client signs. */
  letters?: IssuedLetter[];
  /** The older built-in letter, still used for links made before the templates, and for test builds without Google Drive. */
  letter?: LetterSnapshot;
  /** Signature on the older built-in letter. */
  signature?: Signature;
  linkSentAt?: string;
  /** The link stops working after this, until the team sends it again. */
  expiresAt?: string;
  firstOpenedAt?: string;
  reminderSentAt?: string;
  onboarding?: { draftCode?: string; submissionId?: string; completedAt?: string };
  flags: Flag[];
  events: EngagementEvent[];
  /** Milestone emails already sent to the team, so each one only goes once. */
  notified?: { letterSigned?: string; paymentDone?: string };
}

export type FlowStep = "letter" | "payment" | "onboarding" | "done" | "cancelled" | "expired";

export const BILLING_LABEL: Record<Billing, string> = {
  monthly: "Monthly",
  annual: "Annual",
  one_off: "One-off",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  direct_debit: "Direct Debit",
  card: "Card upfront (Stripe)",
  none: "No payment step",
};

export const CLIENT_TYPE_LABEL: Record<ClientType, string> = {
  "self-assessment": "Self Assessment",
  business: "Company",
  both: "Company and Self Assessment",
  partnership: "Partnership",
  formation: "Company formation",
};

export const LINK_LIFETIME_DAYS = 60;

/** Which fee table rows each letter has. Bookkeeping is an extra row any letter can take. */
export const FEE_ROWS_FOR: Record<LetterKind, FeeRowKey[]> = {
  company: ["accounts_ct", "vat", "payroll", "bookkeeping"],
  sa: ["sa", "bookkeeping"],
  partnership: ["partnership", "bookkeeping"],
};

/** The rows of the engagement letters' fee tables, for the price list. */
export const LETTER_ROW_OPTIONS: { value: FeeRowKey | "none"; label: string }[] = [
  { value: "accounts_ct", label: "Company letter: Accounts and Corporation Tax" },
  { value: "vat", label: "Company letter: VAT returns" },
  { value: "payroll", label: "Company letter: Payroll" },
  { value: "sa", label: "Self Assessment letter" },
  { value: "partnership", label: "Partnership letter" },
  { value: "bookkeeping", label: "Bookkeeping (row added to any letter)" },
  { value: "none", label: "Not in the letter" },
];
