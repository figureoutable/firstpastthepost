"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { TeamSettings } from "@/lib/engagements/settings";

type Key = "autoStartAml" | "dailySummary";

const OPTIONS: { key: Key; title: string; detail: string }[] = [
  {
    key: "autoStartAml",
    title: "Start AML checks automatically",
    detail: "When a link client sends their details, the paid Firmcheck check starts straight away. Live site only.",
  },
  {
    key: "dailySummary",
    title: "One daily summary email",
    detail: "Replaces the \"letter signed\" and \"payment set up\" emails with one email each morning. Problems still email straight away.",
  },
];

export function OptionsEditor({ initial }: { initial: Pick<TeamSettings, Key> }) {
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState<Key | "">("");
  const [error, setError] = useState("");

  const toggle = async (key: Key) => {
    const next = !values[key];
    setBusy(key);
    setError("");
    try {
      const res = await fetch("/api/admin/settings/options", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save.");
      setValues({ autoStartAml: data.settings.autoStartAml, dailySummary: data.settings.dailySummary });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div>
      <ul className="divide-y divide-stone-100">
        {OPTIONS.map(({ key, title, detail }) => (
          <li key={key} className="flex items-start justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium text-stone-900">{title}</p>
              <p className="text-xs leading-relaxed text-stone-500">{detail}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={values[key]}
              aria-label={title}
              onClick={() => toggle(key)}
              disabled={Boolean(busy)}
              className={cn(
                "relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/50 disabled:opacity-60",
                values[key] ? "bg-clay-500" : "bg-stone-300"
              )}
            >
              <span className={cn("inline-block h-5 w-5 rounded-full bg-white shadow transition-transform", values[key] ? "translate-x-5" : "translate-x-0.5")} />
            </button>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
