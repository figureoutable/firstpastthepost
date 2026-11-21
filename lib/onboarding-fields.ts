/** Field definitions shared by the onboarding forms, the submit route and emails. */

export type OnboardingType = "business" | "self-assessment" | "both";

export type AmlQuestion = {
  field: string;
  label: string;
  /** Field for extra detail, shown when the answer is "yes". */
  detailsField?: string;
};

const PEP: AmlQuestion = {
  field: "isPep",
  label: "Are you, or anyone who owns or runs the business, a politically exposed person (for example an MP, senior official, judge or their close family)?",
  detailsField: "pepDetails",
};

export const AML_QUESTIONS: Record<OnboardingType, AmlQuestion[]> = {
  "self-assessment": [
    { ...PEP, label: "Are you a politically exposed person (for example an MP, senior official, judge or their close family)?" },
    {
      field: "hasHighRiskIncome",
      label: "Do you have income from, or links to, sanctioned or high-risk countries?",
      detailsField: "highRiskDetails",
    },
    {
      field: "financialDifficulty",
      label: "Have you ever been bankrupt or in serious financial difficulty?",
      detailsField: "financialDifficultyDetails",
    },
  ],
  business: [
    PEP,
    {
      field: "hasSanctions",
      label: "Does the business trade with, or have links to, sanctioned or high-risk countries?",
      detailsField: "sanctionsDetails",
    },
    {
      field: "hasComplexStructure",
      label: "Is the company owned through other companies, trusts or overseas entities?",
      detailsField: "structureDescription",
    },
    {
      field: "hasBankruptcy",
      label: "Has any owner or director been bankrupt or disqualified as a director?",
      detailsField: "bankruptcyDescription",
    },
  ],
  both: [
    PEP,
    {
      field: "hasSanctions",
      label: "Do you or the business have income from, or links to, sanctioned or high-risk countries?",
      detailsField: "sanctionsDetails",
    },
    {
      field: "hasComplexStructure",
      label: "Is the company owned through other companies, trusts or overseas entities?",
      detailsField: "structureDescription",
    },
    {
      field: "hasBankruptcy",
      label: "Have you, or any owner or director, been bankrupt, disqualified or in serious financial difficulty?",
      detailsField: "bankruptcyDescription",
    },
  ],
};

export const INCOME_TYPES = [
  "Employment (PAYE)",
  "Self-employment / sole trader",
  "Rental income",
  "Dividends",
  "Bank interest",
  "Capital gains (shares, crypto, property)",
  "Foreign income",
  "Pensions or benefits",
  "Other",
];

export const BUSINESS_SERVICES = [
  "Company accounts and corporation tax",
  "VAT returns",
  "Payroll",
  "Bookkeeping",
  "New PAYE or VAT registration",
  "Other",
];

export const NOT_YET_ISSUED = "Not issued yet";
export const SEND_LATER = "Client will send later";

export function isOnboardingType(value: unknown): value is OnboardingType {
  return value === "business" || value === "self-assessment" || value === "both";
}

export function isEmail(value: unknown): boolean {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Labels used in the internal email. */
export const FIELD_LABELS: Record<string, string> = {
  onboardingType: "Onboarding type",
  fullNamePassport: "Full name (as on passport)",
  fullName: "Full name",
  email: "Email",
  phoneNumber: "Phone",
  dob: "Date of birth",
  homeAddress: "Home address",
  companyName: "Company name",
  registrationNumber: "Company number",
  businessUtr: "Business UTR",
  personalUtr: "Personal UTR",
  utrNumber: "UTR",
  niNumber: "National Insurance number",
  companyAuthCode: "Companies House authentication code",
  hasPaye: "Has a PAYE scheme",
  accountsOfficeRef: "Accounts Office reference",
  payeRef: "PAYE reference",
  isVatRegistered: "VAT registered",
  vatNumber: "VAT number",
  vatRegDate: "VAT registration date",
  natureOfBusiness: "Nature of business",
  sourceOfFunds: "Source of funds",
  tradingAddress: "Trading address",
  servicesRequired: "Services required",
  incomeTypes: "Income types",
  otherIncome: "Other income",
  expectsForeignIncome: "Expects foreign income",
  foreignIncomeDetails: "Foreign income details",
  isPep: "Politically exposed person",
  pepDetails: "PEP details",
  hasSanctions: "Links to sanctioned or high-risk countries",
  sanctionsDetails: "Sanctions / high-risk details",
  hasHighRiskIncome: "Income from sanctioned or high-risk countries",
  highRiskDetails: "High-risk details",
  financialDifficulty: "Bankruptcy or serious financial difficulty",
  financialDifficultyDetails: "Financial difficulty details",
  hasComplexStructure: "Owned through other companies, trusts or overseas entities",
  structureDescription: "Ownership structure",
  hasBankruptcy: "Bankruptcy or disqualification",
  bankruptcyDescription: "Bankruptcy / disqualification details",
  previousAccountant: "Has a previous accountant",
  previousAccountantName: "Previous accountant name",
  previousAccountantFirm: "Previous accountant firm",
  previousAccountantEmail: "Previous accountant email",
  directors: "Directors and owners (25%+)",
  confirmed: "Confirmed details are accurate",
  role: "Role",
  address: "Address",
};

/** Internal-only flags that are folded into the values above. */
export const HIDDEN_FIELDS = new Set([
  "photoId",
  "proofOfAddress",
  "noPersonalUtr",
  "noBusinessUtr",
  "noAuthCode",
  "resumeCode",
]);
