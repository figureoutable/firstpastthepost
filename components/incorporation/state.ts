import { FIGURES_ADDRESS } from "@/lib/figures-config";

export type Address = {
  line1: string;
  line2: string;
  town: string;
  county: string;
  postcode: string;
  country: string;
};

export const emptyAddress = (): Address => ({
  line1: "",
  line2: "",
  town: "",
  county: "",
  postcode: "",
  country: "United Kingdom",
});

export function figuresAddress(): Address {
  return {
    line1: FIGURES_ADDRESS.line1,
    line2: FIGURES_ADDRESS.line2,
    town: FIGURES_ADDRESS.town,
    county: FIGURES_ADDRESS.county,
    postcode: FIGURES_ADDRESS.postcode,
    country: FIGURES_ADDRESS.country,
  };
}

export type Director = {
  id: string;
  title: string;
  firstName: string;
  middleName: string;
  lastName: string;
  differentName: "yes" | "no";
  prevFirst: string;
  prevLast: string;
  nationality: string;
  secondNationality: string;
  dobDay: string;
  dobMonth: string;
  dobYear: string;
  corrType: "registered" | "other";
  corrAddress: Address;
  homeType: "same" | "other";
  homeAddress: Address;
  countryResidence: string;
  emailReminders: string;
  agreesDirector: boolean;
};

export type Shareholder = {
  id: string;
  kind: "person" | "business";
  isDirector: "yes" | "no";
  directorId: string;
  firstName: string;
  lastName: string;
  businessName: string;
  businessAddress: Address;
  actingFirst: string;
  actingLast: string;
  addrType: "registered" | "other";
  addr: Address;
};

export function newDirector(): Director {
  return {
    id: crypto.randomUUID(),
    title: "",
    firstName: "",
    middleName: "",
    lastName: "",
    differentName: "no",
    prevFirst: "",
    prevLast: "",
    nationality: "British",
    secondNationality: "",
    dobDay: "",
    dobMonth: "",
    dobYear: "",
    corrType: "registered",
    corrAddress: emptyAddress(),
    homeType: "same",
    homeAddress: emptyAddress(),
    countryResidence: "United Kingdom",
    emailReminders: "",
    agreesDirector: false,
  };
}

export function newShareholder(): Shareholder {
  return {
    id: crypto.randomUUID(),
    kind: "person",
    isDirector: "no",
    directorId: "",
    firstName: "",
    lastName: "",
    businessName: "",
    businessAddress: emptyAddress(),
    actingFirst: "",
    actingLast: "",
    addrType: "registered",
    addr: emptyAddress(),
  };
}

export type IncorporationState = {
  step1: { cic: "yes" | "no"; limitedByGuarantee: "yes" | "no" };
  step2: {
    name: string;
    ending: "Limited" | "Ltd";
    backupName: string;
    backupEnding: "Limited" | "Ltd";
    confirmedAvailable: boolean;
  };
  step3: {
    region: "EW" | "S" | "NI" | "W" | "";
    useFiguresRegistered: boolean;
    registered: Address;
    principal: "same" | "different" | "none";
    principalAddr: Address;
    registeredEmail: string;
    hmrcPhone: string;
  };
  step4: {
    replacing: "yes" | "no";
    prevBusinessName: string;
    prevBusinessAddr: Address;
    handoverPerson: string;
    trading: "now" | "date" | "none";
    tradingDate: string;
    loansOverseas: "yes" | "no";
    protectedDetails: "yes" | "no";
    businessDescription: string;
    sicCodes: { code: string; description: string }[];
    sicSuggestions: { code: string; description: string }[];
    sicLoading: boolean;
  };
  step5: { directors: Director[] };
  step6: { shareholders: Shareholder[] };
  step7: {
    standard: boolean;
    /** When standard is false, user describes custom share classes here */
    customShareDescription: string;
    shareClass: string;
    shareClassOther: string;
    currency: string;
    currencyOther: string;
    valuePerShare: string;
    valueOther: string;
    oneVote: "yes" | "no";
    dividends: "yes" | "no";
    dividendRights: "equal" | "different";
    dividendText: string;
    assetsClose: "yes" | "no";
    capitalRights: "equal" | "different";
    capitalText: string;
    paidFull: boolean;
    allocations: Record<string, number>;
    paidAmounts: Record<string, string>;
  };
  step8: {
    /** No one >25% — user confirms */
    noPscConfirm: boolean;
    /** At least one PSC — user confirms list matches shareholdings */
    pscListConfirm: boolean;
  };
  step9: {
    directorPersonalCodes: Record<string, string>;
    acc1: boolean;
    acc2: boolean;
    acc3: boolean;
  };
  /** Filled on banner before Start — reminder + required 11-char code */
  introPersonalCode: string;
};

export const initialState = (): IncorporationState => ({
  step1: { cic: "no", limitedByGuarantee: "no" },
  step2: {
    name: "",
    ending: "Limited",
    backupName: "",
    backupEnding: "Limited",
    confirmedAvailable: false,
  },
  step3: {
    region: "",
    useFiguresRegistered: false,
    registered: emptyAddress(),
    principal: "same",
    principalAddr: emptyAddress(),
    registeredEmail: "",
    hmrcPhone: "",
  },
  step4: {
    replacing: "no",
    prevBusinessName: "",
    prevBusinessAddr: emptyAddress(),
    handoverPerson: "",
    trading: "now",
    tradingDate: "",
    loansOverseas: "no",
    protectedDetails: "no",
    businessDescription: "",
    sicCodes: [],
    sicSuggestions: [],
    sicLoading: false,
  },
  step5: { directors: [newDirector()] },
  step6: { shareholders: [newShareholder()] },
  step7: {
    standard: true,
    customShareDescription: "",
    shareClass: "Ordinary",
    shareClassOther: "",
    currency: "GBP",
    currencyOther: "",
    valuePerShare: "1",
    valueOther: "",
    oneVote: "yes",
    dividends: "yes",
    dividendRights: "equal",
    dividendText: "",
    assetsClose: "yes",
    capitalRights: "equal",
    capitalText: "",
    paidFull: true,
    allocations: {},
    paidAmounts: {},
  },
  step8: { noPscConfirm: false, pscListConfirm: false },
  step9: { directorPersonalCodes: {}, acc1: false, acc2: false, acc3: false },
  introPersonalCode: "",
});
