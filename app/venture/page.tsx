"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/venture/page-header";
import { OwnershipPie } from "@/components/venture/ownership-pie";
import { StatusPill } from "@/components/venture/status-pill";
import { Expandable } from "@/components/ui/expandable";
import { Button } from "@/components/ui/button";
import {
  effectiveEconomicTerms,
  formatGbpFromPence,
  penceToPounds,
  type FeaInvestor,
  type FeaRaise,
} from "@/lib/fea";
import { useVenture } from "@/lib/venture/store";
import { cn } from "@/lib/utils";

const GBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

function agreementLifecycleStatus(investor: FeaInvestor): string {
  if (investor.registerStatus === "cancelled") return "cancelled";
  if (investor.registerStatus === "converted") return "converted";
  if (investor.registerStatus === "complete") return "complete";
  if (investor.signatureStatus === "signed") return "outstanding";
  if (investor.signatureStatus === "sent") return "sent";
  return "draft";
}

function raiseTotalPence(raise: FeaRaise): number {
  return raise.investors
    .filter(
      (a) =>
        a.registerStatus === "outstanding" ||
        a.registerStatus === "converted" ||
        a.registerStatus === "complete"
    )
    .reduce((sum, a) => sum + a.investmentAmount, 0);
}

function formatLongstopDate(raise: FeaRaise): string {
  const terms = raise.defaultTerms;
  if (terms.longstop.type === "FIXED_DATE") {
    return terms.longstop.date
      ? new Date(terms.longstop.date).toLocaleDateString("en-GB")
      : "-";
  }
  return `${terms.longstop.months} months from agreement`;
}

export default function VentureOverviewPage() {
  const { state } = useVenture();
  const shareholders = state.capTable.shareholders;
  const raises = state.safe.raises;
  const [expandedRaiseId, setExpandedRaiseId] = useState<string | null>(
    raises[0]?.id ?? null
  );

  const totalOutstandingSafePence = raises
    .flatMap((r) => r.investors)
    .filter((a) => a.registerStatus === "outstanding" || a.registerStatus === "complete")
    .reduce((sum, a) => sum + a.investmentAmount, 0);
  const totalRoundsRaised = state.fundingRounds.rounds
    .filter((r) => r.status === "applied_to_cap_table")
    .reduce((sum, r) => sum + r.amountRaised, 0);
  const rdSpend = state.rd.projects.reduce(
    (sum, p) =>
      sum + p.costs.staff + p.costs.subcontractors + p.costs.software + p.costs.consumables,
    0
  );
  const totalShares = shareholders.reduce((s, sh) => s + sh.shares, 0);
  const emiOptionsGranted = state.emi.grants.reduce((s, g) => s + g.numberOfOptions, 0);

  const pieSlices = useMemo(
    () =>
      shareholders.map((sh) => ({
        name: sh.name,
        shares: sh.shares,
      })),
    [shareholders]
  );

  const allInvestors = raises.flatMap((r) => r.investors);

  const stats: {
    label: string;
    value: string;
    color: string;
    imageSrc: string;
  }[] = [
    {
      label: "Funds raised",
      value: GBP.format(penceToPounds(totalOutstandingSafePence) + totalRoundsRaised),
      imageSrc: "/icons/funds.png",
      color: "#D2795A",
    },
    {
      label: "R&D qualifying spend",
      value: GBP.format(rdSpend),
      imageSrc: "/icons/rd.png",
      color: "#3DBE7A",
    },
    {
      label: "No. of shares",
      value: totalShares.toLocaleString(),
      imageSrc: "/icons/cap-table.png",
      color: "#8B7FD6",
    },
    {
      label: "EMI options granted",
      value: emiOptionsGranted.toLocaleString(),
      imageSrc: "/icons/emi.png",
      color: "#E0A458",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="MoonShot AI"
        subtitle="Sample company - fundraising and compliance tools for early-stage UK startups: SEIS/EIS, R&D, cap tables and more. Pick a module from the left to get started."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-4 rounded-lg border border-stone-200 bg-card p-5 shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.imageSrc} alt="" className="h-10 w-10 object-contain" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                {s.label}
              </p>
              <p className="mt-0.5 text-lg font-bold text-stone-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-stone-900">Cap table</h2>
            <p className="mt-1 text-sm text-stone-500">
              {shareholders.length} holder{shareholders.length === 1 ? "" : "s"} ·{" "}
              {totalShares.toLocaleString()} shares
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-md">
            <Link href="/venture/cap-table">
              Open cap table <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
        {pieSlices.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
            No shareholders yet.
          </p>
        ) : (
          <OwnershipPie slices={pieSlices} size={360} />
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-stone-900">
              Future Equity Agreements
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              {formatGbpFromPence(totalOutstandingSafePence)} outstanding across {raises.length}{" "}
              raise{raises.length === 1 ? "" : "s"} · {allInvestors.length} agreement
              {allInvestors.length === 1 ? "" : "s"}
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-md">
            <Link href="/venture/safe">
              Open FEA register <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {raises.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
            No raises yet.
          </p>
        ) : (
          <div className="space-y-3">
            {raises.map((raise) => {
              const expanded = expandedRaiseId === raise.id;
              const total = raiseTotalPence(raise);
              const terms = raise.defaultTerms;
              return (
                <div
                  key={raise.id}
                  className="overflow-hidden rounded-lg border border-stone-200"
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 bg-stone-50/80 px-4 py-3 text-left transition-colors hover:bg-stone-50"
                    onClick={() => setExpandedRaiseId(expanded ? null : raise.id)}
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-stone-400 transition-transform",
                        expanded && "rotate-180"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-semibold text-stone-900">{raise.name}</span>
                        <span className="text-xs text-stone-500">
                          {raise.investors.length} investor
                          {raise.investors.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-stone-500">
                        Cap{" "}
                        {terms.valuationCap != null
                          ? formatGbpFromPence(terms.valuationCap)
                          : terms.fixedValuation != null
                            ? formatGbpFromPence(terms.fixedValuation)
                            : "-"}{" "}
                        · {terms.discountPercent ?? 0}% discount · Longstop{" "}
                        {formatLongstopDate(raise)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold tabular-nums text-stone-900">
                        {formatGbpFromPence(total)}
                      </div>
                      <div className="text-xs uppercase tracking-wide text-stone-400">
                        Total raised
                      </div>
                    </div>
                  </button>

                  <Expandable show={expanded} contentKey={`overview-raise-${raise.id}`}>
                    <div className="overflow-x-auto border-t border-stone-200 bg-card">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-stone-50/50 text-xs uppercase tracking-wide text-stone-500">
                          <tr>
                            <th className="px-4 py-2.5 font-semibold">Investor</th>
                            <th className="px-4 py-2.5 font-semibold text-right">Amount</th>
                            <th className="px-4 py-2.5 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {raise.investors.map((investor) => {
                            const effective = effectiveEconomicTerms(raise, investor);
                            const hasOverrides =
                              investor.overrides &&
                              Object.keys(investor.overrides).length > 0;
                            return (
                              <tr key={investor.id} className="border-t border-stone-100">
                                <td className="px-4 py-3">
                                  <div className="font-medium text-stone-900">
                                    {investor.name}
                                  </div>
                                  {hasOverrides && (
                                    <div className="mt-0.5 text-xs text-amber-700">
                                      Custom terms
                                      {effective.valuationCap != null
                                        ? ` (cap ${formatGbpFromPence(effective.valuationCap)})`
                                        : ""}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums text-stone-600">
                                  {formatGbpFromPence(investor.investmentAmount)}
                                </td>
                                <td className="px-4 py-3">
                                  <StatusPill status={agreementLifecycleStatus(investor)} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Expandable>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
