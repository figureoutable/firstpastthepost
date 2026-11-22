"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, CalendarClock, CheckCircle2, Sparkles } from "lucide-react";
import { OwnershipPie } from "@/components/venture/ownership-pie";
import { AnimatedNumber, ModuleIcon, ProgressRing, StatusDot, stagger } from "@/components/venture/motion-bits";
import { formatGbpFromPence, penceToPounds, type FeaRaise } from "@/lib/fea";
import { GROUPS, MODULES } from "@/lib/venture/modules";
import { milestones, nextSteps, progress } from "@/lib/venture/insights";
import { useVenture } from "@/lib/venture/store";
import type { ModuleStatus } from "@/lib/venture/types";
import { cn } from "@/lib/utils";

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

const STATUS_LABEL: Record<ModuleStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Done",
};

const card = "rounded-2xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)]";

function raisedPence(raise: FeaRaise) {
  return raise.investors
    .filter((i) => ["outstanding", "complete", "converted"].includes(i.registerStatus))
    .reduce((sum, i) => sum + i.investmentAmount, 0);
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function VentureOverviewPage() {
  const { state } = useVenture();
  const company = (state.seisEis.companyName || "").trim() || "Your company";
  const steps = nextSteps(state);
  const { done, started, total } = progress(state);
  const dates = milestones(state);

  const numbers = useMemo(() => {
    const feaPence = state.safe.raises.reduce((sum, r) => sum + raisedPence(r), 0);
    const rounds = state.fundingRounds.rounds
      .filter((r) => r.status === "applied_to_cap_table")
      .reduce((sum, r) => sum + r.amountRaised, 0);
    const rdSpend = state.rd.projects.reduce(
      (sum, p) => sum + p.costs.staff + p.costs.subcontractors + p.costs.software + p.costs.consumables,
      0
    );
    return [
      { label: "Funds raised", value: penceToPounds(feaPence) + rounds, money: true, href: "/venture/safe" },
      { label: "R&D qualifying spend", value: rdSpend, money: true, href: "/venture/rd" },
      {
        label: "Shares in issue",
        value: state.capTable.shareholders.reduce((s, sh) => s + sh.shares, 0),
        money: false,
        href: "/venture/cap-table",
      },
      {
        label: "EMI options granted",
        value: state.emi.grants.reduce((s, g) => s + g.numberOfOptions, 0),
        money: false,
        href: "/venture/emi",
      },
    ];
  }, [state]);

  const slices = useMemo(
    () => state.capTable.shareholders.map((sh) => ({ name: sh.name, shares: sh.shares })),
    [state.capTable.shareholders]
  );

  return (
    <motion.div variants={stagger.container} initial="hidden" animate="show" className="space-y-8 sm:space-y-10">
      {/* Header */}
      <motion.header variants={stagger.item}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-clay-700">Venture</span>
          <span className="rounded-full bg-stone-200/70 px-2 py-0.5 text-[11px] font-medium text-stone-600">Sample data</span>
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">{company}</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-stone-600">
          Raising money, who owns what and your tax reliefs, in one place. Figures checks everything before it goes to HMRC or Companies House.
        </p>
      </motion.header>

      {/* Progress and next steps */}
      <motion.section variants={stagger.item} className={cn(card, "grid gap-6 p-5 sm:p-6 md:grid-cols-[auto_1fr] md:gap-8")}>
        <div className="flex items-center gap-5 md:flex-col md:items-center md:justify-center md:gap-3 md:border-r md:border-stone-100 md:pr-8">
          <ProgressRing value={done} total={total} size={112} stroke={10}>
            <span className="text-2xl font-semibold tabular-nums text-stone-900">
              {done}/{total}
            </span>
            <span className="text-[11px] text-stone-500">done</span>
          </ProgressRing>
          <div className="md:text-center">
            <p className="text-sm font-semibold text-stone-900">Your progress</p>
            <p className="text-sm text-stone-500">{started} in progress</p>
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-clay-600" />
            <h2 className="text-base font-semibold text-stone-900">What to do next</h2>
          </div>
          {steps.length === 0 ? (
            <p className="flex items-center gap-2 rounded-xl bg-forest-50 px-4 py-3 text-sm text-forest-800">
              <CheckCircle2 className="h-4 w-4" /> You are all caught up. Nice work.
            </p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {steps.slice(0, 3).map((step, i) => (
                <li key={step.title}>
                  <Link
                    href={step.href}
                    className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-stone-50"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-clay-50 text-xs font-semibold text-clay-700 ring-1 ring-inset ring-clay-100">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-stone-900">{step.title}</span>
                      <span className="block text-sm text-stone-500">{step.detail}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5 group-hover:text-clay-600" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.section>

      {/* Key numbers */}
      <motion.section variants={stagger.item} aria-label="Key numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {numbers.map((n) => (
          <Link
            key={n.label}
            href={n.href}
            className={cn(card, "group p-4 transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-5")}
          >
            <p className="flex items-center justify-between text-xs font-medium text-stone-500">
              {n.label}
              <ArrowUpRight className="h-3.5 w-3.5 text-stone-300 transition-colors group-hover:text-clay-600" />
            </p>
            <AnimatedNumber
              value={n.value}
              format={n.money ? (v) => GBP.format(Math.round(v)) : undefined}
              className="mt-1 block text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl"
            />
          </Link>
        ))}
      </motion.section>

      {/* Modules */}
      {GROUPS.map((group) => (
        <motion.section key={group} variants={stagger.item} className="space-y-3">
          <h2 className="text-sm font-semibold text-stone-900">{group}</h2>
          <motion.div
            variants={stagger.container}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
          >
            {MODULES.filter((m) => m.group === group).map((m) => {
              const status = m.status(state);
              return (
                <motion.div key={m.href} variants={stagger.item} whileHover={{ y: -3 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
                  <Link
                    href={m.href}
                    className={cn(
                      card,
                      "group flex h-full flex-col gap-4 p-5 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <ModuleIcon module={m} />
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-50 px-2.5 py-1 text-xs text-stone-600 ring-1 ring-inset ring-stone-200">
                        <StatusDot status={status} /> {STATUS_LABEL[status]}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-stone-900">{m.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-stone-500">{m.description}</p>
                    </div>
                    <div className="flex items-center justify-between border-t border-stone-100 pt-3 text-sm">
                      <span className="truncate text-stone-700">{m.metric(state)}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-stone-300 transition-all group-hover:translate-x-0.5 group-hover:text-clay-600" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.section>
      ))}

      {/* Ownership */}
      <motion.section variants={stagger.item} className={cn(card, "p-5 sm:p-6")}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-stone-900">Who owns what</h2>
            <p className="text-sm text-stone-500">From your cap table. Hover a name to highlight it.</p>
          </div>
          <Link href="/venture/cap-table" className="inline-flex items-center gap-1 text-sm font-medium text-clay-700 hover:text-clay-800">
            Open <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {slices.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
            No shareholders yet.
          </p>
        ) : (
          <OwnershipPie slices={slices} size={340} />
        )}
      </motion.section>

      {/* Key dates and future equity */}
      <motion.div variants={stagger.item} className="grid gap-4 lg:grid-cols-5">
        <section className={cn(card, "p-5 sm:p-6 lg:col-span-2")}>
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-clay-600" />
            <h2 className="text-base font-semibold text-stone-900">Key dates</h2>
          </div>
          {dates.length === 0 ? (
            <p className="text-sm text-stone-500">Dates appear here as you add raises, share issues and grants.</p>
          ) : (
            <ol className="relative space-y-4 border-l border-stone-200 pl-5">
              {dates.map((d) => (
                <li key={`${d.title}-${d.date}`} className="relative">
                  <span
                    className={cn(
                      "absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white",
                      d.past ? "bg-stone-300" : "bg-clay-500"
                    )}
                  />
                  <Link href={d.href} className="group block">
                    <p className="text-xs font-medium text-stone-500">
                      {d.past ? shortDate(d.date) : `Coming up: ${shortDate(d.date)}`}
                    </p>
                    <p className="text-sm font-medium text-stone-900 group-hover:text-clay-700">{d.title}</p>
                    <p className="line-clamp-1 text-sm text-stone-500">{d.detail}</p>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className={cn(card, "p-5 sm:p-6 lg:col-span-3")}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-stone-900">Future equity raises</h2>
              <p className="text-sm text-stone-500">Signed and paid so far, against what investors have agreed</p>
            </div>
            <Link href="/venture/safe" className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-clay-700 hover:text-clay-800">
              Open <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {state.safe.raises.length === 0 ? (
            <p className="text-sm text-stone-500">No raises yet.</p>
          ) : (
            <ul className="space-y-5">
              {state.safe.raises.map((raise, i) => {
                const raised = raisedPence(raise);
                const pledged = raise.investors
                  .filter((inv) => inv.registerStatus !== "cancelled")
                  .reduce((sum, inv) => sum + inv.investmentAmount, 0);
                const pct = pledged > 0 ? Math.round((raised / pledged) * 100) : 0;
                return (
                  <li key={raise.id}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <p className="font-medium text-stone-900">{raise.name}</p>
                      <p className="text-sm tabular-nums text-stone-600">
                        <span className="font-semibold text-stone-900">{formatGbpFromPence(raised)}</span> of{" "}
                        {formatGbpFromPence(pledged)}
                      </p>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-clay-400 to-clay-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.9, delay: 0.3 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-stone-500">
                      {raise.investors.length} investor{raise.investors.length === 1 ? "" : "s"} · {pct}% in
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </motion.div>
    </motion.div>
  );
}
