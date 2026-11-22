import type { ModuleStatus, VentureState } from "./types";
import {
  getCapTableStatus,
  getEligibilityStatus,
  getEmiStatus,
  getFundingRoundsStatus,
  getRdStatus,
  getSafeStatus,
  getSeisEisStatus,
  getTermSheetsStatus,
} from "./status";
import { penceToPounds } from "@/lib/fea";

/** One place that describes every Venture module: navigation, overview cards and statuses. */

export type ModuleGroup = "Raise money" | "Ownership" | "Tax relief";

export type VentureModule = {
  href: string;
  title: string;
  /** One line for cards. */
  description: string;
  group: ModuleGroup;
  /** Image icon in /public/icons, or a lucide icon name used by ModuleIcon. */
  image?: string;
  icon?: "badge-check" | "file-signature" | "trending-up";
  status: (state: VentureState) => ModuleStatus;
  /** Short fact shown on the overview card. */
  metric: (state: VentureState) => string;
};

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export const MODULES: VentureModule[] = [
  {
    href: "/venture/eligibility",
    title: "Eligibility check",
    description: "Five questions to see if you qualify for SEIS, EIS, EMI and R&D relief.",
    group: "Raise money",
    icon: "badge-check",
    status: getEligibilityStatus,
    metric: (s) =>
      s.eligibility.results
        ? `${s.eligibility.results.filter((r) => r.result === "pass").length} of 4 schemes look likely`
        : "Takes about two minutes",
  },
  {
    href: "/venture/seis-eis",
    title: "SEIS / EIS",
    description: "Prepare your advance assurance application for HMRC.",
    group: "Raise money",
    image: "/icons/seis-eis.png",
    status: getSeisEisStatus,
    metric: (s) =>
      s.seisEis.submitted
        ? "Ready for review"
        : s.seisEis.amountSeeking
          ? `Raising ${GBP.format(s.seisEis.amountSeeking)}`
          : "Not started",
  },
  {
    href: "/venture/safe",
    title: "Future equity",
    description: "Raise now, convert to shares later, with UK future equity agreements.",
    group: "Raise money",
    image: "/icons/future-equity.png",
    status: getSafeStatus,
    metric: (s) => {
      const investors = s.safe.raises.flatMap((r) => r.investors);
      const total = investors
        .filter((i) => ["outstanding", "complete", "converted"].includes(i.registerStatus))
        .reduce((sum, i) => sum + i.investmentAmount, 0);
      return investors.length ? `${GBP.format(penceToPounds(total))} from ${plural(investors.length, "investor")}` : "No raises yet";
    },
  },
  {
    href: "/venture/term-sheets",
    title: "Term sheets",
    description: "Record offers from investors and compare them side by side.",
    group: "Raise money",
    icon: "file-signature",
    status: getTermSheetsStatus,
    metric: (s) => (s.termSheets.sheets.length ? plural(s.termSheets.sheets.length, "term sheet") : "None yet"),
  },
  {
    href: "/venture/funding-round",
    title: "Funding rounds",
    description: "Model a priced round and see what it does to your cap table.",
    group: "Raise money",
    icon: "trending-up",
    status: getFundingRoundsStatus,
    metric: (s) => (s.fundingRounds.rounds.length ? plural(s.fundingRounds.rounds.length, "round") : "None yet"),
  },
  {
    href: "/venture/cap-table",
    title: "Cap table",
    description: "Who owns what, share classes, and every issue and transfer.",
    group: "Ownership",
    image: "/icons/cap-table.png",
    status: getCapTableStatus,
    metric: (s) => {
      const shares = s.capTable.shareholders.reduce((sum, sh) => sum + sh.shares, 0);
      return s.capTable.shareholders.length
        ? `${plural(s.capTable.shareholders.length, "holder")}, ${shares.toLocaleString("en-GB")} shares`
        : "No shareholders yet";
    },
  },
  {
    href: "/venture/emi",
    title: "EMI share options",
    description: "Set up your option pool and record grants to your team.",
    group: "Ownership",
    image: "/icons/emi.png",
    status: getEmiStatus,
    metric: (s) => {
      const options = s.emi.grants.reduce((sum, g) => sum + g.numberOfOptions, 0);
      return s.emi.grants.length ? `${options.toLocaleString("en-GB")} options, ${plural(s.emi.grants.length, "grant")}` : "No grants yet";
    },
  },
  {
    href: "/venture/rd",
    title: "R&D tax relief",
    description: "Log your projects and costs, ready for your claim.",
    group: "Tax relief",
    image: "/icons/rd.png",
    status: getRdStatus,
    metric: (s) => {
      const spend = s.rd.projects.reduce(
        (sum, p) => sum + p.costs.staff + p.costs.subcontractors + p.costs.software + p.costs.consumables,
        0
      );
      return s.rd.projects.length ? `${GBP.format(spend)} across ${plural(s.rd.projects.length, "project")}` : "No projects yet";
    },
  },
];

export const GROUPS: ModuleGroup[] = ["Raise money", "Ownership", "Tax relief"];

export function moduleFor(pathname: string): VentureModule | undefined {
  return MODULES.find((m) => pathname === m.href || pathname.startsWith(`${m.href}/`));
}
