export type {
  ConsiderationType,
  FeaBankDetails,
  FeaCompany,
  FeaCompanySignatory,
  FeaConsideration,
  FeaConsiderationPeriod,
  FeaCurrency,
  FeaCustomTerm,
  FeaEconomicTermOverrides,
  FeaEconomicTerms,
  FeaGeneratedAgreement,
  FeaInvestor,
  FeaInvestorRegisterStatus,
  FeaInvestorSignatures,
  FeaInvestorSignatory,
  FeaInvestorType,
  FeaLongstop,
  FeaOverridableTermKey,
  FeaRaise,
  FeaSignatureStatus,
  FeaState,
  FeaTaxRelief,
  GeneratedAgreementStatus,
  TaxReliefScheme,
  ValuationMechanism,
} from "./types";

export {
  FEA_OVERRIDABLE_TERM_KEYS,
  effectiveEconomicTerms,
  isGeneratedAgreementImmutable,
} from "./types";

export {
  FeaStorageError,
  assertCanMutateGeneratedContent,
  assertValidStatusTransition,
  createCallbackFeaStorage,
  createMemoryFeaStorage,
  emptyFeaState,
  type FeaStorage,
} from "./storage";

export { formatGbpFromPence, penceToPounds, poundsToPence } from "./money";
export { createSeedFeaState } from "./seed";
export { migrateToFeaState } from "./migrate-legacy";
