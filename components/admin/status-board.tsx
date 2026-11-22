"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Flag, Search } from "lucide-react";
import type { StageState } from "@/lib/engagements/flow";
import { amlState, StagePill } from "./stage-pill";
import { cn } from "@/lib/utils";

export interface BoardRow {
  id: string;
  name: string;
  company?: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  status: "open" | "complete" | "cancelled";
  payment: { state: StageState; label: string };
  letter: { state: StageState; label: string };
  details: { state: StageState; label: string };
  link: { state: StageState; label: string };
  aml: { state: "not_started" | "in_progress" | "passed" | "flagged"; label: string };
  flags: number;
}

type Filter = "all" | "progress" | "attention" | "finished" | "cancelled";

function matches(row: BoardRow, filter: Filter): boolean {
  switch (filter) {
    case "progress":
      return row.status === "open";
    case "attention":
      return row.flags > 0 || row.aml.state === "flagged" || row.payment.state === "problem";
    case "finished":
      return row.status === "complete";
    case "cancelled":
      return row.status === "cancelled";
    default:
      return row.status !== "cancelled";
  }
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function StatusBoard({ rows }: { rows: BoardRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => ({
      all: rows.filter((r) => matches(r, "all")).length,
      progress: rows.filter((r) => matches(r, "progress")).length,
      attention: rows.filter((r) => matches(r, "attention")).length,
      finished: rows.filter((r) => matches(r, "finished")).length,
      cancelled: rows.filter((r) => matches(r, "cancelled")).length,
    }),
    [rows]
  );

  const visible = rows.filter((r) => {
    if (!matches(r, filter)) return false;
    const q = query.trim().toLowerCase();
    return !q || [r.name, r.company, r.email].some((v) => v?.toLowerCase().includes(q));
  });

  const tabs: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "progress", label: "In progress" },
    { id: "attention", label: "Needs attention" },
    { id: "finished", label: "Finished" },
    { id: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-stone-100 p-1" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={filter === t.id}
              onClick={() => setFilter(t.id)}
              className={cn(
                "relative whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                filter === t.id ? "text-stone-900" : "text-stone-500 hover:text-stone-800"
              )}
            >
              {filter === t.id && (
                <motion.span layoutId="board-tab" className="absolute inset-0 rounded-lg bg-white shadow-sm" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
              )}
              <span className="relative">
                {t.label}
                <span className={cn("ml-1.5 tabular-nums", t.id === "attention" && counts.attention ? "text-red-600" : "text-stone-400")}>{counts[t.id]}</span>
              </span>
            </button>
          ))}
        </div>
        <label className="relative block sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, company or email"
            aria-label="Search clients"
            className="h-10 w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-clay-400 focus:ring-2 focus:ring-clay-500/20"
          />
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
          <p className="font-medium text-stone-900">{rows.length === 0 ? "No clients yet" : "Nothing here"}</p>
          <p className="mt-1 text-sm text-stone-500">
            {rows.length === 0 ? "Press New client to send your first link." : "Try another filter or search."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
          <table className="hidden w-full text-left text-sm lg:table">
            <thead className="border-b border-stone-200 bg-stone-50/70 text-xs font-medium text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-3 py-3 font-medium">Link</th>
                <th className="px-3 py-3 font-medium">Letter</th>
                <th className="px-3 py-3 font-medium">Payment</th>
                <th className="px-3 py-3 font-medium">Details</th>
                <th className="px-3 py-3 font-medium">AML</th>
                <th className="px-4 py-3 text-right font-medium">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {visible.map((r) => (
                <tr key={r.id} className="group relative transition-colors hover:bg-stone-50/70">
                  <td className="px-4 py-3">
                    <Link href={`/admin/clients/${r.id}`} className="absolute inset-0" aria-label={`Open ${r.name}`} />
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-stone-900">{r.company || r.name}</span>
                      {r.flags > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">
                          <Flag className="h-3 w-3" /> {r.flags}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone-500">{r.company ? `${r.name} · ${r.email}` : r.email}</div>
                  </td>
                  <td className="px-3 py-3"><StagePill {...r.link} /></td>
                  <td className="px-3 py-3"><StagePill {...r.letter} /></td>
                  <td className="px-3 py-3"><StagePill {...r.payment} /></td>
                  <td className="px-3 py-3"><StagePill {...r.details} /></td>
                  <td className="px-3 py-3"><StagePill state={amlState(r.aml.state)} label={r.aml.label} /></td>
                  <td className="px-4 py-3 text-right text-xs text-stone-500">
                    <span className="inline-flex items-center gap-1">
                      {shortDate(r.updatedAt)} <ArrowRight className="h-3.5 w-3.5 text-stone-300 transition-colors group-hover:text-clay-600" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="divide-y divide-stone-100 lg:hidden">
            {visible.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/clients/${r.id}`} className="block space-y-2.5 px-4 py-4 active:bg-stone-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-stone-900">{r.company || r.name}</p>
                      <p className="truncate text-xs text-stone-500">{r.email}</p>
                    </div>
                    {r.flags > 0 && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                        <Flag className="h-3 w-3" /> {r.flags}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <StagePill {...r.letter} label={`Letter: ${r.letter.label}`} />
                    <StagePill {...r.payment} />
                    <StagePill {...r.details} label={`Details: ${r.details.label}`} />
                    <StagePill state={amlState(r.aml.state)} label={`AML: ${r.aml.label}`} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
