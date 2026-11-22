/** Firm details shown on the privacy notice and in client emails. */
export const FIRM = {
  legalName: "Figures & Finance Limited",
  tradingName: "Figures",
  website: "https://tryfigures.com",
  /** Shown to clients as the address to contact. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "joshua@tryfigures.com",
  /** Free discovery call, used now that new clients get a personal link from the team. */
  bookingUrl: "https://cal.com/figures/discoverycall",
} as const;

export const COMPANIES_HOUSE_IDENTITY_URL =
  "https://identity.company-information.service.gov.uk/identity-verification/direct/has-identity-been-verified";
