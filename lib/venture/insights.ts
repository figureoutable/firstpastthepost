import type { VentureState } from "./types";
import { MODULES } from "./modules";

/** Suggestions and dates for the Venture overview, worked out from the company's data. */

export type NextStep = { title: string; detail: string; href: string };

export function nextSteps(state: VentureState): NextStep[] {
  const steps: NextStep[] = [];
  const investors = state.safe.raises.flatMap((r) => r.investors);

  if (!state.eligibility.results) {
    steps.push({
      title: "Check what you qualify for",
      detail: "Five quick questions on SEIS, EIS, EMI and R&D relief.",
      href: "/venture/eligibility",
    });
  }
  if (!state.seisEis.submitted) {
    steps.push({
      title: "Finish your advance assurance",
      detail: "Investors usually want SEIS or EIS assurance before they commit.",
      href: "/venture/seis-eis",
    });
  }
  const unsigned = investors.filter((i) => i.registerStatus !== "cancelled" && i.signatureStatus !== "signed").length;
  if (unsigned > 0) {
    steps.push({
      title: `${unsigned} future equity agreement${unsigned === 1 ? "" : "s"} to sign`,
      detail: "Send them out so the money can come in.",
      href: "/venture/safe",
    });
  }
  const draftSheets = state.termSheets.sheets.filter((s) => s.status === "draft").length;
  if (draftSheets > 0) {
    steps.push({
      title: `Decide on ${draftSheets} term sheet${draftSheets === 1 ? "" : "s"}`,
      detail: "Compare the offers side by side, then accept or decline.",
      href: "/venture/term-sheets",
    });
  }
  const draftGrants = state.emi.grants.filter((g) => g.status === "draft").length;
  if (draftGrants > 0) {
    steps.push({
      title: `Grant ${draftGrants} draft EMI option${draftGrants === 1 ? "" : "s"}`,
      detail: "Options only start vesting once they are granted.",
      href: "/venture/emi",
    });
  }
  if (state.rd.projects.length > 0 && !state.rd.submitted) {
    steps.push({
      title: "Send your R&D projects for review",
      detail: "We check your projects and costs before the claim goes in.",
      href: "/venture/rd",
    });
  }
  if (state.capTable.shareholders.length === 0) {
    steps.push({
      title: "Add your shareholders",
      detail: "Everything else builds on an accurate cap table.",
      href: "/venture/cap-table",
    });
  }
  return steps;
}

export function progress(state: VentureState): { done: number; started: number; total: number } {
  const statuses = MODULES.map((m) => m.status(state));
  return {
    done: statuses.filter((s) => s === "complete").length,
    started: statuses.filter((s) => s === "in_progress").length,
    total: statuses.length,
  };
}

export type Milestone = { date: string; title: string; detail: string; href: string; past: boolean };

/** Upcoming deadlines and recent events, newest first for the past, soonest first for the future. */
export function milestones(state: VentureState, now = new Date()): Milestone[] {
  const items: Milestone[] = [];
  for (const raise of state.safe.raises) {
    const longstop = raise.defaultTerms.longstop;
    if (longstop.type === "FIXED_DATE" && longstop.date) {
      items.push({
        date: longstop.date,
        title: `${raise.name} longstop`,
        detail: "Agreements convert or fall due if no round has happened by then.",
        href: "/venture/safe",
        past: new Date(longstop.date) < now,
      });
    }
  }
  for (const event of state.capTable.events) {
    items.push({
      date: event.date,
      title: event.type === "issue" ? "Shares issued" : "Shares transferred",
      detail: event.description,
      href: "/venture/cap-table",
      past: new Date(event.date) < now,
    });
  }
  for (const grant of state.emi.grants) {
    if (!grant.grantDate) continue;
    items.push({
      date: grant.grantDate,
      title: `EMI grant: ${grant.employeeName}`,
      detail: `${grant.numberOfOptions.toLocaleString("en-GB")} options`,
      href: "/venture/emi",
      past: new Date(grant.grantDate) < now,
    });
  }
  const upcoming = items.filter((i) => !i.past).sort((a, b) => a.date.localeCompare(b.date));
  const recent = items.filter((i) => i.past).sort((a, b) => b.date.localeCompare(a.date));
  return [...upcoming.slice(0, 3), ...recent.slice(0, 3)];
}
