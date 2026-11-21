"use client";

import { Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Building blocks shared by the onboarding forms. */

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 border-t border-stone-200 pt-6 first:border-t-0 first:pt-0">
      <div>
        <h3 className="text-base font-semibold tracking-tight text-stone-900">{title}</h3>
        {description && <p className="mt-1 text-sm leading-relaxed text-stone-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {optional && <span className="ml-1 font-normal text-stone-400">(optional)</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-stone-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

/** Yes / No buttons with nothing selected until the client chooses. */
export function YesNo({
  value,
  onChange,
  label,
  invalid,
}: {
  value: string | undefined;
  onChange: (value: "yes" | "no") => void;
  label: string;
  invalid?: boolean;
}) {
  const current = typeof value === "string" ? value.toLowerCase() : "";
  return (
    <div role="radiogroup" aria-label={label} className="grid shrink-0 grid-cols-2 gap-2 sm:w-40">
      {(["yes", "no"] as const).map((option) => {
        const selected = current === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option)}
            className={cn(
              "flex h-10 items-center justify-center rounded-lg border text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/40",
              selected
                ? "border-clay-500 bg-clay-50 text-clay-800"
                : invalid
                  ? "border-red-300 bg-white text-stone-700 hover:border-red-400"
                  : "border-stone-300 bg-white text-stone-700 hover:border-stone-400"
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function QuestionRow({
  label,
  children,
  details,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  details?: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="text-sm leading-snug text-stone-800">{label}</p>
        {children}
      </div>
      {details}
    </div>
  );
}

/** Multi-select chips, e.g. services or income types. */
export function ChoiceChips({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isOn = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={isOn}
            onClick={() => onToggle(option)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/40",
              isOn
                ? "border-clay-500 bg-clay-50 font-medium text-clay-800"
                : "border-stone-300 bg-white text-stone-700 hover:border-stone-400"
            )}
          >
            {isOn && <Check className="h-3.5 w-3.5" />}
            {option}
          </button>
        );
      })}
    </div>
  );
}

/** Small "I don't have one yet" tick box under a field. */
export function InlineCheck({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-stone-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-stone-300 accent-clay-600"
      />
      {children}
    </label>
  );
}

export function StepProgress({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="mb-8">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <p className="text-sm font-medium text-stone-900">{steps[current]}</p>
        <p className="text-xs tabular-nums text-stone-500">
          Step {current + 1} of {steps.length}
        </p>
      </div>
      <div className="flex gap-1.5" aria-hidden>
        {steps.map((step, i) => (
          <div
            key={step}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-500",
              i < current ? "bg-clay-500" : i === current ? "bg-clay-300" : "bg-stone-200"
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function ErrorSummary({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <p className="font-medium">Please complete the following:</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function Notice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warm" }) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm leading-relaxed",
        tone === "warm" ? "border-clay-200 bg-clay-50 text-stone-800" : "border-stone-200 bg-stone-50 text-stone-700"
      )}
    >
      {children}
    </div>
  );
}
