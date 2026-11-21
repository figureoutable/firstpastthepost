/**
 * Firm details shown in the footer, the privacy notice and client emails.
 *
 * Fill in the blanks below. UK company websites must show the registered name,
 * company number, where it is registered and the registered office address.
 * Anything left blank shows as "to be added" on the site so it is easy to spot.
 */
export const FIRM = {
  legalName: "Figures & Finance Limited",
  tradingName: "Figures",
  /** e.g. "12345678" or "SC123456" */
  companyNumber: "",
  /** e.g. "England and Wales" or "Scotland" */
  registeredIn: "",
  /** Registered office address on one line */
  registeredOffice: "",
  /** ICO data protection registration number, e.g. "ZA123456" */
  icoNumber: "",
  website: "https://tryfigures.com",
  /** Shown to clients as the address to contact. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "joshua@tryfigures.com",
} as const;

export const MISSING = "to be added";

export function firmValue(value: string): string {
  return value.trim() ? value : MISSING;
}

export const COMPANIES_HOUSE_IDENTITY_URL =
  "https://identity.company-information.service.gov.uk/identity-verification/direct/has-identity-been-verified";
