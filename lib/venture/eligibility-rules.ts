import type { EligibilityAnswers, EligibilityResultItem, SchemeResult } from "./types";

const GBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

/**
 * Simplified rule-of-thumb checks, not a substitute for HMRC guidance.
 * Limits reflect the rules for shares and options issued from 6 April 2026
 * (Finance Act 2026: EIS gross assets £30m before / £35m after issue; EMI gross
 * assets £120m and fewer than 500 employees). Some "specified companies" keep
 * the older, lower limits, so results near a threshold are flagged.
 * Last reviewed: November 2026.
 */
export function computeEligibility(
  answers: EligibilityAnswers
): EligibilityResultItem[] {
  const {
    tradingActivity,
    grossAssetsGBP,
    employeeCount,
    tradeAgeMonths,
    companyIndependent,
  } = answers;

  const assets = grossAssetsGBP ?? 0;
  const employees = employeeCount ?? 0;
  const ageMonths = tradeAgeMonths ?? 0;
  const independent = companyIndependent ?? false;
  const excludedTrade = tradingActivity === "excluded";
  const unsureTrade = tradingActivity === "unsure";

  const results: EligibilityResultItem[] = [];

  // ---- SEIS ----
  results.push(
    evaluate("SEIS", [
      excludedTrade && fail("Your trading activity falls under HMRC's excluded activities list for SEIS."),
      unsureTrade && borderline("Trading activity needs confirming against HMRC's excluded activities list."),
      !independent && fail("The company must not be controlled by another company - independence test failed."),
      assets > 350_000 && fail(`Gross assets of ${GBP.format(assets)} exceed the £350,000 SEIS limit.`),
      employees >= 25 && fail(`${employees} employees exceeds the SEIS limit of fewer than 25 full-time equivalents.`),
      ageMonths > 36 && fail(`Trade age of ${ageMonths} months exceeds the 3-year SEIS trading limit.`),
      ageMonths > 24 && borderline(`Trade age of ${ageMonths} months is close to the 3-year SEIS limit - confirm exact incorporation/trading start date.`),
      assets > 300_000 && borderline(`Gross assets of ${GBP.format(assets)} are close to the £350,000 SEIS limit.`),
      pass("Trading activity, assets, headcount and trading age all sit within SEIS limits."),
    ])
  );

  // ---- EIS ----
  results.push(
    evaluate("EIS", [
      excludedTrade && fail("Your trading activity falls under HMRC's excluded activities list for EIS."),
      unsureTrade && borderline("Trading activity needs confirming against HMRC's excluded activities list."),
      !independent && fail("The company must not be controlled by another company - independence test failed."),
      assets > 30_000_000 && fail(`Gross assets of ${GBP.format(assets)} exceed the £30m EIS limit for shares issued from 6 April 2026.`),
      employees >= 250 && fail(`${employees} employees exceeds the EIS limit of fewer than 250 full-time equivalents.`),
      ageMonths > 84 && fail(`Trade age of ${ageMonths} months exceeds the general 7-year EIS trading limit.`),
      ageMonths > 72 && borderline(`Trade age of ${ageMonths} months is approaching the 7-year EIS limit - knowledge-intensive status may extend this to 10 years.`),
      assets > 25_000_000 && borderline(`Gross assets of ${GBP.format(assets)} are approaching the £30m EIS limit.`),
      assets > 15_000_000 && borderline(`Gross assets of ${GBP.format(assets)} are within the new £30m EIS limit but above the old £15m limit, which still applies to some companies. Worth confirming.`),
      pass("Trading activity, assets, headcount and trading age all sit within EIS limits."),
    ])
  );

  // ---- R&D tax relief ----
  results.push(
    evaluate("R&D", [
      excludedTrade && borderline("Confirm the specific project work counts as a qualifying R&D activity resolving scientific or technological uncertainty."),
      unsureTrade && borderline("Confirm the specific project work counts as a qualifying R&D activity resolving scientific or technological uncertainty."),
      employees >= 500 && borderline(`With ${employees} employees the company is not an SME, so the extra support for loss-making R&D-intensive SMEs is not available. The merged R&D scheme still applies.`),
      pass("For accounting periods starting on or after 1 April 2024, a company doing qualifying R&D claims under the merged R&D scheme, whatever its size."),
    ])
  );

  // ---- EMI ----
  results.push(
    evaluate("EMI", [
      excludedTrade && fail("Your trading activity falls under HMRC's excluded activities list for EMI."),
      unsureTrade && borderline("Trading activity needs confirming against HMRC's excluded activities list for EMI."),
      !independent && fail("The company must not be a 51%+ subsidiary of another company to grant EMI options."),
      assets > 120_000_000 && fail(`Gross assets of ${GBP.format(assets)} exceed the £120m EMI limit for options granted from 6 April 2026.`),
      employees >= 500 && fail(`${employees} employees exceeds the EMI limit of fewer than 500 full-time equivalents for options granted from 6 April 2026.`),
      assets > 100_000_000 && borderline(`Gross assets of ${GBP.format(assets)} are approaching the £120m EMI limit.`),
      (assets > 30_000_000 || employees >= 250) && borderline("Above the old EMI limits (£30m gross assets, 250 employees). The higher limits apply from 6 April 2026, but not to every company. Worth confirming."),
      pass("Trading activity, assets and headcount all sit within EMI limits."),
    ])
  );

  return results;
}

interface Candidate {
  result: SchemeResult;
  reason: string;
}

function fail(reason: string): Candidate {
  return { result: "fail", reason };
}
function borderline(reason: string): Candidate {
  return { result: "borderline", reason };
}
function pass(reason: string): Candidate {
  return { result: "pass", reason };
}

function evaluate(
  scheme: EligibilityResultItem["scheme"],
  candidates: (Candidate | false | null | undefined)[]
): EligibilityResultItem {
  const ordered = candidates.filter(Boolean) as Candidate[];
  const fails = ordered.filter((c) => c.result === "fail");
  const borderlines = ordered.filter((c) => c.result === "borderline");
  const passes = ordered.filter((c) => c.result === "pass");

  const chosen = fails[0] ?? borderlines[0] ?? passes[0] ?? {
    result: "borderline" as SchemeResult,
    reason: "Not enough information to determine eligibility - please review your answers.",
  };

  return { scheme, result: chosen.result, reason: chosen.reason };
}
