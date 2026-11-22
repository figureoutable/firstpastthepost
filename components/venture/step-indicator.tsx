"use client";

import { motion } from "framer-motion";

export function StepIndicator({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label?: string;
}) {
  return (
    <div className="mb-7">
      <div className="flex items-center justify-between gap-3">
        {label ? (
          <p className="text-sm font-semibold text-stone-900">{label}</p>
        ) : (
          <span />
        )}
        <span className="whitespace-nowrap text-xs tabular-nums text-stone-500">
          Step {current + 1} of {total}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-200">
            <motion.div
              className="h-full rounded-full bg-clay-500"
              initial={false}
              animate={{ width: i < current ? "100%" : i === current ? "50%" : "0%" }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
