import type { NextStep } from "@/lib/next-steps";

export function NextStepsList({ steps }: { steps: NextStep[] }) {
  return (
    <ol className="space-y-0">
      {steps.map((step, i) => (
        <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
          {i < steps.length - 1 && <span aria-hidden className="absolute left-[13px] top-8 h-[calc(100%-2rem)] w-px bg-stone-200" />}
          <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-clay-500 text-xs font-semibold text-white">
            {i + 1}
          </span>
          <div className="pt-0.5">
            <p className="font-medium text-stone-900">{step.title}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-stone-600">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
