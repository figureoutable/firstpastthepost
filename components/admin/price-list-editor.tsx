"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Billing, PriceListItem } from "@/lib/engagements/types";
import { cn } from "@/lib/utils";

type Row = Omit<PriceListItem, "pricePence"> & { price: string };

const input =
  "h-9 w-full rounded-lg border border-stone-200 bg-white px-2.5 text-sm outline-none focus:border-clay-400 focus:ring-2 focus:ring-clay-500/20";

export function PriceListEditor({ items, examples }: { items: PriceListItem[]; examples: boolean }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(
    items.map((i) => ({ ...i, price: (i.pricePence / 100).toFixed(i.pricePence % 100 ? 2 : 0) }))
  );
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  const update = (i: number, patch: Partial<Row>) => {
    setState("idle");
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const save = async () => {
    setError("");
    setState("saving");
    try {
      const payload = rows.map((r) => {
        const n = Number(r.price.replace(/[£,\s]/g, ""));
        if (!Number.isFinite(n) || n < 0) throw new Error(`Check the price for "${r.name || "a service"}".`);
        return { id: r.id.startsWith("example-") ? undefined : r.id, name: r.name, description: r.description, billing: r.billing, pricePence: Math.round(n * 100), active: r.active };
      });
      const res = await fetch("/api/admin/settings/price-list", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save.");
      setRows(data.items.map((i: PriceListItem) => ({ ...i, price: (i.pricePence / 100).toFixed(i.pricePence % 100 ? 2 : 0) })));
      setState("saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      setState("idle");
    }
  };

  return (
    <div className="space-y-4">
      {examples && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          These are example services and prices. Change them to yours and press Save.
        </p>
      )}
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={r.id} className={cn("grid gap-2 rounded-xl border border-stone-200 p-3 sm:grid-cols-[1fr_130px_120px_auto]", !r.active && "opacity-60")}>
            <div className="space-y-2">
              <input aria-label="Service name" className={cn(input, "font-medium")} value={r.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Service name" />
              <input aria-label="Description" className={cn(input, "text-stone-600")} value={r.description} onChange={(e) => update(i, { description: e.target.value })} placeholder="Short description (shown on the letter)" />
            </div>
            <select aria-label="Billed" className={input} value={r.billing} onChange={(e) => update(i, { billing: e.target.value as Billing })}>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
              <option value="one_off">One-off</option>
            </select>
            <label className="relative block">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-stone-400">£</span>
              <input aria-label="Price" inputMode="decimal" className={cn(input, "pl-6 text-right tabular-nums")} value={r.price} onChange={(e) => update(i, { price: e.target.value })} />
            </label>
            <div className="flex items-center gap-1 sm:flex-col sm:items-end">
              <label className="flex items-center gap-1.5 text-xs text-stone-600">
                <input type="checkbox" checked={r.active} onChange={(e) => update(i, { active: e.target.checked })} /> Offered
              </label>
              <button type="button" aria-label={`Remove ${r.name}`} onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))} className="ml-auto rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-red-600 sm:ml-0">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setRows((prev) => [...prev, { id: `new-${Date.now()}`, name: "", description: "", billing: "monthly", price: "0", active: true }])}
        >
          <Plus className="h-4 w-4" /> Add service
        </Button>
        <Button type="button" onClick={save} disabled={state === "saving"}>
          {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "saved" ? <Check className="h-4 w-4" /> : null}
          {state === "saved" ? "Saved" : "Save price list"}
        </Button>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </div>
      <p className="text-xs text-stone-500">Changes only affect new links. Letters already sent keep the prices they were issued with.</p>
    </div>
  );
}
