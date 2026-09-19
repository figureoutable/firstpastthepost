"use client";

import { Banknote, FlaskConical, PieChart, ListChecks } from "lucide-react";
import { PageHeader } from "@/components/venture/page-header";
import { useVenture } from "@/lib/venture/store";
import {
  getSeisEisStatus,
  getRdStatus,
  getCapTableStatus,
  getSafeStatus,
  getEmiStatus,
} from "@/lib/venture/status";

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

export default function VentureOverviewPage() {
  const { state } = useVenture();

  const statuses = [
    getSeisEisStatus(state),
    getRdStatus(state),
    getCapTableStatus(state),
    getSafeStatus(state),
    getEmiStatus(state),
  ];
  const completeCount = statuses.filter((s) => s === "complete").length;

  const totalOutstandingSafe = state.safe.instruments
    .filter((i) => i.status === "outstanding")
    .reduce((sum, i) => sum + i.amount, 0);
  const totalRoundsRaised = state.fundingRounds.rounds
    .filter((r) => r.status === "applied_to_cap_table")
    .reduce((sum, r) => sum + r.amountRaised, 0);
  const rdSpend = state.rd.projects.reduce(
    (sum, p) => sum + p.costs.staff + p.costs.subcontractors + p.costs.software + p.costs.consumables,
    0
  );
  const totalShares = state.capTable.shareholders.reduce((s, sh) => s + sh.shares, 0);

  const stats = [
    {
      label: "Funds raised",
      value: GBP.format(totalOutstandingSafe + totalRoundsRaised),
      icon: Banknote,
      color: "#4C8DFF",
    },
    {
      label: "R&D qualifying spend",
      value: GBP.format(rdSpend),
      icon: FlaskConical,
      color: "#3DBE7A",
    },
    {
      label: "Shareholders on cap table",
      value: `${state.capTable.shareholders.length} · ${totalShares.toLocaleString()} shares`,
      icon: PieChart,
      color: "#8B7FD6",
    },
    {
      label: "Modules complete",
      value: String(completeCount),
      icon: ListChecks,
      color: "#F5C542",
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
            className="flex items-center gap-4 rounded-none border border-stone-200 bg-card p-5 shadow-sm"
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-none"
              style={{ backgroundColor: `${s.color}1F`, color: s.color }}
            >
              <s.icon className="h-5 w-5" />
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
