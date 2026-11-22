import type { OnboardingType } from "@/lib/onboarding-fields";

/** What the client is signing up for. "formation" uses the company formation form instead of onboarding. */
export type ClientType = OnboardingType | "formation";

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
}

export interface EngagementLine {
  serviceId: string;
  name: string;
  description: string;
  billing: Billing;
  pricePence: number;
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
  };
  lines: EngagementLine[];
  payment: PaymentRecord;
  /** Upfront card amount. Only for card payments. */
  cardAmountPence?: number;
  /** Why the team chose card or no payment step. Shown on the status board. */
  paymentNote?: string;
  paymentChosenBy: string;
  letter: LetterSnapshot;
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
  formation: "Company formation",
};

export const LINK_LIFETIME_DAYS = 60;
