"use client";

import { useMemo, useState } from "react";
import {
  PieChart,
  Plus,
  ArrowLeftRight,
  History,
  ChevronDown,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { PageHeader } from "@/components/venture/page-header";
import { ModuleIntro } from "@/components/venture/module-intro";
import { OwnershipPie } from "@/components/venture/ownership-pie";
import { FormSection } from "@/components/venture/form-section";
import { StubAction } from "@/components/venture/stub-action";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import GradientButton from "@/components/kokonutui/gradient-button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useVenture, genId } from "@/lib/venture/store";
import { getCapTableStatus } from "@/lib/venture/status";

const CLASS_TYPE_MEANINGS: Record<string, string> = {
  Ordinary:
    "Standard voting shares, usually held by founders and early employees. One share, one vote, and equal rights to dividends and capital on a sale or winding up.",
  "Ordinary A":
    "Often used for angel or early investors. Economically similar to Ordinary shares, but may sit in a separate class so investor-specific rights (information, vetoes, anti-dilution) can be attached without rewriting founder shares.",
  "Preference / Preferred":
    "Typically issued in priced funding rounds. Preferential rights usually include a liquidation preference (getting money back first) and sometimes anti-dilution protection.",
  "EMI / Option pool":
    "Shares reserved for employee share options under an EMI scheme. Unallocated pool shares are not yet owned by employees; they dilute everyone when options are granted and exercised.",
  "Deferred / Growth":
    "Shares that only participate in value above a hurdle (e.g. after investors reach a return). Used for later hires or advisers so economics stay founder/investor-friendly.",
  "Non-voting":
    "Economic rights without board or shareholder voting power. Sometimes used for employees or family members who should share in upside but not control decisions.",
};

const CLASS_TYPES = Object.keys(CLASS_TYPE_MEANINGS);

const GBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const DEFAULT_SHARE_CLASSES = [
  { id: "sc-1", name: "Ordinary", classType: "Ordinary", nominalValue: 0.01 },
  { id: "sc-2", name: "Ordinary A", classType: "Ordinary A", nominalValue: 0.01 },
];

export default function CapTablePage() {
  const { state, setState } = useVenture();
  const status = getCapTableStatus(state);
  const { shareholders, events } = state.capTable;
  const shareClasses = state.capTable.shareClasses?.length
    ? state.capTable.shareClasses
    : DEFAULT_SHARE_CLASSES;

  const [activeFlow, setActiveFlow] = useState<"none" | "add" | "record">("none");
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [removingClassId, setRemovingClassId] = useState<string | null>(null);
  const [reassignTarget, setReassignTarget] = useState("");

  const updateShareClass = (
    id: string,
    patch: Partial<{ name: string; classType: string; nominalValue: number }>
  ) => {
    setState((prev) => {
      const current = prev.capTable.shareClasses?.length
        ? prev.capTable.shareClasses
        : DEFAULT_SHARE_CLASSES;
      const existing = current.find((sc) => sc.id === id);
      const nextClasses = current.map((sc) => (sc.id === id ? { ...sc, ...patch } : sc));
      let nextShareholders = prev.capTable.shareholders;
      if (patch.name != null && existing && existing.name !== patch.name) {
        nextShareholders = prev.capTable.shareholders.map((sh) =>
          sh.shareClass === existing.name ? { ...sh, shareClass: patch.name! } : sh
        );
      }
      return {
        ...prev,
        capTable: {
          ...prev.capTable,
          shareClasses: nextClasses,
          shareholders: nextShareholders,
        },
      };
    });
  };

  const addShareClass = () => {
    const id = genId("sc");
    setState((prev) => {
      const current = prev.capTable.shareClasses?.length
        ? prev.capTable.shareClasses
        : DEFAULT_SHARE_CLASSES;
      return {
        ...prev,
        capTable: {
          ...prev.capTable,
          shareClasses: [
            ...current,
            { id, name: "New share class", classType: "Ordinary", nominalValue: 0.01 },
          ],
        },
      };
    });
    setExpandedClassId(id);
  };

  const removeShareClass = (id: string, reassignTo?: string) => {
    setState((prev) => {
      const current = prev.capTable.shareClasses?.length
        ? prev.capTable.shareClasses
        : DEFAULT_SHARE_CLASSES;
      const target = current.find((sc) => sc.id === id);
      if (!target) return prev;
      const nextClasses = current.filter((sc) => sc.id !== id);
      let nextShareholders = prev.capTable.shareholders;
      if (reassignTo) {
        nextShareholders = prev.capTable.shareholders.map((sh) =>
          sh.shareClass === target.name ? { ...sh, shareClass: reassignTo } : sh
        );
      }
      return {
        ...prev,
        capTable: {
          ...prev.capTable,
          shareClasses: nextClasses,
          shareholders: nextShareholders,
        },
      };
    });
    setExpandedClassId((cur) => (cur === id ? null : cur));
    setRemovingClassId(null);
    setReassignTarget("");
  };

  const moveHolderToClass = (shareholderId: string, newClass: string) => {
    setState((prev) => ({
      ...prev,
      capTable: {
        ...prev.capTable,
        shareholders: prev.capTable.shareholders.map((sh) =>
          sh.id === shareholderId ? { ...sh, shareClass: newClass } : sh
        ),
      },
    }));
  };

  const totalShares = useMemo(() => shareholders.reduce((s, sh) => s + sh.shares, 0), [shareholders]);

  type SortKey = "name" | "role" | "shareClass" | "shares" | "pct";
  const [sortKey, setSortKey] = useState<SortKey>("shares");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "role" || key === "shareClass" ? "asc" : "desc");
    }
  };

  const sortedShareholders = useMemo(() => {
    const list = [...shareholders];
    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "role":
          cmp = (a.role ?? "").localeCompare(b.role ?? "");
          break;
        case "shareClass":
          cmp = a.shareClass.localeCompare(b.shareClass);
          break;
        case "shares":
          cmp = a.shares - b.shares;
          break;
        case "pct":
          cmp = a.shares - b.shares;
          break;
      }
      return cmp * dir;
    });
    return list;
  }, [shareholders, sortKey, sortDir]);

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) {
      return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    }
    return sortDir === "asc" ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    );
  };

  const [addForm, setAddForm] = useState({ name: "", role: "", shareClass: "Ordinary", shares: "" });
  const [recordForm, setRecordForm] = useState({
    type: "issue" as "issue" | "transfer",
    fromId: "",
    toName: "",
    toExisting: "",
    shares: "",
  });

  const resetForms = () => {
    setAddForm({ name: "", role: "", shareClass: "Ordinary", shares: "" });
    setRecordForm({ type: "issue", fromId: "", toName: "", toExisting: "", shares: "" });
  };

  const submitAdd = () => {
    const shares = Number(addForm.shares) || 0;
    if (!addForm.name.trim() || shares <= 0) return;
    setState((prev) => ({
      ...prev,
      capTable: {
        ...prev.capTable,
        shareholders: [
          ...prev.capTable.shareholders,
          {
            id: genId("sh"),
            name: addForm.name.trim(),
            role: addForm.role.trim() || undefined,
            shareClass: addForm.shareClass,
            shares,
          },
        ],
        events: [
          {
            id: genId("ev"),
            type: "issue",
            date: new Date().toISOString(),
            description: `${shares.toLocaleString()} ${addForm.shareClass} shares issued to ${addForm.name.trim()} (new shareholder).`,
          },
          ...prev.capTable.events,
        ],
      },
    }));
    resetForms();
    setActiveFlow("none");
  };

  const submitRecord = () => {
    const shares = Number(recordForm.shares) || 0;
    if (shares <= 0) return;

    if (recordForm.type === "issue") {
      const targetName = recordForm.toExisting || recordForm.toName.trim();
      if (!targetName) return;
      setState((prev) => {
        const existing = prev.capTable.shareholders.find((sh) => sh.id === recordForm.toExisting);
        let shareholders;
        if (existing) {
          shareholders = prev.capTable.shareholders.map((sh) =>
            sh.id === existing.id ? { ...sh, shares: sh.shares + shares } : sh
          );
        } else {
          shareholders = [
            ...prev.capTable.shareholders,
            { id: genId("sh"), name: targetName, shareClass: "Ordinary", shares },
          ];
        }
        return {
          ...prev,
          capTable: {
            ...prev.capTable,
            shareholders,
            events: [
              {
                id: genId("ev"),
                type: "issue",
                date: new Date().toISOString(),
                description: `${shares.toLocaleString()} shares issued to ${targetName}.`,
              },
              ...prev.capTable.events,
            ],
          },
        };
      });
    } else {
      const from = shareholders.find((sh) => sh.id === recordForm.fromId);
      const targetName = recordForm.toExisting || recordForm.toName.trim();
      if (!from || !targetName || shares > from.shares) return;
      setState((prev) => {
        let shareholdersNext = prev.capTable.shareholders.map((sh) =>
          sh.id === from.id ? { ...sh, shares: sh.shares - shares } : sh
        );
        const existingTarget = shareholdersNext.find((sh) => sh.id === recordForm.toExisting);
        if (existingTarget) {
          shareholdersNext = shareholdersNext.map((sh) =>
            sh.id === existingTarget.id ? { ...sh, shares: sh.shares + shares } : sh
          );
        } else {
          shareholdersNext = [
            ...shareholdersNext,
            { id: genId("sh"), name: targetName, shareClass: from.shareClass, shares },
          ];
        }
        return {
          ...prev,
          capTable: {
            ...prev.capTable,
            shareholders: shareholdersNext,
            events: [
              {
                id: genId("ev"),
                type: "transfer",
                date: new Date().toISOString(),
                description: `${shares.toLocaleString()} shares transferred from ${from.name} to ${targetName}.`,
              },
              ...prev.capTable.events,
            ],
          },
        };
      });
    }
    resetForms();
    setActiveFlow("none");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cap Table Management"
        subtitle="Track shareholders, share classes and ownership percentages - updated live as shares are issued or transferred."
      />

      <ModuleIntro
        icon={PieChart}
        title="Your Cap Table"
        description="A live record of who owns what. Add shareholders, record share issues or transfers, and see ownership percentages recalculate instantly."
        color="#8B7FD6"
        status={status}
        hideIcon
        hideStatus
        visual={
          <OwnershipPie
            size={400}
            slices={shareholders.map((sh) => ({ name: sh.name, shares: sh.shares }))}
          />
        }
      />

      <div className="rounded-sm border border-border bg-card p-6 sm:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-stone-900">Shareholders</h2>
            <p className="mt-1 text-sm text-stone-500">
              {totalShares.toLocaleString()} total shares in issue
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                resetForms();
                setActiveFlow(activeFlow === "add" ? "none" : "add");
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add shareholder
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                resetForms();
                setActiveFlow(activeFlow === "record" ? "none" : "record");
              }}
            >
              <ArrowLeftRight className="mr-1.5 h-4 w-4" /> Record issue / transfer
            </Button>
          </div>
        </div>

        {activeFlow === "add" && (
          <div className="mb-6">
            <FormSection title="Add shareholder">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[160px] flex-1 space-y-2">
                  <Label htmlFor="addName">Name *</Label>
                  <Input
                    id="addName"
                    value={addForm.name}
                    onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="min-w-[140px] flex-1 space-y-2">
                  <Label htmlFor="addRole">Role</Label>
                  <Input
                    id="addRole"
                    placeholder="e.g. Founder"
                    value={addForm.role}
                    onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}
                  />
                </div>
                <div className="min-w-[140px] flex-1 space-y-2">
                  <Label htmlFor="addClass">Share class</Label>
                  <select
                    id="addClass"
                    className="flex h-12 w-full rounded-md border border-stone-200 bg-card px-4 py-2 text-sm text-stone-700 focus-visible:border-forest-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/20"
                    value={addForm.shareClass}
                    onChange={(e) => setAddForm((f) => ({ ...f, shareClass: e.target.value }))}
                  >
                    {shareClasses.map((sc) => (
                      <option key={sc.id} value={sc.name}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[140px] flex-1 space-y-2">
                  <Label htmlFor="addShares">Number of shares *</Label>
                  <Input
                    id="addShares"
                    type="number"
                    min={0}
                    value={addForm.shares}
                    onChange={(e) => setAddForm((f) => ({ ...f, shares: e.target.value }))}
                  />
                </div>
                <div className="flex shrink-0 gap-3">
                  <GradientButton type="button" onClick={submitAdd}>
                    Add shareholder
                  </GradientButton>
                  <Button variant="outline" onClick={() => setActiveFlow("none")}>
                    Cancel
                  </Button>
                </div>
              </div>
            </FormSection>
          </div>
        )}

        {activeFlow === "record" && (
          <div className="mb-6">
            <FormSection title="Record a share issue or transfer">
              <RadioGroup
                value={recordForm.type}
                onValueChange={(v) => setRecordForm((f) => ({ ...f, type: v as "issue" | "transfer" }))}
                className="grid grid-cols-1 gap-3 sm:grid-cols-2"
              >
                {[
                  { value: "issue", label: "Issue new shares" },
                  { value: "transfer", label: "Transfer existing shares" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-3 rounded-md border border-stone-200 bg-card p-4 text-sm text-stone-700 transition-colors hover:border-forest-300"
                  >
                    <RadioGroupItem value={opt.value} id={`rec-${opt.value}`} />
                    {opt.label}
                  </label>
                ))}
              </RadioGroup>

              {recordForm.type === "transfer" && (
                <div className="space-y-2">
                  <Label>From shareholder *</Label>
                  <select
                    className="flex h-12 w-full rounded-md border border-stone-200 bg-card px-4 py-2 text-sm text-stone-700 focus-visible:border-forest-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/20"
                    value={recordForm.fromId}
                    onChange={(e) => setRecordForm((f) => ({ ...f, fromId: e.target.value }))}
                  >
                    <option value="">Select shareholder…</option>
                    {shareholders.map((sh) => (
                      <option key={sh.id} value={sh.id}>
                        {sh.name} ({sh.shares.toLocaleString()} shares)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>To (existing shareholder)</Label>
                  <select
                    className="flex h-12 w-full rounded-md border border-stone-200 bg-card px-4 py-2 text-sm text-stone-700 focus-visible:border-forest-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/20"
                    value={recordForm.toExisting}
                    onChange={(e) => setRecordForm((f) => ({ ...f, toExisting: e.target.value, toName: "" }))}
                  >
                    <option value="">- or type a new name →</option>
                    {shareholders.map((sh) => (
                      <option key={sh.id} value={sh.id}>
                        {sh.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toName">Or new shareholder name</Label>
                  <Input
                    id="toName"
                    disabled={!!recordForm.toExisting}
                    value={recordForm.toName}
                    onChange={(e) => setRecordForm((f) => ({ ...f, toName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="max-w-xs space-y-2">
                <Label htmlFor="recShares">Number of shares *</Label>
                <Input
                  id="recShares"
                  type="number"
                  min={0}
                  value={recordForm.shares}
                  onChange={(e) => setRecordForm((f) => ({ ...f, shares: e.target.value }))}
                />
              </div>

              <div className="flex gap-3">
                <GradientButton type="button" onClick={submitRecord}>
                  Record
                </GradientButton>
                <Button variant="outline" onClick={() => setActiveFlow("none")}>
                  Cancel
                </Button>
              </div>
            </FormSection>
          </div>
        )}

        <div className="overflow-x-auto rounded-md border border-stone-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                {(
                  [
                    { key: "name" as const, label: "Shareholder", align: "left" },
                    { key: "role" as const, label: "Role", align: "left" },
                    { key: "shareClass" as const, label: "Share class", align: "left" },
                    { key: "shares" as const, label: "Shares", align: "right" },
                    { key: "pct" as const, label: "%", align: "right" },
                  ] as const
                ).map((col) => (
                  <th key={col.key} className={cn("px-4 py-3 font-semibold", col.align === "right" && "text-right")}>
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={cn(
                        "inline-flex items-center hover:text-stone-800",
                        col.align === "right" && "ml-auto",
                        sortKey === col.key && "text-stone-800"
                      )}
                    >
                      {col.label}
                      <SortIcon column={col.key} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedShareholders.map((sh) => (
                <tr key={sh.id} className="border-t border-stone-100">
                  <td className="px-4 py-3 font-medium text-stone-900">{sh.name}</td>
                  <td className="px-4 py-3 text-stone-600">{sh.role ?? "-"}</td>
                  <td className="px-4 py-3 text-stone-600">{sh.shareClass}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-stone-600">
                    {sh.shares.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-forest-700">
                    {totalShares > 0 ? ((sh.shares / totalShares) * 100).toFixed(2) : "0.00"}%
                  </td>
                </tr>
              ))}
              {sortedShareholders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-stone-400">
                    No shareholders yet.
                  </td>
                </tr>
              )}
            </tbody>
            {shareholders.length > 0 && (
              <tfoot>
                <tr className="border-t border-stone-200 bg-stone-50/70 font-semibold text-stone-900">
                  <td className="px-4 py-3" colSpan={3}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{totalShares.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">100.00%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="rounded-sm border border-border bg-card p-6 sm:p-8">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="mb-1 text-lg font-semibold text-stone-900">Share classes</h3>
            <p className="text-sm text-stone-500">
              Click a class to see who holds it. Rename any class if you like.
            </p>
          </div>
          <Button variant="outline" onClick={addShareClass}>
            <Plus className="mr-1.5 h-4 w-4" /> Add class
          </Button>
        </div>

        <div className="divide-y divide-stone-200 rounded-md border border-stone-200">
          {shareClasses.map((sc) => {
            const expanded = expandedClassId === sc.id;
            const holders = shareholders.filter((sh) => sh.shareClass === sc.name);
            const holderShares = holders.reduce((sum, sh) => sum + sh.shares, 0);
            const definition =
              CLASS_TYPE_MEANINGS[sc.classType] ?? CLASS_TYPE_MEANINGS[sc.name] ?? "";

            const removing = removingClassId === sc.id;
            const otherClasses = shareClasses.filter((other) => other.id !== sc.id);
            const canRemove = shareClasses.length > 1;
            const nominalValue = sc.nominalValue ?? 0;
            const totalNominalValue = nominalValue * holderShares;

            return (
              <div key={sc.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-stone-50"
                  onClick={() => setExpandedClassId(expanded ? null : sc.id)}
                >
                  <Input
                    value={sc.name}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateShareClass(sc.id, { name: e.target.value })}
                    className="h-9 max-w-[160px] shrink-0 rounded-md px-2 text-sm font-semibold"
                  />
                  <p className="min-w-0 flex-1 truncate text-sm text-stone-500">{definition}</p>
                  <span className="hidden shrink-0 text-xs text-stone-400 sm:inline">
                    {holderShares.toLocaleString()} shares issued
                  </span>
                  <span className="hidden shrink-0 text-xs text-stone-400 sm:inline">
                    {GBP.format(totalNominalValue)} nominal
                  </span>
                  <span className="shrink-0 text-xs text-stone-400">
                    {holders.length} holder{holders.length === 1 ? "" : "s"}
                  </span>
                  <button
                    type="button"
                    title={canRemove ? "Remove class" : "You need at least one share class"}
                    disabled={!canRemove}
                    className="shrink-0 rounded-md p-1.5 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-stone-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!canRemove) return;
                      if (holders.length === 0) {
                        removeShareClass(sc.id);
                        return;
                      }
                      setReassignTarget(otherClasses[0]?.name ?? "");
                      setRemovingClassId(removing ? null : sc.id);
                      if (!expanded) setExpandedClassId(sc.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-stone-400 transition-transform",
                      expanded && "rotate-180"
                    )}
                  />
                </button>

                {removing && (
                  <div className="space-y-3 border-t border-stone-100 bg-red-50/60 px-4 py-4">
                    <p className="text-sm font-medium text-stone-900">
                      Remove &ldquo;{sc.name}&rdquo;? Reassign its {holders.length} holder
                      {holders.length === 1 ? "" : "s"} to another class first.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <select
                        className="flex h-10 min-w-[180px] rounded-md border border-stone-200 bg-card px-3 text-sm text-stone-700"
                        value={reassignTarget}
                        onChange={(e) => setReassignTarget(e.target.value)}
                      >
                        {otherClasses.map((other) => (
                          <option key={other.id} value={other.name}>
                            {other.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-100"
                        onClick={() => removeShareClass(sc.id, reassignTarget)}
                        disabled={!reassignTarget}
                      >
                        Reassign &amp; remove class
                      </Button>
                      <Button variant="outline" onClick={() => setRemovingClassId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {expanded && (
                  <div className="space-y-3 border-t border-stone-100 bg-stone-50/60 px-4 py-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Class type</Label>
                        <select
                          className="flex h-10 w-full rounded-md border border-stone-200 bg-card px-3 text-sm text-stone-700"
                          value={sc.classType}
                          onChange={(e) => updateShareClass(sc.id, { classType: e.target.value })}
                        >
                          {CLASS_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nominal value per share (£)</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.0001}
                          className="h-10"
                          value={nominalValue}
                          onChange={(e) =>
                            updateShareClass(sc.id, { nominalValue: Number(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="flex flex-col justify-end gap-0.5 text-sm text-stone-500">
                        <span>
                          <span className="font-semibold text-stone-900">
                            {holderShares.toLocaleString()}
                          </span>{" "}
                          shares issued
                        </span>
                        <span>
                          <span className="font-semibold text-stone-900">
                            {GBP.format(totalNominalValue)}
                          </span>{" "}
                          total nominal value
                        </span>
                      </div>
                    </div>

                    {holders.length === 0 ? (
                      <p className="text-sm text-stone-400">No holders in this class yet.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-md border border-stone-200 bg-card">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                            <tr>
                              <th className="px-3 py-2 font-semibold">Name</th>
                              <th className="px-3 py-2 font-semibold">Role</th>
                              <th className="px-3 py-2 font-semibold text-right">%</th>
                              <th className="px-3 py-2 font-semibold text-right">No. shares</th>
                              <th className="px-3 py-2 font-semibold">Move to</th>
                            </tr>
                          </thead>
                          <tbody>
                            {holders.map((sh) => (
                              <tr key={sh.id} className="border-t border-stone-100">
                                <td className="px-3 py-2 font-medium text-stone-900">{sh.name}</td>
                                <td className="px-3 py-2 text-stone-500">{sh.role ?? "-"}</td>
                                <td className="px-3 py-2 text-right tabular-nums text-stone-600">
                                  {totalShares > 0
                                    ? ((sh.shares / totalShares) * 100).toFixed(1)
                                    : "0.0"}
                                  %
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-stone-600">
                                  {sh.shares.toLocaleString()}
                                </td>
                                <td className="px-3 py-2">
                                  <select
                                    className="flex h-8 rounded-md border border-stone-200 bg-card px-2 text-xs text-stone-700"
                                    value={sc.name}
                                    onChange={(e) => moveHolderToClass(sh.id, e.target.value)}
                                  >
                                    <option value={sc.name}>{sc.name}</option>
                                    {otherClasses.map((other) => (
                                      <option key={other.id} value={other.name}>
                                        {other.name}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {events.length > 0 && (
        <div className="rounded-sm border border-border bg-card p-6 sm:p-8">
          <div className="mb-4 flex items-center gap-2">
            <History className="h-4 w-4 text-stone-400" />
            <h3 className="text-lg font-semibold text-stone-900">Share history</h3>
          </div>
          <div className="space-y-3">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="flex items-start justify-between gap-4 border-b border-stone-100 pb-3 text-sm last:border-0 last:pb-0"
              >
                <span className="text-stone-600">{ev.description}</span>
                <span className="shrink-0 text-xs text-stone-400">
                  {new Date(ev.date).toLocaleDateString("en-GB")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-sm border border-border bg-card p-6 sm:p-8">
        <h3 className="mb-4 text-lg font-semibold text-stone-900">Companies House filing</h3>
        <StubAction
          emphasized
          label="File SH01"
          placeholderText="Connect Companies House integration here - this demo does not file a real SH01 return of allotment of shares."
        />
      </div>
    </div>
  );
}
