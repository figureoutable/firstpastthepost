/** Figures office — used as registered office / correspondence option */
export const FIGURES_ADDRESS = {
  line1: "Figures Accounting Ltd",
  line2: "Suite 2, Example Business Centre",
  town: "London",
  county: "",
  postcode: "EC1A 1BB",
  country: "United Kingdom",
} as const;

export const FIGURES_ADDRESS_SINGLE_LINE = [
  FIGURES_ADDRESS.line1,
  FIGURES_ADDRESS.line2,
  FIGURES_ADDRESS.town,
  FIGURES_ADDRESS.postcode,
  FIGURES_ADDRESS.country,
]
  .filter(Boolean)
  .join(", ");

export const FIGURES_WHATSAPP_URL = "https://wa.me/441234567890";

export const COMPANIES_HOUSE_IDENTITY_URL =
  "https://identity.company-information.service.gov.uk/identity-verification/direct/has-identity-been-verified";
