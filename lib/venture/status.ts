import type { ModuleStatus, VentureState } from "./types";

export function getEligibilityStatus(state: VentureState): ModuleStatus {
  if (state.eligibility.results && state.eligibility.results.length > 0) return "complete";
  if (state.eligibility.answers.tradingActivity) return "in_progress";
  return "not_started";
}

export function getSeisEisStatus(state: VentureState): ModuleStatus {
  if (state.seisEis.submitted) return "complete";
  if (state.seisEis.companyName || state.seisEis.amountSeeking) return "in_progress";
  return "not_started";
}

export function getRdStatus(state: VentureState): ModuleStatus {
  if (state.rd.submitted) return "complete";
  if (state.rd.projects.length > 0) return "in_progress";
  return "not_started";
}

export function getCapTableStatus(state: VentureState): ModuleStatus {
  return state.capTable.shareholders.length > 0 ? "in_progress" : "not_started";
}

export function getSafeStatus(state: VentureState): ModuleStatus {
  return state.safe.instruments.length > 0 ? "in_progress" : "not_started";
}

export function getTermSheetsStatus(state: VentureState): ModuleStatus {
  if (state.termSheets.sheets.some((s) => s.status === "accepted")) return "complete";
  return state.termSheets.sheets.length > 0 ? "in_progress" : "not_started";
}

export function getFundingRoundsStatus(state: VentureState): ModuleStatus {
  if (state.fundingRounds.rounds.some((r) => r.status === "applied_to_cap_table")) return "complete";
  return state.fundingRounds.rounds.length > 0 ? "in_progress" : "not_started";
}

export function getEmiStatus(state: VentureState): ModuleStatus {
  return state.emi.grants.length > 0 ? "in_progress" : "not_started";
}
