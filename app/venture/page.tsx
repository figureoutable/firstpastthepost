"use client";

import { PageHeader } from "@/components/venture/page-header";
import { penceToPounds } from "@/lib/fea/money";
import { useVenture } from "@/lib/venture/store";

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

export default function VentureOverviewPage() {
  const { state } = useVenture();

  const totalOutstandingSafePence = state.safe.raises
    .flatMap((r) => r.investors)
    .filter((a) => a.registerStatus === "outstanding" || a.registerStatus === "complete")
    .reduce((sum, a) => sum + a.investmentAmount, 0);
  const totalRoundsRaised = state.fundingRounds.rounds
    .filter((r) => r.status === "applied_to_cap_table")
    .reduce((sum, r) => sum + r.amountRaised, 0);
  const rdSpend = state.rd.projects.reduce(
    (sum, p) => sum + p.costs.staff + p.costs.subcontractors + p.costs.software + p.costs.consumables,
    0
  );
  const totalShares = state.capTable.shareholders.reduce((s, sh) => s + sh.shares, 0);
  const emiOptionsGranted = state.emi.grants.reduce((s, g) => s + g.numberOfOptions, 0);

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
    <div>
      <PageHeader
        title="MoonShot AI"
        subtitle="Sample company - fundraising and compliance tools for early-stage UK startups: SEIS/EIS, R&D, cap tables and more. Pick a module from the left to get started."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
    </div>
  );
}
